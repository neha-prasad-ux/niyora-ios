import {
  ANCHOR_IDS,
  EMPTY_ANSWERS,
  bandLevel,
  copingStandingCopy,
  cycleLine,
  deriveCopingStanding,
  deriveLevel,
  deriveLevers,
  formatStretchDate,
  levelActivation,
  levelSpectrumPosition,
  nextTougherStretch,
  regulationBlurb,
  remissionLine,
  standingSkill,
  waveMeterLabel,
  type V3Answers,
} from './v3-content';

function answers(patch: Partial<V3Answers>): V3Answers {
  return { ...EMPTY_ANSWERS, ...patch };
}

// --- Level banding (decision 2) ---------------------------------------

describe('bandLevel (the locked formula)', () => {
  it('reads severe only when count >= 5 AND anchor AND impact === 2', () => {
    expect(bandLevel(5, true, 2)).toBe('severe');
    expect(bandLevel(8, true, 2)).toBe('severe');
  });

  it('is not severe if any of the three severe conditions is missing', () => {
    expect(bandLevel(4, true, 2)).toBe('moderate'); // too few symptoms
    expect(bandLevel(6, false, 2)).toBe('moderate'); // no anchor -> falls to count>=3 && impact>=1
    expect(bandLevel(6, true, 1)).toBe('moderate'); // impact not "a lot"
  });

  it('reads moderate when (count >= 3 OR anchor) AND impact >= 1', () => {
    expect(bandLevel(3, false, 1)).toBe('moderate'); // count path
    expect(bandLevel(1, true, 1)).toBe('moderate'); // anchor path
    expect(bandLevel(3, false, 2)).toBe('moderate');
  });

  it('reads mild when impact is zero regardless of symptoms', () => {
    expect(bandLevel(9, true, 0)).toBe('mild');
    expect(bandLevel(5, true, 0)).toBe('mild');
  });

  it('reads mild for a low, unanchored, low-impact profile', () => {
    expect(bandLevel(2, false, 1)).toBe('mild'); // <3 and no anchor
    expect(bandLevel(0, false, 0)).toBe('mild');
  });
});

describe('deriveLevel (reads the inputs off the answers)', () => {
  it('uses the four emotional anchors, not just any symptom', () => {
    expect(ANCHOR_IDS).toEqual(['mood_swings', 'irritability', 'feeling_low', 'anxious']);
  });

  it('bands a PMDD-range profile as severe', () => {
    const a = answers({
      presence: ['mood_swings', 'irritability', 'anxious', 'bloating', 'aches'],
      impairment: { work: 2, relationships: 1, home: 0 }, // highest = 2
    });
    expect(deriveLevel(a)).toBe('severe');
  });

  it('takes the HIGHEST impairment slider, not the sum or average', () => {
    const a = answers({
      presence: ['mood_swings', 'irritability', 'anxious', 'bloating', 'aches'],
      impairment: { work: 2, relationships: 0, home: 0 },
    });
    expect(deriveLevel(a)).toBe('severe'); // highest is 2, so still severe
  });

  it('bands a low, low-impact profile as mild', () => {
    const a = answers({ presence: ['bloating'], impairment: { work: 0, relationships: 0, home: 0 } });
    expect(deriveLevel(a)).toBe('mild');
  });

  it('treats a single anchor with some impact as moderate', () => {
    const a = answers({ presence: ['anxious'], impairment: { work: 1 } });
    expect(deriveLevel(a)).toBe('moderate');
  });

  it('handles empty answers without throwing', () => {
    expect(deriveLevel(EMPTY_ANSWERS)).toBe('mild');
  });
});

describe('levelSpectrumPosition', () => {
  it('advances left to right with severity', () => {
    expect(levelSpectrumPosition('mild')).toBeLessThan(levelSpectrumPosition('moderate'));
    expect(levelSpectrumPosition('moderate')).toBeLessThan(levelSpectrumPosition('severe'));
  });
});

// --- Levers -----------------------------------------------------------

