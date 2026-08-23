import {
  applyMint,
  cyclesKept,
  daysBetween,
  dayToYmd,
  deriveMaterial,
  dueRecalls,
  earnLight,
  engagedDatesFrom,
  fadingRecalls,
  foldLedger,
  localYmd,
  mintCycleMoon,
  moonBrightness,
  ringsEarned,
  soulEarned,
  withBrightness,
  withMaterial,
  ymdToDay,
  MATERIAL_GATES,
  RINGS,
  CYCLE_KEPT_MIN,
  DAILY_LIGHT_CAP,
  DEFAULT_MOON_STATE,
  DIM_FLOOR,
  DIM_PER_FADING,
  FULLNESS_MAX,
  LIGHT_BASE,
  type LedgerTotals,
  type LightEvent,
  type MoonState,
} from './moon-light';

function ev(kind: LightEvent['kind'], amount: number, date = '2026-03-10'): LightEvent {
  return { date, kind, amount };
}

function totals(overrides: Partial<LedgerTotals> = {}): LedgerTotals {
  return {
    lifetimeLight: 0,
    recognitions: 0,
    applications: 0,
    skillsLived: 0,
    skillsSolid: 0,
    ...overrides,
  };
}

function moon(overrides: Partial<MoonState> = {}): MoonState {
  return { ...DEFAULT_MOON_STATE, ...overrides };
}

// --- earnLight ---------------------------------------------------------------

describe('earnLight', () => {
  it('grants the base amounts on a fresh day', () => {
    for (const kind of ['visit', 'calm', 'train', 'recall', 'notice', 'apply'] as const) {
      expect(earnLight({ kind, todaysEvents: [], matchedAction: false })).toBe(LIGHT_BASE[kind]);
    }
  });

  it('grants a visit once per day', () => {
    expect(
      earnLight({ kind: 'visit', todaysEvents: [ev('visit', 5)], matchedAction: false }),
    ).toBe(0);
  });

  it('diminishes repeat calms: 15, 5, then nothing', () => {
    expect(earnLight({ kind: 'calm', todaysEvents: [], matchedAction: false })).toBe(15);
    expect(earnLight({ kind: 'calm', todaysEvents: [ev('calm', 15)], matchedAction: false })).toBe(
      5,
    );
    expect(
      earnLight({
        kind: 'calm',
        todaysEvents: [ev('calm', 15), ev('calm', 5)],
        matchedAction: false,
      }),
    ).toBe(0);
  });

  it('caps notice and apply at two per day', () => {
    const two = [ev('notice', 30), ev('notice', 30)];
    expect(earnLight({ kind: 'notice', todaysEvents: two, matchedAction: false })).toBe(0);
    const applied = [ev('apply', 40), ev('apply', 40)];
    expect(earnLight({ kind: 'apply', todaysEvents: applied, matchedAction: false })).toBe(0);
  });

  it('multiplies the coached action by 1.5, rounded up', () => {
    expect(earnLight({ kind: 'train', todaysEvents: [], matchedAction: true })).toBe(30);
    expect(earnLight({ kind: 'calm', todaysEvents: [], matchedAction: true })).toBe(23); // ceil(22.5)
  });

  it('truncates to the daily cap and then grants nothing', () => {
    const nearCap = [ev('apply', 40), ev('apply', 40), ev('notice', 15)]; // 95 spent
    expect(earnLight({ kind: 'calm', todaysEvents: nearCap, matchedAction: false })).toBe(
      DAILY_LIGHT_CAP - 95,
    );
    const atCap = [...nearCap, ev('calm', 5)];
    expect(earnLight({ kind: 'train', todaysEvents: atCap, matchedAction: false })).toBe(0);
  });
});

// --- brightness: bright by default ----------------------------------------------

describe('moonBrightness / withBrightness', () => {
  it('is fully bright with nothing fading', () => {
    expect(moonBrightness(0)).toBe(FULLNESS_MAX);
    expect(DEFAULT_MOON_STATE.fullness).toBe(FULLNESS_MAX);
  });

  it('dims one step per fading lesson', () => {
    expect(moonBrightness(1)).toBeCloseTo(FULLNESS_MAX - DIM_PER_FADING);
    expect(moonBrightness(2)).toBeCloseTo(FULLNESS_MAX - 2 * DIM_PER_FADING);
  });

  it('never dims below a clearly lit moon', () => {
    expect(moonBrightness(50)).toBe(DIM_FLOOR);
  });

  it('withBrightness restores instantly and is a no-op when unchanged', () => {
    const dim = withBrightness(moon(), moonBrightness(2));
    expect(dim.fullness).toBeCloseTo(0.7);
    const bright = withBrightness(dim, moonBrightness(0));
    expect(bright.fullness).toBe(FULLNESS_MAX);
    expect(withBrightness(bright, FULLNESS_MAX)).toBe(bright);
  });
});

