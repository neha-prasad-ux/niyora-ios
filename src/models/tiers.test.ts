import {
  TIERS,
  currentTier,
  nextTier,
  sessionsToNext,
  earnedTierBetween,
  tierRingCount,
} from './tiers';

describe('currentTier', () => {
  it('returns Spark only before the first ring', () => {
    expect(currentTier(0).id).toBe('spark');
  });

  it('steps up at each threshold boundary', () => {
    expect(currentTier(1).id).toBe('glow'); // first ring after one session
    expect(currentTier(4).id).toBe('glow');
    expect(currentTier(5).id).toBe('shine');
    expect(currentTier(15).id).toBe('radiance');
    expect(currentTier(40).id).toBe('brilliance');
  });

  it('caps at Brilliance for very high counts', () => {
    expect(currentTier(1000).id).toBe('brilliance');
  });
});

describe('nextTier', () => {
  it('returns the following tier', () => {
    expect(nextTier(TIERS[0])?.id).toBe('glow');
    expect(nextTier(currentTier(5))?.id).toBe('radiance');
  });

  it('returns null at the top tier', () => {
    expect(nextTier(currentTier(40))).toBeNull();
  });
});

describe('sessionsToNext', () => {
  it('counts sessions remaining to the next tier', () => {
    expect(sessionsToNext(0)).toBe(1); // -> Glow at 1
    expect(sessionsToNext(1)).toBe(4); // -> Shine at 5
    expect(sessionsToNext(5)).toBe(10); // -> Radiance at 15
  });

  it('returns 0 at the top tier', () => {
    expect(sessionsToNext(40)).toBe(0);
    expect(sessionsToNext(200)).toBe(0);
  });
});

describe('earnedTierBetween', () => {
  it('earns the first ring on the very first session', () => {
    expect(earnedTierBetween(0, 1)?.id).toBe('glow');
  });

  it('returns the new tier on the session that crosses a threshold', () => {
    expect(earnedTierBetween(4, 5)?.id).toBe('shine');
    expect(earnedTierBetween(14, 15)?.id).toBe('radiance');
    expect(earnedTierBetween(39, 40)?.id).toBe('brilliance');
  });

  it('returns null when no threshold is crossed', () => {
    expect(earnedTierBetween(1, 2)).toBeNull();
    expect(earnedTierBetween(5, 6)).toBeNull();
    expect(earnedTierBetween(40, 200)).toBeNull();
  });

  it('does not fire on the same count (idempotent)', () => {
    expect(earnedTierBetween(5, 5)).toBeNull();
  });
});

describe('tierRingCount', () => {
  it('maps each tier to a ring count equal to its index', () => {
    expect(tierRingCount('spark')).toBe(0);
    expect(tierRingCount('glow')).toBe(1);
    expect(tierRingCount('brilliance')).toBe(TIERS.length - 1);
  });
});
