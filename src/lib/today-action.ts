import { daysUntilPmsWindow, pmsOffsetDays, PMS_GRACE_AFTER_DAYS } from '@/lib/pms-window';
import type { PmsPrefs } from '@/store/pms-prefs';
import type { PmsRead } from '@/store/pms-reads';
import {
  READINESS_CHECK_IDS,
  todayYmd,
  type ReadinessCheckId,
  type ReadinessChecks,
  type ReadinessState,
} from '@/store/pms-readiness';
import type { TrainingState } from '@/store/training-v3';
import { PMS_FACTORS } from '@/v3/v3-content';
import { trainSummary } from '@/v3/game-content';

// The Now tab's one coached action, picked fresh each render from the stores.
// This is the spine of the IA redesign (today-action-spec.md is the contract):
// a phase ladder (setup -> window -> period -> prep -> open), personalised by
// the weakest lifestyle lever from her last PMS read, split morning/evening at
// 17:00. Pure functions only, so the whole matrix is unit-testable.
//
// The Calm now button is the screen's constant, so the selector NEVER asks
// for a calming practice — the coached action is always something different
// (a readiness check, a training level, a check-in), and calm stays one tap
// away regardless of the day.
//
// Check-in actions (period confirm, remission) are completed by the screen
// marking the rotation store's dismissedDate for today — that is what closes
// the ring for checkin kinds, whether she answered or tapped "Not yet"
// (honesty is the ask, not the period).

export type TodayPhase = 'setup' | 'window' | 'period' | 'prep' | 'open';

export type TodayActionKind = 'assessment' | 'readiness' | 'train' | 'checkin' | 'done';

export type TodayAction = {
  id: string; // stable per ask, e.g. 'readiness:calcium', 'prep:woundDown'
  kind: TodayActionKind;
  title: string;
  caption: string;
  route: string; // expo-router href; '' when the screen intercepts by id
};

export type TodayActionInput = {
  prefs: PmsPrefs;
  reads: PmsRead[];
  readiness: ReadinessState; // today's, from getReadiness()
  calmDoneToday: boolean; // any session recorded today
  training: TrainingState;
  remissionAnsweredThisCycle: boolean;
  lastAction: { date: string; id: string } | null;
  dismissedDate: string | null;
  now: Date;
};

export type Lever = 'sleep' | 'food' | 'movement';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EVENING_HOUR = 17;

function parseDayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

function dayNumberLocal(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

// --- Phase ---------------------------------------------------------------

export function derivePhase(prefs: PmsPrefs, hasRead: boolean, now: Date): TodayPhase {
  if (!hasRead) return 'setup';
  if (!prefs.pmsMode || prefs.lastPeriodStart == null) return 'open';
  const offset = pmsOffsetDays(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (offset == null) return 'open';
  if (offset >= -7 && offset <= -1) return 'window';
  if (offset >= 0 && offset <= PMS_GRACE_AFTER_DAYS) return 'period';
  const until = daysUntilPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (until != null && until >= 1 && until <= 7) return 'prep';
  return 'open';
}

// Whether this cycle's period has actually been logged: the anchor date is a
// real recent start, not last cycle's projection still rolling forward.
export function periodConfirmed(prefs: PmsPrefs, now: Date): boolean {
  if (prefs.lastPeriodStart == null) return false;
  const anchor = parseDayNumber(prefs.lastPeriodStart);
  if (anchor == null) return false;
  const diff = dayNumberLocal(now) - anchor;
  return diff >= 0 && diff <= 6;
}

// --- Lever ---------------------------------------------------------------

const LEVER_STRENGTH: Record<Lever, number> = {
  sleep: PMS_FACTORS.find((f) => f.id === 'sleep')?.strength ?? 3,
  food: PMS_FACTORS.find((f) => f.id === 'food')?.strength ?? 2,
  movement: PMS_FACTORS.find((f) => f.id === 'movement')?.strength ?? 5,
};

const LEVERS: readonly Lever[] = ['sleep', 'food', 'movement'];

/**
 * The habit her last read says is weakest: levers rated 0-1 (unanswered
 * defaults high, same rule as deriveLevers), lowest score first, ties broken
 * by evidence strength so the strongest-evidence lever wins the ask.
 */
export function weakestLever(reads: PmsRead[]): Lever | null {
  const last = reads[reads.length - 1];
  if (last == null) return null;
  const candidates = LEVERS.filter((id) => (last.answers.levers[id] ?? 2) <= 1);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const scoreDiff = (last.answers.levers[a] ?? 2) - (last.answers.levers[b] ?? 2);
    if (scoreDiff !== 0) return scoreDiff;
    return LEVER_STRENGTH[b] - LEVER_STRENGTH[a];
  });
  return candidates[0];
}

