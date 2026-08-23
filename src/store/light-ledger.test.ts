const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    mockStore.set(k, v);
    return Promise.resolve();
  }),
}));

import { getLightLedger, parseLightLedger, recordLight } from './light-ledger';
import { getMoonState } from './moon-state';
import { FULLNESS_MAX } from '@/lib/moon-light';

const NOW = new Date(2026, 2, 10, 9, 0); // 2026-03-10 morning

beforeEach(() => mockStore.clear());

describe('parseLightLedger', () => {
  it('degrades junk to an empty ledger', () => {
    expect(parseLightLedger(null)).toEqual([]);
    expect(parseLightLedger('not json')).toEqual([]);
    expect(parseLightLedger('{"a":1}')).toEqual([]);
    expect(
      parseLightLedger(
        JSON.stringify([
          { date: '2026-03-10', kind: 'calm', amount: 15 },
          { date: 'junk', kind: 'calm', amount: 15 },
          { date: '2026-03-10', kind: 'nope', amount: 15 },
          { date: '2026-03-10', kind: 'visit', amount: 0 },
        ]),
      ),
    ).toEqual([{ date: '2026-03-10', kind: 'calm', amount: 15 }]);
  });
});

describe('recordLight', () => {
  it('records a visit once per day; the moon stays bright by default', async () => {
    const first = await recordLight('visit', { now: NOW });
    expect(first.event).toMatchObject({ date: '2026-03-10', kind: 'visit', amount: 5 });
    expect((await recordLight('visit', { now: NOW })).event).toBeNull();
    expect(await getLightLedger()).toHaveLength(1);
    const moon = await getMoonState();
    expect(moon.fullness).toBe(FULLNESS_MAX);
  });

  it('diminishes repeat calms in the stored amounts', async () => {
    await recordLight('calm', { now: NOW });
    await recordLight('calm', { now: NOW });
    expect((await recordLight('calm', { now: NOW })).event).toBeNull();
    expect((await getLightLedger()).map((e) => e.amount)).toEqual([15, 5]);
  });

  it('never re-grants a level, even days later', async () => {
    await recordLight('train', { refId: 'irr-l1', now: NOW });
    const later = new Date(2026, 2, 14, 9, 0);
    expect((await recordLight('train', { refId: 'irr-l1', now: later })).event).toBeNull();
    expect((await recordLight('train', { refId: 'irr-l2', now: later })).event).not.toBeNull();
  });

  it('grants a level exactly two recalls', async () => {
    await recordLight('recall', { refId: 'irr-l1', now: NOW });
    const later = new Date(2026, 2, 17, 9, 0);
    expect((await recordLight('recall', { refId: 'irr-l1', now: later })).event).not.toBeNull();
    const evenLater = new Date(2026, 2, 25, 9, 0);
    expect((await recordLight('recall', { refId: 'irr-l1', now: evenLater })).event).toBeNull();
  });

  it('applies the coached-action multiplier from the shown-action memory', async () => {
    mockStore.set(
      'niyora:today-action',
      JSON.stringify({ last: { date: '2026-03-10', id: 'session:calm' }, dismissedDate: null }),
    );
    const calm = await recordLight('calm', { now: NOW });
    expect(calm.event).toMatchObject({ amount: 23, matchedAction: true }); // ceil(15 * 1.5)
    const train = await recordLight('train', { refId: 'irr-l1', now: NOW });
    expect(train.event).toMatchObject({ amount: 20 }); // the ask was a session, not this level
  });

  it('grandfathers legacy sessions: earned rings stand, without a fake celebration', async () => {
    const legacy = Array.from({ length: 40 }, (_, i) => ({
      techniqueId: 'box',
      completedAt: new Date(2026, 0, 1 + (i % 28), 9, 0).toISOString(),
    }));
    mockStore.set('niyora:sessions', JSON.stringify(legacy));
    const first = await recordLight('visit', { now: NOW });
    const ledger = await getLightLedger();
    expect(ledger[0]).toMatchObject({ date: '2026-03-09', refId: 'legacy-sessions', amount: 600 });
    expect(first.ringEarned).toBeNull(); // Radiance was already hers, not news
    expect(first.event).toMatchObject({ kind: 'visit', amount: 5 }); // cap untouched
  });

  it('reports the ring the crossing act earned, exactly once', async () => {
    const visit = await recordLight('visit', { now: NOW }); // 5 light
    expect(visit.ringEarned).toBeNull();
    const calm = await recordLight('calm', { now: NOW }); // 20 light, Spark
    expect(calm.ringEarned?.id).toBe('spark');
    const second = await recordLight('calm', { now: NOW }); // 25, no new ring
    expect(second.event).not.toBeNull();
    expect(second.ringEarned).toBeNull();
  });
});
