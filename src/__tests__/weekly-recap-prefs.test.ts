import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  currentWeekKey,
  getRecapDismissedWeek,
  setRecapDismissedWeek,
} from '@/store/weekly-recap-prefs';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  mockGetItem.mockReset();
  mockSetItem.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('currentWeekKey', () => {
  it('returns a string in YYYY-WNN format', () => {
    jest.setSystemTime(new Date(2026, 5, 10, 12, 0, 0)); // Wed Jun 10 2026
    expect(currentWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('returns the same key for all days in the same ISO week', () => {
    // ISO week 24 of 2026: Mon Jun 8 to Sun Jun 14
    const days = [8, 9, 10, 11, 12, 13, 14];
    const keys = days.map((d) => {
      jest.setSystemTime(new Date(2026, 5, d, 12, 0, 0));
      return currentWeekKey();
    });
    expect(new Set(keys).size).toBe(1);
  });

  it('returns different keys for days in different ISO weeks', () => {
    jest.setSystemTime(new Date(2026, 5, 7, 12, 0, 0)); // Sun Jun 7 (end of W23)
    const keyW23 = currentWeekKey();
    jest.setSystemTime(new Date(2026, 5, 8, 12, 0, 0)); // Mon Jun 8 (start of W24)
    const keyW24 = currentWeekKey();
    expect(keyW23).not.toBe(keyW24);
  });

  it('handles year boundary correctly (Jan 1 belonging to prior year week)', () => {
    // Jan 1 2026 is a Thursday, so it belongs to 2026-W01.
    jest.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
    expect(currentWeekKey()).toBe('2026-W01');
  });
});

describe('getRecapDismissedWeek', () => {
  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getRecapDismissedWeek()).toBeNull();
  });

  it('returns the stored week key', async () => {
    mockGetItem.mockResolvedValue('2026-W24');
    expect(await getRecapDismissedWeek()).toBe('2026-W24');
  });
});

describe('setRecapDismissedWeek', () => {
  it('stores the week key', async () => {
    mockSetItem.mockResolvedValue(undefined);
    await setRecapDismissedWeek('2026-W24');
    expect(mockSetItem).toHaveBeenCalledWith('niyora:weekly-recap-dismissed', '2026-W24');
  });
});
