import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAvailableFreezes,
  applyFreezesToDates,
  awardFreezes,
  readFreezeState,
} from '@/store/streak-freeze';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockSetItem.mockResolvedValue(undefined);
});

describe('readFreezeState', () => {
  it('returns default state when nothing stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const state = await readFreezeState();
    expect(state).toEqual({ available: 0, appliedDates: [] });
  });

  it('returns default state when stored value is malformed', async () => {
    mockGetItem.mockResolvedValue('not-json');
    const state = await readFreezeState();
    expect(state).toEqual({ available: 0, appliedDates: [] });
  });

  it('parses stored state correctly', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ available: 2, appliedDates: ['2026-01-08'] }),
    );
    const state = await readFreezeState();
    expect(state).toEqual({ available: 2, appliedDates: ['2026-01-08'] });
  });
});

describe('getAvailableFreezes', () => {
  it('returns 0 when nothing stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getAvailableFreezes()).toBe(0);
  });

  it('returns stored available count', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ available: 3, appliedDates: [] }));
    expect(await getAvailableFreezes()).toBe(3);
  });
});

describe('awardFreezes', () => {
  it('increments available count', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ available: 1, appliedDates: [] }));
    await awardFreezes(2);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.available).toBe(3);
  });

  it('does nothing when count is 0', async () => {
    await awardFreezes(0);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('applyFreezesToDates', () => {
  it('records the date and decrements available', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ available: 2, appliedDates: [] }));
    await applyFreezesToDates(['2026-01-08']);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.available).toBe(1);
    expect(saved.appliedDates).toContain('2026-01-08');
  });

  it('is idempotent for dates already applied', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ available: 1, appliedDates: ['2026-01-08'] }),
    );
    await applyFreezesToDates(['2026-01-08']);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('does nothing for an empty date list', async () => {
    await applyFreezesToDates([]);
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('does not go below 0 available', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ available: 0, appliedDates: [] }));
    await applyFreezesToDates(['2026-01-08']);
    // newDates = ['2026-01-08'], length 1, so it WILL write (new date not in list)
    // but available is clamped to max(0, 0-1) = 0
    const saved = JSON.parse(mockSetItem.mock.calls[0][1] as string);
    expect(saved.available).toBe(0);
  });
});
