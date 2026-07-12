import type { RemissionAnswer } from '@/store/remission-log';

// The moon reward system (moon-reward-spec.md is the contract). One currency
// (light) earned by acts of different depth; two axes on the Now-tab moon:
// fullness (current engagement — waxes with rings and light, wanes with
// absence, floors at a sliver) and material (lifetime mastery — moonstone →
// gold → opal → diamond, monotonic, never lost). Pure functions only; the
// stores (light-ledger, moon-state) persist and compose.

export type LightKind = 'visit' | 'calm' | 'train' | 'recall' | 'notice' | 'apply';

export type LightEvent = {
  date: string; // local YYYY-MM-DD
  kind: LightKind;
  amount: number; // light granted at append time, after caps — immutable after
  refId?: string; // levelId / skillId / techniqueId
  matchedAction?: boolean; // earned as today's coached action (the ×1.5)
};

export type MoonMaterial = 'moonstone' | 'gold' | 'opal' | 'diamond';

export type MintedMoon = {
  cycleStart: string; // YYYY-MM-DD, the previous period start
  cycleEnd: string; // YYYY-MM-DD, the confirmed new start (exclusive)
  fullness: number; // weighted share of key days engaged, 0..1
  clarity: RemissionAnswer | null; // the cycle's remission answer, if given
  material: MoonMaterial; // tier at mint time
  kept: boolean; // fullness >= CYCLE_KEPT_MIN
};

export type MoonState = {
  fullness: number; // brightness, DIM_FLOOR..FULLNESS_MAX — bright by default
  material: MoonMaterial;
  facets: number; // post-diamond kept cycles, cosmetic only
  shelf: MintedMoon[]; // one minted moon per confirmed cycle
};

// --- Earning light ---------------------------------------------------------

// The gradient mirrors depth of change: showing up < doing < learning <
// remembering < seeing it in your own life < changing the moment.
export const LIGHT_BASE: Record<LightKind, number> = {
  visit: 5,
  calm: 15,
  train: 20,
  recall: 25,
  notice: 30,
  apply: 40,
};

export const CALM_REPEAT_LIGHT = 5; // 2nd calm of the day; 3rd+ earns none
export const NOTICE_APPLY_DAILY_MAX = 2;
export const MATCHED_MULTIPLIER = 1.5; // doing the coached action, rounded up
export const DAILY_LIGHT_CAP = 100; // binge days can't substitute for rhythm

/**
 * Light for one act, given what today already earned. Zero means "welcome,
 * but no light": repeat visits, third calms, capped days. Self-ratings never
 * reach this function — reflecting is the rewarded act, not the grade.
 */
export function earnLight(input: {
  kind: LightKind;
  todaysEvents: LightEvent[];
  matchedAction: boolean;
}): number {
  const { kind, todaysEvents, matchedAction } = input;
  const countToday = (k: LightKind) => todaysEvents.filter((e) => e.kind === k).length;

  let base = LIGHT_BASE[kind];
  if (kind === 'visit' && countToday('visit') >= 1) return 0;
  if (kind === 'calm') {
    const calms = countToday('calm');
    if (calms >= 2) return 0;
    if (calms === 1) base = CALM_REPEAT_LIGHT;
  }
  if ((kind === 'notice' || kind === 'apply') && countToday(kind) >= NOTICE_APPLY_DAILY_MAX) {
    return 0;
  }

  const amount = matchedAction ? Math.ceil(base * MATCHED_MULTIPLIER) : base;
  const spentToday = todaysEvents.reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, Math.min(amount, DAILY_LIGHT_CAP - spentToday));
}

// --- Brightness: bright by default ---------------------------------------------

// The moon is bright for everyone, always — brightness is not a meter to farm,
// and absence never dims it. Continuous decay proved forgettable and
// unmeasurable; the discrete layers (rings, material, the shelf) carry
// progression instead. Brightness dims one step per fading lesson — a recall
// left past its grace — and restores the moment she refreshes, so a dim moon
// is never a punishment, only a gentle "something wants remembering".
export const FULLNESS_MAX = 1;
export const DIM_FLOOR = 0.4; // clearly lit even at its dimmest — never a dark sky
export const DIM_PER_FADING = 0.15;

export const DEFAULT_MOON_STATE: MoonState = {
  fullness: FULLNESS_MAX,
  material: 'moonstone',
  facets: 0,
  shelf: [],
};

export function clampBrightness(n: number): number {
  return Math.max(DIM_FLOOR, Math.min(FULLNESS_MAX, n));
}

/** Brightness for a given number of fading lessons (see fadingRecalls). */
export function moonBrightness(fadingCount: number): number {
  return clampBrightness(FULLNESS_MAX - fadingCount * DIM_PER_FADING);
}

