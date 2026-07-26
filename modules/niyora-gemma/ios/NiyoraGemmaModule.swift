import ExpoModulesCore
import UIKit
import CryptoKit

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

// MARK: - Where the model lives
//
// The weights used to be a bundle resource, which made the app a 3.1GB install
// and meant changing model required a full rebuild and reinstall. They are now
// DOWNLOADED at runtime into Application Support.
//
// Resolution order is deliberate: a downloaded model WINS over a bundled one.
// That way a build can still ship a bundled fallback while we migrate, and the
// downloaded file is what we actually iterate on.
enum ModelStore {
  static let folder = "NiyoraModels"

  static func directory() throws -> URL {
    let base = try FileManager.default.url(
      for: .applicationSupportDirectory, in: .userDomainMask,
      appropriateFor: nil, create: true)
    let dir = base.appendingPathComponent(folder, isDirectory: true)
    if !FileManager.default.fileExists(atPath: dir.path) {
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    // Multi-GB weights must never go into iCloud backup. Apple rejects apps
    // that back up re-downloadable content, and it would wreck her backup size.
    var mutable = dir
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try? mutable.setResourceValues(values)
    return dir
  }

  static func url(for filename: String) -> URL? {
    guard let dir = try? directory() else { return nil }
    return dir.appendingPathComponent(filename)
  }

  /// The downloaded model currently installed, if any. Nil when not downloaded.
  static func installed(filename: String) -> URL? {
    guard let u = url(for: filename),
          FileManager.default.fileExists(atPath: u.path) else { return nil }
    return u
  }

  static func size(of url: URL) -> Int64 {
    let a = try? FileManager.default.attributesOfItem(atPath: url.path)
    return (a?[.size] as? NSNumber)?.int64Value ?? -1
  }

  /// Streamed so a ~2GB file is never held in memory to hash it.
  static func sha256(of url: URL) -> String? {
    guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
    defer { try? handle.close() }
    var hasher = SHA256()
    while true {
      guard let chunk = try? handle.read(upToCount: 4 * 1024 * 1024), !chunk.isEmpty else { break }
      hasher.update(data: chunk)
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }
}


// Resolution order, both formats: a DOWNLOADED model wins over a bundled one.
// Bundling a 2.6 GB model makes the app a 2.6 GB install, cannot be updated
// without a rebuild and reinstall, and double-counts storage when a downloaded
// copy also exists -- which it already did on the test device: a bundled 2.57 GB
// plus a 2.41 GB download is ~5 GB of models on a phone.
private func liteRtPath() -> String? {
  let name = "\(kLiteRtResource).\(kLiteRtExtension)"
  if let downloaded = ModelStore.installed(filename: name) { return downloaded.path }
  return Bundle.main.path(forResource: kLiteRtResource, ofType: kLiteRtExtension)
}
private func mediaPipePath() -> String? {
  let name = "\(kMediaPipeResource).\(kMediaPipeExtension)"
  if let downloaded = ModelStore.installed(filename: name) { return downloaded.path }
  return Bundle.main.path(forResource: kMediaPipeResource, ofType: kMediaPipeExtension)
}
private func modelPath() -> String? { liteRtPath() ?? mediaPipePath() }

/// One generation backend. Both implementations block and are called on a
/// serial queue, so neither needs to be thread-safe itself.
private protocol LlmBackend {
  func warm(maxTokens: Int) -> Bool
  /// Free native memory. Must be explicit: LiteRT-LM has no close() and relies
  /// on ARC, so the owner has to drop references in dependency order.
  func release()
  /// `system` is the instruction block. LiteRT-LM applies the model's own chat
  /// template around roled messages, so passing it separately reproduces how
  /// the model was TRAINED (system + user turns) instead of flattening both
  /// into one user string. MediaPipe has no role concept and concatenates.
  func generate(_ prompt: String, system: String?, maxTokens: Int) -> String?
}

// NO `#if canImport(LiteRTLM)` and no `import LiteRTLM`. The wrapper's Swift
// sources are vendored into THIS pod target (see the podspec), so its types are
// in the same module and there is nothing to import. Guarding on
// canImport(LiteRTLM) would evaluate FALSE and silently compile the whole
// LiteRT-LM path out — the build would succeed, the app would fall back to
// MediaPipe, and our fine-tune would never load, with no error anywhere.
private final class LiteRtBackend: LlmBackend {
  private var engine: Engine?
  private var conversation: Conversation?
  private let path: String
  init(path: String) { self.path = path }

  func warm(maxTokens: Int) -> Bool {
    if engine != nil { return true }
    // `Engine` is an ACTOR (Engine.swift:28), so initialize() and
    // createConversation() are actor-isolated and must be AWAITED even though
    // neither is declared `async`. Calling them directly from a synchronous
    // context is a compile error.
    //
    // .cpu, not .gpu: Google's iOS numbers put GPU at 1450 MB peak against
    // CPU's 607 MB for +31 tok/s decode. On a 6 GB device memory is the binding
    // constraint. GPU also copies weights into dirty GPU-accessible buffers,
    // which jetsam counts in full, where CPU keeps them clean and mmapped.
    //
    // maxNumTokens IS the kv-cache size (Config.swift:55). Every token of cache
    // is resident memory.
    guard let cfg = try? EngineConfig(
      modelPath: path,
      backend: .cpu(),
      maxNumTokens: max(256, maxTokens),
      cacheDir: NSTemporaryDirectory()
    ) else { return false }

    let e = Engine(engineConfig: cfg)
    let sem = DispatchSemaphore(value: 0)
    var ok = false
    Task {
      do { try await e.initialize(); ok = true } catch { ok = false }
      sem.signal()
    }
    sem.wait()
    engine = ok ? e : nil
    return ok
  }

  func generate(_ prompt: String, system: String?, maxTokens: Int) -> String? {
    if engine == nil, !warm(maxTokens: maxTokens) { return nil }
    guard let engine else { return nil }
    let sem = DispatchSemaphore(value: 0)
    var out: String?
    Task {
      do {
        // The .litertlm carries the model's own jinja chat template (18.5 KB),
        // and LiteRT-LM applies it to ROLED messages. So the system block goes
        // in as a system message rather than glued onto the user turn: the
        // corpus was trained as system + user turns.
        let cfg = system.map {
          ConversationConfig(systemMessage: Message($0, role: .system))
        }
        let convo = try await engine.createConversation(with: cfg)
        // Held so release() can drop it BEFORE the engine. See below.
        self.conversation = convo
        out = try await convo.sendMessage(Message(prompt)).toString
      } catch {
        out = nil
      }
      sem.signal()
    }
    sem.wait()
    // The turn is over; drop the conversation so it cannot pin the engine.
    conversation = nil
    return out
  }

  /// ORDER IS LOAD-BEARING: conversation first, then engine.
  ///
  /// LiteRT-LM's Swift API exposes NO close()/release()/destroy(). Teardown is
  /// deinit-only, driven by ARC (Engine.swift:269, Conversation.swift:87), and
  /// the references are strong in one direction:
  ///
  ///     StreamContext ──strong──> Conversation ──strong──> Engine
  ///
  /// So `engine = nil` frees NOTHING while any Conversation is still alive.
  /// Google's own Kotlin API makes this explicit -- Engine and Conversation are
  /// both AutoCloseable and the Gallery app closes the conversation first
  /// (LlmChatModelHelper.kt:253 then :259). Swift users get ARC and no warning.
  ///
  /// An earlier version of this method nilled only the backend, which dropped
  /// the engine reference while an in-flight turn still held a conversation:
  /// a silent no-op that looked like a working release.
  func release() {
    conversation = nil
    engine = nil
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

  func release() { llm = nil }

  func generate(_ prompt: String, system: String?, maxTokens: Int) -> String? {
    if llm == nil, !warm(maxTokens: maxTokens) { return nil }
    guard let llm else { return nil }
    // MediaPipe has no role concept: the only option is to prepend. This is one
    // more reason the LiteRT-LM path is preferred, not merely newer.
    let full = system.map { "\($0)\n\n\(prompt)" } ?? prompt
    return try? llm.generateResponse(inputText: full)
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

  /// Serialised on `queue`, which is what prevents a double load.
  ///
  /// Two concurrent warms would each allocate ~2.6 GB and OOM the app
  /// instantly. It is a real failure mode -- Google's own Swift adapter
  /// memoises the in-flight init Task for exactly this reason
  /// (LiteRTLanguageModel.swift:485) -- and it is reachable here: the session
  /// screen prewarms on mount while a fast first tap can call generate(), and
  /// a quick unmount/remount can fire prewarm twice.
  ///
  /// The serial queue already gives us this: the second caller blocks until the
  /// first finishes, then sees a non-nil backend and returns immediately.
  func warm(maxTokens: Int) -> Bool {
    queue.sync {
      if backend == nil { backend = GemmaEngine.selectBackend() }
      return backend?.warm(maxTokens: maxTokens) ?? false
    }
  }

  func generate(_ prompt: String, system: String?, maxTokens: Int) -> String? {
    queue.sync {
      if backend == nil { backend = GemmaEngine.selectBackend() }
      return backend?.generate(prompt, system: system, maxTokens: maxTokens)
    }
  }

  /// Drop the engine and return its memory.
  ///
  /// The model is ~2.6 GB resident. Without this it is held for the whole
  /// process lifetime after the first session, so every unrelated screen in the
  /// app carries that footprint and backgrounding becomes a jetsam magnet: iOS
  /// evicts the largest suspended app first, and after one session that is us.
  ///
  /// Reloading costs the same multi-second warm the session already pays on
  /// entry, and it happens while she is reading a scripted opening line rather
  /// than waiting on a blank screen. Holding 2.6 GB between sessions to save
  /// that is the wrong trade on a 6 GB device.
  func release() {
    queue.sync {
      // Tell the backend to tear down in the right order first; dropping our
      // own reference alone would leave ARC to decide, and ARC cannot break the
      // Conversation -> Engine chain for us.
      backend?.release()
      backend = nil
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
    // JS side calls this when the session screen mounts -- NOT at app launch,
    // so opening the app does not cost 2.6 GB.
    AsyncFunction("prewarm") { (maxTokens: Int) -> Bool in
      GemmaEngine.shared.warm(maxTokens: maxTokens)
    }

    // Give the memory back. Called when the session screen unmounts.
    AsyncFunction("release") { () -> Bool in
      GemmaEngine.shared.release()
      return true
    }

    // iOS asks before it kills. Dropping ~2.6 GB on a memory warning is the
    // difference between a degraded session and the whole app being terminated
    // mid-conversation, which loses everything she has typed.
    // OnCreate, not OnStartObserving: the latter requires a declared Events
    // block and only fires once JS subscribes. This must be armed for the whole
    // module lifetime, whether or not anything is listening.
    OnCreate {
      NotificationCenter.default.addObserver(
        forName: UIApplication.didReceiveMemoryWarningNotification,
        object: nil, queue: .main
      ) { _ in GemmaEngine.shared.release() }

      // Also release on background. Google's Gallery app deliberately does NOT
      // do this and keeps the engine resident when backgrounded -- but that is
      // an Android app, and Android will not jetsam a suspended process nearly
      // as fast as iOS will. A 2.6 GB suspended app is the first thing iOS
      // evicts, and being evicted loses the whole session including what she
      // typed. Re-warming on return costs the same seconds the screen already
      // pays on entry.
      NotificationCenter.default.addObserver(
        forName: UIApplication.didEnterBackgroundNotification,
        object: nil, queue: .main
      ) { _ in GemmaEngine.shared.release() }
    }

    // One generation. Never throws — returns a result object the JS side maps
    // onto the scripted fallback:
    //   { ok: true,  text: String, latencyMs: Int }
    //   { ok: false, failure: "unavailable"|"error", message: String, latencyMs: Int }
    AsyncFunction("generateText") { (prompt: String, maxTokens: Int, system: String?) async -> [String: Any] in
      let started = Date()
      let ms = { Int(Date().timeIntervalSince(started) * 1000) }
      guard GemmaEngine.selectBackend() != nil else {
        return ["ok": false, "failure": "unavailable",
                "message": "no model bundled", "latencyMs": 0]
      }
      if let text = GemmaEngine.shared.generate(prompt, system: system, maxTokens: maxTokens) {
        return ["ok": true, "text": text, "latencyMs": ms()]
      }
      return ["ok": false, "failure": "error",
              "message": "generation failed", "latencyMs": ms()]
    }
  }
}
