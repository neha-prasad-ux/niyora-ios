import ExpoModulesCore

// Thin transport to an on-device Gemma model.
//
// TWO RUNTIMES, ONE INTERFACE
//   .task      MediaPipe `LlmInference`. What shipped first. Google has put the
//              MediaPipe LLM Inference API into maintenance-only mode on every
//              platform, and its iOS guide never listed `.litertlm`.
//   .litertlm  LiteRT-LM. The current runtime, and the ONLY one that can load a
//              fine-tuned Gemma 4: `litert-torch export_hf` emits `.litertlm`
//              exclusively and MediaPipe's bundler has no Gemma 4 model type
//              (`Unknown special model: GEMMA_4_E2B`). No conversion exists
//              between the two, so shipping our own fine-tune requires this.
//
// Both sit behind `LlmBackend`, selected by which file is actually bundled,
// preferring `.litertlm`. LiteRT-LM is vendored into this pod so it is always
// present; MediaPipe sits behind `canImport` so the module still builds if that
// pod is ever dropped. Like niyora-fm, the module is deliberately dumb: it knows
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

// Keep in sync with GEMMA_MODEL_FILENAME in ../src/index.ts.
private let kLiteRtResource = "niyora-gemma4-e2b-v4-wide-deduped-int4"
private let kLiteRtExtension = "litertlm"
private let kMediaPipeResource = "gemma-3n-E2B-it-int4"
private let kMediaPipeExtension = "task"

private func liteRtPath() -> String? {
  Bundle.main.path(forResource: kLiteRtResource, ofType: kLiteRtExtension)
}
private func mediaPipePath() -> String? {
  Bundle.main.path(forResource: kMediaPipeResource, ofType: kMediaPipeExtension)
}
private func modelPath() -> String? { liteRtPath() ?? mediaPipePath() }

/// One generation backend. Both implementations block and are called on a
/// serial queue, so neither needs to be thread-safe itself.
private protocol LlmBackend {
  func warm(maxTokens: Int) -> Bool
  func generate(_ prompt: String, maxTokens: Int) -> String?
}

// NO `#if canImport(LiteRTLM)` and no `import LiteRTLM`. The wrapper's Swift
// sources are vendored into THIS pod target (see the podspec), so its types are
// in the same module and there is nothing to import. Guarding on
// canImport(LiteRTLM) would evaluate FALSE and silently compile the whole
// LiteRT-LM path out — the build would succeed, the app would fall back to
// MediaPipe, and our fine-tune would never load, with no error anywhere.
private final class LiteRtBackend: LlmBackend {
  private var engine: Engine?
  private let path: String
  init(path: String) { self.path = path }

  func warm(maxTokens: Int) -> Bool {
    if engine != nil { return true }
    // Verified against the vendored LiteRTLM 0.14.0 sources, not assumed:
    // EngineConfig.init and Engine.initialize() are BOTH synchronous `throws`.
    // Only Conversation.sendMessage is async. An earlier draft awaited all
    // three and would not have compiled.
    //
    // .cpu, not .gpu, deliberately. Google's own iOS numbers put GPU at 1450 MB
    // peak against CPU's 607 MB for +31 tok/s decode. On a 6 GB device memory
    // is the binding constraint, not speed.
    //
    // maxNumTokens is the kv-cache size (input + output). CBT turns are short,
    // and every token of cache is resident memory on a device that has little
    // to spare.
    do {
      let cfg = try EngineConfig(
        modelPath: path,
        backend: .cpu(),
        maxNumTokens: max(256, maxTokens),
        cacheDir: NSTemporaryDirectory()
      )
      let e = Engine(engineConfig: cfg)
      try e.initialize()
      engine = e
      return true
    } catch {
      engine = nil
      return false
    }
  }

  func generate(_ prompt: String, maxTokens: Int) -> String? {
    if engine == nil, !warm(maxTokens: maxTokens) { return nil }
    guard let engine else { return nil }
    guard let convo = try? engine.createConversation() else { return nil }
    // sendMessage IS async, and this runs on a serial queue that must not
    // return before the text exists. The semaphore bridges that rather than
    // making the whole LlmBackend protocol async for one method.
    let sem = DispatchSemaphore(value: 0)
    var out: String?
    Task {
      out = try? await convo.sendMessage(Message(prompt)).toString
      sem.signal()
    }
    sem.wait()
    return out
  }
}

#if canImport(MediaPipeTasksGenAI)
import MediaPipeTasksGenAI