// --- Ask content ---------------------------------------------------------

// Imperative ask-form of the readiness checks (the stored titles are
// first-person past tense, which reads wrong as a coached ask).
const READINESS_ASK: Record<ReadinessCheckId, { title: string; caption: string }> = {
  calcium: { title: 'Have calcium-rich food', caption: 'Yogurt, cheese, or greens' },
  micronutrient: { title: 'A small handful of nuts or seeds', caption: 'Tops up magnesium' },
  steady: { title: 'Eat steadily today', caption: 'No big sugar crash' },
  antiInflammatory: {
    title: 'Add anti-inflammatory food',
    caption: 'Greens, ginger, berries, olive oil',
  },
  woundDown: { title: 'Wind down early tonight', caption: 'Screens off, dim lights' },
};

const FOOD_ORDER: readonly ReadinessCheckId[] = [
  'calcium',
  'micronutrient',
  'steady',
  'antiInflammatory',
];

function readinessAction(check: ReadinessCheckId, prep: boolean): TodayAction {
  const ask = READINESS_ASK[check];
  return {
    id: `${prep ? 'prep' : 'readiness'}:${check}`,
    kind: 'readiness',
    title: prep && check === 'woundDown' ? 'Wind down early tonight' : ask.title,
    caption: prep ? 'Get ahead of your window' : ask.caption,
    route: '/pms-readiness',
  };
}

const DONE_ACTION: TodayAction = {
  id: 'done',
  kind: 'done',
  title: 'Done for today',
  caption: 'See you tomorrow',
  route: '',
};

// The everyday-wellbeing fallback for cells with no lever ask and no training
// left: the same date-keyed readiness checks, framed for any day. Food-first
// in the morning, wind-down in the evening — never a calming practice, which
// the Calm now button already owns.
function wellbeingAction(readiness: ReadinessState, morning: boolean): TodayAction {
  if (morning) {
    const food = firstUnchecked(readiness, FOOD_ORDER);
    if (food != null) return readinessAction(food, true);
    if (!readiness.checks.woundDown) return readinessAction('woundDown', true);
  } else {
    if (!readiness.checks.woundDown) return readinessAction('woundDown', true);
    const food = firstUnchecked(readiness, FOOD_ORDER);
    if (food != null) return readinessAction(food, true);
  }
  return DONE_ACTION;
}

function trainAction(training: TrainingState): TodayAction | null {
  const summary = trainSummary(training);
  if (summary.next == null) return null;
  return {
    id: `train:${summary.next.levelId}`,
    kind: 'train',
    title: `${summary.statusWord}: ${summary.detail}`,
    caption: 'A few minutes of training',
    route: `/game-v3?chapter=${summary.next.chapterId}`,
  };
}

// --- Selection -----------------------------------------------------------

function firstUnchecked(
  readiness: ReadinessState,
  order: readonly ReadinessCheckId[],
): ReadinessCheckId | null {
  return order.find((id) => !readiness.checks[id]) ?? null;
}

