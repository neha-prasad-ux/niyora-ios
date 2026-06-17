import {
  evaluateStress,
  DEFAULT_STRESS_CONFIG,
  type ActivitySignals,
} from '@/lib/stress-detect';
import { computeBaseline, type BaselineModel, type HrSample } from '@/lib/hr-baseline';

const NOW = new Date(2026, 5, 15, 14, 0, 0); // local 14:00

// A baseline whose 14:00 bucket rests at ~60 bpm.
function baselineResting60(): BaselineModel {
  const samples: HrSample[] = Array.from({ length: 40 }, (_, i) => ({
    bpm: 60 + (i % 5), // 60..64
    date: new Date(2026, 5, 1 + Math.floor(i / 20), 14, i % 60, 0).toISOString(),
  }));
  return computeBaseline(samples); // p25 ~ 60-61
}

// HR samples every 20s across the last `spanMin` minutes ending at NOW.
function recentHr(bpm: number | ((i: number) => number), spanMin: number): HrSample[] {
  const out: HrSample[] = [];
  const stepMs = 20_000;
  const count = Math.floor((spanMin * 60_000) / stepMs);
  for (let i = 0; i < count; i++) {
    const t = new Date(NOW.getTime() - i * stepMs);
    out.push({ bpm: typeof bpm === 'function' ? bpm(i) : bpm, date: t.toISOString() });
  }
  return out;
}

const STILL: ActivitySignals = { steps: 0, activeEnergyKcal: 0, hasActiveWorkout: false };

describe('evaluateStress — activity gate', () => {
  it('returns active when a workout is in progress', () => {
    const v = evaluateStress(recentHr(90, 5), baselineResting60(), {
      ...STILL,
      hasActiveWorkout: true,
    }, NOW);
    expect(v.reason).toBe('active');
    expect(v.stressed).toBe(false);
  });

  it('returns active when steps exceed the threshold', () => {
    const v = evaluateStress(recentHr(90, 5), baselineResting60(), {
      ...STILL,
      steps: DEFAULT_STRESS_CONFIG.maxSteps + 1,
    }, NOW);
    expect(v.reason).toBe('active');
  });

  it('returns active when active energy exceeds the threshold', () => {
    const v = evaluateStress(recentHr(90, 5), baselineResting60(), {
      ...STILL,
      activeEnergyKcal: DEFAULT_STRESS_CONFIG.maxActiveEnergyKcal + 1,
    }, NOW);
    expect(v.reason).toBe('active');
  });

  it('gate wins even with no baseline (exercise is decisively not the trigger)', () => {
    const empty = computeBaseline([]);
    const v = evaluateStress(recentHr(90, 5), empty, { ...STILL, hasActiveWorkout: true }, NOW);
    expect(v.reason).toBe('active');
  });
});

describe('evaluateStress — preconditions', () => {
  it('returns no-baseline when the model is empty and the user is still', () => {
    const empty = computeBaseline([]);
    const v = evaluateStress(recentHr(90, 5), empty, STILL, NOW);
    expect(v.reason).toBe('no-baseline');
    expect(v.stressed).toBe(false);
  });

  it('returns insufficient-data when the window has too little coverage', () => {
    // Only ~1 min of data, below the 3-min minimum coverage.
    const v = evaluateStress(recentHr(90, 1), baselineResting60(), STILL, NOW);
    expect(v.reason).toBe('insufficient-data');
    expect(v.resting).not.toBeNull();
  });

  it('returns insufficient-data when there are no recent samples', () => {
    const v = evaluateStress([], baselineResting60(), STILL, NOW);
    expect(v.reason).toBe('insufficient-data');
    expect(v.currentHr).toBeNull();
  });

  it('ignores samples outside the sustain window', () => {
    // All samples are 30+ min old -> none fall in the 5-min window.
    const old = recentHr(90, 5).map((s) => ({
      ...s,
      date: new Date(new Date(s.date).getTime() - 30 * 60_000).toISOString(),
    }));
    const v = evaluateStress(old, baselineResting60(), STILL, NOW);
    expect(v.reason).toBe('insufficient-data');
  });
});

describe('evaluateStress — verdict', () => {
  it('flags sustained elevation at rest as stressed', () => {
    // ~88 bpm vs resting ~60 -> well above the 12% threshold, for 5 min, still.
    const v = evaluateStress(recentHr(88, 5), baselineResting60(), STILL, NOW);
    expect(v.reason).toBe('stressed');
    expect(v.stressed).toBe(true);
    expect(v.threshold).toBeCloseTo(v.resting! * 1.12);
    expect(v.elevatedFraction).toBe(1);
    expect(v.currentHr).toBe(88);
  });

  it('treats resting-level HR as calm', () => {
    const v = evaluateStress(recentHr(61, 5), baselineResting60(), STILL, NOW);
    expect(v.reason).toBe('calm');
    expect(v.stressed).toBe(false);
    expect(v.elevatedFraction).toBe(0);
  });

  it('does not fire on a brief spike inside an otherwise-calm window', () => {
    // First ~40s elevated, the rest calm -> elevated fraction well below 0.7.
    const v = evaluateStress(
      recentHr((i) => (i < 2 ? 100 : 61), 5),
      baselineResting60(),
      STILL,
      NOW,
    );
    expect(v.stressed).toBe(false);
    expect(v.reason).toBe('calm');
    expect(v.elevatedFraction!).toBeLessThan(0.7);
  });

  it('respects a custom elevation threshold', () => {
    // 70 bpm vs resting 60 = ~16%. Default 12% -> stressed; 25% -> calm.
    const hot = evaluateStress(recentHr(70, 5), baselineResting60(), STILL, NOW);
    expect(hot.reason).toBe('stressed');
    const strict = evaluateStress(recentHr(70, 5), baselineResting60(), STILL, NOW, {
      elevationPct: 0.25,
    });
    expect(strict.reason).toBe('calm');
  });

  it('requires sustained, not just majority-at-one-instant, elevation', () => {
    // Exactly at the 0.7 fraction boundary: 70% elevated -> stressed.
    const v = evaluateStress(
      recentHr((i) => (i < 11 ? 90 : 61), 5), // 15 samples, 11 elevated ~= 0.73
      baselineResting60(),
      STILL,
      NOW,
    );
    expect(v.elevatedFraction!).toBeGreaterThanOrEqual(0.7);
    expect(v.stressed).toBe(true);
  });
});
