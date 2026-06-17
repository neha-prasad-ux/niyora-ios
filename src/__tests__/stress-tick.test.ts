import { runStressTick, type TickDeps } from '@/lib/stress-tick';
import type { BaselineModel, HrSample } from '@/lib/hr-baseline';
import type { NudgeEvent } from '@/store/nudge-history';

// stress-tick transitively imports the AsyncStorage-backed store for its pure
// helpers; jest needs the native module stubbed even though the tick injects
// all I/O and never calls storage directly.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const NOW = new Date(2026, 5, 15, 14, 0, 0); // 14:00 local, outside quiet hours

// Baseline whose 14:00 bucket rests at 60.
function baselineResting60(): BaselineModel {
  const byHour: (BaselineModel['byHour'][number])[] = Array(24).fill(null);
  byHour[14] = { resting: 60, median: 62, count: 100 };
  return { byHour, global: { resting: 60, median: 62, count: 100 }, sampleCount: 100 };
}

// HR every 20s across the last 5 min ending at NOW.
function recentHr(bpm: number): HrSample[] {
  const out: HrSample[] = [];
  for (let i = 0; i < 15; i++) {
    out.push({ bpm, date: new Date(NOW.getTime() - i * 20_000).toISOString() });
  }
  return out;
}

function deps(overrides: Partial<TickDeps> = {}): TickDeps {
  return {
    now: NOW,
    getRecentHr: jest.fn().mockResolvedValue(recentHr(88)), // stressed by default
    getSteps: jest.fn().mockResolvedValue(0),
    getActiveEnergy: jest.fn().mockResolvedValue(0),
    getWorkouts: jest.fn().mockResolvedValue([]),
    loadBaseline: jest.fn().mockResolvedValue(baselineResting60()),
    getHistory: jest.fn().mockResolvedValue([] as NudgeEvent[]),
    recordFired: jest.fn().mockResolvedValue(undefined),
    fireNudge: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('runStressTick', () => {
  it('fires a nudge on sustained stress at rest, recording it first', async () => {
    const d = deps();
    const r = await runStressTick(d);
    expect(r.verdict.reason).toBe('stressed');
    expect(r.decision.reason).toBe('nudge');
    expect(r.fired).toBe(true);
    expect(d.recordFired).toHaveBeenCalledWith(
      expect.objectContaining({ currentHr: 88, resting: 60 }),
    );
    expect(d.fireNudge).toHaveBeenCalledTimes(1);
    // recordFired must run before fireNudge.
    const recordOrder = (d.recordFired as jest.Mock).mock.invocationCallOrder[0];
    const fireOrder = (d.fireNudge as jest.Mock).mock.invocationCallOrder[0];
    expect(recordOrder).toBeLessThan(fireOrder);
  });

  it('does nothing when there is no baseline, without reading sensors', async () => {
    const d = deps({ loadBaseline: jest.fn().mockResolvedValue(null) });
    const r = await runStressTick(d);
    expect(r.verdict.reason).toBe('no-baseline');
    expect(r.fired).toBe(false);
    expect(d.getRecentHr).not.toHaveBeenCalled();
    expect(d.fireNudge).not.toHaveBeenCalled();
  });

  it('does not fire when calm', async () => {
    const d = deps({ getRecentHr: jest.fn().mockResolvedValue(recentHr(61)) });
    const r = await runStressTick(d);
    expect(r.verdict.reason).toBe('calm');
    expect(r.fired).toBe(false);
    expect(d.fireNudge).not.toHaveBeenCalled();
  });

  it('does not fire when moving (activity gate)', async () => {
    const d = deps({ getWorkouts: jest.fn().mockResolvedValue([{ isActive: true }]) });
    const r = await runStressTick(d);
    expect(r.verdict.reason).toBe('active');
    expect(r.fired).toBe(false);
    expect(d.fireNudge).not.toHaveBeenCalled();
  });

  it('holds the nudge when within cooldown of a recent one', async () => {
    const recent: NudgeEvent = {
      firedAt: new Date(NOW.getTime() - 20 * 60_000).toISOString(), // 20 min ago
      answer: null,
      currentHr: 90,
      resting: 60,
    };
    const d = deps({ getHistory: jest.fn().mockResolvedValue([recent]) });
    const r = await runStressTick(d);
    expect(r.verdict.reason).toBe('stressed');
    expect(r.decision.reason).toBe('cooldown');
    expect(r.fired).toBe(false);
    expect(d.fireNudge).not.toHaveBeenCalled();
  });

  it('holds the nudge during quiet hours', async () => {
    const night = new Date(2026, 5, 15, 23, 30, 0);
    const nightHr: HrSample[] = Array.from({ length: 15 }, (_, i) => ({
      bpm: 88,
      date: new Date(night.getTime() - i * 20_000).toISOString(),
    }));
    const d = deps({ now: night, getRecentHr: jest.fn().mockResolvedValue(nightHr) });
    const r = await runStressTick(d);
    expect(r.decision.reason).toBe('quiet-hours');
    expect(r.fired).toBe(false);
  });
});
