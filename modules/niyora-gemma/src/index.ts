import { requireNativeModule } from 'expo-modules-core';

// Thin transport to an on-device Gemma model via LiteRT-LM (MediaPipe
// `LlmInference`). Deliberately dumb, exactly like niyora-fm: it knows nothing
// about CBT, beats, prompts, or JSON shaping. It takes one fully-composed text
// prompt and returns raw generated text. All protocol content and all output
// parsing live in TypeScript (src/lib/reflect-model.ts + rough-moment-content),
// so the session copy and the chip/JSON format iterate without a native
// rebuild. The JS side owns the timeout and the scripted fallback.
//
// Unlike Apple Foundation Models, Gemma needs no Apple Intelligence and no A17,
// so this is the provider that runs on the A16 test phone.
//
// The model is DOWNLOADED at runtime into Application Support, not bundled: a
// bundled 3GB model made the install 3.1GB and turned "try a different model"
// into a full rebuild and reinstall. `setActiveModel()` + `downloadModel()`
// make it a download instead. A bundled file is still honoured as a fallback.
// The download is the only network call this module makes; a session never
// sends anything anywhere.
//
// CORRECTED 2026-07-25: this comment used to say "Gemma runs on the GPU/CPU".
// Do not restore that. `export-decisions.md` established that the `.task` path
// is CPU-only in practice, and the backend is in fact SELECTABLE (see
// `GemmaBackend`) rather than automatically GPU. State which backend was
// actually used; never assert GPU without a measurement.
//
// Size note: E2B (~3GB) previously jetsam-OOMed the A16 under the default
// per-app memory cap, so an UNTUNED 1B was bundled into local dev builds for a
// while instead. It never reached a user (the AI path is gated behind
// EXPO_PUBLIC_REFLECT_AI=1 and store builds leave it unset), and it was never
// our fine-tuned 1B: nothing tuned has ever been on a phone. We now declare the
// increased-memory-limit entitlement (app.json → ios.entitlements), and as of
// 2026-07-25 E2B is CONFIRMED resident and generating on the A16.

/** The bundled model file. The fetch script writes this name; the Swift side
 *  looks it up in the app bundle. Change both together. */
export const GEMMA_MODEL_FILENAME = 'gemma-3n-E2B-it-int4.task';

/** Total token budget (input + output) the engine is initialised with. CBT
 *  turns are short; a small budget keeps memory down and generation fast. Set
 *  once at prewarm — the engine is loaded once and reused across turns. */
export const GEMMA_MAX_CONTEXT = 512;

/** Why the on-device model can or cannot run right now.
 *
 *  NOTE the exact meaning of 'available': the model FILE is present in the
 *  bundle. It does not mean the engine loaded, because availability() does not
 *  load it. Only prewarm() proves the weights fit in memory, and only
 *  generateText() proves a token comes out. Treating 'available' as proof that
 *  inference works is the false pass this module is easiest to get wrong. */
export type GemmaAvailability =
  | 'available' // the .task file is in Bundle.main (engine NOT yet loaded)
  | 'modelNotReady' // module linked but the .task file isn't in the bundle
  | 'unsupported'; // MediaPipe not compiled into this binary (or non-iOS)

/** Which LiteRT backend to ask for. `default` lets the model decide.
 *
 *  NOTE: `ai-briefs/export-decisions.md` disqualified this route partly on
 *  ".task on iOS is CPU-only, GPU isn't exposed through the C API". That is not
 *  true of MediaPipeTasksGenAI 0.10.35, whose C header declares
 *  `LlmPreferredBackend` with a GPU case. Whether GPU actually works for this
 *  model on this chip is measured, not assumed. */
export type GemmaBackend = 'default' | 'gpu' | 'cpu';

/** Raw state for telling failure modes apart on device. `availableMemoryBytes`
 *  is what the process may still claim, which is the number that decides
 *  whether ~3GB of weights survive on a 6GB A16. */
export type GemmaDiagnostics = {
  mediapipeLinked: boolean;
  /** Which LiteRT backend the resident engine was built with, or 'none'. */
  backendUsed: GemmaBackend | 'none';
  lastError: string | null;
  modelPath: string | null;
  modelBytes: number; // -1 when the file is absent
  availableMemoryBytes: number;
  physicalMemoryBytes: number;
};

/** Where the active model file lives right now. `source: 'missing'` means it
 *  has not been downloaded and is not bundled, so the session stays scripted. */
export type GemmaModelState = {
  activeModel: string;
  source: 'downloaded' | 'bundled' | 'missing';
  path: string | null;
  bytes: number;
  downloading: boolean;
};

export type GemmaDownloadProgress = {
  bytesWritten: number;
  bytesTotal: number;
  fraction: number;
};

/** One raw generation, or the reason it failed. Shaping/parsing is the caller's
 *  job — this is just text in, text out. */
