jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  appendCycleImpact,
  lastImpactReads,
  latestReadsByAnchor,
  parseCycleImpact,
  parseMutedDomains,
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

describe('appendCycleImpact', () => {
  it('appends a new entry with the rated domains', async () => {
    getItem.mockResolvedValue(null);
    await appendCycleImpact('2026-06-01', { work: 2, partner: 3 }, '2026-06-30T10:00:00.000Z');
    const saved = JSON.parse(setItem.mock.calls[0][1]);
    expect(saved).toEqual([
      { cycleAnchor: '2026-06-01', reads: { work: 2, partner: 3 }, at: '2026-06-30T10:00:00.000Z' },
    ]);
  });

  it('stacks a second reflection rather than overwriting', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([{ cycleAnchor: '2026-06-01', reads: { work: 2 }, at: '2026-06-30T10:00:00.000Z' }]),
    );
    const log = await appendCycleImpact('2026-06-01', { work: 1 }, '2026-07-01T09:00:00.000Z');
    expect(log).toHaveLength(2);
  });

  it('ignores a malformed anchor or an empty read', async () => {
    getItem.mockResolvedValue(null);
    await appendCycleImpact('nope', { work: 2 }, '2026-06-30T10:00:00.000Z');
    await appendCycleImpact('2026-06-01', {}, '2026-06-30T10:00:00.000Z');
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('latestReadsByAnchor', () => {
  it('folds to the latest read per domain per cycle', () => {
    const log = parseCycleImpact(
      JSON.stringify([
        { cycleAnchor: '2026-06-01', reads: { work: 2, partner: 3 }, at: '2026-06-30T10:00:00.000Z' },
        { cycleAnchor: '2026-06-01', reads: { work: 1 }, at: '2026-07-01T09:00:00.000Z' },
        { cycleAnchor: '2026-05-01', reads: { yourself: 2 }, at: '2026-05-30T10:00:00.000Z' },
      ]),
    );
    const map = latestReadsByAnchor(log);
    // work overwritten by the later entry; partner preserved from the earlier one.
    expect(map.get('2026-06-01')).toEqual({ work: 1, partner: 3 });
    expect(map.get('2026-05-01')).toEqual({ yourself: 2 });
  });
});

describe('lastImpactReads', () => {
  it('returns the most recent entry reads, or null when empty', () => {
    expect(lastImpactReads([])).toBeNull();
    const log = parseCycleImpact(
      JSON.stringify([
        { cycleAnchor: '2026-05-01', reads: { work: 2 }, at: '2026-05-30T10:00:00.000Z' },
        { cycleAnchor: '2026-06-01', reads: { work: 3 }, at: '2026-06-30T10:00:00.000Z' },
      ]),
    );
    expect(lastImpactReads(log)).toEqual({ work: 3 });
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
