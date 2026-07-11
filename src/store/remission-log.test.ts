jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { answeredForCycle, appendRemission, parseRemissionLog } from './remission-log';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

describe('parseRemissionLog', () => {
  it('degrades junk to an empty log', () => {
    expect(parseRemissionLog(null)).toEqual([]);
    expect(parseRemissionLog('not json')).toEqual([]);
    expect(parseRemissionLog('{"a":1}')).toEqual([]);
  });

  it('keeps valid entries and drops malformed ones', () => {
    const raw = JSON.stringify([
      { cycleAnchor: '2026-06-28', answer: 'yes', at: '2026-06-30' },
      { cycleAnchor: 'junk', answer: 'yes', at: '2026-06-30' },
      { cycleAnchor: '2026-05-30', answer: 'maybe', at: '2026-06-01' },
      { cycleAnchor: '2026-05-30', answer: 'soft', at: '2026-06-01' },
    ]);
    expect(parseRemissionLog(raw)).toEqual([
      { cycleAnchor: '2026-06-28', answer: 'yes', at: '2026-06-30' },
      { cycleAnchor: '2026-05-30', answer: 'soft', at: '2026-06-01' },
    ]);
  });
});

describe('appendRemission', () => {
  it('appends to the existing log', async () => {
    getItem.mockResolvedValueOnce(
      JSON.stringify([{ cycleAnchor: '2026-05-30', answer: 'no', at: '2026-06-01' }]),
    );
    await appendRemission({ cycleAnchor: '2026-06-28', answer: 'yes', at: '2026-06-30' });
    const written = JSON.parse(setItem.mock.calls[0][1]);
    expect(written).toHaveLength(2);
    expect(written[1].cycleAnchor).toBe('2026-06-28');
  });
});

describe('answeredForCycle', () => {
  const log = [{ cycleAnchor: '2026-06-28', answer: 'yes' as const, at: '2026-06-30' }];

  it('matches only the exact cycle anchor', () => {
    expect(answeredForCycle(log, '2026-06-28')).toBe(true);
    expect(answeredForCycle(log, '2026-05-30')).toBe(false);
    expect(answeredForCycle(log, null)).toBe(false);
    expect(answeredForCycle([], '2026-06-28')).toBe(false);
  });
});