// One engine per process, loaded lazily and reused across turns. Loading the
// weights is the multi-second cost prewarm() pays up front. A serial queue
// guards init and inference so overlapping turns can't race the engine.
private final class MediaPipeBackend: LlmBackend {
  private var llm: LlmInference?
  private let path: String
  init(path: String) { self.path = path }

  // `maxTokens` caps TOTAL context (input + output); CBT turns are short, so a
  // small budget keeps memory down and generation fast.
  func warm(maxTokens: Int) -> Bool {
    if llm != nil { return true }
    let options = LlmInference.Options(modelPath: path)
    options.maxTokens = max(256, maxTokens)
    llm = try? LlmInference(options: options)
    return llm != nil
  }

  func generate(_ prompt: String, maxTokens: Int) -> String? {
    if llm == nil, !warm(maxTokens: maxTokens) { return nil }
    guard let llm else { return nil }
    return try? llm.generateResponse(inputText: prompt)
  }
}
#endif

/// One engine per process, loaded lazily and reused across turns. Loading the
/// weights is the multi-second cost `prewarm()` pays up front. A serial queue
/// guards init and inference so overlapping turns cannot race the engine.
private final class GemmaEngine {
  static let shared = GemmaEngine()
  private let queue = DispatchQueue(label: "com.niyora.gemma.engine")
  private var backend: LlmBackend?

  /// `.litertlm` wins when both are bundled: it is the only runtime that can
  /// load our fine-tune, and shipping both files would be 5+ GB of bundle.
  static func selectBackend() -> LlmBackend? {
    if let p = liteRtPath() { return LiteRtBackend(path: p) }
    #if canImport(MediaPipeTasksGenAI)
    if let p = mediaPipePath() { return MediaPipeBackend(path: p) }
    #endif
    return nil
  }

  func warm(maxTokens: Int) -> Bool {
    queue.sync {
      if backend == nil { backend = GemmaEngine.selectBackend() }
      return backend?.warm(maxTokens: maxTokens) ?? false
    }
  }

  func generate(_ prompt: String, maxTokens: Int) -> String? {
    queue.sync {
      if backend == nil { backend = GemmaEngine.selectBackend() }
      return backend?.generate(prompt, maxTokens: maxTokens)
    }
  }
}

public class NiyoraGemmaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NiyoraGemma")

    // "available" | "modelNotReady" | "unsupported"
    //
    // "available" means the engine ACTUALLY LOADED, not merely that a file
    // exists on disk. The previous version returned "available" whenever
    // modelPath() was non-nil, so a corrupt or too-large model reported
    // healthy: the JS provider then cached `gemma` for the whole session and
    // every turn failed, while the working Apple Foundation Models path was
    // never tried. An entire install could silently degrade to scripted.
    AsyncFunction("availability") { (maxTokens: Int?) -> String in
      guard GemmaEngine.selectBackend() != nil else {
        // LiteRT-LM is always linked (vendored), so reaching here means no
        // model FILE is bundled, not that the runtime is missing.
        return "modelNotReady"
      }
      return GemmaEngine.shared.warm(maxTokens: maxTokens ?? 512)
        ? "available" : "modelNotReady"
    }

    /// Which runtime answered. Diagnostic only, logged in dev, so a silent
    /// fall back to the legacy path is visible rather than guessed at.
    AsyncFunction("backendName") { () -> String in
      if liteRtPath() != nil { return "litertlm" }
      #if canImport(MediaPipeTasksGenAI)
      if mediaPipePath() != nil { return "mediapipe" }
      #endif
      return "none"
    }

    // Load the weights so the first turn doesn't pay cold-start latency. The
    // JS side calls this when the session screen mounts.
    AsyncFunction("prewarm") { (maxTokens: Int) -> Bool in
      GemmaEngine.shared.warm(maxTokens: maxTokens)
    }

    // One generation. Never throws — returns a result object the JS side maps
    // onto the scripted fallback:
    //   { ok: true,  text: String, latencyMs: Int }
    //   { ok: false, failure: "unavailable"|"error", message: String, latencyMs: Int }
    AsyncFunction("generateText") { (prompt: String, maxTokens: Int) async -> [String: Any] in
      let started = Date()
      let ms = { Int(Date().timeIntervalSince(started) * 1000) }
      guard GemmaEngine.selectBackend() != nil else {
        return ["ok": false, "failure": "unavailable",
                "message": "no model bundled", "latencyMs": 0]
      }
      if let text = GemmaEngine.shared.generate(prompt, maxTokens: maxTokens) {
        return ["ok": true, "text": text, "latencyMs": ms()]
      }
      return ["ok": false, "failure": "error",
              "message": "generation failed", "latencyMs": ms()]
    }
  }
}
