jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  PREP_RINGS_TOTAL,
  cycleKeyFor,
  freshPrep,
  noCycleKey,
  parsePrep,
  prepFullness,
  prepReadiness,
  prepRingCount,
  recordChapterComplete,
} from './pms-prep';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

describe('cycleKeyFor', () => {
  it('uses the period anchor, falling back to a stable no-cycle key', () => {
    expect(cycleKeyFor('2026-07-01')).toBe('2026-07-01');
    expect(cycleKeyFor(null)).toBe(noCycleKey());
    expect(cycleKeyFor('')).toBe(noCycleKey());
  });
});

describe('parsePrep', () => {
  it('degrades junk to fresh', () => {
    expect(parsePrep(null, 'c1')).toEqual(freshPrep('c1'));
    expect(parsePrep('not json', 'c1')).toEqual(freshPrep('c1'));
  });

  it('resets to fresh when the stored cycle differs (the natural wane)', () => {
    const raw = JSON.stringify({
      cycleKey: 'old-cycle',
      chaptersDone: ['story-1'],
      kitChosen: ['food'],
      engaged: true,
    });
    expect(parsePrep(raw, 'new-cycle')).toEqual(freshPrep('new-cycle'));
  });

  it('keeps this cycle and filters non-string ids', () => {
    const raw = JSON.stringify({
      cycleKey: 'c1',
      chaptersDone: ['story-1', 3],
      kitChosen: ['food', null, 'remember'],
      engaged: true,
    });
    const state = parsePrep(raw, 'c1');
    expect(state.chaptersDone).toEqual(['story-1']);
    expect(state.kitChosen).toEqual(['food', 'remember']);
    expect(state.engaged).toBe(true);
  });
});

describe('recordChapterComplete', () => {
  it('banks the chapter and chosen kit ids without double-counting on replay', async () => {
    getItem.mockResolvedValue(null);
    const first = await recordChapterComplete('c1', 'story-1', ['notice', 'food']);
    expect(first.chaptersDone).toEqual(['story-1']);
    expect(first.kitChosen).toEqual(['notice', 'food']);
    expect(first.engaged).toBe(true);

    getItem.mockResolvedValue(JSON.stringify(first));
    const again = await recordChapterComplete('c1', 'story-1', ['food', 'remember']);
    expect(again.chaptersDone).toEqual(['story-1']);
    expect(again.kitChosen).toEqual(['notice', 'food', 'remember']);
  });
});

describe('derivations', () => {
  it('caps rings at the band width', () => {
    const state = { ...freshPrep('c1'), kitChosen: ['a', 'b', 'c', 'd', 'e'] };
    expect(prepRingCount(state)).toBe(PREP_RINGS_TOTAL);
  });

  it('waxes fullness with engagement, filling on a finished story', () => {
    expect(prepFullness(freshPrep('c1'))).toBe(0.5);
    expect(prepFullness({ ...freshPrep('c1'), engaged: true })).toBe(0.75);
    expect(prepFullness({ ...freshPrep('c1'), chaptersDone: ['story-1'] })).toBe(1);
  });

  it('keeps readiness above zero and reaches 1 on a full kit', () => {
    expect(prepReadiness(freshPrep('c1'))).toBeGreaterThan(0);
    expect(prepReadiness(freshPrep('c1'))).toBeLessThan(1);
    const full = { ...freshPrep('c1'), kitChosen: ['a', 'b', 'c', 'd'] };
    expect(prepReadiness(full)).toBe(1);
  });
});
