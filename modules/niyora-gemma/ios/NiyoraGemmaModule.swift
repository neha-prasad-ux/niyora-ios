import ExpoModulesCore
import Foundation
import CryptoKit
import os

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

/// Which model file the engine should load. Settable from JS so a new model can
/// be tried without a native rebuild, which is the whole point of moving off a
/// bundle resource.
private var kActiveModelFilename: String = "\(kModelResource).\(kModelExtension)"

private func modelPath() -> String? {
  if let downloaded = ModelStore.installed(filename: kActiveModelFilename) {
    return downloaded.path
  }
  // Legacy fallback: a model bundled at build time. Kept so existing builds
  // keep working while the download path lands.
  let name = (kActiveModelFilename as NSString).deletingPathExtension
  let ext = (kActiveModelFilename as NSString).pathExtension
  return Bundle.main.path(forResource: name, ofType: ext)
}

#if canImport(MediaPipeTasksGenAI)
import MediaPipeTasksGenAI

// One engine per process, loaded lazily and reused across turns. Loading the
// weights is the multi-second cost prewarm() pays up front. A serial queue
// guards init and inference so overlapping turns can't race the engine.
private final class GemmaEngine {
  static let shared = GemmaEngine()
  private let queue = DispatchQueue(label: "com.niyora.gemma.engine")
  // Separate from `queue` on purpose: generation waits on a callback delivered
  // by MediaPipe on a queue we don't control, so it must not hold the same lock
  // that init uses.
  private let genLock = NSLock()
  private var llm: LlmInference?

  // The last underlying failure, verbatim. Loading a ~3GB model on an A16 can
  // fail for reasons that look identical from JS (jetsam kill on memory, a
  // truncated download, a .task the installed MediaPipe can't parse), so the
  // error text is the only thing that tells them apart. Swallowing it with
  // `try?` is how a memory failure gets misread as a bad model file.
  private(set) var lastError: String?

  // Which backend the resident engine was built with, for reporting.
  private(set) var backendUsed: String = "none"

  // Load the engine if the model is bundled. Returns true once resident.
  // `maxTokens` caps total context (input + output); CBT turns are short, so a
  // small budget keeps memory down and generation fast.
  //
  // `backend` selects the LiteRT backend. This is exposed because
  // `ai-briefs/export-decisions.md` disqualified this whole route on the claim
  // that ".task on iOS is CPU-only, GPU isn't exposed through the C API".
  // That is not true of MediaPipeTasksGenAI 0.10.35: the C header declares
  // `LlmPreferredBackend` with a GPU case and the Swift Options surface
  // exposes `preferredBackend`. Whether GPU actually WORKS for this model on
  // this chip is a separate question, so make it selectable and measure it
  // rather than trusting either claim.
  func warm(maxTokens: Int, backend: String) -> Bool {
    return queue.sync { warmLocked(maxTokens: maxTokens, backend: backend) }
  }

  // Drop the engine so a different backend can be timed in the same session.
  func reset() {
    queue.sync {
      llm = nil
      backendUsed = "none"
    }
  }

  // One generation, with enough detail to tell a clean stop from a runaway we
  // had to cut short. Every field here exists because its absence caused a
  // wrong conclusion at some point.
  struct GenResult {
    let text: String // trimmed at the stop marker: what a caller should use
    let rawChars: Int // everything emitted before we stopped
    let outputTokens: Int // real count from sizeInTokens, -1 if unavailable
    let chunks: Int
    let msToFirstToken: Int
    let totalMs: Int
    let stopReason: String // "eos" | "stopMarker" | "tokenCap" | "error"
    let streamMode: String // "incremental" | "cumulative" | "unknown"
  }

