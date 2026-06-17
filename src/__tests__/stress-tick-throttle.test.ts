import { shouldRunTick } from '@/hooks/use-stress-tick';

// use-stress-tick transitively imports the AsyncStorage-backed stores; jest
// needs the native module stubbed to import the pure throttle helper.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('shouldRunTick', () => {
  const MIN = 2 * 60_000;

  it('runs on the very first call (lastRun = 0)', () => {
    expect(shouldRunTick(0, 5_000_000, MIN)).toBe(true);
  });

  it('blocks a second run inside the interval', () => {
    const now = 5_000_000;
    expect(shouldRunTick(now, now + 60_000, MIN)).toBe(false); // 1 min later
  });

  it('allows a run once the interval has elapsed', () => {
    const now = 5_000_000;
    expect(shouldRunTick(now, now + MIN, MIN)).toBe(true); // exactly 2 min
    expect(shouldRunTick(now, now + MIN + 1, MIN)).toBe(true);
  });

  it('honours a custom interval', () => {
    const now = 1_000_000;
    expect(shouldRunTick(now, now + 30_000, 10_000)).toBe(true);
    expect(shouldRunTick(now, now + 5_000, 10_000)).toBe(false);
  });
});