export function withBrightness(state: MoonState, brightness: number): MoonState {
  const b = clampBrightness(brightness);
  return state.fullness === b ? state : { ...state, fullness: b };
}

// --- Rings: the first two weeks ------------------------------------------------

// Chapter one of the reward journey: every act advances the ring band, so the
// fragile first days always have something visibly growing. Denominated in the
// same light as everything else — no parallel currency. The names carry over
// from the original Soul tiers; the thresholds are tuned so a typical engaged
// day (~50 light) rings on day one, ~day 3, ~week one, and ~week two.
// Rings are permanent (like material, never lost) and gate NOTHING — every
// technique is always available; rewards celebrate, they never gate care.
export const RINGS = [
  { id: 'spark', name: 'Spark', light: 20 },
  { id: 'glow', name: 'Glow', light: 100 },
  { id: 'shine', name: 'Shine', light: 300 },
  { id: 'radiance', name: 'Radiance', light: 600 },
] as const;

export type RingId = (typeof RINGS)[number]['id'];

export function ringsEarned(lifetimeLight: number): number {
  return RINGS.filter((r) => lifetimeLight >= r.light).length;
}

/**
 * The fourth ring fuses the band into the soul halo — the graduation ceremony
 * — and only then is the moon's material story revealed. The last ring (600)
 * sits just under the gold gate (800) so the handoff has no dead zone: light
 * already earned immediately counts toward the next thing.
 */
export function soulEarned(lifetimeLight: number): boolean {
  return ringsEarned(lifetimeLight) >= RINGS.length;
}

// --- Material: the lifetime ladder -------------------------------------------

export type LedgerTotals = {
  lifetimeLight: number;
  recognitions: number; // notice events
  applications: number; // apply events
  skillsLived: number; // distinct skills with >=1 apply
  skillsSolid: number; // levels with both recalls passed
};

export function foldLedger(events: LightEvent[]): LedgerTotals {
  let lifetimeLight = 0;
  let recognitions = 0;
  let applications = 0;
  const lived = new Set<string>();
  const recallsByLevel = new Map<string, number>();
  for (const e of events) {
    lifetimeLight += e.amount;
    if (e.kind === 'notice') recognitions++;
    if (e.kind === 'apply') {
      applications++;
      if (e.refId != null) lived.add(e.refId);
    }
    if (e.kind === 'recall' && e.refId != null) {
      recallsByLevel.set(e.refId, (recallsByLevel.get(e.refId) ?? 0) + 1);
    }
  }
  let skillsSolid = 0;
  for (const count of recallsByLevel.values()) if (count >= 2) skillsSolid++;
  return { lifetimeLight, recognitions, applications, skillsLived: lived.size, skillsSolid };
}

// Depth gates, not volume gates: light alone can never reach opal or diamond.
// Diamond means the skills live outside the app.
export const MATERIAL_GATES = {
  gold: { light: 800, cyclesKept: 1 },
  opal: { light: 2500, skillsSolid: 3, recognitions: 5 },
  diamond: { light: 6000, cyclesKept: 3, skillsLived: 3, applications: 10 },
} as const;

// The material ladder, in order — moonstone (level 1) to diamond (level 4).
// The You tab's scoreboard reads a level number and total off this.
export const MATERIAL_ORDER: readonly MoonMaterial[] = ['moonstone', 'gold', 'opal', 'diamond'];

/** 1-based position on the ladder (moonstone = 1 … diamond = 4). */
export function materialLevel(material: MoonMaterial): number {
  return MATERIAL_ORDER.indexOf(material) + 1;
}

export function deriveMaterial(totals: LedgerTotals, cyclesKept: number): MoonMaterial {
  const d = MATERIAL_GATES.diamond;
  if (
    totals.lifetimeLight >= d.light &&
    cyclesKept >= d.cyclesKept &&
    totals.skillsLived >= d.skillsLived &&
    totals.applications >= d.applications
  ) {
    return 'diamond';
  }
  const o = MATERIAL_GATES.opal;
  if (
    totals.lifetimeLight >= o.light &&
    totals.skillsSolid >= o.skillsSolid &&
    totals.recognitions >= o.recognitions
  ) {
    return 'opal';
  }
  const g = MATERIAL_GATES.gold;
  if (totals.lifetimeLight >= g.light && cyclesKept >= g.cyclesKept) return 'gold';
  return 'moonstone';
}

/** Material is monotonic: the derived tier can only ever raise the current one. */
export function withMaterial(state: MoonState, totals: LedgerTotals): MoonState {
  const derived = deriveMaterial(totals, cyclesKept(state.shelf));
  const material =
    MATERIAL_ORDER.indexOf(derived) > MATERIAL_ORDER.indexOf(state.material)
      ? derived
      : state.material;
  return material === state.material ? state : { ...state, material };
}