  // Streaming generation with a client-side stop.
  //
  // Why this replaced the blocking `generateResponse`: Gemma 4 answers
  // correctly and then keeps emitting turn tokens until it exhausts the
  // context, so one sentence cost 110 SECONDS and ~510 tokens on device. The
  // blocking call gives no way to intervene, and `maxTokens` cannot help --
  // it is a CONTEXT cap applied at warm time and clamped by `max(256, n)`, so
  // passing a small number to a warm engine does exactly nothing. That was
  // measured, not assumed: two runs at "cap=64" produced 931 and 2038 chars.
  //
  // `ai-briefs/export-decisions.md` said fixing this needed `LlmPromptTemplates`
  // through the C API. It does not. The shipped Swift surface has
  // `generateResponseAsync` and `Session.cancelGenerateResponseAsync()`, so we
  // can watch the stream and stop it ourselves.
  //
  // Note this is a CLIENT-side stop, not a real EOS. It bounds the cost and
  // returns a clean answer; it does not make the model stop wanting to talk.
  // `stopReason` reports which happened, so a model that genuinely terminates
  // is never confused with one we cut off.
  func generateStreaming(
    prompt: String,
    maxTokens: Int,
    maxOutputTokens: Int,
    stopMarkers: [String]
  ) -> GenResult? {
    // Take the engine under the lock, then release it. The progress callback
    // arrives on a queue we do not control, so holding the serial queue across
    // the wait below risks deadlocking against our own callback.
    let engine: LlmInference? = queue.sync {
      if llm == nil, !warmLocked(maxTokens: maxTokens, backend: "default") { return nil }
      return llm
    }
    guard let engine else { return nil }

    // Still one generation at a time, just not on the queue the callback may
    // land on.
    genLock.lock()
    defer { genLock.unlock() }

    do {
      let session = try LlmInference.Session(llmInference: engine)
      try session.addQueryChunk(inputText: prompt)

      var raw = ""
      var chunks = 0
      var firstTokenMs = -1
      var stopReason = "eos"
      var streamMode = "unknown"
      var stopped = false
      let started = Date()
      let finished = DispatchSemaphore(value: 0)
      let guard_ = NSLock() // the callback is not promised to be serial

      try session.generateResponseAsync(
        progress: { partial, error in
          guard_.lock()
          defer { guard_.unlock() }
          if stopped { return }
          if let error {
            self.lastError = "stream: \(error)"
            stopReason = "error"
            stopped = true
            finished.signal()
            return
          }
          guard let partial, !partial.isEmpty else { return }
          if firstTokenMs < 0 {
            firstTokenMs = Int(Date().timeIntervalSince(started) * 1000)
          }
          chunks += 1

          // Whether `partialResponse` is the new text or the whole text so far
          // is not documented in the header, and guessing wrong either drops
          // most of the output or duplicates all of it. So detect it instead of
          // assuming, and report which it was rather than leaving it folklore.
          if !raw.isEmpty, partial.hasPrefix(raw) {
            streamMode = "cumulative"
            raw = partial
          } else {
            if streamMode == "unknown" { streamMode = "incremental" }
            raw += partial
          }

          if stopMarkers.contains(where: { raw.contains($0) }) {
            stopReason = "stopMarker"
          } else if maxOutputTokens > 0, chunks >= maxOutputTokens {
            stopReason = "tokenCap"
          } else {
            return
          }
          stopped = true
          try? session.cancelGenerateResponseAsync()
          finished.signal()
        },
        completion: {
          guard_.lock()
          defer { guard_.unlock() }
          if stopped { return }
          stopped = true
          finished.signal()
        }
      )

      finished.wait()
      let totalMs = Int(Date().timeIntervalSince(started) * 1000)

      guard_.lock()
      let rawOut = raw
      let chunksOut = chunks
      let reasonOut = stopReason
      let modeOut = streamMode
      let firstOut = firstTokenMs
      guard_.unlock()

      // Cut at the first stop marker. Everything after it is the runaway.
      var clean = rawOut
      for marker in stopMarkers {
        if let r = clean.range(of: marker) { clean = String(clean[clean.startIndex..<r.lowerBound]) }
      }
      clean = clean.trimmingCharacters(in: .whitespacesAndNewlines)

      // A REAL token count, not characters divided by a guess. Every tokens/sec
      // figure in the briefs so far was estimated from character counts and
      // flagged as such; this is what replaces it. A fresh session is used
      // because the generating one has just been cancelled.
      var tokens = -1
      if let counter = try? LlmInference.Session(llmInference: engine) {
        tokens = (try? counter.sizeInTokens(text: rawOut)) ?? -1
      }

      lastError = nil
      return GenResult(
        text: clean,
        rawChars: rawOut.count,
        outputTokens: tokens,
        chunks: chunksOut,
        msToFirstToken: firstOut,
        totalMs: totalMs,
        stopReason: reasonOut,
        streamMode: modeOut
      )
    } catch {
      lastError = "generateStreaming: \(error)"
      return nil
    }
  }

