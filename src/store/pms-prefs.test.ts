import {
  parsePmsPrefs,
  addPeriodStart,
  replaceLatestPeriodStart,
  effectiveCycleLength,
  DEFAULT_PMS_PREFS,
  type PmsPrefs,
} from './pms-prefs';

// Hoisted above the import by jest; the store touches AsyncStorage at module load.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const base = (over: Partial<PmsPrefs> = {}): PmsPrefs => ({
  ...DEFAULT_PMS_PREFS,
  ...over,
});

describe('parsePmsPrefs', () => {
  it('returns defaults for empty storage', () => {
    expect(parsePmsPrefs(null)).toEqual(DEFAULT_PMS_PREFS);
  });

  it('migrates a legacy single lastPeriodStart into the history', () => {
    const parsed = parsePmsPrefs(
      JSON.stringify({ pmsMode: true, lastPeriodStart: '2026-06-01', cycleLength: 30 }),
    );
    expect(parsed.periodStarts).toEqual(['2026-06-01']);
    expect(parsed.lastPeriodStart).toBe('2026-06-01');
    expect(parsed.cycleLength).toBe(30);
  });

  it('sorts and dedupes the stored history and points last at the most recent', () => {
    const parsed = parsePmsPrefs(
      JSON.stringify({
        pmsMode: true,
        periodStarts: ['2026-05-31', '2026-05-02', '2026-05-31', 'garbage'],
      }),
    );
    expect(parsed.periodStarts).toEqual(['2026-05-02', '2026-05-31']);
    expect(parsed.lastPeriodStart).toBe('2026-05-31');
  });
});

describe('addPeriodStart', () => {
  it('appends a new period and advances lastPeriodStart', () => {
    const next = addPeriodStart(base({ periodStarts: ['2026-05-01'], lastPeriodStart: '2026-05-01' }), '2026-05-31');
    expect(next.periodStarts).toEqual(['2026-05-01', '2026-05-31']);
    expect(next.lastPeriodStart).toBe('2026-05-31');
  });

  it('ignores a duplicate date', () => {
    const next = addPeriodStart(base({ periodStarts: ['2026-05-01'] }), '2026-05-01');
    expect(next.periodStarts).toEqual(['2026-05-01']);
  });

  it('ignores an invalid date', () => {
    const prefs = base({ periodStarts: ['2026-05-01'] });
    expect(addPeriodStart(prefs, 'nope')).toBe(prefs);
  });
});

describe('replaceLatestPeriodStart', () => {
  it('corrects the most recent date without adding a phantom cycle', () => {
    const next = replaceLatestPeriodStart(
      base({ periodStarts: ['2026-05-01', '2026-05-30'] }),
      '2026-05-31',
    );
    expect(next.periodStarts).toEqual(['2026-05-01', '2026-05-31']);
    expect(next.lastPeriodStart).toBe('2026-05-31');
  });

  it('sets the first date when history is empty', () => {
    const next = replaceLatestPeriodStart(base(), '2026-06-01');
    expect(next.periodStarts).toEqual(['2026-06-01']);
  });
});

describe('effectiveCycleLength', () => {
  it('uses the typed seed before there is enough history to learn', () => {
    expect(effectiveCycleLength(base({ cycleLength: 26, periodStarts: ['2026-06-01'] }))).toBe(26);
  });

  it('learns from logged periods once there are at least two', () => {
    expect(
      effectiveCycleLength(base({ cycleLength: 28, periodStarts: ['2026-05-02', '2026-05-31'] })),
    ).toBe(29);
  });

  it('lets a manual override win over the learned value', () => {
    expect(
      effectiveCycleLength(
        base({ cycleLength: 26, manualCycle: true, periodStarts: ['2026-05-02', '2026-05-31'] }),
      ),
    ).toBe(26);
  });
});
