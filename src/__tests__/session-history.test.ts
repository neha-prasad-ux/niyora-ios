import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionsThisWeek, getSessionsToday, getCurrentStreak } from '@/store/session-history';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;

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

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FAKE_NOW);
  mockGetItem.mockReset();
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
