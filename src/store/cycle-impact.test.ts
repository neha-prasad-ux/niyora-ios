jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  appendCycleImpact,
  lastImpactReads,
  latestReadsByAnchor,
  levelOf,
  parseCycleImpact,
  parseMutedDomains,
  priorDomainReads,
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

  it('keeps valid reads, drops unknown domains, and clamps out-of-range', () => {
    const raw = JSON.stringify([
      { cycleAnchor: '2026-06-01', reads: { work: 72, partner: 150, sleep: 40, yourself: -5 }, at: '2026-06-30' },
      { cycleAnchor: 'junk', reads: { work: 40 }, at: '2026-06-30' },
    ]);
    const log = parseCycleImpact(raw);
    expect(log).toHaveLength(1);
    // work kept; partner clamped to 100; yourself clamped to 0; sleep unknown dropped.
    expect(log[0].reads).toEqual({ work: 72, partner: 100, yourself: 0 });
  });

  it('reinterprets legacy 1|2|3 levels onto the 0–100 scale', () => {
    const raw = JSON.stringify([
      { cycleAnchor: '2026-06-01', reads: { work: 1, partner: 2, yourself: 3 }, at: '2026-06-30' },
    ]);
    expect(parseCycleImpact(raw)[0].reads).toEqual({ work: 15, partner: 50, yourself: 85 });
  });
});

describe('levelOf', () => {
  it('buckets a continuous value into rough/okay/fine bands', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(15)).toBe(1);
    expect(levelOf(50)).toBe(2);
    expect(levelOf(85)).toBe(3);
    expect(levelOf(100)).toBe(3);
    // Clamps out-of-range before bucketing.
    expect(levelOf(-10)).toBe(1);
    expect(levelOf(200)).toBe(3);
  });
});

describe('appendCycleImpact', () => {
  it('appends a new entry with the rated domains', async () => {
    getItem.mockResolvedValue(null);
    await appendCycleImpact('2026-06-01', { work: 40, partner: 85 }, '2026-06-30T10:00:00.000Z');
    const saved = JSON.parse(setItem.mock.calls[0][1]);
    expect(saved).toEqual([
      { cycleAnchor: '2026-06-01', reads: { work: 40, partner: 85 }, at: '2026-06-30T10:00:00.000Z' },
    ]);
  });

  it('stacks a second reflection rather than overwriting', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([{ cycleAnchor: '2026-06-01', reads: { work: 55 }, at: '2026-06-30T10:00:00.000Z' }]),
    );
    const log = await appendCycleImpact('2026-06-01', { work: 20 }, '2026-07-01T09:00:00.000Z');
    expect(log).toHaveLength(2);
  });

  it('ignores a malformed anchor or an empty read', async () => {
    getItem.mockResolvedValue(null);
    await appendCycleImpact('nope', { work: 40 }, '2026-06-30T10:00:00.000Z');
    await appendCycleImpact('2026-06-01', {}, '2026-06-30T10:00:00.000Z');
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('latestReadsByAnchor', () => {
  it('folds to the latest read per domain per cycle', () => {
    const log = parseCycleImpact(
      JSON.stringify([
        { cycleAnchor: '2026-06-01', reads: { work: 50, partner: 85 }, at: '2026-06-30T10:00:00.000Z' },
        { cycleAnchor: '2026-06-01', reads: { work: 20 }, at: '2026-07-01T09:00:00.000Z' },
        { cycleAnchor: '2026-05-01', reads: { yourself: 45 }, at: '2026-05-30T10:00:00.000Z' },
      ]),
    );
    const map = latestReadsByAnchor(log);
    // work overwritten by the later entry; partner preserved from the earlier one.
    expect(map.get('2026-06-01')).toEqual({ work: 20, partner: 85 });
    expect(map.get('2026-05-01')).toEqual({ yourself: 45 });
  });
});

describe('priorDomainReads', () => {
  it('returns prior cycles for a domain, ordered oldest → newest, capped', () => {
    const log = parseCycleImpact(
      JSON.stringify([
        { cycleAnchor: '2026-04-01', reads: { work: 30 }, at: '2026-04-30T10:00:00.000Z' },
        { cycleAnchor: '2026-05-01', reads: { work: 55 }, at: '2026-05-30T10:00:00.000Z' },
        { cycleAnchor: '2026-06-01', reads: { work: 70, partner: 40 }, at: '2026-06-30T10:00:00.000Z' },
      ]),
    );
    // Current cycle is 2026-07-01: the two most recent prior work reads.
    expect(priorDomainReads(log, '2026-07-01', 'work')).toEqual([
      { cycleAnchor: '2026-05-01', value: 55 },
      { cycleAnchor: '2026-06-01', value: 70 },
    ]);
    // Excludes the current cycle itself and domains it never rated.
    expect(priorDomainReads(log, '2026-06-01', 'work')).toEqual([
      { cycleAnchor: '2026-04-01', value: 30 },
      { cycleAnchor: '2026-05-01', value: 55 },
    ]);
    expect(priorDomainReads(log, '2026-07-01', 'yourself')).toEqual([]);
  });
});

describe('lastImpactReads', () => {
  it('returns the most recent entry reads, or null when empty', () => {
    expect(lastImpactReads([])).toBeNull();
    const log = parseCycleImpact(
      JSON.stringify([
        { cycleAnchor: '2026-05-01', reads: { work: 50 }, at: '2026-05-30T10:00:00.000Z' },
        { cycleAnchor: '2026-06-01', reads: { work: 80 }, at: '2026-06-30T10:00:00.000Z' },
      ]),
    );
    expect(lastImpactReads(log)).toEqual({ work: 80 });
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