  // Same as warm() but assumes the caller already holds the queue.
  private func warmLocked(maxTokens: Int, backend: String) -> Bool {
    if llm != nil { return true }
    guard let path = modelPath() else {
      lastError = "model not in Bundle.main (\(kModelResource).\(kModelExtension))"
      return false
    }
    let options = LlmInference.Options(modelPath: path)
    options.maxTokens = max(256, maxTokens)
    switch backend {
    case "gpu": options.preferredBackend = .gpu
    case "cpu": options.preferredBackend = .cpu
    default: break // leave at the model's own default
    }
    do {
      llm = try LlmInference(options: options)
      lastError = nil
      backendUsed = backend
      return true
    } catch {
      // A GPU init failure is expected to be possible and must not be silent:
      // it is the difference between "GPU is unsupported here" and "the model
      // is broken", and those have opposite consequences for the route choice.
      lastError = "LlmInference init (backend=\(backend)): \(error)"
      return false
    }
  }
}
#endif

// MARK: - Download
//
// A ~2GB fetch has to survive her locking the phone or switching apps, so this
// uses a background URLSession rather than a plain data task. It reports
// progress, verifies before installing, and installs atomically.
//
// Honest limitation: the AppDelegate `handleEventsForBackgroundURLSession` hook
// is NOT wired, so if iOS terminates the app mid-download the transfer finishes
// but the app is not relaunched to install it. It reinstalls on next launch via
// resume. Wire the hook before this is a shipping path.
private final class GemmaDownloader: NSObject, URLSessionDownloadDelegate {
  static let shared = GemmaDownloader()

  var onProgress: ((Int64, Int64) -> Void)?
  var onFinished: ((Bool, String) -> Void)?

  private var session: URLSession!
  private var task: URLSessionDownloadTask?
  private var destination: URL?
  private var expectedSha: String?
  private var expectedBytes: Int64 = -1

  override init() {
    super.init()
    let config = URLSessionConfiguration.background(withIdentifier: "com.niyora.gemma.download")
    config.isDiscretionary = false
    config.sessionSendsLaunchEvents = true
    // Default to Wi-Fi. Nobody should burn 2GB of cellular without choosing to.
    config.allowsCellularAccess = false
    session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
  }

  var isRunning: Bool { task != nil }

  func start(url: URL, filename: String, sha256: String?, bytes: Int64, allowCellular: Bool) -> String? {
    if task != nil { return "a download is already running" }
    guard let dest = ModelStore.url(for: filename) else { return "could not resolve the models directory" }

    // Refuse to start if the device cannot hold it. Failing here with a clear
    // message beats failing at 95% with an opaque disk error.
    if bytes > 0, let free = try? URL(fileURLWithPath: NSHomeDirectory())
      .resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
      .volumeAvailableCapacityForImportantUsage {
      // Need room for the temp file and the installed copy during the move.
      if Int64(free) < bytes + 500_000_000 {
        return "not enough free space: needs about \(bytes / 1_000_000)MB plus headroom"
      }
    }

    destination = dest
    expectedSha = sha256
    expectedBytes = bytes
    session.configuration.allowsCellularAccess = allowCellular
    let t = session.downloadTask(with: url)
    task = t
    t.resume()
    return nil
  }

