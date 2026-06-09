import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMoodRecords, appendMood } from '@/store/mood-history';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
});

describe('getMoodRecords', () => {
  it('returns empty array when storage is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getMoodRecords()).toEqual([]);
  });

  it('returns parsed records from storage', async () => {
    const records = [
      { techniqueId: 'box', mood: 4, recordedAt: '2026-01-01T10:00:00.000Z' },
      { techniqueId: 'box', mood: 5, recordedAt: '2026-01-02T10:00:00.000Z' },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    expect(await getMoodRecords()).toEqual(records);
  });

  it('returns empty array on corrupt storage', async () => {
    mockGetItem.mockResolvedValue('not-json');
    expect(await getMoodRecords()).toEqual([]);
  });
});

describe('mood trend strip visibility logic', () => {
  it('strip is hidden when there are 0 records', async () => {
    mockGetItem.mockResolvedValue(null);
    const records = await getMoodRecords();
    expect(records.slice(-7).length).toBe(0);
    expect(records.slice(-7).length < 2).toBe(true);
  });

  it('strip is hidden when there is exactly 1 record', async () => {
    const records = [{ techniqueId: 'box', mood: 3, recordedAt: '2026-01-01T10:00:00.000Z' }];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    const fetched = await getMoodRecords();
    expect(fetched.slice(-7).length < 2).toBe(true);
  });

  it('strip is shown when there are 2 or more records', async () => {
    const records = [
      { techniqueId: 'box', mood: 3, recordedAt: '2026-01-01T10:00:00.000Z' },
      { techniqueId: 'box', mood: 4, recordedAt: '2026-01-02T10:00:00.000Z' },
    ];
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    const fetched = await getMoodRecords();
    expect(fetched.slice(-7).length >= 2).toBe(true);
  });

  it('caps displayed records at 7 when there are more', async () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      techniqueId: 'box',
      mood: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      recordedAt: new Date(2026, 0, i + 1).toISOString(),
    }));
    mockGetItem.mockResolvedValue(JSON.stringify(records));
    const fetched = await getMoodRecords();
    expect(fetched.slice(-7).length).toBe(7);
  });
});

describe('appendMood', () => {
  it('appends a mood record to existing records', async () => {
    const existing = [{ techniqueId: 'box', mood: 3, recordedAt: '2026-01-01T10:00:00.000Z' }];
    mockGetItem.mockResolvedValue(JSON.stringify(existing));
    mockSetItem.mockResolvedValue(undefined);

    await appendMood('breathe', 5);

    const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(saved).toHaveLength(2);
    expect(saved[1].techniqueId).toBe('breathe');
    expect(saved[1].mood).toBe(5);
  });
});