// Rotate away from yesterday's ask when the cell offers alternatives. Never
// applies to setup/done or the window checklist (those progress on their own).
function rotate(
  candidates: TodayAction[],
  lastAction: { date: string; id: string } | null,
  now: Date,
): TodayAction {
  const yesterday = todayYmd(new Date(now.getTime() - MS_PER_DAY));
  if (
    candidates.length >= 2 &&
    lastAction != null &&
    lastAction.date === yesterday &&
    candidates[0].id === lastAction.id
  ) {
    return candidates[1];
  }
  return candidates[0];
}

export function pickTodayAction(input: TodayActionInput): TodayAction {
  const { prefs, reads, readiness, training, now } = input;
  const phase = derivePhase(prefs, reads.length > 0, now);
  const morning = now.getHours() < EVENING_HOUR;
  const lever = weakestLever(reads);

  if (phase === 'setup') {
    return {
      id: 'assessment',
      kind: 'assessment',
      title: 'Know your PMS level',
      caption: 'A few quick questions unlock your plan',
      route: '/onboarding-v3',
    };
  }

  if (phase === 'window') {
    // The window day closes on the five checks (or her "done for today" tap).
    // The calming practice is the checklist's bonus sixth item, reached via
    // the ever-present Calm now button — never the coached ask.
    if (readiness.doneForToday || READINESS_CHECK_IDS.every((id) => readiness.checks[id])) {
      return DONE_ACTION;
    }

    let check: ReadinessCheckId | null;
    if (morning) {
      check =
        lever === 'movement' || lever == null
          ? firstUnchecked(readiness, READINESS_CHECK_IDS)
          : firstUnchecked(readiness, FOOD_ORDER); // food and sleep both food-first in the morning
    } else if (lever === 'food') {
      check = !readiness.checks.steady ? 'steady' : firstUnchecked(readiness, ['woundDown', ...FOOD_ORDER]);
    } else {
      check = !readiness.checks.woundDown
        ? 'woundDown'
        : firstUnchecked(readiness, READINESS_CHECK_IDS);
    }
    if (check == null) return DONE_ACTION;
    return readinessAction(check, false);
  }

  if (phase === 'period') {
    // Period days carry the lightest asks: the two once-a-cycle check-ins,
    // any time of day, then the day settles. Calm stays a button-tap away.
    const confirmed = periodConfirmed(prefs, now);
    const dismissedToday = input.dismissedDate === todayYmd(now);
    if (!dismissedToday) {
      if (!confirmed) {
        return {
          id: 'checkin:period-confirm',
          kind: 'checkin',
          title: 'Period arrived? Add it',
          caption: 'Keeps your predictions honest',
          route: '',
        };
      }
      if (!input.remissionAnsweredThisCycle) {
        return {
          id: 'checkin:remission',
          kind: 'checkin',
          title: 'Did symptoms ease once your period started?',
          caption: 'One tap, once a cycle',
          route: '',
        };
      }
    }
    return DONE_ACTION;
  }

  if (phase === 'prep') {
    const candidates: TodayAction[] = [];
    if (lever === 'sleep') {
      candidates.push({
        ...readinessAction('woundDown', true),
        title: morning ? 'Plan an early night' : 'Wind down early tonight',
      });
      const food = firstUnchecked(readiness, FOOD_ORDER);
      if (food != null) candidates.push(readinessAction(food, true));
    } else if (lever === 'food') {
      if (morning) {
        for (const id of FOOD_ORDER) {
          if (!readiness.checks[id]) candidates.push(readinessAction(id, true));
        }
      } else {
        if (!readiness.checks.steady)
          candidates.push({
            ...readinessAction('steady', true),
            title: 'Steady dinner, no sugar crash',
          });
        candidates.push(readinessAction('woundDown', true));
      }
    }
    if (candidates.length === 0) {
      // movement lever (no check content yet) and the no-weak-lever column
      const train = trainAction(training);
      const wellbeing = wellbeingAction(readiness, morning);
      if (morning && train != null) candidates.push(train);
      candidates.push(wellbeing);
      if (!morning && train != null) candidates.push(train);
    }
    return rotate(candidates, input.lastAction, now);
  }

  // open
  const train = trainAction(training);
  const wellbeing = wellbeingAction(readiness, morning);
  if (train != null) {
    return rotate([train, wellbeing], input.lastAction, now);
  }
  return wellbeing;
}