  func cancel() {
    task?.cancel()
    task = nil
  }

  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                  didWriteData bytesWritten: Int64, totalBytesWritten: Int64,
                  totalBytesExpectedToWrite: Int64) {
    let total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : expectedBytes
    onProgress?(totalBytesWritten, total)
  }

  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask,
                  didFinishDownloadingTo location: URL) {
    defer { task = nil }
    guard let dest = destination else {
      onFinished?(false, "no destination")
      return
    }
    // Verify BEFORE installing. A truncated or corrupt multi-GB file otherwise
    // fails much later as an opaque engine init error, which is exactly the
    // confusion this module already had to be taught to distinguish.
    if expectedBytes > 0 {
      let got = ModelStore.size(of: location)
      if got != expectedBytes {
        onFinished?(false, "size mismatch: expected \(expectedBytes), got \(got)")
        return
      }
    }
    if let want = expectedSha, !want.isEmpty {
      guard let got = ModelStore.sha256(of: location), got.caseInsensitiveCompare(want) == .orderedSame else {
        onFinished?(false, "sha256 mismatch, refusing to install")
        return
      }
    }
    do {
      if FileManager.default.fileExists(atPath: dest.path) {
        try FileManager.default.removeItem(at: dest)
      }
      try FileManager.default.moveItem(at: location, to: dest)
      onFinished?(true, dest.path)
    } catch {
      onFinished?(false, "install failed: \(error)")
    }
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if let error {
      self.task = nil
      onFinished?(false, "transfer failed: \(error.localizedDescription)")
    }
  }
}

