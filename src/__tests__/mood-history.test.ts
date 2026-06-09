import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendMood, getMoodRecords } from '@/store/mood-history';

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
  it('returns [] when the store is empty', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await getMoodRecords()).toEqual([]);
  });
});

describe('appendMood + getMoodRecords', () => {
  it('returns one record with a string recordedAt after a single append', async () => {
    let stored: string | null = null;
    mockGetItem.mockImplementation(() => Promise.resolve(stored));
    mockSetItem.mockImplementation((_key: string, value: string) => {
      stored = value;
      return Promise.resolve();
    });

    await appendMood('box', 3);
    const records = await getMoodRecords();

    expect(records).toHaveLength(1);
    expect(records[0].mood).toBe(3);
    expect(typeof records[0].recordedAt).toBe('string');
    expect(records[0].recordedAt.length).toBeGreaterThan(0);
  });

  it('returns both records in insertion order after two appends', async () => {
    let stored: string | null = null;
    mockGetItem.mockImplementation(() => Promise.resolve(stored));
    mockSetItem.mockImplementation((_key: string, value: string) => {
      stored = value;
      return Promise.resolve();
    });

    await appendMood('box', 2);
    await appendMood('478', 4);
    const records = await getMoodRecords();

    expect(records).toHaveLength(2);
    expect(records[0].mood).toBe(2);
    expect(records[1].mood).toBe(4);
  });
});
