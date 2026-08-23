jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { preparednessScore, prepBand, PREP_CEILING } from '@/lib/preparedness';
import { READINESS_CHECK_IDS, type ReadinessChecks } from '@/store/pms-readiness';

// Build a checks object with the first `n` factors ticked.
function checksWith(n: number): ReadinessChecks {
  const checks = {} as ReadinessChecks;
  READINESS_CHECK_IDS.forEach((id, i) => {
    checks[id] = i < n;
  });
  return checks;
}

const NONE = checksWith(0);
const ALL = checksWith(READINESS_CHECK_IDS.length);

describe('preparednessScore', () => {
  it('is 0 with nothing done', () => {
    expect(preparednessScore(NONE, false)).toBe(0);
  });

  it('never reaches the ceiling, even everything done', () => {
    const max = preparednessScore(ALL, true);
    expect(max).toBeLessThan(PREP_CEILING + 1e-9);
    expect(max).toBeLessThan(1);
  });

  it('climbs monotonically as more is done', () => {
    let prev = -1;
    for (let n = 0; n <= READINESS_CHECK_IDS.length; n++) {
      const s = preparednessScore(checksWith(n), false);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it('has diminishing returns, each step adds less than the last', () => {
    const s = [0, 1, 2, 3].map((n) => preparednessScore(checksWith(n), false));
    const d1 = s[1] - s[0];
    const d2 = s[2] - s[1];
    const d3 = s[3] - s[2];
    expect(d2).toBeLessThan(d1);
    expect(d3).toBeLessThan(d2);
  });

  it('counts the calm session as a contribution', () => {
    expect(preparednessScore(NONE, true)).toBeGreaterThan(preparednessScore(NONE, false));
  });
});

describe('prepBand', () => {
  it('starts at "Getting started" and never claims completion', () => {
    expect(prepBand(0)).toBe('Getting started');
    // The top rung praises effort, it does not say "done" / "100%".
    expect(prepBand(preparednessScore(ALL, true))).toBe('You are doing great');
  });

  it('moves up through the ladder as the score rises', () => {
    const labels = [0, 0.3, 0.5, 0.7, 0.9].map(prepBand);
    // Never regresses as the score climbs.
    const rank = (l: string) =>
      ['Getting started', 'A little', 'Half way', 'Well prepared', 'You are doing great'].indexOf(l);
    for (let i = 1; i < labels.length; i++) {
      expect(rank(labels[i])).toBeGreaterThanOrEqual(rank(labels[i - 1]));
    }
  });
});
