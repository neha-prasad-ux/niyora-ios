import {
  computeBaseline,
  percentile,
  restingForHour,
  restingAt,
  type HrSample,
} from '@/lib/hr-baseline';

// Build `count` samples at a given local hour with the given bpm values,
// cycling through `bpms`. Dates are spread across days so they all land in the
// same hour-of-day bucket.
function samplesAtHour(hour: number, bpms: number[], count: number): HrSample[] {
  const out: HrSample[] = [];
  for (let i = 0; i < count; i++) {
    const day = 1 + Math.floor(i / 50); // spread across days, same hour-of-day
    // Local-time constructor so the bucket matches the machine's timezone,
    // exactly as computeBaseline reads it via Date#getHours.
    const d = new Date(2026, 0, day, hour, i % 60, 0);
    out.push({ bpm: bpms[i % bpms.length], date: d.toISOString() });
  }
  return out;
}

describe('percentile', () => {
  it('returns NaN for empty input', () => {
    expect(percentile([], 0.25)).toBeNaN();
  });

  it('returns the single value for a one-element array', () => {
    expect(percentile([62], 0.25)).toBe(62);
  });

  it('computes p0, p50, p100 as min, median, max', () => {
    const v = [10, 20, 30, 40, 50];
    expect(percentile(v, 0)).toBe(10);
    expect(percentile(v, 0.5)).toBe(30);
    expect(percentile(v, 1)).toBe(50);
  });

  it('interpolates between ranks', () => {
    // p25 of [10,20,30,40,50]: rank = 0.25*4 = 1.0 -> exactly 20
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    // p10: rank = 0.1*4 = 0.4 -> 10 + 0.4*(20-10) = 14
    expect(percentile([10, 20, 30, 40, 50], 0.1)).toBeCloseTo(14);
  });

  it('does not mutate its input', () => {
    const v = [3, 1, 2];
    percentile(v, 0.5);
    expect(v).toEqual([3, 1, 2]);
  });
});

describe('computeBaseline', () => {
  it('returns an all-null model for no samples', () => {
    const m = computeBaseline([]);
    expect(m.sampleCount).toBe(0);
    expect(m.global).toBeNull();
    expect(m.byHour).toHaveLength(24);
    expect(m.byHour.every((h) => h === null)).toBe(true);
  });

  it('buckets by local hour and takes the low percentile as resting', () => {
    // Hour 3: readings 60..69 (calm). Resting (p25) should sit near the low end.
    const samples = samplesAtHour(3, [60, 61, 62, 63, 64, 65, 66, 67, 68, 69], 40);
    const m = computeBaseline(samples);
    const h3 = m.byHour[3];
    expect(h3).not.toBeNull();
    expect(h3!.count).toBe(40);
    expect(h3!.resting).toBeGreaterThanOrEqual(60);
    expect(h3!.resting).toBeLessThan(h3!.median);
    expect(h3!.median).toBeCloseTo(64.5, 0);
  });

  it('marks hours below the sample threshold as null but still feeds global', () => {
    const sparse = samplesAtHour(9, [70], 5); // below default minSamplesPerHour (20)
    const m = computeBaseline(sparse);
    expect(m.byHour[9]).toBeNull();
    expect(m.global).not.toBeNull();
    expect(m.global!.count).toBe(5);
    expect(m.sampleCount).toBe(5);
  });

  it('keeps distinct resting levels for different times of day', () => {
    // Early morning lower than mid-afternoon — the whole reason for time-of-day.
    const morning = samplesAtHour(4, [55, 56, 57, 58, 59], 30);
    const afternoon = samplesAtHour(15, [72, 74, 76, 78, 80], 30);
    const m = computeBaseline([...morning, ...afternoon]);
    expect(m.byHour[4]!.resting).toBeLessThan(m.byHour[15]!.resting);
  });

  it('drops implausible bpm values', () => {
    // 4-value cycle, 1 of 4 in range (65) -> 10 valid of 40.
    const samples = samplesAtHour(10, [0, 5, 300, 65], 40);
    const m = computeBaseline(samples, { minSamplesPerHour: 5 });
    expect(m.sampleCount).toBe(10); // 30 junk readings dropped
    expect(m.byHour[10]!.count).toBe(10);
    expect(m.byHour[10]!.resting).toBe(65);
  });

  it('honours a custom resting percentile', () => {
    const samples = samplesAtHour(6, [60, 65, 70, 75, 80], 40);
    const low = computeBaseline(samples, { restingPercentile: 0.1 });
    const high = computeBaseline(samples, { restingPercentile: 0.5 });
    expect(low.byHour[6]!.resting).toBeLessThan(high.byHour[6]!.resting);
  });
});

describe('restingForHour / restingAt', () => {
  it('returns the hour bucket when present', () => {
    const m = computeBaseline(samplesAtHour(8, [60, 62, 64], 30));
    expect(restingForHour(m, 8)).toBe(m.byHour[8]!.resting);
  });

  it('falls back to global for a sparse hour', () => {
    const m = computeBaseline(samplesAtHour(8, [60, 62, 64], 30));
    // Hour 20 has no samples -> global fallback.
    expect(restingForHour(m, 20)).toBe(m.global!.resting);
  });

  it('returns null when the model has no data', () => {
    const m = computeBaseline([]);
    expect(restingForHour(m, 12)).toBeNull();
  });

  it('normalises out-of-range hours', () => {
    const m = computeBaseline(samplesAtHour(8, [60, 62, 64], 30));
    expect(restingForHour(m, 32)).toBe(restingForHour(m, 8)); // 32 % 24 = 8
    expect(restingForHour(m, -16)).toBe(restingForHour(m, 8)); // -16 -> 8
  });

  it('restingAt uses the local hour of the given date', () => {
    const m = computeBaseline(samplesAtHour(8, [60, 62, 64], 30));
    const at = new Date(2026, 0, 1, 8, 30, 0);
    expect(restingAt(m, at)).toBe(m.byHour[8]!.resting);
  });
});
