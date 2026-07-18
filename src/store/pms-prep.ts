import AsyncStorage from '@react-native-async-storage/async-storage';

// This cycle's preparedness reward — the isolated per-cycle prep state behind
// Neha's story (niyora-pms-preparedness-spec.md, "Reward model"). Deliberately
// SEPARATE from the shipped lifetime moon (src/models/tiers.ts, the light
// ledger): this is the losable, re-earned-each-cycle layer, so it lives in its
// own store and never touches lifetime light. The permanent moon stays intact.
//
// Keyed by the cycle anchor (the last period start), so a new cycle reads as a
// clean, fresh prep with nothing done yet — "new month, new prep", the natural
// wane, never "you lost your rings". Stays entirely on device.
//
//   fullness  — this cycle's engagement (opened the app / did the story)
//   rings     — story completion: the correct kit items she banked this cycle
//   readiness — the one number the Now card surfaces, a generous non-zero floor

export type PrepState = {
  // The cycle this prep belongs to (the period anchor, or 'no-cycle' when none
  // is logged yet). A mismatch on read means a new cycle → fresh prep.
  cycleKey: string;
  // Chapter ids finished this cycle.
  chaptersDone: string[];
  // Kit item ids she banked this cycle (only correct items are stored). These
  // are her checklist and the rings that land on the payoff.
  kitChosen: string[];
  // True once she has opened the story this cycle — engagement, for fullness.
  engaged: boolean;
};

const STORAGE_KEY = 'niyora:pms-prep';

// The prep moon carries up to four rings (the four preparedness elements the
// spec composes readiness from: notice, food, remember, heads-up). Story 1's
// four correct kit items map one-to-one, so a fully built kit lands all four.
export const PREP_RINGS_TOTAL = 4;

// Readiness never reads zero: tracking your cycle already counts, so the score
// carries one free segment as a generous, non-judgmental floor. Fresh cycle =
// 1/(1+4) = 20%; a fully built kit = 5/5 = 100%.
const READINESS_BASELINE = 1;

// Warm ring hues for the prep band (kept distinct from the lifetime SOUL_RING
// hues so the two systems never read as the same rings): rose, amber, violet,
// blue — the "getting ready" palette landing together on the payoff.
export const PREP_RING_HUES: readonly number[] = [335, 45, 280, 210];

export function noCycleKey(): string {
  return 'no-cycle';
}

// The cycle key for a given period anchor. null anchor (no period logged) still
// gets a usable, stable key so the story is playable before onboarding.
export function cycleKeyFor(lastPeriodStart: string | null | undefined): string {
  return lastPeriodStart && lastPeriodStart.length > 0 ? lastPeriodStart : noCycleKey();
}

export function freshPrep(cycleKey: string): PrepState {
  return { cycleKey, chaptersDone: [], kitChosen: [], engaged: false };
}

// Parse stored prep for a cycle. Anything from a different cycle resets to fresh
// (the natural wane into a new cycle), so old rings never linger into a new one.
export function parsePrep(raw: string | null, cycleKey: string): PrepState {
  if (!raw) return freshPrep(cycleKey);
  try {
    const parsed = JSON.parse(raw) as Partial<PrepState>;
    if (parsed == null || typeof parsed !== 'object' || parsed.cycleKey !== cycleKey) {
      return freshPrep(cycleKey);
    }
    const chaptersDone = Array.isArray(parsed.chaptersDone)
      ? parsed.chaptersDone.filter((x): x is string => typeof x === 'string')
      : [];
    const kitChosen = Array.isArray(parsed.kitChosen)
      ? parsed.kitChosen.filter((x): x is string => typeof x === 'string')
      : [];
    return { cycleKey, chaptersDone, kitChosen, engaged: parsed.engaged === true };
  } catch {
    return freshPrep(cycleKey);
  }
}

export async function getPrep(cycleKey: string): Promise<PrepState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parsePrep(raw, cycleKey);
}

export async function setPrep(state: PrepState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Mark the app opened / story entered this cycle — enough on its own to lift the
// moon off its half-lit resting state (spec: "opens the app and does anything").
export async function markEngaged(cycleKey: string): Promise<PrepState> {
  const state = await getPrep(cycleKey);
  if (state.engaged) return state;
  const next = { ...state, engaged: true };
  await setPrep(next);
  return next;
}

// Bank a finished chapter and the kit items she chose (correct-only ids). Idempotent
// per chapter/item, so replaying the story never double-counts. Returns the new
// state so the caller can drive the payoff off it.
export async function recordChapterComplete(
  cycleKey: string,
  chapterId: string,
  chosenKitIds: readonly string[],
): Promise<PrepState> {
  const state = await getPrep(cycleKey);
  const chaptersDone = state.chaptersDone.includes(chapterId)
    ? state.chaptersDone
    : [...state.chaptersDone, chapterId];
  const kitChosen = [...state.kitChosen];
  for (const id of chosenKitIds) {
    if (!kitChosen.includes(id)) kitChosen.push(id);
  }
  const next: PrepState = { cycleKey, chaptersDone, kitChosen, engaged: true };
  await setPrep(next);
  return next;
}

// --- Derivations (pure, unit-tested) ----------------------------------------

// Rings landed this cycle = the kit items she banked, capped at the band width.
export function prepRingCount(state: PrepState): number {
  return Math.min(PREP_RINGS_TOTAL, state.kitChosen.length);
}

// This cycle's engagement, as the moon's fullness (0..1). Untouched = half-lit
// (the resting "haven't opened it yet" moon, never dark/dead); engaged lifts it;
// a finished story fills it. The waxing is the cue, never a punishment.
export function prepFullness(state: PrepState): number {
  if (state.chaptersDone.length > 0) return 1;
  if (state.engaged) return 0.75;
  return 0.5;
}

// The one number the Now card surfaces, 0..1. Generous non-zero floor so it
// never reads as "you're failing", climbing to 1 as she builds her kit.
export function prepReadiness(state: PrepState): number {
  const rings = prepRingCount(state);
  return (READINESS_BASELINE + rings) / (READINESS_BASELINE + PREP_RINGS_TOTAL);
}
