import { TECHNIQUES, getTechnique, isBreathing, unlockedTechniques } from '@/models/techniques';

describe('getTechnique (lookup)', () => {
  it('returns the correct technique for a known id', () => {
    const t = getTechnique('box');
    expect(t).toBeDefined();
    expect(t?.name).toBe('Box Breath');
  });

  it('returns undefined for an unknown id', () => {
    expect(getTechnique('nonexistent')).toBeUndefined();
  });

  it('finds locked techniques by id', () => {
    const t = getTechnique('ocean');
    expect(t).toBeDefined();
    expect(t?.locked).toBe(true);
  });

  it('finds mindfulness techniques', () => {
    const t = getTechnique('be-kind');
    expect(t).toBeDefined();
    expect(t?.category).toBe('mindfulness');
  });
});

describe('isBreathing', () => {
  it('returns true for a breathing technique', () => {
    const t = getTechnique('box')!;
    expect(isBreathing(t)).toBe(true);
  });

  it('returns false for a mindfulness technique', () => {
    const t = getTechnique('be-kind')!;
    expect(isBreathing(t)).toBe(false);
  });

  it('narrows the type: breathing techniques have phases', () => {
    const t = getTechnique('wind-down')!;
    if (isBreathing(t)) {
      expect(t.phases.length).toBeGreaterThan(0);
      expect(t.rounds).toBeGreaterThan(0);
    }
  });
});

describe('unlockedTechniques', () => {
  it('returns only unlocked entries', () => {
    const unlocked = unlockedTechniques();
    for (const t of unlocked) {
      expect(t.locked).toBe(false);
    }
  });

  it('count matches what is in TECHNIQUES', () => {
    const expected = TECHNIQUES.filter((t) => !t.locked).length;
    expect(unlockedTechniques().length).toBe(expected);
  });

  it('includes box breath (unlocked)', () => {
    const ids = unlockedTechniques().map((t) => t.id);
    expect(ids).toContain('box');
    expect(ids).toContain('belly');
  });

  it('excludes ocean and cooling (locked)', () => {
    const ids = unlockedTechniques().map((t) => t.id);
    expect(ids).not.toContain('ocean');
    expect(ids).not.toContain('cooling');
  });
});
