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
// highest of the two.

export const IMPAIRMENT_ITEMS: { id: string; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'relationships', label: 'Relationships' },
];

export const IMPAIRMENT_MAX = 2; // 0 none, 1 a little, 2 a lot

// --- Question screen: root cause / levers -----------------------------
// Framed as everyday lifestyle habits (not minimised to the premenstrual
// window), stated positively and observationally so rating one low never reads
// as failing. `factor` is the key word to emphasise in the UI. `linked` means
// the evidence is association only, `change it` means it is an intervention.

export const LEVER_ITEMS: {
  id: 'sleep' | 'food' | 'movement';
  label: string; // short area label, used in the result
  statement: string; // positive lifestyle statement she rates as true or not
  factor: string; // key word to highlight within the statement
  tag: 'linked' | 'change it';
}[] = [
  { id: 'sleep', label: 'Sleep', statement: 'I get 7 to 8 hours of sleep', factor: '7 to 8 hours', tag: 'linked' },
  { id: 'food', label: 'Food', statement: 'I eat regular, full meals', factor: 'meals', tag: 'change it' },
  { id: 'movement', label: 'Movement', statement: 'I move for 30 minutes most days', factor: '30 minutes', tag: 'change it' },
];

// --- Question screen: coping ------------------------------------------
// engagement (adaptive) vs disengagement (backfires). No repeats.

export const COPING_ITEMS: {
  id: string;
  label: string;
  mode: 'engagement' | 'disengagement';
}[] = [
  { id: 'talk', label: 'Talk it through with someone', mode: 'engagement' },
  { id: 'withdraw', label: 'Keep to yourself', mode: 'disengagement' },
  { id: 'reframe', label: 'Try to see it differently', mode: 'engagement' },
  { id: 'ruminate', label: 'Keep replaying it', mode: 'disengagement' },
  { id: 'distract', label: 'Distract yourself', mode: 'engagement' },
  { id: 'suppress', label: 'Push it down and carry on', mode: 'disengagement' },
  { id: 'engage', label: 'Keep talking it out', mode: 'engagement' },
  { id: 'vent', label: 'Take it out on someone', mode: 'disengagement' },
  { id: 'cry', label: 'Cry it out', mode: 'engagement' },
  { id: 'accept', label: 'Let it pass', mode: 'engagement' },
];

// --- Answer shape -----------------------------------------------------

