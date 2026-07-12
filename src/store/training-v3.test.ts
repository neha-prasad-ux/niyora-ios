jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  DEFAULT_TRAINING,
  MAX_SKILL,
  SEED_SKILL,
  applyKindWord,
  applyLevelComplete,
  parseTraining,
} from './training-v3';

describe('parseTraining', () => {
  it('returns the seed default for empty or junk', () => {
    expect(parseTraining(null)).toEqual(DEFAULT_TRAINING);
    expect(parseTraining('not json')).toEqual(DEFAULT_TRAINING);
  });

  it('clamps skill into range and filters bad completed entries', () => {
    const s = parseTraining(
      JSON.stringify({ skill: 99, completed: ['irr-l1', 3, null, 'irr-l2'], kindWords: -4 }),
    );
    expect(s.skill).toBe(MAX_SKILL);
    expect(s.completed).toEqual(['irr-l1', 'irr-l2']);
    expect(s.kindWords).toBe(0);
  });

  it('keeps a valid lastCompletedOn and drops junk ones', () => {
    const good = parseTraining(JSON.stringify({ lastCompletedOn: '2026-07-11' }));
    expect(good.lastCompletedOn).toBe('2026-07-11');
    const bad = parseTraining(JSON.stringify({ lastCompletedOn: 'yesterday' }));
    expect(bad.lastCompletedOn).toBeUndefined();
  });
});

describe('applyLevelComplete', () => {
  it('records a new level once and nudges skill up', () => {
    const a = applyLevelComplete(DEFAULT_TRAINING, 'irr-l1');
    expect(a.completed).toEqual(['irr-l1']);
    expect(a.skill).toBeGreaterThan(SEED_SKILL);
  });

  it('is idempotent: re-completing does not double-count or re-bump', () => {
    const a = applyLevelComplete(DEFAULT_TRAINING, 'irr-l1');
    const b = applyLevelComplete(a, 'irr-l1');
    expect(b).toBe(a); // unchanged reference when no day is stamped
    expect(b.completed).toEqual(['irr-l1']);
    expect(b.skill).toBe(a.skill);
  });

  it('never pushes skill past the max', () => {
    let s = { ...DEFAULT_TRAINING, skill: MAX_SKILL - 0.2 };
    s = applyLevelComplete(s, 'irr-l6');
    expect(s.skill).toBeLessThanOrEqual(MAX_SKILL);
  });

  it('stamps the completion day, including on replays (progress untouched)', () => {
    const a = applyLevelComplete(DEFAULT_TRAINING, 'irr-l1', undefined, '2026-07-11');
    expect(a.lastCompletedOn).toBe('2026-07-11');
    // A replay re-stamps the day — that is what closes the Now ring on
    // all-trained build days — but never re-counts the level or the skill.
    const b = applyLevelComplete(a, 'irr-l1', undefined, '2026-07-12');
    expect(b.lastCompletedOn).toBe('2026-07-12');
    expect(b.completed).toEqual(['irr-l1']);
    expect(b.skill).toBe(a.skill);
  });
});

describe('applyKindWord', () => {
  it('increments the kind-word count', () => {
    expect(applyKindWord(DEFAULT_TRAINING).kindWords).toBe(1);
    expect(applyKindWord(applyKindWord(DEFAULT_TRAINING)).kindWords).toBe(2);
  });
});
