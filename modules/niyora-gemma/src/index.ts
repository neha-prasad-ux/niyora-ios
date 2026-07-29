import { requireNativeModule } from 'expo-modules-core';

// Thin transport to an on-device Gemma model via LiteRT-LM (MediaPipe
// `LlmInference`). Deliberately dumb, exactly like niyora-fm: it knows nothing
// about CBT, beats, prompts, or JSON shaping. It takes one fully-composed text
// prompt and returns raw generated text. All protocol content and all output
// parsing live in TypeScript (src/lib/reflect-model.ts + rough-moment-content),
// so the session copy and the chip/JSON format iterate without a native
// rebuild. The JS side owns the timeout and the scripted fallback.
//
// Unlike Apple Foundation Models, Gemma runs on the GPU/CPU and needs no Apple
// Intelligence and no A17 — so this is the provider that runs on the A16 test
// phone. The model file (~3GB, gemma-3n-E2B int4) is bundled into the app at
// build time (see modules/niyora-gemma/scripts/fetch-model.mjs); nothing is
// downloaded on the user's device and nothing leaves it.

/** The bundled model file. The fetch script writes this name; the Swift side
 *  looks it up in the app bundle. Change both together. */
// The fine-tuned Gemma 4, INT4. Keep in sync with kLiteRtResource in
// ios/NiyoraGemmaModule.swift and MODEL_FILENAME in scripts/fetch-model.mjs.
export const GEMMA_MODEL_FILENAME = 'niyora-gemma4-e2b-v4-wide-deduped-int4.litertlm';

/** Total token budget (input + output) the engine is initialised with, i.e.
 *  the kv-cache size. Every token of cache is resident memory, so this is a
 *  real cost, but 512 was too tight: in an on-device sweep (2026-07-27, A16)
 *  stock Gemma 4 failed to generate at 512 and generated at 2048. Keep it at
 *  2048 unless something forces it down.
 *
 *  There is a CEILING too, on the other side: LiteRT #6765 reports Gemma 4 on
 *  iOS arm64 returning nil at 8192 and crashing at 16384+, stable at 4096. So
 *  the usable window is roughly 2048-4096. */
export const GEMMA_MAX_CONTEXT = 2048;

/** Why the on-device model can or cannot run right now. */
export type GemmaAvailability =
  | 'available' // model file present and the engine initialised
  | 'modelNotReady' // module linked but the .task file isn't in the bundle
  | 'unsupported'; // MediaPipe not compiled into this binary (or non-iOS)

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

  /**
   * Diagnostic: override the engine knobs and drop any resident engine.
   * `maxTokens <= 0` restores the caller-supplied value.
   */
  async setRuntimeConfig(maxTokens: number, useGpu: boolean): Promise<boolean> {
    if (!Native?.setRuntimeConfig) return false;
    try {
      return await Native.setRuntimeConfig(maxTokens, useGpu);
    } catch {
      return false;
    }
  },

  /**
   * Load a specific file from the models directory instead of the default
   * fine-tune. Drops any resident engine first. Pass '' to restore the
   * default. Diagnostic: lets one binary compare our export against a stock
   * model on the same device.
   */
  async setActiveModel(filename: string): Promise<boolean> {
    if (!Native?.setActiveModel) return false;
    try {
      return await Native.setActiveModel(filename);
    } catch {
      return false;
    }
  },

  /** Mirror a JS line into the native NSLog stream, so a device console
   *  capture carries the whole picture rather than only the native half. */
  async note(s: string): Promise<void> {
    if (!Native?.note) return;
    try {
      await Native.note(s);
    } catch {
      // Diagnostics must never break the thing they are diagnosing.
    }
  },

  /**
   * The reason the last load or generation failed, or '' when none. Every
   * failure inside the engine is a caught Swift error that would otherwise
   * collapse into `modelNotReady`, which is the same thing an absent file
   * reports -- so without this a broken model and a missing model look
   * identical from JS.
   */
  async lastError(): Promise<string> {
    if (!Native?.lastError) return '';
    try {
      return await Native.lastError();
    } catch {
      return '';
    }
  },

  /** What is actually on disk, and which file the resolver picked. */
  async modelFiles(): Promise<{
    resolvedPath?: string;
    liteRtPath?: string;
    directory?: string;
    files?: { name: string; size: number }[];
  }> {
    if (!Native?.modelFiles) return {};
    try {
      return await Native.modelFiles();
    } catch {
      return {};
    }
  },

  /** Which runtime answered: 'litertlm', 'mediapipe', or 'none'. */
  async backendName(): Promise<string> {
    if (!Native?.backendName) return 'none';
    try {
      return await Native.backendName();
    } catch {
      return 'none';
    }
  },

  /**
   * Warm the engine (load weights into memory) when the session screen mounts,
   * so the first turn doesn't pay the multi-second cold-start and fall back to
   * the scripted line. Returns true once the engine is resident.
   */
  async prewarm(maxTokens: number = GEMMA_MAX_CONTEXT): Promise<boolean> {
    return Native ? Native.prewarm(maxTokens) : false;
  },

  /**
   * One raw generation for a fully-composed prompt. Never throws — returns a
   * result object the caller maps onto the scripted fallback. No timeout here;
   * the caller (reflect-model) races it against a deadline so a slow model
   * degrades to the scripted line instead of a hung conversation.
   */
  /** Drop the engine and give ~2.6 GB back. Safe to call when not loaded. */
  async release(): Promise<void> {
    if (!Native) return;
    try {
      await Native.release();
    } catch {
      // Releasing memory must never surface an error to the session.
    }
  },

  async generateText(
    prompt: string,
    maxTokens: number,
    // The instruction block, passed SEPARATELY rather than glued to the front
    // of the prompt. LiteRT-LM applies the model's own chat template (baked
    // into the .litertlm) around roled messages, so a system string becomes a
    // real system turn -- which is how the corpus was trained. Flattening it
    // into the user turn is off-distribution from training. The MediaPipe path
    // has no role concept and prepends, which is one more reason LiteRT-LM is
    // preferred rather than merely newer.
    system?: string,
  ): Promise<GemmaTextResult> {
    if (!Native) return { ok: false, failure: 'unavailable', latencyMs: 0 };
    try {
      return await Native.generateText(prompt, maxTokens, system ?? null);
    } catch (e: any) {
      return { ok: false, failure: 'error', message: e?.message ?? String(e), latencyMs: 0 };
    }
  },
};
