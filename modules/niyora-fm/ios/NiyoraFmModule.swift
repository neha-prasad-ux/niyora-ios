import ExpoModulesCore

// Thin transport to Apple's on-device Foundation Models (iOS 26+). The module
// is deliberately dumb: it knows nothing about CBT, beats, or prompts. All
// protocol content lives in TypeScript (src/v3/rough-moment-content.ts), so the
// session copy can iterate without a native rebuild. One bounded call per
// rendered turn; the JS side owns the timeout and the scripted fallback.
//
// Availability is a session-start state, not just a per-call error: the device
// may be ineligible, Apple Intelligence may be off, or the model may still be
// downloading. `availability()` surfaces the reason so the UI can route to the
// scripted-only session instead of failing mid-conversation.
#if canImport(FoundationModels)
import FoundationModels

/// Guided output for one conversational turn. `chips` are short tappable reply
/// options built from the user's own words (the effort gradient: from beat 3
/// on she can tap instead of type). Clamped to 3 on the way out.
@available(iOS 26.0, *)
@Generable
struct GenTurn {
    @Guide(description: "One or two short, warm, plain sentences. Quiet tone. No exclamation points, no emojis, no clinical jargon.")
    var prose: String
    @Guide(description: "Exactly two or three short tappable reply options, each under 10 words, written in the user's own vocabulary.")
    var chips: [String]
}

/// Guided output for prose-only turns (reflection, reframe, keep copy).
@available(iOS 26.0, *)
@Generable
struct GenProse {
    @Guide(description: "One or two short, warm, plain sentences. Quiet tone. No exclamation points, no emojis, no clinical jargon.")
    var prose: String
}
#endif

public class NiyoraFmModule: Module {
    public func definition() -> ModuleDefinition {
        Name("NiyoraFm")

        // "available" | "deviceNotEligible" | "appleIntelligenceNotEnabled"
        // | "modelNotReady" | "unavailable" | "unsupported" (pre-iOS-26 build/OS)
        AsyncFunction("availability") { () -> String in
            #if canImport(FoundationModels)
            if #available(iOS 26.0, *) {
                switch SystemLanguageModel.default.availability {
                case .available:
                    return "available"
                case .unavailable(let reason):
                    switch reason {
                    case .deviceNotEligible: return "deviceNotEligible"
                    case .appleIntelligenceNotEnabled: return "appleIntelligenceNotEnabled"
                    case .modelNotReady: return "modelNotReady"
                    @unknown default: return "unavailable"
                    }
                @unknown default:
                    return "unavailable"
                }
            }
            #endif
            return "unsupported"
        }

        // Warm the model when the session screen mounts, so the first turn (the
        // "feel heard" beat, the one the feature hinges on) does not pay the
        // cold-start latency and fall back to the scripted line.
        AsyncFunction("prewarm") { () -> Bool in
            #if canImport(FoundationModels)
            if #available(iOS 26.0, *) {
                guard SystemLanguageModel.default.availability == .available else { return false }
                let session = LanguageModelSession()
                session.prewarm()
                return true
            }
            #endif
            return false
        }

        // One turn. A fresh session per call keeps every request far under the
        // context window by construction: the JS side sends a compact state
        // summary, never the running transcript. Returns a result object, never
        // throws -- the JS side maps `failure` onto the scripted fallback.
        //
        //   { ok: true,  prose: String, chips: [String]?, latencyMs: Int }
        //   { ok: false, failure: "guardrail"|"overflow"|"unavailable"|"error",
        //     message: String, latencyMs: Int }
        AsyncFunction("generate") { (instructions: String, prompt: String, wantChips: Bool) async -> [String: Any] in
            #if canImport(FoundationModels)
            if #available(iOS 26.0, *) {
                guard SystemLanguageModel.default.availability == .available else {
                    return ["ok": false, "failure": "unavailable", "message": "model not available", "latencyMs": 0]
                }
                let started = Date()
                let ms = { Int(Date().timeIntervalSince(started) * 1000) }
                let session = LanguageModelSession(instructions: instructions)
                do {
                    if wantChips {
                        let r = try await session.respond(to: prompt, generating: GenTurn.self)
                        return [
                            "ok": true,
                            "prose": r.content.prose,
                            "chips": Array(r.content.chips.prefix(3)),
                            "latencyMs": ms(),
                        ]
                    } else {
                        let r = try await session.respond(to: prompt, generating: GenProse.self)
                        return ["ok": true, "prose": r.content.prose, "latencyMs": ms()]
                    }
                } catch let e as LanguageModelSession.GenerationError {
                    let failure: String
                    switch e {
                    case .guardrailViolation: failure = "guardrail"
                    case .exceededContextWindowSize: failure = "overflow"
                    default: failure = "error"
                    }
                    return ["ok": false, "failure": failure, "message": String(describing: e), "latencyMs": ms()]
                } catch {
                    return ["ok": false, "failure": "error", "message": error.localizedDescription, "latencyMs": ms()]
                }
            }
            #endif
            return ["ok": false, "failure": "unavailable", "message": "FoundationModels requires iOS 26", "latencyMs": 0]
        }
    }
}
