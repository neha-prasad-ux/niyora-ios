const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(mockStore.get(k) ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    mockStore.set(k, v);
    return Promise.resolve();
  }),
}));

import { getMoonState, parseMoonState, recordCycleMint } from './moon-state';
import { DEFAULT_MOON_STATE, DIM_FLOOR, FULLNESS_MAX, foldLedger } from '@/lib/moon-light';

beforeEach(() => mockStore.clear());

describe('parseMoonState', () => {
  it('degrades junk to the default bright moon', () => {
    expect(parseMoonState(null)).toEqual(DEFAULT_MOON_STATE);
    expect(parseMoonState('nope')).toEqual(DEFAULT_MOON_STATE);
  });

  it('clamps brightness and drops malformed shelf entries', () => {
    const parsed = parseMoonState(
      JSON.stringify({
        fullness: 7,
        material: 'gold',
        facets: 2.9,
        shelf: [
          {
            cycleStart: '2026-02-01',
            cycleEnd: '2026-03-01',
            fullness: 0.7,
            clarity: 'yes',
            material: 'gold',
            kept: true,
          },
          { cycleStart: 'junk' },
        ],
      }),
    );
    expect(parsed.fullness).toBe(FULLNESS_MAX);
    expect(parseMoonState(JSON.stringify({ fullness: -1 })).fullness).toBe(DIM_FLOOR);
    expect(parsed.material).toBe('gold');
    expect(parsed.facets).toBe(2);
    expect(parsed.shelf).toHaveLength(1);
  });
});

describe('recordCycleMint', () => {
  const input = {
    cycleStart: '2026-02-01',
    cycleEnd: '2026-03-01',
    clarity: 'yes' as const,
    engagedDates: new Set(['2026-02-20', '2026-02-21']),
    totals: foldLedger([]),
  };

  it('mints once per cycle end', async () => {
    const minted = await recordCycleMint(input);
    expect(minted.shelf).toHaveLength(1);
    expect(minted.shelf[0]).toMatchObject({ clarity: 'yes', kept: false });
    const again = await recordCycleMint(input);
    expect(again.shelf).toHaveLength(1);
    expect(await getMoonState()).toEqual(again);
  });
});
