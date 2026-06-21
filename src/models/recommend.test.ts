import { getTechnique, isBreathing, isMindfulness } from './techniques';
import {
  alternate,
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
    expect(getFeeling('irritable')?.label).toBe('Irritable');
  });
  it('returns undefined for an unknown feeling', () => {
    expect(getFeeling('nope')).toBeUndefined();
  });
});

describe('recommend', () => {
  it('routes a ~1 min "short" feeling to its mindfulness practice, no rounds', () => {
    // low: oneMin='short', short='hold-yourself'
    const rec = recommend('low', 1);
    expect(rec).toEqual({ techniqueId: 'hold-yourself', feelingId: 'low' });
  });

  it('routes a ~1 min "long" feeling to a short breath with scaled rounds', () => {
    // anxious: oneMin='long', long='wind-down'
    const rec = recommend('anxious', 1);
    expect(rec?.techniqueId).toBe('wind-down');
    expect(rec?.rounds).toBeGreaterThan(0);
    expect(rec?.feelingId).toBe('anxious');
  });

  it('matches each feeling oneMin path: short = mindful, long = breathing', () => {
    for (const f of FEELINGS) {
      const rec = recommend(f.id, 1);
      const t = getTechnique(rec!.techniqueId)!;
      if (f.oneMin === 'short') {
        expect(isMindfulness(t)).toBe(true);
        expect(rec!.rounds).toBeUndefined();
      } else {
        expect(isBreathing(t)).toBe(true);
        expect(rec!.rounds).toBeGreaterThan(0);
      }
    }
  });

  it('routes longer durations to the breathing practice with scaled rounds', () => {
    const rec = recommend('anxious', 5);
    expect(rec?.techniqueId).toBe('wind-down');
    expect(rec?.rounds).toBeGreaterThan(0);
    expect(rec?.feelingId).toBe('anxious');
  });

  it('scales rounds up with duration for the same feeling', () => {
    const three = recommend('anxious', 3);
    const five = recommend('anxious', 5);
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

describe('recommend with multiple feelings', () => {
  it('uses the primary (first) feeling and attaches feelingIds', () => {
    // anxious is primary: long='wind-down'
    const rec = recommend(['anxious', 'low'], 5);
    expect(rec?.techniqueId).toBe('wind-down');
    expect(rec?.feelingId).toBe('anxious');
    expect(rec?.feelingIds).toEqual(['anxious', 'low']);
  });

  it('accepts up to 3 feelings', () => {
    const rec = recommend(['low', 'foggy', 'overwhelmed'], 3);
    expect(rec?.techniqueId).toBe('belly'); // low.long
    expect(rec?.feelingIds).toHaveLength(3);
  });

  it('returns null for an empty array', () => {
    expect(recommend([], 3)).toBeNull();
  });

  it('single-element array behaves like string call but adds feelingIds', () => {
    const rec = recommend(['irritable'], 3);
    expect(rec?.feelingId).toBe('irritable');
    expect(rec?.feelingIds).toEqual(['irritable']);
  });
});

describe('alternate (wanna try another)', () => {
  it('offers the mindful practice after the breath, for the same feeling', () => {
    // overwhelmed: long = ocean (breath), short = soft-gaze (mindful)
    const alt = alternate('overwhelmed', 'ocean');
    expect(alt).toEqual({ techniqueId: 'soft-gaze', feelingId: 'overwhelmed' });
  });

  it('offers the breath after the mindful practice, with rounds', () => {
    const alt = alternate('overwhelmed', 'soft-gaze');
    expect(alt?.techniqueId).toBe('ocean');
    expect(alt?.rounds).toBeGreaterThan(0);
    expect(alt?.feelingId).toBe('overwhelmed');
  });

  it('falls back to a different go-to without a feeling context', () => {
    const alt = alternate(undefined, 'box');
    expect(alt).not.toBeNull();
    expect(alt!.techniqueId).not.toBe('box');
    expect(getTechnique(alt!.techniqueId)).toBeDefined();
  });

  it('falls back for an unknown feeling', () => {
    const alt = alternate('nope', 'box');
    expect(alt).not.toBeNull();
    expect(alt!.techniqueId).not.toBe('box');
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
