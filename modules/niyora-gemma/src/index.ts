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
//
// Size note: E2B (~3GB) previously jetsam-OOMed the A16 under the default per-app
// memory cap, which is why we briefly shipped the 1B. We now declare the
// increased-memory-limit entitlement (app.json → ios.entitlements) so a 6GB
// device can hold it, and are retrying E2B for real reflection quality. If it
// still OOMs on the A16, fall back to a converted Gemma 2 2B int4 (~1.3GB).

/** The bundled model file. The fetch script writes this name; the Swift side
 *  looks it up in the app bundle. Change both together. */
export const GEMMA_MODEL_FILENAME = 'gemma-3n-E2B-it-int4.task';

/** Total token budget (input + output) the engine is initialised with. CBT
 *  turns are short; a small budget keeps memory down and generation fast. Set
 *  once at prewarm — the engine is loaded once and reused across turns. */
export const GEMMA_MAX_CONTEXT = 512;

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
  async generateText(prompt: string, maxTokens: number): Promise<GemmaTextResult> {
    if (!Native) return { ok: false, failure: 'unavailable', latencyMs: 0 };
    try {
      return await Native.generateText(prompt, maxTokens);
    } catch (e: any) {
      return { ok: false, failure: 'error', message: e?.message ?? String(e), latencyMs: 0 };
    }
  },
};
