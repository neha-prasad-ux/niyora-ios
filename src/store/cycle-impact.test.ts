jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseCycleImpact,
  parseMutedDomains,
  recordCycleImpact,
  setDomainMuted,
} from './cycle-impact';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

describe('parseCycleImpact', () => {
  it('degrades junk to an empty log', () => {
    expect(parseCycleImpact(null)).toEqual([]);
    expect(parseCycleImpact('not json')).toEqual([]);
    expect(parseCycleImpact('{"a":1}')).toEqual([]);
  });

  it('keeps valid reads and drops out-of-range or unknown domains', () => {
    const raw = JSON.stringify([
      { cycleAnchor: '2026-06-01', reads: { work: 3, partner: 2, sleep: 1, yourself: 9 }, at: '2026-06-30' },
      { cycleAnchor: 'junk', reads: { work: 1 }, at: '2026-06-30' },
    ]);
    const log = parseCycleImpact(raw);
    expect(log).toHaveLength(1);
    expect(log[0].reads).toEqual({ work: 3, partner: 2 });
  });
});

describe('recordCycleImpact', () => {
  it('creates an entry for a new cycle', async () => {
    getItem.mockResolvedValue(null);
    await recordCycleImpact('2026-06-01', 'work', 2, new Date(2026, 5, 30));
    const saved = JSON.parse(setItem.mock.calls[0][1]);
    expect(saved).toEqual([{ cycleAnchor: '2026-06-01', reads: { work: 2 }, at: '2026-06-30' }]);
  });

  it('merges a second domain into the same cycle and overwrites a repeat', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([{ cycleAnchor: '2026-06-01', reads: { work: 2 }, at: '2026-06-30' }]),
    );
    const log = await recordCycleImpact('2026-06-01', 'partner', 3, new Date(2026, 6, 1));
    expect(log[0].reads).toEqual({ work: 2, partner: 3 });

    getItem.mockResolvedValue(JSON.stringify(log));
    const log2 = await recordCycleImpact('2026-06-01', 'work', 1, new Date(2026, 6, 1));
    expect(log2[0].reads.work).toBe(1);
  });

  it('ignores a malformed anchor', async () => {
    getItem.mockResolvedValue(null);
    await recordCycleImpact('nope', 'work', 2);
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('muted domains', () => {
  it('parses only known domains', () => {
    expect(parseMutedDomains(JSON.stringify(['work', 'sleep']))).toEqual(['work']);
    expect(parseMutedDomains(null)).toEqual([]);
  });

  it('adds and removes a mute', async () => {
    getItem.mockResolvedValue(null);
    const muted = await setDomainMuted('partner', true);
    expect(muted).toEqual(['partner']);

    getItem.mockResolvedValue(JSON.stringify(['partner']));
    const cleared = await setDomainMuted('partner', false);
    expect(cleared).toEqual([]);
  });
});
