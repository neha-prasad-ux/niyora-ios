// Niyora V3 PMS-mode onboarding: copy, sources, and derivation logic.
//
// Ported from the React prototype (niyora/app/src/v3/v3-content.ts). Copy and
// item lists are carried over verbatim. The derivation adds the three decisions
// locked in this session: the level-banding formula, the remission line, and
// the cycle estimate for the next tougher stretch.
//
// Voice rules (hard): no em dashes anywhere, quiet and specific, every
// reassurance pairs with a fact, every blame-lift pairs with agency. See
// DESIGN.md and the V3 spec.
//
// Sourced numbers carry a `source` line and are marked to confirm against the
// research bank before this ships to real users.

import { pmsOffsetDays } from '@/lib/pms-window';

// --- Sources -----------------------------------------------------------
// Each is a claim we surface in the flow. `confirm` flags that the number
// must be checked against Niyora's research bank before release.

export interface Source {
  claim: string;
  citation: string;
  confirm: string;
}

export const SOURCES = {
  calcium: {
    claim: '1200 mg calcium a day cut PMS symptoms by about 48 percent in a trial.',
    citation: 'Thys-Jacobs, randomized trial, 1998.',
    confirm: 'confirm against research bank',
  },
  b6: {
    claim: 'Vitamin B6 made improvement more than twice as likely, up to 100 mg a day.',
    citation: 'Wyatt, BMJ, 1999. Odds ratio 2.32.',
    confirm: 'confirm against research bank',
  },
  exercise: {
    claim: 'Exercise produced a large reduction in symptoms across trials.',
    citation: 'Pearce, 2020.',
    confirm: 'confirm against research bank',
  },
  stress: {
    claim: 'High stress is linked to about 5 times the odds of PMS.',
    citation: 'PLOS One, 2019. Association, not proven cause.',
    confirm: 'confirm against research bank',
  },
  sleep: {
    claim: 'Poor sleep is linked to about 2 times the odds of PMS.',
    citation: 'Sao Paulo Epidemiologic Sleep Study. Association, not proven cause.',
    confirm: 'confirm against research bank',
  },
  // The brain-shifts-across-the-cycle fact. Citation verified via web search
  // this session: title, year, journal, and PubMed PMID 33098847 all confirmed.
  brain: {
    claim: 'The brain changes measurably across the cycle, which is why the feelings are real.',
    citation:
      'Dubol et al., Frontiers in Neuroendocrinology, 2021. Neuroimaging the menstrual cycle, a multimodal systematic review.',
    confirm: 'confirm against research bank',
  },
} satisfies Record<string, Source>;

// --- Question screen: presence ----------------------------------------
// Emotional items first, physical second. No repeats. The four emotional
// anchors used by the banding formula are flagged with `anchor: true`.

export interface PresenceItem {
  id: string;
  label: string;
  kind: 'emotional' | 'physical';
  anchor?: boolean;
}

export const PRESENCE_ITEMS: PresenceItem[] = [
  { id: 'mood_swings', label: 'Mood swings', kind: 'emotional', anchor: true },
  { id: 'tearfulness', label: 'Tearfulness', kind: 'emotional' },
  { id: 'irritability', label: 'Irritability', kind: 'emotional', anchor: true },
  { id: 'anger', label: 'Anger', kind: 'emotional' },
  { id: 'feeling_low', label: 'Feeling low', kind: 'emotional', anchor: true },
  { id: 'hopeless', label: 'Hopeless', kind: 'emotional' },
  { id: 'anxious', label: 'Anxious', kind: 'emotional', anchor: true },
  { id: 'overwhelmed', label: 'Overwhelmed', kind: 'emotional' },
  { id: 'low_energy', label: 'Low energy', kind: 'physical' },
  { id: 'trouble_focusing', label: 'Trouble focusing', kind: 'physical' },
  { id: 'cravings', label: 'Cravings', kind: 'physical' },
  { id: 'sleep_change', label: 'Sleeping more or less', kind: 'physical' },
  { id: 'bloating', label: 'Bloating', kind: 'physical' },
  { id: 'tenderness', label: 'Tenderness', kind: 'physical' },
  { id: 'aches', label: 'Aches', kind: 'physical' },
];