describe('deriveLevers', () => {
  it('flags the healthy habits she rarely keeps (rated 0-1), in order', () => {
    const a = answers({ levers: { sleep: 2, food: 0, movement: 1 } });
    expect(deriveLevers(a).map((l) => l.id)).toEqual(['food', 'movement']);
  });

  it('flags nothing when the habits are kept', () => {
    expect(deriveLevers(answers({ levers: { sleep: 2, food: 2, movement: 2 } }))).toEqual([]);
  });
});

// --- Coping standing --------------------------------------------------

describe('deriveCopingStanding', () => {
  it('is null with no selections', () => {
    expect(deriveCopingStanding(EMPTY_ANSWERS)).toBeNull();
  });

  it('reads disengaging when disengagement outweighs engagement', () => {
    expect(deriveCopingStanding(answers({ coping: ['suppress', 'withdraw', 'talk'] }))).toBe('disengaging');
  });

  it('reads engaging when engagement outweighs disengagement', () => {
    expect(deriveCopingStanding(answers({ coping: ['talk', 'reframe', 'suppress'] }))).toBe('engaging');
  });

  it('reads mixed on a tie', () => {
    expect(deriveCopingStanding(answers({ coping: ['talk', 'suppress'] }))).toBe('mixed');
  });

  it('names the standing without a personality label', () => {
    const copy = copingStandingCopy('disengaging');
    expect(copy?.line).toContain('push feelings down');
    expect(copy?.tail).toContain('trainable');
    expect(copingStandingCopy(null)).toBeNull();
  });
});

// --- Remission (decision 3) -------------------------------------------

describe('remissionLine', () => {
  it('yes gives the predictable, agency-forward line', () => {
    expect(remissionLine('yes')).toContain('predictable');
  });

  it('no gives the gentle, non-alarming flag', () => {
    const line = remissionLine('no');
    expect(line).toContain('fuller picture');
    expect(line?.toLowerCase()).not.toContain('danger');
  });

  it('unsure and null give no line', () => {
    expect(remissionLine('unsure')).toBeNull();
    expect(remissionLine(null)).toBeNull();
  });

  it('never uses an em dash', () => {
    for (const r of ['yes', 'no'] as const) {
      expect(remissionLine(r)).not.toContain('—');
    }
  });
});

// --- Cycle estimate (decision 3) --------------------------------------

describe('nextTougherStretch', () => {
  const today = new Date(2026, 6, 6); // 2026-07-06 (local)

  it('is null when the cycle answer is missing', () => {
    expect(nextTougherStretch({ lastPeriod: null, length: null, unsure: false }, today)).toBeNull();
  });

  it('is null when "not sure" is set', () => {
    expect(nextTougherStretch({ lastPeriod: '2026-06-20', length: 28, unsure: true }, today)).toBeNull();
  });

  it('points ~7 days before the next predicted period', () => {
    // last period 2026-06-20, 28-day cycle -> next period ~2026-07-18.
    // Window opens 7 days before -> ~2026-07-11.
    const d = nextTougherStretch({ lastPeriod: '2026-06-20', length: 28, unsure: false }, today);
    expect(d).not.toBeNull();
    expect(formatStretchDate(d as Date)).toBe('July 11');
  });

  it('rolls to a later cycle when the last period was long ago', () => {
    const d = nextTougherStretch({ lastPeriod: '2026-04-01', length: 30, unsure: false }, today);
    expect(d).not.toBeNull();
    // Should be a future date, not in the past.
    expect((d as Date).getTime()).toBeGreaterThan(today.getTime());
  });
});

describe('cycleLine', () => {
  const today = new Date(2026, 6, 6);

  it('produces a dated line when the cycle is known', () => {
    const line = cycleLine({ lastPeriod: '2026-06-20', length: 28, unsure: false }, today);
    expect(line).toContain('PMS window');
    expect(line).not.toContain('dip'); // say PMS, not "dip"
    expect(line).toContain('July 11');
  });

  it('omits cleanly when unknown or not sure', () => {
    expect(cycleLine({ lastPeriod: null, length: null, unsure: false }, today)).toBeNull();
    expect(cycleLine({ lastPeriod: '2026-06-20', length: 28, unsure: true }, today)).toBeNull();
  });

  it('never uses an em dash', () => {
    const line = cycleLine({ lastPeriod: '2026-06-20', length: 28, unsure: false }, today);
    expect(line).not.toContain('—');
  });
});