public class NiyoraGemmaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NiyoraGemma")

    Events("onModelDownloadProgress", "onModelDownloadFinished")

    OnStartObserving {
      GemmaDownloader.shared.onProgress = { [weak self] written, total in
        self?.sendEvent("onModelDownloadProgress", [
          "bytesWritten": written,
          "bytesTotal": total,
          "fraction": total > 0 ? Double(written) / Double(total) : 0,
        ])
      }
      GemmaDownloader.shared.onFinished = { [weak self] ok, message in
        self?.sendEvent("onModelDownloadFinished", ["ok": ok, "message": message])
      }
    }

    // Which model file the engine loads. Changing this at runtime is what lets
    // a different model (a Gemma 4 `.task`, a `.litertlm`) be tried without a
    // native rebuild and a 2GB reinstall.
    AsyncFunction("setActiveModel") { (filename: String) -> Bool in
      #if canImport(MediaPipeTasksGenAI)
      kActiveModelFilename = filename
      // The resident engine belongs to the OLD file, so it must go.
      GemmaEngine.shared.reset()
      return true
      #else
      return false
      #endif
    }

    // Is the model on disk, where, and how big. Distinct from availability():
    // this is about the FILE, and says nothing about whether it loads.
    AsyncFunction("modelState") { () -> [String: Any] in
      var out: [String: Any] = ["activeModel": kActiveModelFilename]
      if let downloaded = ModelStore.installed(filename: kActiveModelFilename) {
        out["source"] = "downloaded"
        out["path"] = downloaded.path
        out["bytes"] = ModelStore.size(of: downloaded)
      } else if let bundled = modelPath() {
        out["source"] = "bundled"
        out["path"] = bundled
        out["bytes"] = ModelStore.size(of: URL(fileURLWithPath: bundled))
      } else {
        out["source"] = "missing"
        out["path"] = NSNull()
        out["bytes"] = -1
      }
      out["downloading"] = GemmaDownloader.shared.isRunning
      return out
    }

    // Start a download. `sha256` and `bytes` are verified before install; pass
    // them whenever known, because an unverified multi-GB file is how you get a
    // failure that looks like a broken model.
    AsyncFunction("downloadModel") {
      (urlString: String, filename: String, sha256: String?, bytes: Int?, allowCellular: Bool?) -> [String: Any] in
      guard let url = URL(string: urlString) else {
        return ["started": false, "error": "bad url"]
      }
      let err = GemmaDownloader.shared.start(
        url: url, filename: filename, sha256: sha256,
        bytes: Int64(bytes ?? -1), allowCellular: allowCellular ?? false)
      return err == nil ? ["started": true] : ["started": false, "error": err!]
    }

    AsyncFunction("cancelDownload") { () -> Bool in
      GemmaDownloader.shared.cancel()
      return true
    }

    AsyncFunction("deleteModel") { (filename: String) -> Bool in
      guard let u = ModelStore.installed(filename: filename) else { return false }
      #if canImport(MediaPipeTasksGenAI)
      GemmaEngine.shared.reset()
      #endif
      return (try? FileManager.default.removeItem(at: u)) != nil
    }

    // "available" | "modelNotReady" | "unsupported"
    AsyncFunction("availability") { () -> String in
      #if canImport(MediaPipeTasksGenAI)
      return modelPath() != nil ? "available" : "modelNotReady"
      #else
      return "unsupported"
      #endif
    }

    // Everything needed to tell the failure modes apart from JS, without a
    // native rebuild. `availability()` only says the file EXISTS; it does not
    // load the engine, so "available" is not proof that inference runs. This
    // reports what is actually on disk and how much memory the process may
    // still claim, which is the number that decides whether a ~3GB model
    // survives on a 6GB A16 with the increased-memory-limit entitlement.
    AsyncFunction("diagnostics") { () -> [String: Any] in
      var out: [String: Any] = [:]
      #if canImport(MediaPipeTasksGenAI)
      out["mediapipeLinked"] = true
      out["lastError"] = GemmaEngine.shared.lastError as Any
      out["backendUsed"] = GemmaEngine.shared.backendUsed
      #else
      out["mediapipeLinked"] = false
      out["lastError"] = "MediaPipeTasksGenAI not compiled into this binary"
      out["backendUsed"] = "none"
      #endif
      if let path = modelPath() {
        out["modelPath"] = path
        let attrs = try? FileManager.default.attributesOfItem(atPath: path)
        out["modelBytes"] = (attrs?[.size] as? NSNumber)?.int64Value ?? -1
      } else {
        out["modelPath"] = NSNull()
        out["modelBytes"] = -1
      }
      out["availableMemoryBytes"] = Int64(os_proc_available_memory())
      out["physicalMemoryBytes"] = Int64(ProcessInfo.processInfo.physicalMemory)
      return out
    }

    // Load the weights so the first turn doesn't pay cold-start latency. The
    // JS side calls this when the session screen mounts.
    AsyncFunction("prewarm") { (maxTokens: Int, backend: String) -> Bool in
      #if canImport(MediaPipeTasksGenAI)
      return GemmaEngine.shared.warm(maxTokens: maxTokens, backend: backend)
      #else
      return false
      #endif
    }

    // Drop the resident engine, so CPU and GPU can be timed back to back in
    // one session instead of across two app launches (which would confound the
    // comparison with cold-vs-warm page cache).
    AsyncFunction("reset") { () -> Bool in
      #if canImport(MediaPipeTasksGenAI)
      GemmaEngine.shared.reset()
      return true
      #else
      return false
      #endif
    }

    // One generation. Never throws — returns a result object the JS side maps
    // onto the scripted fallback:
    //   { ok: true,  text: String, latencyMs: Int }
    //   { ok: false, failure: "unavailable"|"error", message: String, latencyMs: Int }
    AsyncFunction("generateText") {
      (prompt: String, maxTokens: Int, maxOutputTokens: Int, stopMarkers: [String]) async -> [String: Any] in
      #if canImport(MediaPipeTasksGenAI)
      let started = Date()
      let ms = { Int(Date().timeIntervalSince(started) * 1000) }
      guard modelPath() != nil else {
        return ["ok": false, "failure": "unavailable", "message": "model not bundled", "latencyMs": 0]
      }
      if let r = GemmaEngine.shared.generateStreaming(
        prompt: prompt,
        maxTokens: maxTokens,
        maxOutputTokens: maxOutputTokens,
        stopMarkers: stopMarkers
      ) {
        return [
          "ok": true,
          "text": r.text,
          "latencyMs": r.totalMs,
          // Everything below is what makes a timing interpretable rather than
          // just a number: whether the model stopped on its own or we cut it
          // off, and how many tokens it actually produced.
          "rawChars": r.rawChars,
          "outputTokens": r.outputTokens,
          "chunks": r.chunks,
          "msToFirstToken": r.msToFirstToken,
          "stopReason": r.stopReason,
          "streamMode": r.streamMode,
        ]
      }
      let why = GemmaEngine.shared.lastError ?? "generation failed with no reported error"
      return ["ok": false, "failure": "error", "message": why, "latencyMs": ms()]
      #else
      return ["ok": false, "failure": "unavailable", "message": "MediaPipe not linked", "latencyMs": 0]
      #endif
    }
  }
}
