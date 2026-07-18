// The provider seam for the Rough Moment CBT session. `rough-moment.tsx` talks
// only to this file; it does not know or care which on-device model answered.
//
// Provider order:
//   1. Gemma (niyora-gemma / LiteRT-LM) — runs on the GPU with no Apple
//      Intelligence and no A17, so it works on the A16 test phone. First choice.
//   2. Apple Foundation Models (niyora-fm) — only on iOS 26 + eligible silicon.
//   3. none — neither is available; every turn returns `unavailable` and the
//      screen renders its scripted line. The session still reads complete.
//
// The two native modules are deliberately dumb. This file owns everything model-
// specific in TypeScript so it can iterate without a native rebuild: for Gemma
// that means composing the prompt (Apple FM does guided output natively; Gemma
// does not) and tolerantly parsing its free text back into { prose, chips }.

import { NiyoraFm, isFmLinked, type FmTurnResult } from 'niyora-fm';
import { NiyoraGemma, isGemmaLinked, GEMMA_MAX_CONTEXT } from 'niyora-gemma';

import { composeGemmaPrompt, parseGemmaTurn } from '@/lib/reflect-model-parse';

/** One turn result, in the exact shape rough-moment already consumes. */
export type ReflectTurnResult = FmTurnResult;

export type ReflectProvider = 'gemma' | 'fm' | 'none';
type Provider = ReflectProvider;

// Last-turn telemetry for the dev overlay (rough-moment). Not used in the store
// build — the overlay is gated on __DEV__. Updated on prewarm and every turn.
export interface ReflectDebug {
  provider: Provider;
  lastLatencyMs: number | null;
  lastOk: boolean | null;
  lastFailure: string | null;
}
let debug: ReflectDebug = {
  provider: 'none',
  lastLatencyMs: null,
  lastOk: null,
  lastFailure: null,
};

/** Snapshot of the last provider/turn, for the dev overlay only. */
export function reflectDebug(): ReflectDebug {
  return debug;
}

// Resolved once per session — the set of linked modules is static for a build,
// and availability (e.g. Apple Intelligence being on) is stable within a
// session. Cached so every turn doesn't re-probe the native layer.
let resolved: Provider | null = null;

async function resolveProvider(): Promise<Provider> {
  if (resolved) return resolved;
  if (isGemmaLinked && (await NiyoraGemma.availability()) === 'available') {
    resolved = 'gemma';
  } else if (isFmLinked && (await NiyoraFm.availability()) === 'available') {
    resolved = 'fm';
  } else {
    resolved = 'none';
  }
  debug.provider = resolved;
  return resolved;
}

/** Test seam: forget the cached provider so the next call re-resolves. */
export function _resetReflectProvider(): void {
  resolved = null;
}

// --- Provider API (what rough-moment calls) -------------------------------

const TIMEOUT = Symbol('timeout');

async function withDeadline<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function generateGemma(
  instructions: string,
  prompt: string,
  wantChips: boolean,
  timeoutMs: number,
): Promise<ReflectTurnResult> {
  const full = composeGemmaPrompt(instructions, prompt, wantChips);
  const raced = await withDeadline(
    NiyoraGemma.generateText(full, GEMMA_MAX_CONTEXT),
    timeoutMs,
  );
  if (raced === TIMEOUT) return { ok: false, failure: 'timeout', latencyMs: timeoutMs };
  if (!raced.ok) return { ok: false, failure: raced.failure, message: raced.message, latencyMs: raced.latencyMs };
  const parsed = parseGemmaTurn(raced.text, wantChips);
  if (!parsed) {
    return { ok: false, failure: 'error', message: 'unparseable output', latencyMs: raced.latencyMs };
  }
  return { ok: true, prose: parsed.prose, chips: parsed.chips, latencyMs: raced.latencyMs };
}

export const ReflectModel = {
  /** Warm whichever provider will answer, so the first turn isn't cold. */
  async prewarm(): Promise<void> {
    const provider = await resolveProvider();
    if (provider === 'gemma') await NiyoraGemma.prewarm();
    else if (provider === 'fm') await NiyoraFm.prewarm();
  },

  /** One bounded turn, in the shape rough-moment consumes. Never throws. */
  async generate(
    instructions: string,
    prompt: string,
    wantChips: boolean,
    timeoutMs = 5000,
  ): Promise<ReflectTurnResult> {
    const provider = await resolveProvider();
    let result: ReflectTurnResult;
    if (provider === 'gemma') result = await generateGemma(instructions, prompt, wantChips, timeoutMs);
    else if (provider === 'fm') result = await NiyoraFm.generate(instructions, prompt, wantChips, timeoutMs);
    else result = { ok: false, failure: 'unavailable', latencyMs: 0 };
    debug = {
      provider,
      lastLatencyMs: result.latencyMs,
      lastOk: result.ok,
      lastFailure: result.ok ? null : result.failure,
    };
    return result;
  },
};
