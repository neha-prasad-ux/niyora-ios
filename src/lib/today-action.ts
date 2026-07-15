import { daysUntilPmsWindow, pmsOffsetDays, PMS_GRACE_AFTER_DAYS } from '@/lib/pms-window';
import type { PmsPrefs } from '@/store/pms-prefs';
import type { PmsRead } from '@/store/pms-reads';
import {
  isReadyDone,
  READINESS_CHECK_IDS,
  todayYmd,
  type ReadinessChecks,
  type ReadinessState,
} from '@/store/pms-readiness';
import type { TrainingState } from '@/store/training-v3';
import { PMS_FACTORS } from '@/v3/v3-content';
import { trainSummary, workSummary } from '@/v3/game-content';

// The Now tab's one coached action, picked fresh each render from the stores.
// This is the spine of the IA redesign (today-action-spec.md is the contract):
// a phase ladder (setup -> window -> period -> build), where build covers the
// whole clear stretch (the spec's prep + open). Pure functions only, so the
// whole matrix is unit-testable.
//
// The phase grammar: the far-out "open" build days coach from Grow (training);
// the pre-PMS "prep" run-up (1-7 days out) runs the preparedness ladder — Neha's
// story first, then once that's done the PMS checklist, then training; PMS days
// own the in-the-moment flow; period days carry the once-a-cycle check-ins. The
// checklist only surfaces in the prep run-up (after the story) or the window
// itself, never as an everyday open-day chore. Within the window, asks are
// personalised by the weakest lifestyle lever from her last PMS read, split
// morning/evening at 17:00.
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

export type TodayActionKind =
  | 'assessment'
  | 'story'
  | 'readiness'
  | 'steady'
  | 'train'
  | 'checkin'
  | 'done';

export type TodayAction = {
  id: string; // stable per ask, e.g. 'readiness:calcium', 'train:revisit'
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
  /** Whether she has finished Neha's story this cycle (from the prep store). */
  storyDoneThisCycle: boolean;
  lastAction: { date: string; id: string } | null;
  dismissedDate: string | null;
  now: Date;
};

export type Lever = 'sleep' | 'food' | 'movement';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

// The PMS-days coached action: the in-the-moment Steady-yourself flow. During
// the window the home shows this ONE action — the readiness checklist moved to
// Grow and the pre-PMS notification — so a rough moment always has one
// science-backed way through it, a single tap from home.
const STEADY_ACTION: TodayAction = {
  id: 'steady',
  kind: 'steady',
  title: 'Cried, fought, or snapped?',
  caption: 'Science can help you move through it',
  route: '/steady-yourself',
};

const DONE_ACTION: TodayAction = {
  id: 'done',
  kind: 'done',
  title: 'Done for today',
  caption: 'See you tomorrow',
  route: '',
};

// The pre-PMS run-up leads with Neha's story (the preparedness serial), then
// once it is done hands to the checklist. The story is the first coached step
// so she arrives at the window already prepped and reassured.
const STORY_ACTION: TodayAction = {
  id: 'story',
  kind: 'story',
  title: "Neha's story",
  caption: 'A few minutes to get prepped',
  route: '/pms-story',
};

// After the story, the run-up asks the evidence-backed checklist (the same one
// the window uses). Only reached in prep once the story is done, so it is never
// an everyday open-day chore.
const CHECKLIST_ACTION: TodayAction = {
  id: 'readiness:checklist',
  kind: 'readiness',
  title: 'PMS day checklist',
  caption: 'Proven ways to ease symptoms',
  route: '/pms-readiness',
};

// Every chapter trained: build days still point at Grow, asking for a replay.
// Replays stamp lastCompletedOn (store/training-v3) without inflating
// progress, so the ring can still close honestly on an all-trained day.
const GROW_REVISIT_ACTION: TodayAction = {
  id: 'train:revisit',
  kind: 'train',
  title: 'Revisit a practice in Grow',
  caption: 'Replay a level that helped',
  route: '/grow',
};

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

// Once the mind pillar is trained, learning moves on rather than looping — the
// work pillar (steadier nerves, confidence, assertiveness) is the next course.
function workAction(training: TrainingState): TodayAction | null {
  const summary = workSummary(training);
  if (summary.next == null) return null;
  return {
    id: `work:${summary.next.levelId}`,
    kind: 'train',
    title: `${summary.statusWord}: ${summary.detail}`,
    caption: 'A few minutes of training',
    route: `/game-v3?chapter=${summary.next.chapterId}`,
  };
}

// --- Selection -----------------------------------------------------------

export function pickTodayAction(input: TodayActionInput): TodayAction {
  const { prefs, reads, training, now } = input;
  const phase = derivePhase(prefs, reads.length > 0, now);

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
    // PMS days: the one coached action is the in-the-moment Steady-yourself
    // flow. It is a way through a rough moment, not a daily checkbox, so it
    // never settles to "done", and Calm now folds into it (see now.tsx). The
    // readiness checklist lives in Grow and the pre-PMS notification now.
    return STEADY_ACTION;
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
    // The pre-PMS run-up: Neha's story first (the preparedness serial), then
    // once it is done the daily checklist, then training as other topics. This
    // is the one place the checklist appears outside the window — after the
    // story has set her up for the week.
    if (!input.storyDoneThisCycle) return STORY_ACTION;
    const checklistDone = isReadyDone(
      input.readiness.checks,
      input.calmDoneToday,
      input.readiness.doneForToday,
    );
    if (!checklistDone) return CHECKLIST_ACTION;
    return trainAction(training) ?? workAction(training) ?? GROW_REVISIT_ACTION;
  }

  // Far-out "open" build days: the ask comes from Grow — walk the mind pillar,
  // then the work pillar, and only replay once every course is trained. Never
  // the checklist; readiness asks belong to the prep run-up and the window.
  return trainAction(training) ?? workAction(training) ?? GROW_REVISIT_ACTION;
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
    case 'story':
      // Finishing the story this cycle closes the day's ring (a once-a-cycle win).
      return input.storyDoneThisCycle ? 1 : 0;
    case 'readiness':
      return prepsDoneCount(input.readiness.checks) / PREP_CHECK_COUNT;
    case 'steady':
      return 0; // the SOS is a way through a rough moment, never a daily ring
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