export type GemmaTextResult =
  | { ok: true; text: string; latencyMs: number }
  | {
      ok: false;
      failure: 'unavailable' | 'error';
      message?: string;
      latencyMs: number;
    };

// Load defensively: if the native module isn't in this binary, fall back to a
// no-op so the app still runs with the session simply scripted-only (mirrors
// niyora-fm / niyora-health / niyora-sync).
let Native: any = null;
try {
  Native = requireNativeModule('NiyoraGemma');
} catch {
  Native = null;
}

/** True when the native Gemma module is compiled into this build. */
export const isGemmaLinked = Native !== null;

export const NiyoraGemma = {
  /** Session-start state: can the model run, and if not, why. */
  async availability(): Promise<GemmaAvailability> {
    return Native ? Native.availability() : 'unsupported';
  },

  /** Raw on-device state, for the probe screen and for diagnosing a failure
   *  that JS otherwise sees only as `failure: 'error'`. */
  async diagnostics(): Promise<GemmaDiagnostics> {
    if (!Native) {
      return {
        mediapipeLinked: false,
        backendUsed: 'none',
        lastError: 'native module not in this binary',
        modelPath: null,
        modelBytes: -1,
        availableMemoryBytes: -1,
        physicalMemoryBytes: -1,
      };
    }
    return Native.diagnostics();
  },

  /**
   * Warm the engine (load weights into memory) when the session screen mounts,
   * so the first turn doesn't pay the multi-second cold-start and fall back to
   * the scripted line. Returns true once the engine is resident.
   */
  async prewarm(
    maxTokens: number = GEMMA_MAX_CONTEXT,
    backend: GemmaBackend = 'default',
  ): Promise<boolean> {
    return Native ? Native.prewarm(maxTokens, backend) : false;
  },

  /** Drop the resident engine so a different backend can be loaded. Dev/eval
   *  only: the shipping path loads once and reuses. */
  async reset(): Promise<boolean> {
    return Native ? Native.reset() : false;
  },

  /** Where the active model file is, and whether it is on disk at all.
   *  Distinct from availability(): this describes the FILE, not whether the
   *  engine can load it. */
  async modelState(): Promise<GemmaModelState> {
    if (!Native) {
      return { activeModel: '', source: 'missing', path: null, bytes: -1, downloading: false };
    }
    return Native.modelState();
  },

  /** Point the engine at a different model file, without a native rebuild.
   *  This is what makes trying a new model a download rather than a release. */
  async setActiveModel(filename: string): Promise<boolean> {
    return Native ? Native.setActiveModel(filename) : false;
  },

  /** Begin fetching the model. Pass `sha256` and `bytes` whenever they are
   *  known: an unverified multi-GB file fails later as an opaque engine error,
   *  which is far harder to diagnose than a refused install.
   *  Wi-Fi only unless `allowCellular` is explicitly true. */
  async downloadModel(opts: {
    url: string;
    filename: string;
    sha256?: string;
    bytes?: number;
    allowCellular?: boolean;
  }): Promise<{ started: boolean; error?: string }> {
    if (!Native) return { started: false, error: 'native module not in this binary' };
    return Native.downloadModel(
      opts.url,
      opts.filename,
      opts.sha256 ?? null,
      opts.bytes ?? null,
      opts.allowCellular ?? false,
    );
  },

  async cancelDownload(): Promise<boolean> {
    return Native ? Native.cancelDownload() : false;
  },

  async deleteModel(filename: string): Promise<boolean> {
    return Native ? Native.deleteModel(filename) : false;
  },

  /** Progress for an in-flight download. Returns an unsubscribe function. */
  onDownloadProgress(cb: (e: GemmaDownloadProgress) => void): () => void {
    if (!Native) return () => {};
    const sub = Native.addListener('onModelDownloadProgress', cb);
    return () => sub.remove();
  },

  /** Terminal result of a download: installed, or why not. */
  onDownloadFinished(cb: (e: { ok: boolean; message: string }) => void): () => void {
    if (!Native) return () => {};
    const sub = Native.addListener('onModelDownloadFinished', cb);
    return () => sub.remove();
  },

  /**
   * One raw generation for a fully-composed prompt. Never throws — returns a
   * result object the caller maps onto the scripted fallback. No timeout here;
   * the caller (reflect-model) races it against a deadline so a slow model
   * degrades to the scripted line instead of a hung conversation.
   */
  async generateText(prompt: string, maxTokens: number): Promise<GemmaTextResult> {
    if (!Native) return { ok: false, failure: 'unavailable', latencyMs: 0 };
    try {
      return await Native.generateText(prompt, maxTokens);
    } catch (e: any) {
      return { ok: false, failure: 'error', message: e?.message ?? String(e), latencyMs: 0 };
    }
  },
};
