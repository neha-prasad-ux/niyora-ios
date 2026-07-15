jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  cycleStateLine,
  derivePhase,
  isRingClosed,
  periodButtonState,
  pickTodayAction,
  todayRingProgress,
  weakestLever,
  type TodayActionInput,
} from './today-action';
import { DEFAULT_PMS_PREFS, type PmsPrefs } from '@/store/pms-prefs';
import { freshReadiness, todayYmd, type ReadinessChecks } from '@/store/pms-readiness';
import { DEFAULT_TRAINING } from '@/store/training-v3';
import { EMPTY_ANSWERS } from '@/v3/v3-content';
import { CHAPTERS, WORK_CHAPTERS } from '@/v3/game-content';

// Every course in every pillar — the only state that reaches the Grow replay now
// that build days walk mind then work before looping.
const ALL_LEVELS = [...CHAPTERS, ...WORK_CHAPTERS].flatMap((c) => c.levels.map((l) => l.id));
import type { PmsRead } from '@/store/pms-reads';

// Fixed cycle for the whole suite: period started 2026-01-01, 28-day cycle.
// Next predicted period: Jan 29. PMS window: Jan 22-28. Grace: Jan 29-31.
const PREFS: PmsPrefs = { pmsMode: true, lastPeriodStart: '2026-01-01', cycleLength: 28 };

function read(levers: Record<string, number> = {}, at = '2026-01-02'): PmsRead {
  return { at, answers: { ...EMPTY_ANSWERS, levers } };
}

function input(overrides: Partial<TodayActionInput> & { now: Date }): TodayActionInput {
  return {
    prefs: PREFS,
    reads: [read()],
    readiness: freshReadiness(todayYmd(overrides.now)),
    calmDoneToday: false,
    training: DEFAULT_TRAINING,
    remissionAnsweredThisCycle: false,
    storyDoneThisCycle: false,
    lastAction: null,
    dismissedDate: null,
    ...overrides,
  };
}

function withChecks(now: Date, done: Partial<ReadinessChecks>) {
  const r = freshReadiness(todayYmd(now));
  return { ...r, checks: { ...r.checks, ...done } };
}

const morning = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0);
const evening = (y: number, m: number, d: number) => new Date(y, m - 1, d, 18, 0);

describe('derivePhase', () => {
  it('is setup until a read exists', () => {
    expect(derivePhase(PREFS, false, morning(2026, 1, 25))).toBe('setup');
  });

  it('maps offsets onto the ladder', () => {
    expect(derivePhase(PREFS, true, morning(2026, 1, 21))).toBe('prep'); // offset -8, 1 day to window
    expect(derivePhase(PREFS, true, morning(2026, 1, 22))).toBe('window'); // offset -7
    expect(derivePhase(PREFS, true, morning(2026, 1, 28))).toBe('window'); // offset -1
    expect(derivePhase(PREFS, true, morning(2026, 1, 29))).toBe('period'); // offset 0
    expect(derivePhase(PREFS, true, morning(2026, 1, 31))).toBe('period'); // offset +2
    expect(derivePhase(PREFS, true, morning(2026, 2, 1))).toBe('open'); // offset +3
    expect(derivePhase(PREFS, true, morning(2026, 1, 15))).toBe('prep'); // 7 days to window
    expect(derivePhase(PREFS, true, morning(2026, 1, 14))).toBe('open'); // 8 days to window
  });

  it('is open when PMS mode is off or the anchor is missing', () => {
    expect(derivePhase(DEFAULT_PMS_PREFS, true, morning(2026, 1, 25))).toBe('open');
    expect(
      derivePhase({ ...PREFS, lastPeriodStart: null }, true, morning(2026, 1, 25)),
    ).toBe('open');
  });
});

describe('weakestLever', () => {
  it('returns null with no reads or no weak levers', () => {
    expect(weakestLever([])).toBeNull();
    expect(weakestLever([read({ sleep: 2, food: 2, movement: 2 })])).toBeNull();
    expect(weakestLever([read({})])).toBeNull(); // unanswered defaults high
  });

  it('picks the lowest score', () => {
    expect(weakestLever([read({ sleep: 1, food: 0 })])).toBe('food');
  });

  it('breaks ties by evidence strength: movement > sleep > food', () => {
    expect(weakestLever([read({ sleep: 1, food: 1, movement: 1 })])).toBe('movement');
    expect(weakestLever([read({ sleep: 0, food: 0 })])).toBe('sleep');
  });

  it('reads the latest read, not the baseline', () => {
    expect(weakestLever([read({ sleep: 0 }), read({ food: 0, sleep: 2 })])).toBe('food');
  });
});