// The four emotional anchors the banding formula looks for: mood swings,
// irritability, feeling low, anxious. Derived from PRESENCE_ITEMS so the list
// stays in one place.
export const ANCHOR_IDS: string[] = PRESENCE_ITEMS.filter((i) => i.anchor).map((i) => i.id);

// --- Question screen: impairment --------------------------------------
// Sliders run 0 (not at all) to 2 (a lot). The banding formula reads the
// highest of the three.

export const IMPAIRMENT_ITEMS: { id: string; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'relationships', label: 'Relationships' },
  { id: 'home', label: 'Home life' },
];

export const IMPAIRMENT_MAX = 2; // 0 none, 1 a little, 2 a lot

// --- Question screen: root cause / levers -----------------------------
// Each maps to a lever we can name in the result. `linked` means the evidence
// is association only, `change it` means it is an intervention.

export const LEVER_ITEMS: {
  id: 'sleep' | 'stress' | 'food' | 'movement';
  label: string;
  question: string;
  tag: 'linked' | 'change it';
}[] = [
  { id: 'sleep', label: 'Sleep', question: 'Poor sleep before your period', tag: 'linked' },
  { id: 'stress', label: 'Stress', question: 'High stress before your period', tag: 'linked' },
  { id: 'food', label: 'Food', question: 'Skipped meals or heavy cravings', tag: 'change it' },
  { id: 'movement', label: 'Movement', question: 'Little movement before your period', tag: 'change it' },
];

// --- Question screen: coping ------------------------------------------
// engagement (adaptive) vs disengagement (backfires). No repeats.

export const COPING_ITEMS: {
  id: string;
  label: string;
  mode: 'engagement' | 'disengagement';
}[] = [
  { id: 'talk', label: 'Talk it through', mode: 'engagement' },
  { id: 'reframe', label: 'Try to see it differently', mode: 'engagement' },
  { id: 'distract', label: 'Distract yourself', mode: 'engagement' },
  { id: 'withdraw', label: 'Keep away from people', mode: 'disengagement' },
  { id: 'suppress', label: 'Push it down and carry on', mode: 'disengagement' },
  { id: 'vent', label: 'Let it out on someone', mode: 'disengagement' },
];

// --- Answer shape -----------------------------------------------------

export interface V3Answers {
  presence: string[];
  impairment: Record<string, number>; // 0..2 per item
  cycle: { lastPeriod: string | null; length: number | null; unsure: boolean };
  remission: 'yes' | 'no' | 'unsure' | null;
  levers: Record<string, number>; // 0..3 per lever id
  coping: string[];
}

export const EMPTY_ANSWERS: V3Answers = {
  presence: [],
  impairment: {},
  cycle: { lastPeriod: null, length: null, unsure: false },
  remission: null,
  levers: {},
  coping: [],
};

// --- Level banding (decision 2) ---------------------------------------

export type Level = 'mild' | 'moderate' | 'severe';

/**
 * Level banding, per the locked decision. Inputs derived from the answers:
 *   count   = number of presence symptoms checked
 *   anchor  = any of the four emotional anchors checked
 *   impact  = highest impairment slider value (0 none, 1 a little, 2 a lot)
 *
 * Bands:
 *   Severe (PMDD-range): count >= 5 && anchor && impact === 2
 *   Moderate:            (count >= 3 || anchor) && impact >= 1
 *   Mild:                everything else
 *
 * Kept as a pure function so it can be unit-tested without the UI.
 */
export function bandLevel(count: number, anchor: boolean, impact: number): Level {
  if (count >= 5 && anchor && impact === 2) return 'severe';
  if ((count >= 3 || anchor) && impact >= 1) return 'moderate';
  return 'mild';
}

/** Reads the banding inputs off the answers and applies bandLevel. */
export function deriveLevel(a: V3Answers): Level {
  const count = a.presence.length;
  const anchor = a.presence.some((id) => ANCHOR_IDS.includes(id));
  const impactValues = Object.values(a.impairment);
  const impact = impactValues.length > 0 ? Math.max(...impactValues) : 0;
  return bandLevel(count, anchor, impact);
}

/** Levers she flagged (any degree above zero). Result lists all flagged. */
export function deriveLevers(a: V3Answers): typeof LEVER_ITEMS {
  return LEVER_ITEMS.filter((l) => (a.levers[l.id] ?? 0) > 0);
}

