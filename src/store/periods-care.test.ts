jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getPeriodsCare, parsePeriodsCare, togglePeriodsCare } from './periods-care';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

describe('parsePeriodsCare', () => {
  it('degrades junk to an empty log', () => {
    expect(parsePeriodsCare(null)).toEqual([]);
    expect(parsePeriodsCare('not json')).toEqual([]);
    expect(parsePeriodsCare('{"a":1}')).toEqual([]);
  });

  it('keeps valid days, drops bad dates, and filters non-string ids', () => {
    const raw = JSON.stringify([
      { date: '2026-07-13', done: ['legs-up', 42, 'warm-drink'] },
      { date: 'junk', done: ['x'] },
    ]);
    const log = parsePeriodsCare(raw);
    expect(log).toHaveLength(1);
    expect(log[0].done).toEqual(['legs-up', 'warm-drink']);
  });
});

describe('togglePeriodsCare', () => {
  it('adds then removes an id for the day', async () => {
    getItem.mockResolvedValue(null);
    const on = await togglePeriodsCare('2026-07-13', 'legs-up');
    expect(on).toEqual(['legs-up']);

    getItem.mockResolvedValue(JSON.stringify([{ date: '2026-07-13', done: ['legs-up'] }]));
    const off = await togglePeriodsCare('2026-07-13', 'legs-up');
    expect(off).toEqual([]);
  });

  it('keeps days independent', async () => {
    getItem.mockResolvedValue(JSON.stringify([{ date: '2026-07-12', done: ['warm-drink'] }]));
    await togglePeriodsCare('2026-07-13', 'legs-up');
    const saved = JSON.parse(setItem.mock.calls[0][1]);
    expect(saved).toEqual([
      { date: '2026-07-12', done: ['warm-drink'] },
      { date: '2026-07-13', done: ['legs-up'] },
    ]);
  });

  it('ignores a malformed date', async () => {
    getItem.mockResolvedValue(null);
    await togglePeriodsCare('nope', 'legs-up');
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reads back a day, empty when untouched', async () => {
    getItem.mockResolvedValue(JSON.stringify([{ date: '2026-07-13', done: ['legs-up'] }]));
    expect(await getPeriodsCare('2026-07-13')).toEqual(['legs-up']);
    expect(await getPeriodsCare('2026-07-14')).toEqual([]);
  });
});
