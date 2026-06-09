import { TECHNIQUES, getTechnique, isBreathing, unlockedTechniques } from './techniques';

describe('nasal-breathing cues', () => {
  it('box breath instruction includes nasal cue', () => {
    const t = getTechnique('box');
    expect(t).toBeDefined();
    expect(isBreathing(t!)).toBe(true);
    if (isBreathing(t!)) {
      expect(t.instructions).toContain('nose');
    }
  });

  it('belly breath instruction includes nasal cue', () => {
    const t = getTechnique('belly');
    expect(t).toBeDefined();
    expect(isBreathing(t!)).toBe(true);
    if (isBreathing(t!)) {
      expect(t.instructions).toContain('nose');
    }
  });

  it('at least 4 breathing techniques carry nasal guidance', () => {
    const breathing = TECHNIQUES.filter(isBreathing);
    const withNose = breathing.filter((t) => t.instructions.includes('nose'));
    expect(withNose.length).toBeGreaterThanOrEqual(4);
  });

  it('4-7-8 wind-down exhale is unchanged (mouth exhale protocol)', () => {
    const t = getTechnique('wind-down');
    expect(t).toBeDefined();
    if (isBreathing(t!)) {
      expect(t.instructions).not.toContain('nose');
    }
  });
});

describe('quick-calm', () => {
  it('is a 30-second unlocked breathing technique', () => {
    const t = getTechnique('quick-calm');
    expect(t).toBeDefined();
    expect(isBreathing(t!)).toBe(true);
    expect(t!.locked).toBe(false);
    expect(t!.durationSeconds).toBe(30);
  });

  it('runs 3 rounds of a 4-in / 6-out extended exhale', () => {
    const t = getTechnique('quick-calm');
    if (isBreathing(t!)) {
      expect(t.rounds).toBe(3);
      const inhale = t.phases.find((p) => p.type === 'inhale');
      const exhale = t.phases.find((p) => p.type === 'exhale');
      expect(inhale?.duration).toBe(4);
      expect(exhale?.duration).toBe(6);
      // The longer exhale is the whole point; guard it.
      expect(exhale!.duration).toBeGreaterThan(inhale!.duration);
      // rounds x phase total = stated duration.
      const perRound = t.phases.reduce((s, p) => s + p.duration, 0);
      expect(perRound * t.rounds).toBe(t.durationSeconds);
    }
  });

  it('leads the breathing list as the lowest-friction on-ramp', () => {
    const firstBreathing = TECHNIQUES.filter(isBreathing)[0];
    expect(firstBreathing.id).toBe('quick-calm');
  });

  it('opts into the swelling Soul orb via a sane breathRange', () => {
    const t = getTechnique('quick-calm');
    if (isBreathing(t!)) {
      expect(t.breathRange).toBeDefined();
      // Bigger on inhale, smaller on exhale, both positive scales.
      expect(t.breathRange!.max).toBeGreaterThan(1);
      expect(t.breathRange!.min).toBeGreaterThan(0);
      expect(t.breathRange!.min).toBeLessThan(t.breathRange!.max);
    }
  });

  it('is the only technique that swaps in the orb visual for now', () => {
    const withOrb = TECHNIQUES.filter(isBreathing).filter((t) => t.breathRange);
    expect(withOrb.map((t) => t.id)).toEqual(['quick-calm']);
  });
});

describe('unlockedTechniques', () => {
  it('returns only unlocked entries', () => {
    const unlocked = unlockedTechniques();
    expect(unlocked.every((t) => !t.locked)).toBe(true);
  });

  it('includes box breath and belly breath', () => {
    const ids = unlockedTechniques().map((t) => t.id);
    expect(ids).toContain('box');
    expect(ids).toContain('belly');
  });
});
