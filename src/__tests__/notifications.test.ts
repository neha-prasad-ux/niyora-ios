import { BODY_VARIANTS, pickBody } from '@/lib/notifications';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

describe('BODY_VARIANTS', () => {
  it('contains at least 8 entries', () => {
    expect(BODY_VARIANTS.length).toBeGreaterThanOrEqual(8);
  });

  it('no entry exceeds 100 characters', () => {
    for (const variant of BODY_VARIANTS) {
      expect(variant.length).toBeLessThanOrEqual(100);
    }
  });

  it('at least 4 entries cite a measurable claim', () => {
    // A measurable claim contains a number (timeframe, count, or unit).
    const cited = BODY_VARIANTS.filter((v) => /\d/.test(v));
    expect(cited.length).toBeGreaterThanOrEqual(4);
  });
});

describe('pickBody', () => {
  it('returns a string that is one of the variants', () => {
    const body = pickBody();
    expect(BODY_VARIANTS).toContain(body);
  });

  it('covers all indices across the variant count', () => {
    const seen = new Set<string>();
    // Iterate over every possible index to ensure full coverage.
    for (let i = 0; i < BODY_VARIANTS.length; i++) {
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(i);
      seen.add(pickBody());
      dateSpy.mockRestore();
    }
    expect(seen.size).toBe(BODY_VARIANTS.length);
  });
});
