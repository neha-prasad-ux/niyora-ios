import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionsThisWeek, getSessionsToday, getCurrentStreak, getStreakInfo } from '@/store/session-history';
import { readFreezeState, applyFreezesToDates } from '@/store/streak-freeze';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/store/streak-freeze', () => ({
  readFreezeState: jest.fn(),
  applyFreezesToDates: jest.fn().mockResolvedValue(undefined),
  awardFreezes: jest.fn().mockResolvedValue(undefined),
  FREEZE_INTERVAL: 7,
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockReadFreezeState = readFreezeState as jest.Mock;
const mockApplyFreezesToDates = applyFreezesToDates as jest.Mock;

// Pin to Wednesday 2026-01-07 noon local — Monday of that week is 2026-01-05.
const FAKE_NOW = new Date(2026, 0, 7, 12, 0, 0);
const IN_WEEK_MON = new Date(2026, 0, 5, 8, 0, 0).toISOString();
const IN_WEEK_WED = new Date(2026, 0, 7, 10, 0, 0).toISOString();
const LAST_WEEK = new Date(2026, 0, 4, 20, 0, 0).toISOString(); // Sunday before

// Additional fixtures for today/streak tests (relative to FAKE_NOW = 2026-01-07).
const TODAY = new Date(2026, 0, 7, 9, 0, 0).toISOString();    // Wed Jan 7 (same day as FAKE_NOW)
const YESTERDAY = new Date(2026, 0, 6, 20, 0, 0).toISOString(); // Tue Jan 6
const TWO_DAYS_AGO = new Date(2026, 0, 5, 8, 0, 0).toISOString(); // Mon Jan 5 (= IN_WEEK_MON)
const THREE_DAYS_AGO = new Date(2026, 0, 4, 20, 0, 0).toISOString(); // Sun Jan 4 (= LAST_WEEK)

const NO_FREEZES = { available: 0, appliedDates: [] };

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FAKE_NOW);
  mockGetItem.mockReset();
  mockReadFreezeState.mockReset();
  mockApplyFreezesToDates.mockReset();
  mockReadFreezeState.mockResolvedValue(NO_FREEZES);
  mockApplyFreezesToDates.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getSessionsThisWeek', () => {
  it('returns 0 when there are no sessions', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getSessionsThisWeek()).toBe(0);
  });

  it('counts only sessions that fall within the current week', async () => {
    const records = [
      { techniqueId: 'box', completedAt: IN_WEEK_MON },
      { techniqueId: 'box', completedAt: IN_WEEK_WED },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getSessionsThisWeek()).toBe(2);
  });

  it('excludes sessions from the previous week', async () => {
    const records = [
      { techniqueId: 'box', completedAt: LAST_WEEK },
      { techniqueId: 'box', completedAt: IN_WEEK_MON },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getSessionsThisWeek()).toBe(1);
  });
});

describe('getSessionsToday', () => {
  it('returns 0 when there are no sessions', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getSessionsToday()).toBe(0);
  });

  it('returns 0 when no session was completed today', async () => {
    const records = [{ techniqueId: 'box', completedAt: YESTERDAY }];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getSessionsToday()).toBe(0);
  });

  it('counts only sessions completed today', async () => {
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: YESTERDAY },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getSessionsToday()).toBe(2);
  });
});

describe('getCurrentStreak', () => {
  it('returns 0 when there are no sessions', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getCurrentStreak()).toBe(0);
  });

  it('returns 0 when most recent session is older than yesterday', async () => {
    const records = [{ techniqueId: 'box', completedAt: TWO_DAYS_AGO }];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getCurrentStreak()).toBe(0);
  });

  it('returns 1 when only today has a session', async () => {
    const records = [{ techniqueId: 'box', completedAt: TODAY }];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getCurrentStreak()).toBe(1);
  });

  it('counts consecutive days ending today', async () => {
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: YESTERDAY },
      { techniqueId: 'box', completedAt: TWO_DAYS_AGO },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getCurrentStreak()).toBe(3);
  });

  it('stops at a gap in consecutive days', async () => {
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: YESTERDAY },
      { techniqueId: 'box', completedAt: THREE_DAYS_AGO }, // gap at TWO_DAYS_AGO
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getCurrentStreak()).toBe(2);
  });

  it('starts from yesterday when today has no session', async () => {
    const records = [
      { techniqueId: 'box', completedAt: YESTERDAY },
      { techniqueId: 'box', completedAt: TWO_DAYS_AGO },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getCurrentStreak()).toBe(2);
  });
});

describe('getStreakInfo', () => {
  it('returns 0 streak and 0 freezes when there are no sessions', async () => {
    mockGetItem.mockResolvedValue(null);
    const info = await getStreakInfo();
    expect(info).toEqual({ streak: 0, availableFreezes: 0 });
  });

  it('returns streak without freezes when gap is larger than 1 day', async () => {
    // Gap at TWO_DAYS_AGO → streak breaks even with a freeze available
    const records = [{ techniqueId: 'box', completedAt: TODAY }];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    // Streak = 1, gap at yesterday, then nothing before that
    const info = await getStreakInfo();
    expect(info.streak).toBe(1);
  });

  it('bridges a single missed day using an available freeze', async () => {
    // Sessions on today and two days ago; yesterday is the gap.
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: TWO_DAYS_AGO },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    mockReadFreezeState.mockResolvedValue({ available: 1, appliedDates: [] });

    const info = await getStreakInfo();
    expect(info.streak).toBe(3); // today + yesterday (frozen) + two days ago
    expect(info.availableFreezes).toBe(0);
    expect(mockApplyFreezesToDates).toHaveBeenCalledWith([
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // YESTERDAY date
    ]);
  });

  it('uses an already-applied frozen date without consuming another freeze', async () => {
    const YESTERDAY_STR = '2026-01-06';
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: TWO_DAYS_AGO },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    mockReadFreezeState.mockResolvedValue({
      available: 0,
      appliedDates: [YESTERDAY_STR],
    });

    const info = await getStreakInfo();
    expect(info.streak).toBe(3);
    expect(info.availableFreezes).toBe(0);
    expect(mockApplyFreezesToDates).not.toHaveBeenCalled();
  });

  it('does not bridge a gap when no freezes are available', async () => {
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: TWO_DAYS_AGO },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    // NO_FREEZES already set in beforeEach

    const info = await getStreakInfo();
    expect(info.streak).toBe(1); // only today
    expect(mockApplyFreezesToDates).not.toHaveBeenCalled();
  });

  it('returns available freeze count when no freeze is needed', async () => {
    const records = [
      { techniqueId: 'box', completedAt: TODAY },
      { techniqueId: 'box', completedAt: YESTERDAY },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    mockReadFreezeState.mockResolvedValue({ available: 2, appliedDates: [] });

    const info = await getStreakInfo();
    expect(info.streak).toBe(2);
    expect(info.availableFreezes).toBe(2);
  });
});
