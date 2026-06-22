import { refreshBaselineIfStale, type BaselineRefreshDeps } from '@/lib/baseline-refresh';
import type { ActivityBucket, HrSample } from '@/lib/hr-baseline';
import type { StoredBaseline } from '@/store/hr-baseline';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const NOW = new Date(2026, 5, 17, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

// HR + matching still buckets at hour 14, enough to clear the threshold.
function freshData(): { hr: HrSample[]; buckets: ActivityBucket[] } {
  const start = new Date(2026, 5, 16, 14, 0, 0).getTime();
  const bMs = 5 * 60_000;
  const hr: HrSample[] = [];
  const buckets: ActivityBucket[] = [];
  for (let i = 0; i < 30; i++) {
    buckets.push({ start: new Date(start + i * bMs).toISOString(), steps: 0, kcal: 0 });
    for (let k = 0; k < 2; k++) {
      hr.push({ bpm: 62, date: new Date(start + i * bMs + k * 30_000).toISOString() });
    }
  }
  return { hr, buckets };
}

function deps(overrides: Partial<BaselineRefreshDeps> = {}): BaselineRefreshDeps {
  const { hr, buckets } = freshData();
  return {
    now: NOW,
    readStored: jest.fn().mockResolvedValue(null), // stale by default
    getHr: jest.fn().mockResolvedValue(hr),
    getActivityBuckets: jest.fn().mockResolvedValue(buckets),
    getWorkouts: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function storedAt(iso: string): StoredBaseline {
  return {
    model: { byHour: Array(24).fill(null), global: null, sampleCount: 1 },
    updatedAt: iso,
  };
}

describe('refreshBaselineIfStale', () => {
  it('rebuilds and saves when there is no stored baseline', async () => {
    const d = deps();
    const r = await refreshBaselineIfStale(d);
    expect(r.refreshed).toBe(true);
    expect(r.samples).toBeGreaterThan(0);
    expect(d.save).toHaveBeenCalledTimes(1);
  });

  it('rebuilds when the stored baseline is older than maxAge', async () => {
    const old = storedAt(new Date(NOW.getTime() - 2 * DAY).toISOString());
    const d = deps({ readStored: jest.fn().mockResolvedValue(old) });
    const r = await refreshBaselineIfStale(d);
    expect(r.refreshed).toBe(true);
    expect(d.getHr).toHaveBeenCalled();
  });

  it('does nothing when the stored baseline is still fresh', async () => {
    const recent = storedAt(new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString()); // 1h old
    const d = deps({ readStored: jest.fn().mockResolvedValue(recent) });
    const r = await refreshBaselineIfStale(d);
    expect(r.refreshed).toBe(false);
    expect(d.getHr).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
  });

  it('does not overwrite a good baseline with empty data (watch off)', async () => {
    const d = deps({
      readStored: jest.fn().mockResolvedValue(null),
      getHr: jest.fn().mockResolvedValue([]),
      getActivityBuckets: jest.fn().mockResolvedValue([]),
    });
    const r = await refreshBaselineIfStale(d);
    expect(r.refreshed).toBe(false);
    expect(d.save).not.toHaveBeenCalled();
  });

  it('honours a custom maxAge', async () => {
    const stored = storedAt(new Date(NOW.getTime() - 30 * 60_000).toISOString()); // 30 min old
    const d = deps({ readStored: jest.fn().mockResolvedValue(stored), maxAgeMs: 10 * 60_000 });
    const r = await refreshBaselineIfStale(d);
    expect(r.refreshed).toBe(true); // 30 min > 10 min cap
  });
});
