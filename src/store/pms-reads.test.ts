jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { EMPTY_ANSWERS } from '@/v3/v3-content';

import { parsePmsReads } from './pms-reads';

describe('parsePmsReads', () => {
  it('degrades junk storage to no reads', () => {
    expect(parsePmsReads(null)).toEqual([]);
    expect(parsePmsReads('not json')).toEqual([]);
    expect(parsePmsReads('{"at":"2026-07-11"}')).toEqual([]); // not an array
  });

  it('drops malformed entries and fills missing answer fields', () => {
    const reads = parsePmsReads(
      JSON.stringify([
        { at: '2026-06-10', answers: { presence: ['bloating'] } },
        { answers: {} }, // no date: dropped
        null,
      ]),
    );
    expect(reads).toHaveLength(1);
    expect(reads[0].at).toBe('2026-06-10');
    expect(reads[0].answers).toEqual({ ...EMPTY_ANSWERS, presence: ['bloating'] });
  });
});
