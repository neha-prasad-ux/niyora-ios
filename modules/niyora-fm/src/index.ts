import { requireNativeModule } from 'expo-modules-core';

/** Why the on-device model can or cannot run right now. */
export type FmAvailability =
  | 'available'
  | 'deviceNotEligible'
  | 'appleIntelligenceNotEnabled'
  | 'modelNotReady'
  | 'unavailable'
  | 'unsupported';

/** One generated turn, or the reason it failed (mapped to a scripted fallback). */
export type FmTurnResult =
  | { ok: true; prose: string; chips?: string[]; latencyMs: number }
  | {
      ok: false;
      failure: 'guardrail' | 'overflow' | 'unavailable' | 'error' | 'timeout';
      message?: string;
      latencyMs: number;
    };

// Load defensively: if the native module isn't in this binary, fall back to a
// no-op so the app still runs with the session simply scripted-only (mirrors
// the pattern in niyora-health / niyora-sync).
let Native: any = null;
try {
  Native = requireNativeModule('NiyoraFm');
} catch {
  Native = null;
}

/** True when the native Foundation Models module is available in this build. */
export const isFmLinked = Native !== null;

export const NiyoraFm = {
  /** Session-start state: can the model run, and if not, why. */
  async availability(): Promise<FmAvailability> {
    return Native ? Native.availability() : 'unsupported';
  },

  /**
   * Warm the model. Call when the session screen mounts so the first turn
   * (the "feel heard" beat) doesn't pay cold-start latency.
   */
  async prewarm(): Promise<boolean> {
    return Native ? Native.prewarm() : false;
  },

  /**
   * One bounded turn. `timeoutMs` is enforced here (the native call is not
   * cancelled, but its result is discarded) so a slow model degrades to the
   * scripted line instead of a hung conversation.
   */
  async generate(
    instructions: string,
    prompt: string,
    wantChips: boolean,
    timeoutMs = 5000,
  ): Promise<FmTurnResult> {
    if (!Native) return { ok: false, failure: 'unavailable', latencyMs: 0 };
    const call: Promise<FmTurnResult> = Native.generate(instructions, prompt, wantChips);
    const timeout = new Promise<FmTurnResult>((resolve) => {
      setTimeout(() => resolve({ ok: false, failure: 'timeout', latencyMs: timeoutMs }), timeoutMs);
    });
    try {
      return await Promise.race([call, timeout]);
    } catch (e: any) {
      return { ok: false, failure: 'error', message: e?.message ?? String(e), latencyMs: 0 };
    }
  },
};
