import { getTechnique, isBreathing, isMindfulness } from './techniques';
import {
  alternate,
  defaultNeedFor,
  DURATIONS,
  FEELING_NEED_DEFAULT,
  FEELINGS,
  firstTechnique,
  getFeeling,
  NEEDS,
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

describe('need axis', () => {
  it('lists the six outcome needs', () => {
    expect(NEEDS.map((n) => n.id)).toEqual([
      'calm',
      'focused',
      'relaxed',
      'sleepy',
      'cozy',
      'let-it-out',
    ]);
  });

  it('pre-fills a need default for every feeling', () => {
    for (const f of FEELINGS) {
      expect(defaultNeedFor(f.id)).toBeDefined();
    }
    expect(FEELING_NEED_DEFAULT.anxious).toBe('calm');
    expect(FEELING_NEED_DEFAULT.irritable).toBe('relaxed');
    expect(FEELING_NEED_DEFAULT.low).toBe('cozy');
    expect(FEELING_NEED_DEFAULT.foggy).toBe('focused');
    expect(FEELING_NEED_DEFAULT.overwhelmed).toBe('calm');
  });

  it('returns undefined for an unknown feeling', () => {
    expect(defaultNeedFor('nope')).toBeUndefined();
  });
});

describe('recommend (hero + ranked list)', () => {
  it('returns null without a primary feeling', () => {
    expect(recommend([], ['calm'], 3)).toBeNull();
  });

  it('returns a hero plus a list, carrying the selections through', () => {
    const res = recommend(['anxious'], ['calm'], 3);
    expect(res).not.toBeNull();
    expect(res!.hero).toBeDefined();
    expect(Array.isArray(res!.list)).toBe(true);
    expect(res!.feelingIds).toEqual(['anxious']);
    expect(res!.needIds).toEqual(['calm']);
  });

  it('carries the primary feeling on every card', () => {
    const res = recommend(['low', 'foggy'], ['cozy'], 3)!;
    expect(res.hero.feelingId).toBe('low');
    for (const c of res.list) expect(c.feelingId).toBe('low');
  });

  it('ranks every card by the union of selected feelings + needs (descending)', () => {
    const res = recommend(['irritable', 'overwhelmed'], ['relaxed', 'calm'], 5)!;
    const scores = [res.hero, ...res.list].map((c) => c.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
    expect(res.hero.score).toBeGreaterThan(0);
  });

  it('re-ranks against the selected need', () => {
    const res = recommend(['anxious'], ['sleepy'], 3)!;
    // Every surfaced card serves the chosen need or the feeling (score > 0).
    for (const c of [res.hero, ...res.list]) {
      expect(c.needs.includes('sleepy') || c.feelings.includes('anxious')).toBe(true);
      expect(c.score).toBeGreaterThan(0);
    }
  });

  it('scales a breathing hero/card rounds up with the time budget', () => {
    const three = recommend(['anxious'], ['calm'], 3)!;
    const five = recommend(['anxious'], ['calm'], 5)!;
    const breath3 = [three.hero, ...three.list].find((c) => c.rounds != null);
    const breath5 = [five.hero, ...five.list].find((c) => c.rounds != null);
    expect(breath3?.rounds).toBeGreaterThan(0);
    expect(breath5!.rounds!).toBeGreaterThanOrEqual(breath3!.rounds!);
  });

  it('filters out activities that cannot fit the time budget', () => {
    // slow-walk is 300s and serves cool-off; at a 1-minute budget it drops out,
    // at a 5-minute budget it is eligible.
    const short = recommend(['irritable'], ['relaxed'], 1)!;
    const long = recommend(['irritable'], ['relaxed'], 5)!;
    const ids = (r: typeof short) => [r.hero, ...r.list].map((c) => c.activityId);
    expect(ids(short)).not.toContain('slow-walk');
    expect(ids(long)).toContain('slow-walk');
  });

  it('always keeps instant/open activities regardless of budget', () => {
    // cave-mode (0s) serves rest+settle; present even at a 1-minute budget.
    const res = recommend(['overwhelmed'], ['calm'], 1)!;
    const ids = [res.hero, ...res.list].map((c) => c.activityId);
    expect(ids).toContain('cave-mode');
  });

  it('mixes techniques and activities in the ranking', () => {
    const res = recommend(['low'], ['cozy'], 5)!;
    const sources = new Set([res.hero, ...res.list].map((c) => c.source));
    expect(sources.has('technique')).toBe(true);
    expect(sources.has('activity')).toBe(true);
  });

  it('firstTechnique returns a launchable technique for any query', () => {
    for (const f of FEELINGS) {
      const need = defaultNeedFor(f.id)!;
      for (const d of DURATIONS) {
        const res = recommend([f.id], [need], d.minutes)!;
        const tech = firstTechnique(res);
        expect(tech?.techniqueId).toBeDefined();
        const t = getTechnique(tech!.techniqueId!)!;
        expect(t).toBeDefined();
        expect(isBreathing(t) || isMindfulness(t)).toBe(true);
      }
    }
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