export interface V3Answers {
  presence: string[];
  impairment: Record<string, number>; // 0..2 per item
  cycle: {
    lastPeriod: string | null;
    length: number | null;
    periodLength?: number; // bleeding days; only shapes the calendar, not the prediction
    unsure: boolean;
  };
  remission: 'yes' | 'no' | 'unsure' | null;
  levers: Record<string, number>; // 0..2 per lever id
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

/**
 * Levers worth moving: the healthy habits she rarely keeps. Statements are
 * positive ("I get a full night of sleep"), rated 0 (rarely) to 2 (usually), so
 * a low rating (0-1, i.e. not "usually") is the habit she could build on.
 * Unanswered levers default high, so they are never flagged.
 */
export function deriveLevers(a: V3Answers): typeof LEVER_ITEMS {
  return LEVER_ITEMS.filter((l) => (a.levers[l.id] ?? 2) <= 1);
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

/**
 * Coping standing mapped to a starting skill band (0..10) for the wave meter.
 * Someone already working with their feelings keeps a steadier line; someone
 * pushing them down starts choppier, but never at zero and never shamed. This
 * drives the water's steadiness and its label on the result screen.
 */
export function standingSkill(standing: CopingStanding): number {
  switch (standing) {
    case 'engaging':
      return 7; // works with feelings already -> "Steady in the swell"
    case 'mixed':
      return 5; // -> "Riding the wave"
    case 'disengaging':
      return 3; // the most trainable pattern -> "Finding your footing"
    default:
      return 1; // no read yet -> "Learning the water"
  }
}

/**
 * A two-line, plain-language read of where she stands with regulation right now,
 * phrased about her and matched to the wave-meter band. No jargon, no "trainable"
 * lecture, no shame. Used under the water on the result screen.
 */
export function regulationBlurb(standing: CopingStanding): string {
  switch (standing) {
    case 'engaging':
      return 'You already work with your feelings more than most. On the hard days you mostly keep your footing.';
    case 'mixed':
      return 'Some days you ride it well, some days it rides you. We even that out so the hard days sting less.';
    case 'disengaging':
      return "You're still finding your footing. Big feelings can pull you under before you catch them, and that is the part we steady.";
    default:
      return "You're just learning the water. We start simple, one small steady step at a time.";
  }
}

/** Named coping standing for the result. Never a personality label. */
export function copingStandingCopy(
  standing: CopingStanding,
): { line: string; tail: string } | null {
  switch (standing) {
    case 'disengaging':
      return {
        line: 'You tend to push feelings down or keep them at a distance',
        tail: 'Common, and the pattern that keeps them going, also the most trainable',
      };
    case 'engaging':
      return {
        line: 'You tend to work with the feelings, by talking or reframing',
        tail: 'That is the pattern that eases things, and we build on it',
      };
    case 'mixed':
      return {
        line: 'You do a bit of both, working with feelings and pushing some down',
        tail: 'The working-with side is the one that helps, and it gets stronger with practice',
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

// --- Wave meter (the recurring "riding the wave" surface) -------------
// The wave meter reads two things at once: water *height* is activation (how
// worked up / how high the cycle window pushes her), and the top line's
// choppiness is her *skill* band. Severity becomes water height, so the old
// horizontal "mild -> PMDD" verdict is redrawn as calm-vs-high water.

/**
 * Baseline water height (activation, 0..1) for a severity level, before any
 * in-window bump. Mild sits low and calm; severe sits high. Deliberately never
 * reaches the top of the tank so the in-window bump still has room to read.
 */
export function levelActivation(level: Level): number {
  switch (level) {
    case 'mild':
      return 0.32;
    case 'moderate':
      return 0.5;
    case 'severe':
      return 0.66;
  }
}

/**
 * The wave meter's label, driven by skill band, with a soft in-window note.
 * The band never drops when she is in her window; a rough week only adds the
 * note and raises the water. `skill` is 0..10 (0 at the result debut, before any
 * training). Copy obeys the game voice: no em dashes, no hype.
 */
export function waveMeterLabel(
  skill: number,
  inWindow: boolean,
): { label: string; note: string | null } {
  const s = Math.max(0, Math.min(10, skill));
  const label =
    s <= 2
      ? 'Learning the water'
      : s <= 4
        ? 'Finding your footing'
        : s <= 6
          ? 'Riding the wave'
          : s <= 8
            ? 'Steady in the swell'
            : 'Calm in the current';
  return { label, note: inWindow ? "and the water's high this week" : null };
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
      return "They're predictable, which is what we work with";
    case 'no':
      return "These may run beyond the premenstrual window, so it's worth seeing the fuller picture";
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
  return `Your next PMS window is likely around ${formatStretchDate(d)}. You won't walk into it cold.`;
}

/** Whole days from today until the next tougher window opens, or null. */
export function daysToNextWindow(
  cycle: V3Answers['cycle'],
  today: Date = new Date(),
): number | null {
  const d = nextTougherStretch(cycle, today);
  if (!d) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((d.getTime() - startOfToday.getTime()) / MS_PER_DAY));
}

/**
 * A short "how far away" phrase for the next-window card, in weeks once it is a
 * week or more out so it reads calm ("1 week away"), in days when it is close.
 * Null when we cannot estimate (no cycle, or she skipped it).
 */
export function nextWindowPhrase(
  cycle: V3Answers['cycle'],
  today: Date = new Date(),
): string | null {
  const days = daysToNextWindow(cycle, today);
  if (days == null) return null;
  if (days <= 1) return 'Almost here';
  if (days < 7) return `${days} days away`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? '1 week away' : `${weeks} weeks away`;
}

// --- Result scoreboard: what moves PMS, ranked by evidence -------------
// The five levers the plan can move, ordered by how strong the evidence is that
// working on them helps PMS. `strength` (0..5) drives both the rank and the
// little evidence meter. `science` is the plain-language summary shown inline
// behind "See the science" (never a link, so she never leaves the app). Honesty
// about how firm the evidence is lives in the prose, per house style. The
// numbers must be confirmed against the research bank before real users.

export interface PmsFactor {
  id: 'movement' | 'emotional' | 'sleep' | 'food';
  label: string;
  strength: number; // 1..5: evidence strength, drives bar height + rank
}

// Four levers the plan can move, ordered by how strong the evidence is. Emotional
// training rides the stress research (high stress ~ 5x the odds of PMS), which is
// why it sits near the top even though it is the app's own method.
export const PMS_FACTORS: PmsFactor[] = [
  { id: 'movement', label: 'Movement', strength: 5 },
  { id: 'emotional', label: 'Emotions', strength: 4 },
  { id: 'sleep', label: 'Sleep', strength: 3 },
  { id: 'food', label: 'Food', strength: 2 },
];

// One combined, plain-language read for the whole board, shown behind a single
// "See the science" line. Honesty about evidence strength lives in the prose.
// Numbers to confirm against the research bank before real users.
export const FACTOR_SCIENCE =
  'Movement has the firmest evidence: in trials, regular exercise brought a large drop in premenstrual symptoms (Pearce, 2020). Emotional training works on the stress link, and high stress carries roughly five times the odds of PMS (PLOS One, 2019). Steady sleep helps too, poor sleep is tied to about twice the odds (Sao Paulo Sleep Study). Regular meals are a gentler lever, with lighter evidence so far.';

/**
 * The board, ranked by evidence strength (strongest first), each flagged `yours`
 * when her own answers point at it: the lifestyle levers she rated low, and
 * emotional training when her coping leans on pushing feelings down.
 */
export function deriveFactorBoard(a: V3Answers): { factor: PmsFactor; yours: boolean }[] {
  const leverFlags = new Set(deriveLevers(a).map((l) => l.id));
  const standing = deriveCopingStanding(a);
  const emotionalYours = standing === 'disengaging' || standing === 'mixed';
  return [...PMS_FACTORS]
    .sort((x, y) => y.strength - x.strength)
    .map((factor) => ({
      factor,
      yours: factor.id === 'emotional' ? emotionalYours : leverFlags.has(factor.id),
    }));
}
