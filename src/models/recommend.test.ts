import { getTechnique, isBreathing, isMindfulness } from './techniques';
import {
  DURATIONS,
  FEELINGS,
  getFeeling,
  recommend,
  scaleRounds,
} from './recommend';

describe('FEELINGS catalogue', () => {
  it('maps every feeling to techniques that exist', () => {
    for (const f of FEELINGS) {
      expect(getTechnique(f.short)).toBeDefined();
      expect(getTechnique(f.long)).toBeDefined();
    }
  });

  it('uses a mindfulness practice for the short path', () => {
    for (const f of FEELINGS) {
      const t = getTechnique(f.short)!;
      expect(isMindfulness(t)).toBe(true);
    }
  });

  it('uses a breathing practice for the long path', () => {
    for (const f of FEELINGS) {
      const t = getTechnique(f.long)!;
      expect(isBreathing(t)).toBe(true);
    }
  });

  it('has unique feeling ids', () => {
    const ids = FEELINGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getFeeling', () => {
  it('returns a known feeling', () => {
    expect(getFeeling('tense')?.label).toBe('Tense');
  });
  it('returns undefined for an unknown feeling', () => {
    expect(getFeeling('nope')).toBeUndefined();
  });
});

describe('recommend', () => {
  it('routes ~1 min to the mindfulness practice with no rounds override', () => {
    const rec = recommend('heavy', 1);
    expect(rec).toEqual({ techniqueId: 'be-kind', feelingId: 'heavy' });
  });

  it('routes longer durations to the breathing practice with scaled rounds', () => {
    const rec = recommend('tense', 5);
    expect(rec?.techniqueId).toBe('wind-down');
    expect(rec?.rounds).toBeGreaterThan(0);
    expect(rec?.feelingId).toBe('tense');
  });

  it('scales rounds up with duration for the same feeling', () => {
    const three = recommend('restless', 3);
    const five = recommend('restless', 5);
    expect(five!.rounds!).toBeGreaterThanOrEqual(three!.rounds!);
  });

  it('returns null for an unknown feeling', () => {
    expect(recommend('nope', 3)).toBeNull();
  });

  it('every feeling + duration produces a valid recommendation', () => {
    for (const f of FEELINGS) {
      for (const d of DURATIONS) {
        const rec = recommend(f.id, d.minutes);
        expect(rec).not.toBeNull();
        expect(getTechnique(rec!.techniqueId)).toBeDefined();
      }
    }
  });
});

describe('scaleRounds', () => {
  it('returns at least 1 round', () => {
    const box = getTechnique('box')!;
    expect(scaleRounds(box, 1)).toBeGreaterThanOrEqual(1);
  });

  it('approximates the target duration from per-round cadence', () => {
    const box = getTechnique('box')!;
    // box: 65s over 4 rounds => ~16.25s/round. 5 min => ~18 rounds.
    expect(scaleRounds(box, 300)).toBe(18);
  });

  it('returns 1 for a mindfulness technique (no rounds concept)', () => {
    const beKind = getTechnique('be-kind')!;
    expect(scaleRounds(beKind, 300)).toBe(1);
  });
});
