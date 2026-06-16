import {
  decideNudge,
  inQuietHours,
  DEFAULT_NUDGE_POLICY,
  type NudgeContext,
} from '@/lib/nudge-policy';
import type { StressVerdict } from '@/lib/stress-detect';

const STRESSED: StressVerdict = {
  stressed: true,
  reason: 'stressed',
  resting: 62,
  threshold: 70,
  currentHr: 88,
  elevatedFraction: 1,
  coverageMs: 5 * 60_000,
};

const CALM: StressVerdict = { ...STRESSED, stressed: false, reason: 'calm' };

// A daytime "now" well outside quiet hours.
const NOON = new Date(2026, 5, 15, 12, 0, 0);

function ctx(overrides: Partial<NudgeContext> = {}): NudgeContext {
  return { now: NOON, lastNudgeAt: null, nudgesToday: 0, ...overrides };
}

describe('inQuietHours', () => {
  it('handles a midnight-wrapping window (22 -> 7)', () => {
    expect(inQuietHours(23, 22, 7)).toBe(true);
    expect(inQuietHours(2, 22, 7)).toBe(true);
    expect(inQuietHours(6, 22, 7)).toBe(true);
    expect(inQuietHours(7, 22, 7)).toBe(false); // end is exclusive
    expect(inQuietHours(12, 22, 7)).toBe(false);
    expect(inQuietHours(22, 22, 7)).toBe(true); // start is inclusive
  });

  it('handles a non-wrapping window (1 -> 5)', () => {
    expect(inQuietHours(0, 1, 5)).toBe(false);
    expect(inQuietHours(1, 1, 5)).toBe(true);
    expect(inQuietHours(4, 1, 5)).toBe(true);
    expect(inQuietHours(5, 1, 5)).toBe(false);
  });

  it('normalises out-of-range hours', () => {
    expect(inQuietHours(26, 22, 7)).toBe(inQuietHours(2, 22, 7)); // 26 -> 2
  });
});

describe('decideNudge', () => {
  it('nudges when stressed, awake, cooled down, under the cap', () => {
    expect(decideNudge(STRESSED, ctx())).toEqual({ nudge: true, reason: 'nudge' });
  });

  it('does not nudge when not stressed', () => {
    expect(decideNudge(CALM, ctx())).toEqual({ nudge: false, reason: 'not-stressed' });
  });

  it('stays silent during quiet hours even when stressed', () => {
    const night = new Date(2026, 5, 15, 23, 30, 0);
    expect(decideNudge(STRESSED, ctx({ now: night }))).toEqual({
      nudge: false,
      reason: 'quiet-hours',
    });
  });

  it('respects the cooldown since the last nudge', () => {
    const lastNudgeAt = new Date(NOON.getTime() - 30 * 60_000); // 30 min ago
    expect(decideNudge(STRESSED, ctx({ lastNudgeAt }))).toEqual({
      nudge: false,
      reason: 'cooldown',
    });
  });

  it('nudges again once the cooldown has elapsed', () => {
    const lastNudgeAt = new Date(NOON.getTime() - 91 * 60_000); // just past 90 min
    expect(decideNudge(STRESSED, ctx({ lastNudgeAt }))).toEqual({
      nudge: true,
      reason: 'nudge',
    });
  });

  it('stops at the daily cap', () => {
    expect(
      decideNudge(STRESSED, ctx({ nudgesToday: DEFAULT_NUDGE_POLICY.maxPerDay })),
    ).toEqual({ nudge: false, reason: 'daily-cap' });
  });

  it('prioritises not-stressed over every other gate', () => {
    // Calm, in quiet hours, in cooldown, over cap — still reports not-stressed.
    const night = new Date(2026, 5, 15, 23, 0, 0);
    expect(
      decideNudge(CALM, { now: night, lastNudgeAt: night, nudgesToday: 99 }),
    ).toEqual({ nudge: false, reason: 'not-stressed' });
  });

  it('prioritises quiet-hours over cooldown and cap', () => {
    const night = new Date(2026, 5, 15, 2, 0, 0);
    expect(
      decideNudge(STRESSED, { now: night, lastNudgeAt: night, nudgesToday: 99 }),
    ).toEqual({ nudge: false, reason: 'quiet-hours' });
  });

  it('honours custom policy values', () => {
    // Tight 10-min cooldown: a nudge 15 min ago no longer blocks.
    const lastNudgeAt = new Date(NOON.getTime() - 15 * 60_000);
    expect(
      decideNudge(STRESSED, ctx({ lastNudgeAt }), { cooldownMs: 10 * 60_000 }),
    ).toEqual({ nudge: true, reason: 'nudge' });
  });
});