describe('pickTodayAction: setup and window', () => {
  it('asks for the assessment before anything else', () => {
    const a = pickTodayAction(input({ now: morning(2026, 1, 25), reads: [] }));
    expect(a.kind).toBe('assessment');
    expect(a.route).toBe('/onboarding-v3');
  });

  it('offers the Steady-yourself flow through the PMS days, any time or lever', () => {
    const times = [
      morning(2026, 1, 22), // window opens
      evening(2026, 1, 25),
      morning(2026, 1, 28), // window closes
    ];
    const readSets = [[read({ food: 0 })], [read({ sleep: 0 })], [read({})]];
    for (const now of times) {
      for (const reads of readSets) {
        const a = pickTodayAction(input({ now, reads }));
        expect(a.kind).toBe('steady');
        expect(a.id).toBe('steady');
        expect(a.route).toBe('/steady-yourself');
      }
    }
  });

  it('never settles to done in the window — the SOS is not a daily checkbox', () => {
    const now = morning(2026, 1, 25);
    const readiness = withChecks(now, {
      calcium: true,
      micronutrient: true,
      steady: true,
      antiInflammatory: true,
      woundDown: true,
    });
    const inp = input({ now, readiness });
    const a = pickTodayAction(inp);
    expect(a.kind).toBe('steady');
    expect(isRingClosed(inp, a)).toBe(false);
  });
});

describe('pickTodayAction: period', () => {
  it('asks to confirm the period while unconfirmed', () => {
    // Anchor is Jan 1, so on Jan 29 the projected period is unconfirmed.
    const a = pickTodayAction(input({ now: morning(2026, 1, 29) }));
    expect(a.id).toBe('checkin:period-confirm');
    expect(a.route).toBe(''); // screen intercepts
  });

  it('asks remission once the period is confirmed', () => {
    const prefs = { ...PREFS, lastPeriodStart: '2026-01-29' };
    const a = pickTodayAction(input({ now: morning(2026, 1, 30), prefs }));
    expect(a.id).toBe('checkin:remission');
  });

  it('settles the day once remission is answered', () => {
    const prefs = { ...PREFS, lastPeriodStart: '2026-01-29' };
    const a = pickTodayAction(
      input({ now: morning(2026, 1, 30), prefs, remissionAnsweredThisCycle: true }),
    );
    expect(a.kind).toBe('done');
  });

  it('suppresses the ask and closes the ring after a dismissal', () => {
    const now = morning(2026, 1, 29);
    const inp = input({ now, dismissedDate: todayYmd(now) });
    const a = pickTodayAction(inp);
    expect(a.kind).toBe('done');
    expect(isRingClosed(inp, a)).toBe(true);
  });

  it('asks check-ins in the evening too — period asks are not time-gated', () => {
    const a = pickTodayAction(input({ now: evening(2026, 1, 29) }));
    expect(a.id).toBe('checkin:period-confirm');
  });
});

describe('pickTodayAction: open build days', () => {
  const openMorning = morning(2026, 1, 10); // 12 days to window, far out
  const openEvening = evening(2026, 1, 10);

  it('always asks training, whatever the weak lever or time of day', () => {
    const readSets = [
      [read({ sleep: 0 })],
      [read({ food: 0 })],
      [read({ movement: 0 })],
      [read({ sleep: 2, food: 2, movement: 2 })],
    ];
    for (const reads of readSets) {
      for (const now of [openMorning, openEvening]) {
        const a = pickTodayAction(input({ now, reads }));
        expect(a.kind).toBe('train');
        expect(a.route).toContain('/game-v3');
      }
    }
  });

  it('asks a Grow replay when every level is trained, never the checklist', () => {
    const training = { ...DEFAULT_TRAINING, completed: ALL_LEVELS };
    for (const now of [openMorning, openEvening]) {
      const a = pickTodayAction(input({ now, training }));
      expect(a.id).toBe('train:revisit');
      expect(a.route).toBe('/grow');
    }
  });

  it('never asks a readiness check on open days, even with the story done', () => {
    // Sweep two full cycles; on the far-out open days the checklist never shows,
    // whether or not the story is done (the checklist belongs to prep + window).
    const reads = [read({ sleep: 0, food: 0 })];
    for (let day = 1; day <= 56; day++) {
      for (const hour of [9, 18]) {
        const now = new Date(2026, 0, day, hour, 0);
        if (derivePhase(PREFS, true, now) === 'open') {
          const a = pickTodayAction(input({ now, reads, storyDoneThisCycle: true }));
          expect(a.kind).not.toBe('readiness');
          expect(a.kind).not.toBe('story');
        }
      }
    }
  });
});

describe('pickTodayAction: prep run-up (the preparedness ladder)', () => {
  const prepMorning = morning(2026, 1, 19); // 3 days to window
  const prepEvening = evening(2026, 1, 19);

  it('leads with Neha\'s story until it is done this cycle', () => {
    for (const now of [prepMorning, prepEvening, morning(2026, 1, 15), morning(2026, 1, 21)]) {
      const a = pickTodayAction(input({ now, storyDoneThisCycle: false }));
      expect(a.kind).toBe('story');
      expect(a.route).toBe('/pms-story');
    }
  });

  it('hands to the PMS checklist once the story is done', () => {
    const a = pickTodayAction(input({ now: prepMorning, storyDoneThisCycle: true }));
    expect(a.kind).toBe('readiness');
    expect(a.route).toBe('/pms-readiness');
  });

  it('moves on to training once the story and checklist are both done', () => {
    const now = prepMorning;
    const readiness = { ...withChecks(now, {}), doneForToday: true };
    const a = pickTodayAction(input({ now, storyDoneThisCycle: true, readiness }));
    expect(a.kind).toBe('train');
  });
});

