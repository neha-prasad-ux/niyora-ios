// The gate is the money path: if canOpenMoment() is wrong, either a paying woman
// is locked out or the meter never bites. One check that fails if either breaks.

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore.set(k, v);
  }),
}));

// The gate's own logic is what is under test here, never the design-preview
// switch. config/features.test.ts is what guards that flag.
jest.mock('@/config/features', () => ({ FORCE_PAYWALL: false }));

jest.mock('expo-iap', () => ({
  initConnection: jest.fn(async () => true),
  hasActiveSubscriptions: jest.fn(async () => false),
}));

import { hasActiveSubscriptions } from 'expo-iap';

import { FREE_MOMENTS_PER_MONTH, canOpenMoment, cachedPremium, grantPremium, momentsLeft, redeemComp, refreshPremium } from './premium';

const HISTORY_KEY = 'niyora:moment-history';

/** n finished moments stamped in `ym`, plus one in a different month that must
 *  never count against her. */
function seed(n: number, ym: string) {
  const rows = Array.from({ length: n }, (_, i) => ({
    at: `${ym}-0${(i % 9) + 1}T10:00:00.000Z`,
    date: `${ym}-0${(i % 9) + 1}`,
    entry: 'x',
    feeling: 'Hurt',
    constellation: 'ache',
  }));
  rows.push({
    at: '2020-01-01T00:00:00.000Z',
    date: '2020-01-01',
    entry: 'x',
    feeling: 'Hurt',
    constellation: 'ache',
  });
  mockStore.set(HISTORY_KEY, JSON.stringify(rows));
}

// Local, matching how moment-history stamps a date. A UTC month here would make
// the test agree with a bug instead of catching it.
const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('the Premium gate', () => {
  it('lets a new woman in and counts only this month', async () => {
    seed(0, thisMonth());
    expect(await momentsLeft()).toBe(FREE_MOMENTS_PER_MONTH);
    expect(await canOpenMoment()).toBe(true);
  });

  it('closes at the limit and never goes negative', async () => {
    seed(FREE_MOMENTS_PER_MONTH, thisMonth());
    expect(await momentsLeft()).toBe(0);
    expect(await canOpenMoment()).toBe(false);

    seed(FREE_MOMENTS_PER_MONTH + 4, thisMonth());
    expect(await momentsLeft()).toBe(0);
  });

  it('lets a subscriber past the limit', async () => {
    seed(FREE_MOMENTS_PER_MONTH + 10, thisMonth());
    await grantPremium();
    expect(await canOpenMoment()).toBe(true);
  });

  it('keeps her in when the store is unreachable', async () => {
    await grantPremium();
    (hasActiveSubscriptions as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    expect(await refreshPremium()).toBe(true); // cache stands, no lockout
  });

  it('closes the gate when the subscription has actually lapsed', async () => {
    await grantPremium();
    (hasActiveSubscriptions as jest.Mock).mockResolvedValueOnce(false);
    expect(await refreshPremium()).toBe(false);

    seed(FREE_MOMENTS_PER_MONTH, thisMonth());
    expect(await canOpenMoment()).toBe(false);
  });
});

describe('comp code', () => {
  it('opens premium on the right code, survives a store "no", ignores a wrong one', async () => {
    mockStore.clear();
    expect(await redeemComp('nope')).toBe(false);
    expect(await cachedPremium()).toBe(false);

    expect(await redeemComp('  MoonLight ')).toBe(true);
    expect(await cachedPremium()).toBe(true);

    // refreshPremium writing a store "no" must not revoke a comp.
    mockStore.set('niyora:premium', '0');
    expect(await cachedPremium()).toBe(true);
  });
});
