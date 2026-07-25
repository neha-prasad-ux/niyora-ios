import {
  buildMomentRequest,
  EMPTY_MOMENT,
  LADDER_RUNGS,
  laneForFeeling,
  MOMENT_INSTRUCTIONS,
  MOMENT_SCRIPT,
  momentExcerpt,
  scanCrisis,
  tameProse,
  type MomentState,
} from '@/v3/in-the-moment-content';

describe('scanCrisis — tiered', () => {
  it('treats venting hyperbole as none', () => {
    expect(scanCrisis('i could kill him right now')).toBe('none');
    expect(scanCrisis('i want to die of embarrassment')).toBe('none');
    expect(scanCrisis('this meeting is killing me')).toBe('none');
    expect(scanCrisis('ugh i could just die, so awkward')).toBe('none');
  });

  it('flags explicit self-harm intent as hard', () => {
    expect(scanCrisis('i want to hurt myself')).toBe('hard');
    expect(scanCrisis('i keep thinking about how to end my life')).toBe('hard');
    expect(scanCrisis("i don't want to be here anymore")).toBe('hard');
    expect(scanCrisis('everyone would be better off without me')).toBe('hard');
  });

  it('flags ambiguous hopelessness as soft', () => {
    expect(scanCrisis("what's the point of any of it")).toBe('soft');
    expect(scanCrisis("i can't do this anymore")).toBe('soft');
    expect(scanCrisis('nothing matters')).toBe('soft');
  });

  it('lets ordinary venting through as none', () => {
    expect(scanCrisis('my boss took credit for my work again and i am furious')).toBe('none');
    expect(scanCrisis('i feel so flat today')).toBe('none');
  });

  it('rounds up: hard beats a co-occurring soft phrase', () => {
    expect(scanCrisis("what's the point, i want to end my life")).toBe('hard');
  });
});

describe('laneForFeeling', () => {
  it('routes high-arousal feelings to high', () => {
    for (const f of ['angry', 'anxious', 'overwhelmed', 'stressed', 'scared']) {
      expect(laneForFeeling(f)).toBe('high');
    }
  });
  it('routes low-arousal feelings to low', () => {
    for (const f of ['flat', 'numb', 'drained', 'empty', 'exhausted']) {
      expect(laneForFeeling(f)).toBe('low');
    }
  });
  it('routes labile / rejection-sensitive feelings to mixed', () => {
    for (const f of ['rejected', 'insecure', 'all over the place', 'conflicted', 'unsettled']) {
      expect(laneForFeeling(f)).toBe('mixed');
    }
  });
  it('defaults unknown feelings to high (over-serve regulation)', () => {
    expect(laneForFeeling('peckish')).toBe('high');
    expect(laneForFeeling('')).toBe('high');
  });
});

describe('momentExcerpt', () => {
  it('trims and passes short text through', () => {
    expect(momentExcerpt('  hello  ')).toBe('hello');
  });
  it('bounds long text to the last max chars', () => {
    const long = 'a'.repeat(600);
    expect(momentExcerpt(long, 500)).toHaveLength(500);
  });
});