describe('ring progress', () => {
  it('the window steady action never closes the daily ring', () => {
    const now = morning(2026, 1, 25);
    const inp = input({ now });
    const a = pickTodayAction(inp);
    expect(a.kind).toBe('steady');
    expect(todayRingProgress(inp, a)).toBe(0);
    expect(isRingClosed(inp, a)).toBe(false);
  });

  it('replay ring closes on a level replayed today (all-trained build day)', () => {
    const now = morning(2026, 1, 10);
    const allDone = ALL_LEVELS;
    const fresh = input({
      now,
      training: { ...DEFAULT_TRAINING, completed: allDone, lastCompletedOn: '2026-01-09' },
    });
    const a = pickTodayAction(fresh);
    expect(a.id).toBe('train:revisit');
    expect(todayRingProgress(fresh, a)).toBe(0);
    const replayed = input({
      now,
      training: { ...DEFAULT_TRAINING, completed: allDone, lastCompletedOn: todayYmd(now) },
    });
    expect(todayRingProgress(replayed, a)).toBe(1);
  });

  it('train ring closes only on a level completed today', () => {
    const now = morning(2026, 1, 10);
    const inp = input({
      now,
      training: { ...DEFAULT_TRAINING, completed: ['irr-l1'], lastCompletedOn: todayYmd(now) },
    });
    const a = pickTodayAction(inp);
    expect(a.kind).toBe('train');
    expect(todayRingProgress(inp, a)).toBe(1);
    const stale = input({
      now,
      training: { ...DEFAULT_TRAINING, completed: ['irr-l1'], lastCompletedOn: '2026-01-09' },
    });
    expect(todayRingProgress(stale, pickTodayAction(stale))).toBe(0);
  });

  it('assessment ring closes when a read lands today', () => {
    const now = morning(2026, 1, 25);
    const inp = input({ now, reads: [] });
    const a = pickTodayAction(inp);
    const after = input({ now, reads: [read({}, todayYmd(now))] });
    expect(todayRingProgress(inp, a)).toBe(0);
    expect(todayRingProgress(after, a)).toBe(1);
  });
});

describe('cycleStateLine', () => {
  it('is null when PMS mode is off', () => {
    expect(cycleStateLine(DEFAULT_PMS_PREFS, morning(2026, 1, 25))).toBeNull();
  });

  it('names the day and the window state', () => {
    expect(cycleStateLine(PREFS, morning(2026, 1, 25))).toBe('Day 25 · in your PMS window');
    expect(cycleStateLine(PREFS, morning(2026, 1, 19))).toBe(
      'Day 19 · PMS window opens in 3 days',
    );
    expect(cycleStateLine(PREFS, morning(2026, 1, 21))).toBe('Day 21 · PMS window opens tomorrow');
    expect(cycleStateLine(PREFS, morning(2026, 1, 29))).toBe('Day 1 · period days');
    expect(cycleStateLine(PREFS, morning(2026, 1, 10))).toBe('Day 10 · next window in 12 days');
  });
});

describe('periodButtonState', () => {
  it('stays quiet mid-cycle and once confirmed', () => {
    expect(periodButtonState(PREFS, morning(2026, 1, 10))).toEqual({
      label: 'Add periods',
      emphasized: false,
    });
    const confirmed = { ...PREFS, lastPeriodStart: '2026-01-29' };
    expect(periodButtonState(confirmed, morning(2026, 1, 30)).emphasized).toBe(false);
  });

  it('never reads early-cycle days as a late period', () => {
    // Day 10 after a logged Jan 1 start: offset is +9 vs her own anchor, which
    // is days-since-period, not lateness.
    expect(periodButtonState(PREFS, morning(2026, 1, 10)).emphasized).toBe(false);
    expect(periodButtonState(PREFS, morning(2026, 1, 14)).emphasized).toBe(false);
  });

  it('prompts around the predicted start', () => {
    expect(periodButtonState(PREFS, morning(2026, 1, 27))).toEqual({
      label: 'Period arrived? Add it',
      emphasized: true,
    }); // offset -2
    expect(periodButtonState(PREFS, morning(2026, 1, 31)).emphasized).toBe(true); // offset +2
  });

  it('admits the prediction may be off once clearly late', () => {
    const s = periodButtonState(PREFS, morning(2026, 2, 3)); // offset +5
    expect(s.label).toBe('Running late? Log it when it arrives');
    expect(s.emphasized).toBe(true);
  });
});