export function cyclesKept(shelf: MintedMoon[]): number {
  return shelf.filter((m) => m.kept).length;
}

// --- Recall scheduling ("remember") ------------------------------------------

export const RECALL_FIRST_DAYS = 2;
export const RECALL_SECOND_DAYS = 7;
export const FADE_GRACE_DAYS = 3; // a due recall dims nothing for this long

export type DueRecall = { levelId: string; stage: 1 | 2 };

function recallsAt(events: LightEvent[], todayYmd: string, slack: number): DueRecall[] {
  const due: DueRecall[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (e.kind !== 'train' || e.refId == null || seen.has(e.refId)) continue;
    seen.add(e.refId);
    const age = daysBetween(e.date, todayYmd);
    if (age == null) continue;
    const recalls = events.filter((r) => r.kind === 'recall' && r.refId === e.refId).length;
    if (recalls === 0 && age >= RECALL_FIRST_DAYS + slack) {
      due.push({ levelId: e.refId, stage: 1 });
    } else if (recalls === 1 && age >= RECALL_SECOND_DAYS + slack) {
      due.push({ levelId: e.refId, stage: 2 });
    }
  }
  return due;
}

/**
 * Spaced recall, scheduled straight off the ledger: a level's `train` event is
 * its completion record, so recalls come due 2 and 7 days later. A miss simply
 * stays due — no penalty, no expiry.
 */
export function dueRecalls(events: LightEvent[], todayYmd: string): DueRecall[] {
  return recallsAt(events, todayYmd, 0);
}

/**
 * The lessons that are fading: recalls left unanswered past their grace.
 * Each one dims the moon a step (moonBrightness); answering restores it
 * immediately — "not knowing answers" is the only thing that ever dims light.
 */
export function fadingRecalls(events: LightEvent[], todayYmd: string): DueRecall[] {
  return recallsAt(events, todayYmd, FADE_GRACE_DAYS);
}

// --- Cycle mint (the bridge to the shelf) -------------------------------------

export const CYCLE_KEPT_MIN = 0.6;
export const KEY_DAY_WEIGHT = 2; // window + prep days count double
export const KEY_DAY_SPAN = 14; // the last 14 days of the cycle are the key days

/**
 * At period confirmation the cycle becomes a shelf moon: fullness is the
 * weighted share of days she engaged (any light that day), with the 14 days
 * before the period — prep + window — counting double, because those are the
 * days the app exists for.
 */
export function mintCycleMoon(input: {
  cycleStartYmd: string;
  cycleEndYmd: string; // exclusive: the new period's first day
  engagedDates: ReadonlySet<string>;
  clarity: RemissionAnswer | null;
  material: MoonMaterial;
}): MintedMoon | null {
  const start = ymdToDay(input.cycleStartYmd);
  const end = ymdToDay(input.cycleEndYmd);
  if (start == null || end == null || end <= start) return null;
  let weightSum = 0;
  let engagedSum = 0;
  for (let d = start; d < end; d++) {
    const weight = end - d <= KEY_DAY_SPAN ? KEY_DAY_WEIGHT : 1;
    weightSum += weight;
    if (input.engagedDates.has(dayToYmd(d))) engagedSum += weight;
  }
  const fullness = weightSum === 0 ? 0 : engagedSum / weightSum;
  return {
    cycleStart: input.cycleStartYmd,
    cycleEnd: input.cycleEndYmd,
    fullness,
    clarity: input.clarity,
    material: input.material,
    kept: fullness >= CYCLE_KEPT_MIN,
  };
}

/** Append a minted moon; a kept cycle at diamond adds a facet (cosmetic only). */
export function applyMint(state: MoonState, minted: MintedMoon): MoonState {
  if (state.shelf.some((m) => m.cycleEnd === minted.cycleEnd)) return state;
  return {
    ...state,
    shelf: [...state.shelf, minted],
    facets: state.material === 'diamond' && minted.kept ? state.facets + 1 : state.facets,
  };
}

export function engagedDatesFrom(events: LightEvent[]): Set<string> {
  return new Set(events.map((e) => e.date));
}

// --- Local-day helpers --------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function localYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ymdToDay(ymd: string): number | null {
  const m = YMD.exec(ymd);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

export function dayToYmd(day: number): string {
  const d = new Date(day * MS_PER_DAY);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${dd}`;
}

/** Whole days from a to b (positive when b is later); null on junk input. */
export function daysBetween(a: string, b: string): number | null {
  const da = ymdToDay(a);
  const db = ymdToDay(b);
  if (da == null || db == null) return null;
  return db - da;
}
