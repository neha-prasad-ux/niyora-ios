import ExpoModulesCore

// Thin transport to an on-device Gemma model via LiteRT-LM (MediaPipe
// `LlmInference`). Like niyora-fm, the module is deliberately dumb: it knows
// nothing about CBT, beats, prompts, or JSON. It takes one fully-composed
// prompt string and returns the raw generated text. All protocol content and
// all output parsing live in TypeScript (src/lib/reflect-model.ts), so copy and
// the chip/JSON format iterate without a native rebuild. The JS side owns the
// timeout and the scripted fallback.
//
// The weights (~3GB, gemma-3n-E2B int4) are bundled into the app at build time
// (see scripts/fetch-model.mjs + the podspec `resources`), so the model is in
// Bundle.main from first launch — no download, nothing leaves the device.
//
// Availability is a session-start state: the binary may lack MediaPipe
// ("unsupported"), or the .task file may be missing from the bundle
// ("modelNotReady"). availability() surfaces that so the UI routes to the
// scripted-only session instead of failing mid-conversation.

// Keep this in sync with GEMMA_MODEL_FILENAME in ../src/index.ts.
private let kModelResource = "gemma-3n-E2B-it-int4"
private let kModelExtension = "task"

private func modelPath() -> String? {
  return Bundle.main.path(forResource: kModelResource, ofType: kModelExtension)
}

#if canImport(MediaPipeTasksGenAI)
import MediaPipeTasksGenAI

// One engine per process, loaded lazily and reused across turns. Loading the
// weights is the multi-second cost prewarm() pays up front. A serial queue
// guards init and inference so overlapping turns can't race the engine.
private final class GemmaEngine {
  static let shared = GemmaEngine()
  private let queue = DispatchQueue(label: "com.niyora.gemma.engine")
  private var llm: LlmInference?

  // Load the engine if the model is bundled. Returns true once resident.
  // `maxTokens` caps total context (input + output); CBT turns are short, so a
  // small budget keeps memory down and generation fast.
  func warm(maxTokens: Int) -> Bool {
    return queue.sync {
      if llm != nil { return true }
      guard let path = modelPath() else { return false }
      let options = LlmInference.Options(modelPath: path)
      options.maxTokens = max(256, maxTokens)
      llm = try? LlmInference(options: options)
      return llm != nil
    }
  }

  // Run one blocking generation. Returns raw text or nil on any failure.
  func generate(_ prompt: String, maxTokens: Int) -> String? {
    return queue.sync {
      if llm == nil { _ = warmLocked(maxTokens: maxTokens) }
      guard let llm else { return nil }
      return try? llm.generateResponse(inputText: prompt)
    }
  }

  // Same as warm() but assumes the caller already holds the queue.
  private func warmLocked(maxTokens: Int) -> Bool {
    if llm != nil { return true }
    guard let path = modelPath() else { return false }
    let options = LlmInference.Options(modelPath: path)
    options.maxTokens = max(256, maxTokens)
    llm = try? LlmInference(options: options)
    return llm != nil
  }
}
#endif

public class NiyoraGemmaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NiyoraGemma")

    // "available" | "modelNotReady" | "unsupported"
    AsyncFunction("availability") { () -> String in
      #if canImport(MediaPipeTasksGenAI)
      return modelPath() != nil ? "available" : "modelNotReady"
      #else
      return "unsupported"
      #endif
    }

    // Load the weights so the first turn doesn't pay cold-start latency. The
    // JS side calls this when the session screen mounts.
    AsyncFunction("prewarm") { (maxTokens: Int) -> Bool in
      #if canImport(MediaPipeTasksGenAI)
      return GemmaEngine.shared.warm(maxTokens: maxTokens)
      #else
      return false
      #endif
    }

    // One generation. Never throws — returns a result object the JS side maps
    // onto the scripted fallback:
    //   { ok: true,  text: String, latencyMs: Int }
    //   { ok: false, failure: "unavailable"|"error", message: String, latencyMs: Int }
    AsyncFunction("generateText") { (prompt: String, maxTokens: Int) async -> [String: Any] in
      #if canImport(MediaPipeTasksGenAI)
      let started = Date()
      let ms = { Int(Date().timeIntervalSince(started) * 1000) }
      guard modelPath() != nil else {
        return ["ok": false, "failure": "unavailable", "message": "model not bundled", "latencyMs": 0]
      }
      if let text = GemmaEngine.shared.generate(prompt, maxTokens: maxTokens) {
        return ["ok": true, "text": text, "latencyMs": ms()]
      }
      return ["ok": false, "failure": "error", "message": "generation failed", "latencyMs": ms()]
      #else
      return ["ok": false, "failure": "unavailable", "message": "MediaPipe not linked", "latencyMs": 0]
      #endif
    }
  }
}
