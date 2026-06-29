// A stateful, *delayed* AsyncStorage mock. The delay between get and set is
// what makes lost-write races observable: without serialization, concurrent
// read-modify-write callers all read the same snapshot and clobber each other.
const mockStore: Record<string, string | undefined> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(
    (key: string) =>
      new Promise((resolve) => setTimeout(() => resolve(mockStore[key] ?? null), 0)),
  ),
  setItem: jest.fn(
    (key: string, value: string) =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          mockStore[key] = value;
          resolve();
        }, 0),
      ),
  ),
}));

import { appendCheckIn, getCheckInRecords } from '@/store/checkin-history';
import { addDistressEntry, getDistressState } from '@/store/distress-history';
import { withStoreLock } from '@/store/with-store-lock';

beforeEach(() => {
  for (const key of Object.keys(mockStore)) delete mockStore[key];
});

describe('withStoreLock', () => {
  it('runs tasks for the same key strictly one at a time', async () => {
    let active = 0;
    let maxActive = 0;
    const task = () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          active -= 1;
          resolve();
        }, 0),
      );
    };
    await Promise.all(Array.from({ length: 8 }, () => withStoreLock('key', task)));
    expect(maxActive).toBe(1);
  });

  it('lets different keys run concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    const task = () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          active -= 1;
          resolve();
        }, 0),
      );
    };
    await Promise.all([
      withStoreLock('a', task),
      withStoreLock('b', task),
      withStoreLock('c', task),
    ]);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('returns each task its own result and survives a rejection', async () => {
    const results = await Promise.allSettled([
      withStoreLock('k', async () => 1),
      withStoreLock('k', async () => {
        throw new Error('boom');
      }),
      withStoreLock('k', async () => 3),
    ]);
    expect(results[0]).toEqual({ status: 'fulfilled', value: 1 });
    expect(results[1].status).toBe('rejected');
    // A failed task must not wedge the queue: the next one still runs.
    expect(results[2]).toEqual({ status: 'fulfilled', value: 3 });
  });
});

describe('history stores serialize concurrent writes', () => {
  it('appendCheckIn never loses a concurrent write', async () => {
    await Promise.all(Array.from({ length: 20 }, () => appendCheckIn('okay')));
    const records = await getCheckInRecords();
    expect(records).toHaveLength(20);
  });

  it('addDistressEntry keeps the additive count in step with its entries', async () => {
    const entry = {
      feeling: null,
      before: 3,
      after: 2,
      completedAt: '2026-06-27T10:00:00.000Z',
    };
    await Promise.all(Array.from({ length: 15 }, () => addDistressEntry(entry)));
    const state = await getDistressState();
    expect(state.count).toBe(15);
    expect(state.entries).toHaveLength(15);
  });
});