describe('fadingRecalls', () => {
  const train: LightEvent = { date: '2026-03-01', kind: 'train', amount: 20, refId: 'irr-l1' };

  it('a due recall dims nothing during its grace', () => {
    // Due on the 3rd (+2d); fading only from the 6th (+3d grace).
    expect(dueRecalls([train], '2026-03-04')).toHaveLength(1);
    expect(fadingRecalls([train], '2026-03-05')).toHaveLength(0);
    expect(fadingRecalls([train], '2026-03-06')).toHaveLength(1);
  });

  it('answering the recall restores the count to zero', () => {
    const answered: LightEvent = { date: '2026-03-07', kind: 'recall', amount: 25, refId: 'irr-l1' };
    expect(fadingRecalls([train, answered], '2026-03-08')).toHaveLength(0);
    // The second recall is due on the 8th (+7d) and fades from the 11th.
    expect(fadingRecalls([train, answered], '2026-03-11')).toHaveLength(1);
  });
});

// --- rings ---------------------------------------------------------------------

describe('ringsEarned / soulEarned', () => {
  it('rings the first act of day one', () => {
    expect(ringsEarned(0)).toBe(0);
    expect(ringsEarned(20)).toBe(1); // visit + one calm already gets there
  });

  it('climbs the band at 20 / 100 / 300 / 600', () => {
    expect(ringsEarned(99)).toBe(1);
    expect(ringsEarned(100)).toBe(2);
    expect(ringsEarned(300)).toBe(3);
    expect(ringsEarned(600)).toBe(4);
  });

  it('fuses the soul at the fourth ring', () => {
    expect(soulEarned(599)).toBe(false);
    expect(soulEarned(600)).toBe(true);
  });

  it('hands off to the material ladder with no dead zone', () => {
    const lastRing = RINGS[RINGS.length - 1].light;
    expect(lastRing).toBeLessThan(MATERIAL_GATES.gold.light);
  });
});

// --- material ---------------------------------------------------------------------

describe('deriveMaterial', () => {
  it('starts at moonstone', () => {
    expect(deriveMaterial(totals(), 0)).toBe('moonstone');
  });

  it('gold needs light and a kept cycle', () => {
    expect(deriveMaterial(totals({ lifetimeLight: 800 }), 0)).toBe('moonstone');
    expect(deriveMaterial(totals({ lifetimeLight: 800 }), 1)).toBe('gold');
  });

  it('light alone can never reach opal or diamond', () => {
    expect(deriveMaterial(totals({ lifetimeLight: 999999 }), 99)).toBe('gold');
  });

  it('opal needs solid skills and recognitions', () => {
    const t = totals({ lifetimeLight: 2500, skillsSolid: 3, recognitions: 5 });
    expect(deriveMaterial(t, 0)).toBe('opal');
    expect(deriveMaterial(totals({ ...t, recognitions: 4 }), 0)).toBe('moonstone');
  });

  it('diamond needs kept cycles, lived skills, and applications', () => {
    const t = totals({ lifetimeLight: 6000, skillsLived: 3, applications: 10 });
    expect(deriveMaterial(t, 3)).toBe('diamond');
    expect(deriveMaterial(t, 2)).toBe('gold'); // one kept cycle short of diamond
  });

  it('withMaterial is monotonic: a lower derivation never demotes', () => {
    const s = moon({ material: 'opal' });
    expect(withMaterial(s, totals()).material).toBe('opal');
    const t = totals({ lifetimeLight: 800 });
    const kept = moon({ material: 'opal', shelf: [mintedMoon(true)] });
    expect(withMaterial(kept, t).material).toBe('opal'); // gold derivation, opal held
  });
});

describe('foldLedger', () => {
  it('counts light, recognitions, applications, lived and solid skills', () => {
    const events: LightEvent[] = [
      { date: '2026-03-01', kind: 'train', amount: 20, refId: 'irr-l1' },
      { date: '2026-03-03', kind: 'recall', amount: 25, refId: 'irr-l1' },
      { date: '2026-03-08', kind: 'recall', amount: 25, refId: 'irr-l1' },
      { date: '2026-03-09', kind: 'notice', amount: 30 },
      { date: '2026-03-10', kind: 'apply', amount: 40, refId: 'irr-l1' },
      { date: '2026-03-11', kind: 'apply', amount: 40, refId: 'irr-l1' },
    ];
    const t = foldLedger(events);
    expect(t.lifetimeLight).toBe(180);
    expect(t.recognitions).toBe(1);
    expect(t.applications).toBe(2);
    expect(t.skillsLived).toBe(1);
    expect(t.skillsSolid).toBe(1);
  });
});

// --- recalls -------------------------------------------------------------------

