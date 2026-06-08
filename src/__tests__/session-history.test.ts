import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSessionsThisWeek } from '@/store/session-history';

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
