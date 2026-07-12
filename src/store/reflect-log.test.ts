jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseReflectLog,
  recordReflect,
  reflectedForCycle,
  type ReflectEntry,
} from './reflect-log';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

const entry = (over: Partial<ReflectEntry> = {}): ReflectEntry => ({
  cycleAnchor: '2026-06-01',
  noticedChange: true,
  rightSized: false,
  manageBetter: ['sleep', 'emotions'],
  at: '2026-06-30',
  ...over,
});

describe('parseReflectLog', () => {
  it('degrades junk to an empty log', () => {
    expect(parseReflectLog(null)).toEqual([]);
    expect(parseReflectLog('not json')).toEqual([]);
    expect(parseReflectLog('{"a":1}')).toEqual([]);
  });

  it('keeps valid entries, drops bad anchors, and filters unknown levers', () => {
    const raw = JSON.stringify([
      { ...entry(), manageBetter: ['sleep', 'bogus', 'nutrition'] },
      { ...entry({ cycleAnchor: 'junk' }) },
    ]);
    const log = parseReflectLog(raw);
    expect(log).toHaveLength(1);
    expect(log[0].manageBetter).toEqual(['nutrition', 'sleep']);
  });
});

describe('recordReflect', () => {
  it('appends and overwrites the same cycle by anchor', async () => {
    getItem.mockResolvedValueOnce(null);
    await recordReflect(entry({ rightSized: false }));
    const first = JSON.parse(setItem.mock.calls[0][1]) as ReflectEntry[];
    expect(first).toHaveLength(1);

    getItem.mockResolvedValueOnce(JSON.stringify(first));
    await recordReflect(entry({ rightSized: true }));
    const second = JSON.parse(setItem.mock.calls[1][1]) as ReflectEntry[];
    expect(second).toHaveLength(1);
    expect(second[0].rightSized).toBe(true);
  });

  it('ignores a malformed anchor', async () => {
    getItem.mockResolvedValueOnce(null);
    await recordReflect(entry({ cycleAnchor: 'nope' }));
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('reflectedForCycle', () => {
  it('is true only when the cycle has an entry', () => {
    const log = [entry()];
    expect(reflectedForCycle(log, '2026-06-01')).toBe(true);
    expect(reflectedForCycle(log, '2026-05-01')).toBe(false);
    expect(reflectedForCycle(log, null)).toBe(false);
  });
});