describe('levelActivation (severity -> water height)', () => {
  it('rises with severity and always leaves room for the in-window bump', () => {
    expect(levelActivation('mild')).toBeLessThan(levelActivation('moderate'));
    expect(levelActivation('moderate')).toBeLessThan(levelActivation('severe'));
    expect(levelActivation('severe')).toBeLessThan(0.82); // room to bump higher in-window
  });
});

describe('standingSkill (coping standing -> starting water steadiness)', () => {
  it('ranks engaging steadier than mixed, mixed steadier than disengaging', () => {
    expect(standingSkill('engaging')).toBeGreaterThan(standingSkill('mixed'));
    expect(standingSkill('mixed')).toBeGreaterThan(standingSkill('disengaging'));
  });

  it('never starts anyone at zero and never above the band (no shame, no hype)', () => {
    for (const s of ['engaging', 'mixed', 'disengaging', null] as const) {
      const v = standingSkill(s);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(8);
    }
  });

  it('maps each standing to the intended meter label', () => {
    expect(waveMeterLabel(standingSkill('engaging'), false).label).toBe('Steady in the swell');
    expect(waveMeterLabel(standingSkill('mixed'), false).label).toBe('Riding the wave');
    expect(waveMeterLabel(standingSkill('disengaging'), false).label).toBe('Finding your footing');
    expect(waveMeterLabel(standingSkill(null), false).label).toBe('Learning the water');
  });
});

describe('regulationBlurb (plain-language water description)', () => {
  it('gives a distinct, non-empty read for each standing', () => {
    const all = (['engaging', 'mixed', 'disengaging', null] as const).map(regulationBlurb);
    for (const b of all) expect(b.length).toBeGreaterThan(20);
    expect(new Set(all).size).toBe(4); // all different
  });

  it('explains the "finding your footing" band in plain words', () => {
    expect(regulationBlurb('disengaging').toLowerCase()).toContain('finding your footing');
  });

  it('never lectures about being trainable, and stays quiet (no em dash / bang)', () => {
    for (const s of ['engaging', 'mixed', 'disengaging', null] as const) {
      const b = regulationBlurb(s);
      expect(b.toLowerCase()).not.toContain('trainable');
      expect(b).not.toMatch(/[—!]/);
    }
  });
});

describe('waveMeterLabel (skill band + in-window note)', () => {
  it('bands skill 0..10 into the five labels', () => {
    expect(waveMeterLabel(0, false).label).toBe('Learning the water');
    expect(waveMeterLabel(3, false).label).toBe('Finding your footing');
    expect(waveMeterLabel(6, false).label).toBe('Riding the wave');
    expect(waveMeterLabel(8, false).label).toBe('Steady in the swell');
    expect(waveMeterLabel(10, false).label).toBe('Calm in the current');
  });

  it('debuts at "Learning the water" (skill 0)', () => {
    expect(waveMeterLabel(0, true).label).toBe('Learning the water');
  });

  it('adds the amber note only in-window, and never drops the band', () => {
    expect(waveMeterLabel(6, false).note).toBeNull();
    expect(waveMeterLabel(6, true).note).toContain("water's high");
    // The band is unchanged by the window: rough water, not lost ground.
    expect(waveMeterLabel(6, true).label).toBe(waveMeterLabel(6, false).label);
  });

  it('clamps out-of-range skill without throwing', () => {
    expect(waveMeterLabel(-3, false).label).toBe('Learning the water');
    expect(waveMeterLabel(42, false).label).toBe('Calm in the current');
  });

  it('keeps copy free of em dashes and exclamation points', () => {
    for (const s of [0, 3, 6, 8, 10]) {
      const { label, note } = waveMeterLabel(s, true);
      expect(label).not.toMatch(/[—!]/);
      expect(note ?? '').not.toMatch(/[—!]/);
    }
  });
});
