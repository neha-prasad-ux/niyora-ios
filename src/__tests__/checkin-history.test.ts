import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendCheckIn, getCheckInRecords } from '@/store/checkin-history';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  const store: Record<string, string> = {};
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockGetItem.mockImplementation((key: string) => Promise.resolve(store[key] ?? null));
  mockSetItem.mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
});

describe('getCheckInRecords', () => {
  it('returns [] when the store is empty', async () => {
    expect(await getCheckInRecords()).toEqual([]);
  });
});

describe('appendCheckIn', () => {
  it('appends one record with a valid ISO recordedAt string', async () => {
    await appendCheckIn('light');
    const records = await getCheckInRecords();

    expect(records).toHaveLength(1);
    expect(records[0].level).toBe('light');
    expect(new Date(records[0].recordedAt).toISOString()).toBe(records[0].recordedAt);
  });

  it('appends two records and returns them in insertion order', async () => {
    await appendCheckIn('light');
    await appendCheckIn('heavy');
    const records = await getCheckInRecords();

    expect(records).toHaveLength(2);
    expect(records[0].level).toBe('light');
    expect(records[1].level).toBe('heavy');
  });
});