export type CopingStanding = 'engaging' | 'mixed' | 'disengaging' | null;

export function deriveCopingStanding(a: V3Answers): CopingStanding {
  if (a.coping.length === 0) return null;
  const chosen = COPING_ITEMS.filter((c) => a.coping.includes(c.id));
  const dis = chosen.filter((c) => c.mode === 'disengagement').length;
  const eng = chosen.filter((c) => c.mode === 'engagement').length;
  if (dis > eng) return 'disengaging';
  if (eng > dis) return 'engaging';
  return 'mixed';
}

/** Named coping standing for the result. Never a personality label. */
export function copingStandingCopy(
  standing: CopingStanding,
): { line: string; tail: string } | null {
  switch (standing) {
    case 'disengaging':
      return {
        line: 'You tend to push feelings down or keep them at a distance.',
        tail: 'Common, and it is the pattern that keeps them going. Also the most trainable.',
      };
    case 'engaging':
      return {
        line: 'You tend to work with the feelings, by talking or reframing.',
        tail: 'That is the pattern that eases hard days. We build on it.',
      };
    case 'mixed':
      return {
        line: 'You do a bit of both, working with feelings and pushing some down.',
        tail: 'The working-with side is the one that helps. That part gets stronger with practice.',
      };
    default:
      return null;
  }
}

export function levelCopy(level: Level): string {
  switch (level) {
    case 'mild':
      return 'Your PMS reads as mild.';
    case 'moderate':
      return 'Your PMS reads as moderate.';
    case 'severe':
      return 'Your PMS reads as severe.';
  }
}

/** Position 0..1 on the mild to PMDD spectrum for the result dot. */
export function levelSpectrumPosition(level: Level): number {
  switch (level) {
    case 'mild':
      return 0.22;
    case 'moderate':
      return 0.55;
    case 'severe':
      return 0.85;
  }
}

// --- Remission line (decision 3) --------------------------------------

/**
 * The remission answer feeds one line on the result.
 *   yes    -> predictable, which is what we work with.
 *   no     -> gentle, non-alarming flag to see the fuller picture.
 *   unsure -> no line.
 */
export function remissionLine(remission: V3Answers['remission']): string | null {
  switch (remission) {
    case 'yes':
      return "Because they lift when your period starts, they're predictable, which is what we work with.";
    case 'no':
      return "These may run beyond the premenstrual window, so it's worth seeing the fuller picture.";
    default:
      return null;
  }
}

// --- Cycle estimate (decision 3) --------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Estimate the next tougher (luteal) stretch from the last period start and
 * typical cycle length. Reuses pmsOffsetDays from lib/pms-window so the app has
 * a single source of truth for the prediction, then anchors the window a fixed
 * number of days before the next predicted period.
 *
 * Transparent and simple on purpose: the harder days cluster in the ~7 days
 * before the next period, so we point at the start of that window. Returns null
 * when the cycle answer is missing or "not sure".
 */
export const CYCLE_WINDOW_BEFORE_DAYS = 7;

export function nextTougherStretch(
  cycle: V3Answers['cycle'],
  today: Date = new Date(),
): Date | null {
  if (cycle.unsure || !cycle.lastPeriod || !cycle.length) return null;
  const offset = pmsOffsetDays(cycle.lastPeriod, cycle.length, today);
  if (offset == null) return null;
  // offset is days relative to the nearest predicted period start (negative =
  // before it). Find how many days until the NEXT window opens.
  // Days to the next period start: if we are already at/after this cycle's
  // start (offset >= 0), the next one is `length` days out minus how far in we
  // are; otherwise it is just -offset days away.
  const len = cycle.length;
  const daysToNextPeriod = offset >= 0 ? len - offset : -offset;
  const daysToWindow = daysToNextPeriod - CYCLE_WINDOW_BEFORE_DAYS;
  const target = new Date(today.getTime() + daysToWindow * MS_PER_DAY);
  return target;
}

/** Human date for the result line, e.g. "July 21". Locale-friendly, no year. */
export function formatStretchDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

/** The full result line, or null when we cannot estimate. */
export function cycleLine(cycle: V3Answers['cycle'], today: Date = new Date()): string | null {
  const d = nextTougherStretch(cycle, today);
  if (!d) return null;
  return `Your next tougher stretch is likely around ${formatStretchDate(d)}.`;
}
