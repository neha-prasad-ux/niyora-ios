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