describe('buildMomentRequest', () => {
  const base: MomentState = {
    ...EMPTY_MOMENT,
    rawText: 'he cancelled on me again',
    feeling: 'hurt',
  };

  const ALL_STEPS = [
    'entry',
    'safeCheck',
    'acknowledge',
    'feelings',
    'nameit',
    'feelheard',
    'body',
    'high',
    'ladder',
    'low',
    'mixed',
    'mixedCheckRead',
    'mixedAnchor',
    'arousalCheck',
    'act2',
    'timeit',
    'close',
    'more',
  ] as const;

  // "The moon" is the app-facing persona name only. A small model free-
  // associates on lunar imagery from the token alone and writes poetry instead
  // of reflecting her back (ai-briefs/finetune-results.md), so no string we
  // hand the model may contain it.
  it('never passes the word "moon" to the model', () => {
    expect(MOMENT_INSTRUCTIONS.toLowerCase()).not.toContain('moon');
    for (const step of ALL_STEPS) {
      const req = buildMomentRequest(step, { ...base, cycleContext: 'day 24, premenstrual window' });
      if (!req) continue;
      expect(req.instructions.toLowerCase()).not.toContain('moon');
      expect(req.prompt.toLowerCase()).not.toContain('moon');
    }
  });

  it('returns null for scripted / UI-only steps', () => {
    for (const step of [
      'entry',
      'safeCheck',
      'nameit',
      'body',
      'high',
      'ladder',
      'low',
      'mixed',
      'arousalCheck',
      'close',
    ] as const) {
      expect(buildMomentRequest(step, base)).toBeNull();
    }
  });

  it('acknowledge reflects her raw text, no chips', () => {
    const req = buildMomentRequest('acknowledge', base)!;
    expect(req).not.toBeNull();
    expect(req.instructions).toBe(MOMENT_INSTRUCTIONS);
    expect(req.prompt).toContain('he cancelled on me again');
    expect(req.wantChips).toBe(false);
  });

  it('feelings asks for chips', () => {
    const req = buildMomentRequest('feelings', base)!;
    expect(req.wantChips).toBe(true);
    expect(req.prompt).toContain('he cancelled on me again');
  });

  it('feelheard ties her feeling to what happened, no chips', () => {
    const req = buildMomentRequest('feelheard', base)!;
    expect(req.wantChips).toBe(false);
    expect(req.prompt).toContain('hurt');
    expect(req.prompt).toContain('he cancelled on me again');
  });

  it('injects cycle context when present', () => {
    const req = buildMomentRequest('acknowledge', {
      ...base,
      cycleContext: 'It is day 24 of her cycle, inside the premenstrual window.',
    })!;
    expect(req.prompt).toContain('day 24');
  });

  it('mixedCheckRead reflects her rejection thought, no chips', () => {
    const req = buildMomentRequest('mixedCheckRead', { ...base, feeling: 'rejected' })!;
    expect(req.wantChips).toBe(false);
    expect(req.prompt).toContain('he cancelled on me again');
    expect(req.prompt).toContain('rejected');
  });

  it('mixedAnchor offers a steadying anchor, no chips', () => {
    const req = buildMomentRequest('mixedAnchor', { ...base, feeling: 'rejected' })!;
    expect(req.wantChips).toBe(false);
    expect(req.prompt).toContain('he cancelled on me again');
  });

  it('act2 offers a gentler way to handle it, no chips', () => {
    const req = buildMomentRequest('act2', base)!;
    expect(req.wantChips).toBe(false);
    expect(req.prompt).toContain('he cancelled on me again');
    expect(req.prompt).toContain('hurt');
  });

  it('timeit is scripted (no model request)', () => {
    expect(buildMomentRequest('timeit', base)).toBeNull();
  });
});

describe('tameProse', () => {
  it('turns em/en dashes into commas', () => {
    expect(tameProse('you feel heavy — that makes sense')).toBe('you feel heavy, that makes sense');
    expect(tameProse('okay – nothing to solve')).toBe('okay, nothing to solve');
  });
  it('strips markdown and quotation marks but keeps apostrophes', () => {
    expect(tameProse('**that** sounds hard')).toBe('that sounds hard');
    expect(tameProse('"you don\'t have to fix it"')).toBe("you don't have to fix it");
  });
  it('folds a bulleted list into plain sentences', () => {
    const out = tameProse('here is how:\n* one thing\n* another thing');
    expect(out).not.toMatch(/[*\n]/);
  });
  it('caps to two sentences', () => {
    expect(tameProse('one. two. three. four.')).toBe('one. two.');
  });
  it('lowercases the first letter (moon voice)', () => {
    expect(tameProse('That feels heavy.')).toBe('that feels heavy.');
  });
  it('leaves already-clean moon copy untouched in spirit', () => {
    expect(tameProse('that anger makes complete sense right now.')).toBe(
      'that anger makes complete sense right now.',
    );
  });
});

describe('MOMENT_SCRIPT — no em dashes anywhere', () => {
  it('has no em or en dashes in any scripted string', () => {
    const walk = (v: unknown): string[] =>
      typeof v === 'string'
        ? [v]
        : typeof v === 'function'
          ? [String(v('angry'))]
          : Array.isArray(v)
            ? v.flatMap(walk)
            : [];
    const strings = Object.values(MOMENT_SCRIPT).flatMap(walk);
    const offenders = strings.filter((s) => /[—–]/.test(s));
    expect(offenders).toEqual([]);
  });
});

describe('LADDER_RUNGS', () => {
  it('is an ordered, non-empty escalation set', () => {
    expect(LADDER_RUNGS.length).toBeGreaterThanOrEqual(4);
    expect(LADDER_RUNGS[0].key).toBe('cold');
  });
  it('never repeats the breath — no rung is a breathing round', () => {
    for (const rung of LADDER_RUNGS) {
      expect(rung.intro.toLowerCase()).not.toMatch(/breathe|in for four|out for six/);
    }
  });
  it('every rung has a confirming chip', () => {
    for (const rung of LADDER_RUNGS) {
      expect(rung.chip.length).toBeGreaterThan(0);
    }
  });
});
