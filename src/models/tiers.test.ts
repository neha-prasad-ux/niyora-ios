import {
  TIERS,
  currentTier,
  nextTier,
  lightToNext,
  earnedTierBetween,
  tierRingCount,
} from './tiers';
import { RINGS } from '@/lib/moon-light';

describe('currentTier', () => {
  it('returns the bare base tier before any ring is earned', () => {
    expect(currentTier(0).id).toBe('base');
    expect(currentTier(0).name).toBe('');
  });

  it('steps up at each lifetime-light threshold', () => {
    expect(currentTier(20).id).toBe('spark'); // first ring with day one's first act
    expect(currentTier(99).id).toBe('spark');
    expect(currentTier(100).id).toBe('glow');
    expect(currentTier(300).id).toBe('shine');
    expect(currentTier(600).id).toBe('radiance');
  });

  it('stays aligned with the moon spec ring thresholds', () => {
    expect(TIERS.slice(1).map((t) => t.threshold)).toEqual(RINGS.map((r) => r.light));
  });

  it('caps at Radiance for very high light', () => {
    expect(currentTier(100000).id).toBe('radiance');
  });
});

describe('nextTier', () => {
  it('returns the following tier', () => {
    expect(nextTier(TIERS[0])?.id).toBe('spark');
    expect(nextTier(currentTier(100))?.id).toBe('shine');
  });

  it('returns null at the top tier', () => {
    expect(nextTier(currentTier(600))).toBeNull();
  });
});

describe('lightToNext', () => {
  it('counts light remaining to the next ring', () => {
    expect(lightToNext(0)).toBe(20); // -> Spark at 20
    expect(lightToNext(20)).toBe(80); // -> Glow at 100
    expect(lightToNext(100)).toBe(200); // -> Shine at 300
  });

  it('returns 0 at the top ring', () => {
    expect(lightToNext(600)).toBe(0);
    expect(lightToNext(5000)).toBe(0);
  });
});

describe('earnedTierBetween', () => {
  it('earns the first Spark ring with the first light of day one', () => {
    expect(earnedTierBetween(0, 20)?.id).toBe('spark');
  });

  it('returns the new ring on the act that crosses a threshold', () => {
    expect(earnedTierBetween(90, 105)?.id).toBe('glow');
    expect(earnedTierBetween(290, 310)?.id).toBe('shine');
    expect(earnedTierBetween(580, 620)?.id).toBe('radiance');
  });

  it('returns null when no threshold is crossed', () => {
    expect(earnedTierBetween(20, 40)).toBeNull();
    expect(earnedTierBetween(100, 150)).toBeNull();
    expect(earnedTierBetween(600, 9000)).toBeNull();
  });

  it('does not fire on the same light (idempotent)', () => {
    expect(earnedTierBetween(100, 100)).toBeNull();
  });
});

describe('tierRingCount', () => {
  it('widens the band one ring per tier', () => {
    expect(tierRingCount('base')).toBe(0);
    expect(tierRingCount('spark')).toBe(1);
    expect(tierRingCount('glow')).toBe(2);
    expect(tierRingCount('shine')).toBe(3);
    expect(tierRingCount('radiance')).toBe(4);
  });
});
