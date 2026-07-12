jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { ARRIVAL_GAP_HOURS, cueFor, parseBreathCueState } from './breath-cue';

describe('parseBreathCueState', () => {
  it('degrades junk storage to never-opened', () => {
    expect(parseBreathCueState(null)).toBeNull();
    expect(parseBreathCueState('not json')).toBeNull();
    expect(parseBreathCueState('[]')).toBeNull();
    expect(parseBreathCueState('{"seenIntro":true}')).toBeNull(); // no timestamp
  });

  it('keeps a valid state and defaults a missing intro flag to false', () => {
    expect(parseBreathCueState('{"lastOpenAt":"2026-07-11T09:00:00Z","seenIntro":true}')).toEqual({
      lastOpenAt: '2026-07-11T09:00:00Z',
      seenIntro: true,
    });
    expect(parseBreathCueState('{"lastOpenAt":"2026-07-11T09:00:00Z"}')).toEqual({
      lastOpenAt: '2026-07-11T09:00:00Z',
      seenIntro: false,
    });
  });
});

describe('cueFor', () => {
  const now = new Date('2026-07-11T18:00:00Z');
  const hoursAgo = (h: number) =>
    new Date(now.getTime() - h * 3_600_000).toISOString();

  it('greets the very first open with the fuller intro', () => {
    expect(cueFor(null, now)).toBe('first');
    // A stored state that never saw the intro (e.g. junk overwrite) re-greets.
    expect(cueFor({ lastOpenAt: hoursAgo(1), seenIntro: false }, now)).toBe('first');
  });

  it('cues an arrival only after real time away', () => {
    expect(cueFor({ lastOpenAt: hoursAgo(ARRIVAL_GAP_HOURS + 1), seenIntro: true }, now)).toBe(
      'arrival',
    );
    expect(cueFor({ lastOpenAt: hoursAgo(1), seenIntro: true }, now)).toBeNull();
  });

  it('errs toward cueing when the stored timestamp is unreadable', () => {
    expect(cueFor({ lastOpenAt: 'garbage', seenIntro: true }, now)).toBe('arrival');
  });
});
