import { parseDistressState, EMPTY_DISTRESS_STATE } from '@/store/distress-history';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('parseDistressState', () => {
  it('returns the empty state when storage is empty', () => {
    expect(parseDistressState(null)).toEqual(EMPTY_DISTRESS_STATE);
  });

  it('returns the empty state on malformed JSON', () => {
    expect(parseDistressState('not json')).toEqual(EMPTY_DISTRESS_STATE);
  });

  it('reads a well-formed state', () => {
    const entry = { feeling: 'anxious', before: 4, after: 2, completedAt: '2026-06-27T10:00:00.000Z' };
    expect(parseDistressState(JSON.stringify({ count: 1, entries: [entry] }))).toEqual({
      count: 1,
      entries: [entry],
    });
  });

  it('drops malformed entries', () => {
    const good = { feeling: 'low', before: 3, after: 1, completedAt: '2026-06-27T10:00:00.000Z' };
    const state = parseDistressState(JSON.stringify({ count: 2, entries: [good, { nope: true }] }));
    expect(state.entries).toEqual([good]);
  });

  it('clamps ratings into 1..5', () => {
    const entry = { feeling: null, before: 9, after: 0, completedAt: '2026-06-27T10:00:00.000Z' };
    const state = parseDistressState(JSON.stringify({ count: 1, entries: [entry] }));
    expect(state.entries[0].before).toBe(5);
    expect(state.entries[0].after).toBe(1);
  });

  it('never reports a count below the entries it can see', () => {
    const entry = { feeling: 'foggy', before: 3, after: 2, completedAt: '2026-06-27T10:00:00.000Z' };
    const state = parseDistressState(JSON.stringify({ count: 0, entries: [entry] }));
    expect(state.count).toBe(1);
  });

  it('defaults a missing feeling to null', () => {
    const entry = { before: 3, after: 2, completedAt: '2026-06-27T10:00:00.000Z' };
    const state = parseDistressState(JSON.stringify({ count: 1, entries: [entry] }));
    expect(state.entries[0].feeling).toBeNull();
  });
});
