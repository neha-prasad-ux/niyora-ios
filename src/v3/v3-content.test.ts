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
  levelSpectrumPosition,
  nextTougherStretch,
  remissionLine,
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
  it('lists every lever flagged above zero, in order', () => {
    const a = answers({ levers: { sleep: 2, stress: 0, food: 1, movement: 3 } });
    expect(deriveLevers(a).map((l) => l.id)).toEqual(['sleep', 'food', 'movement']);
  });

  it('returns none when nothing is flagged', () => {
    expect(deriveLevers(answers({ levers: { sleep: 0, stress: 0 } }))).toEqual([]);
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
    expect(line).toContain('next tougher stretch');
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