// --- Ring ----------------------------------------------------------------

/** The five prep checks done today (the calm practice is the button's job). */
export function prepsDoneCount(checks: ReadinessChecks): number {
  return READINESS_CHECK_IDS.filter((id) => checks[id]).length;
}

export const PREP_CHECK_COUNT = READINESS_CHECK_IDS.length;

export function todayRingProgress(input: TodayActionInput, action: TodayAction): number {
  const today = todayYmd(input.now);
  if (input.dismissedDate === today) return 1;
  switch (action.kind) {
    case 'done':
      return 1;
    case 'assessment': {
      const last = input.reads[input.reads.length - 1];
      return last != null && last.at === today ? 1 : 0;
    }
    case 'readiness': {
      if (action.id.startsWith('prep:')) {
        const check = action.id.slice('prep:'.length) as ReadinessCheckId;
        return input.readiness.checks[check] ? 1 : 0;
      }
      return prepsDoneCount(input.readiness.checks) / PREP_CHECK_COUNT;
    }
    case 'train':
      return input.training.lastCompletedOn === today ? 1 : 0;
    case 'checkin':
      return 0; // answering marks dismissedDate, which closes the ring above
  }
}

export function isRingClosed(input: TodayActionInput, action: TodayAction): boolean {
  return todayRingProgress(input, action) >= 1;
}

// --- Now-tab copy --------------------------------------------------------

/** "Day 22 · PMS window opens in 3 days" — null when PMS mode is off. */
export function cycleStateLine(prefs: PmsPrefs, now: Date): string | null {
  if (!prefs.pmsMode || prefs.lastPeriodStart == null) return null;
  const offset = pmsOffsetDays(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (offset == null) return null;
  const day = offset >= 0 ? offset + 1 : prefs.cycleLength + offset + 1;
  if (offset >= -7 && offset <= -1) return `Day ${day} · in your PMS window`;
  if (offset >= 0 && offset <= PMS_GRACE_AFTER_DAYS) return `Day ${day} · period days`;
  const until = daysUntilPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (until == null || until <= 0) return `Day ${day}`;
  if (until === 1) return `Day ${day} · PMS window opens tomorrow`;
  if (until <= 7) return `Day ${day} · PMS window opens in ${until} days`;
  return `Day ${day} · next window in ${until} days`;
}

/** The Add-periods button: quiet most of the cycle, prompting near day 0. */
export function periodButtonState(
  prefs: PmsPrefs,
  now: Date,
): { label: string; emphasized: boolean } {
  const quiet = { label: 'Add periods', emphasized: false };
  if (!prefs.pmsMode || prefs.lastPeriodStart == null) return quiet;
  const offset = pmsOffsetDays(prefs.lastPeriodStart, prefs.cycleLength, now);
  const anchor = parseDayNumber(prefs.lastPeriodStart);
  if (offset == null || anchor == null) return quiet;
  // A positive offset equal to days-since-anchor means the nearest predicted
  // start IS her own logged period: those are ordinary early-cycle days, not a
  // late period. Only prompt when the projection has rolled past the anchor.
  const daysSinceAnchor = dayNumberLocal(now) - anchor;
  if (offset >= 0 && offset === daysSinceAnchor) return quiet;
  if (offset >= -2 && offset <= 4) return { label: 'Period arrived? Add it', emphasized: true };
  if (offset > 4) return { label: 'Running late? Log it when it arrives', emphasized: true };
  return quiet;
}
