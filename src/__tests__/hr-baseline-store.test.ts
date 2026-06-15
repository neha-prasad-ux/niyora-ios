import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  readBaseline,
  saveBaseline,
  updateBaselineFromSamples,
} from '@/store/hr-baseline';
import { computeBaseline, type HrSample } from '@/lib/hr-baseline';

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

function manySamples(hour: number, bpm: number, count: number): HrSample[] {
  return Array.from({ length: count }, (_, i) => ({
    bpm,
    date: new Date(2026, 0, 1 + Math.floor(i / 50), hour, i % 60, 0).toISOString(),
  }));
}

describe('readBaseline', () => {
  it('returns null when nothing stored', async () => {
    mockGetItem.mockResolvedValue(null);
    expect(await readBaseline()).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    mockGetItem.mockResolvedValue('not-json');
    expect(await readBaseline()).toBeNull();
  });

  it('returns null when the shape is wrong (missing 24-hour array)', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ model: { byHour: [1, 2] } }));
    expect(await readBaseline()).toBeNull();
  });

  it('parses a well-formed stored baseline', async () => {
    const model = computeBaseline(manySamples(7, 60, 30));
    mockGetItem.mockResolvedValue(
      JSON.stringify({ model, updatedAt: '2026-06-15T00:00:00.000Z' }),
    );
    const stored = await readBaseline();
    expect(stored?.model.byHour).toHaveLength(24);
    expect(stored?.updatedAt).toBe('2026-06-15T00:00:00.000Z');
  });
});

describe('saveBaseline', () => {
  it('persists the model with an updatedAt timestamp', async () => {
    const model = computeBaseline(manySamples(7, 60, 30));
    await saveBaseline(model, new Date(2026, 5, 15, 12, 0, 0));
    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const [key, value] = mockSetItem.mock.calls[0];
    expect(key).toBe('niyora:hr-baseline');
    const payload = JSON.parse(value);
    expect(payload.model.byHour).toHaveLength(24);
    expect(typeof payload.updatedAt).toBe('string');
  });
});

describe('updateBaselineFromSamples', () => {
  it('computes, persists, and returns the model', async () => {
    const samples = manySamples(7, 60, 30);
    const model = await updateBaselineFromSamples(samples);
    expect(model.byHour[7]).not.toBeNull();
    expect(model.byHour[7]!.resting).toBe(60);
    expect(mockSetItem).toHaveBeenCalledTimes(1);
  });

  it('passes options through to computeBaseline', async () => {
    const samples = manySamples(7, 60, 10); // below default threshold
    const model = await updateBaselineFromSamples(samples, { minSamplesPerHour: 5 });
    expect(model.byHour[7]).not.toBeNull();
  });
});