describe('dueRecalls', () => {
  const train: LightEvent = { date: '2026-03-01', kind: 'train', amount: 20, refId: 'irr-l1' };

  it('offers the first recall two days after completion, not before', () => {
    expect(dueRecalls([train], '2026-03-02')).toEqual([]);
    expect(dueRecalls([train], '2026-03-03')).toEqual([{ levelId: 'irr-l1', stage: 1 }]);
  });

  it('offers the second recall seven days after completion, once the first passed', () => {
    const first: LightEvent = { date: '2026-03-03', kind: 'recall', amount: 25, refId: 'irr-l1' };
    expect(dueRecalls([train, first], '2026-03-07')).toEqual([]);
    expect(dueRecalls([train, first], '2026-03-08')).toEqual([{ levelId: 'irr-l1', stage: 2 }]);
  });

  it('goes quiet after both recalls', () => {
    const done: LightEvent[] = [
      train,
      { date: '2026-03-03', kind: 'recall', amount: 25, refId: 'irr-l1' },
      { date: '2026-03-08', kind: 'recall', amount: 25, refId: 'irr-l1' },
    ];
    expect(dueRecalls(done, '2026-04-01')).toEqual([]);
  });
});

// --- cycle mint ------------------------------------------------------------------

function mintedMoon(kept: boolean) {
  return {
    cycleStart: '2026-02-01',
    cycleEnd: '2026-03-01',
    fullness: kept ? 0.8 : 0.3,
    clarity: null,
    material: 'moonstone' as const,
    kept,
  };
}

describe('mintCycleMoon', () => {
  const start = '2026-02-01';
  const end = '2026-03-01'; // 28-day cycle: 14 open days (w1) + 14 key days (w2)

  function engagedRange(fromYmd: string, toYmdExclusive: string): Set<string> {
    const dates = new Set<string>();
    const a = ymdToDay(fromYmd)!;
    const b = ymdToDay(toYmdExclusive)!;
    for (let d = a; d < b; d++) dates.add(dayToYmd(d));
    return dates;
  }

  it('weights the last fourteen days double', () => {
    // Engaged only the 14 key days: 28/42 of the weight.
    const keyOnly = mintCycleMoon({
      cycleStartYmd: start,
      cycleEndYmd: end,
      engagedDates: engagedRange('2026-02-15', end),
      clarity: 'yes',
      material: 'moonstone',
    })!;
    expect(keyOnly.fullness).toBeCloseTo(28 / 42);
    expect(keyOnly.kept).toBe(true);

    // Engaged only the 14 open days: 14/42, same day count, not kept.
    const openOnly = mintCycleMoon({
      cycleStartYmd: start,
      cycleEndYmd: end,
      engagedDates: engagedRange(start, '2026-02-15'),
      clarity: 'yes',
      material: 'moonstone',
    })!;
    expect(openOnly.fullness).toBeCloseTo(14 / 42);
    expect(openOnly.kept).toBe(false);
  });

  it('keeps the cycle at the threshold', () => {
    const all = mintCycleMoon({
      cycleStartYmd: start,
      cycleEndYmd: end,
      engagedDates: engagedRange(start, end),
      clarity: 'soft',
      material: 'gold',
    })!;
    expect(all.fullness).toBe(1);
    expect(all.kept).toBe(true);
    expect(all.fullness).toBeGreaterThanOrEqual(CYCLE_KEPT_MIN);
  });

  it('rejects a backwards or empty cycle', () => {
    expect(
      mintCycleMoon({
        cycleStartYmd: end,
        cycleEndYmd: start,
        engagedDates: new Set(),
        clarity: null,
        material: 'moonstone',
      }),
    ).toBeNull();
  });
});

describe('applyMint', () => {
  it('appends once per cycle end', () => {
    const s = applyMint(moon(), mintedMoon(true));
    expect(s.shelf).toHaveLength(1);
    expect(applyMint(s, mintedMoon(true))).toBe(s);
    expect(cyclesKept(s.shelf)).toBe(1);
  });

  it('adds a facet only for kept cycles at diamond', () => {
    const diamond = moon({ material: 'diamond' });
    expect(applyMint(diamond, mintedMoon(true)).facets).toBe(1);
    expect(applyMint(diamond, mintedMoon(false)).facets).toBe(0);
    expect(applyMint(moon({ material: 'gold' }), mintedMoon(true)).facets).toBe(0);
  });
});

// --- day helpers -------------------------------------------------------------------

describe('day helpers', () => {
  it('round-trips and subtracts', () => {
    expect(dayToYmd(ymdToDay('2026-03-10')!)).toBe('2026-03-10');
    expect(daysBetween('2026-03-01', '2026-03-10')).toBe(9);
    expect(daysBetween('junk', '2026-03-10')).toBeNull();
    expect(localYmd(new Date(2026, 2, 5, 9, 30))).toBe('2026-03-05');
  });

  it('collects engaged dates', () => {
    const dates = engagedDatesFrom([ev('visit', 5, '2026-03-01'), ev('calm', 15, '2026-03-01')]);
    expect(dates).toEqual(new Set(['2026-03-01']));
  });
});
