import { TIERS, currentTier, nextTier, sessionsToNext, tierById } from '@/models/tiers';

describe('currentTier', () => {
  it('returns spark at 0 sessions', () => {
    expect(currentTier(0).id).toBe('spark');
  });

  it('returns spark just below glow threshold', () => {
    expect(currentTier(4).id).toBe('spark');
  });

  it('returns glow at the glow threshold', () => {
    expect(currentTier(5).id).toBe('glow');
  });

  it('returns shine at 15 sessions', () => {
    expect(currentTier(15).id).toBe('shine');
  });

  it('returns radiance at 40 sessions', () => {
    expect(currentTier(40).id).toBe('radiance');
  });

  it('returns brilliance at 80 sessions', () => {
    expect(currentTier(80).id).toBe('brilliance');
  });

  it('stays at brilliance beyond the max threshold', () => {
    expect(currentTier(200).id).toBe('brilliance');
  });
});

describe('nextTier', () => {
  it('returns glow when current tier is spark', () => {
    expect(nextTier(TIERS[0])?.id).toBe('glow');
  });

  it('returns shine when current tier is glow', () => {
    expect(nextTier(TIERS[1])?.id).toBe('shine');
  });

  it('returns null for the last tier (brilliance)', () => {
    expect(nextTier(TIERS[TIERS.length - 1])).toBeNull();
  });
});

describe('sessionsToNext', () => {
  it('returns 5 from 0 sessions (spark -> glow)', () => {
    expect(sessionsToNext(0)).toBe(5);
  });

  it('counts remaining correctly mid-tier', () => {
    expect(sessionsToNext(3)).toBe(2); // 5 - 3
    expect(sessionsToNext(5)).toBe(10); // 15 - 5
    expect(sessionsToNext(30)).toBe(10); // 40 - 30
  });

  it('returns 0 at and beyond brilliance', () => {
    expect(sessionsToNext(80)).toBe(0);
    expect(sessionsToNext(120)).toBe(0);
  });
});

describe('tierById', () => {
  it('returns the matching tier for each known id', () => {
    for (const t of TIERS) {
      expect(tierById(t.id).id).toBe(t.id);
    }
  });

  it('returns a tier with the correct threshold', () => {
    expect(tierById('glow').threshold).toBe(5);
    expect(tierById('brilliance').threshold).toBe(80);
  });

  it('throws for an unknown id', () => {
    // @ts-expect-error intentional invalid input
    expect(() => tierById('unknown')).toThrow();
  });
});
