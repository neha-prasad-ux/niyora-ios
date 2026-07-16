// The protocol engine must be incapable of producing a dead end: every step
// advances, every model step has a scripted fallback, the Keep always builds.

import {
  buildKeep,
  buildTurnRequest,
  CONFIRM_THOUGHT_CHIPS,
  cycleContextLine,
  dayPill,
  EMPTY_COMPACT,
  FEELING_CHIPS,
  MAX_TURNS,
  nextStep,
  SCRIPT,
  scriptedThoughtProposal,
  STEP_DOT,
  STEP_ORDER,
  ventExcerpt,
  type CompactState,
  type RoughStep,
} from './rough-moment-content';
import type { V3Answers } from './v3-content';

const CYCLE: V3Answers['cycle'] = {
  lastPeriod: '2026-07-01',
  starts: ['2026-07-01'],
  length: 28,
  unsure: false,
};

const state = (over: Partial<CompactState> = {}): CompactState => ({
  ...EMPTY_COMPACT,
  ventExcerpt: 'He ignored me all evening and I feel like everything is falling apart',
  ...over,
});

describe('the arc', () => {
  it('walks confirm to keep and stays terminal at keep', () => {
    expect(nextStep('confirm')).toBe('pattern');
    expect(nextStep('pattern')).toBe('examine');
    expect(nextStep('examine')).toBe('change');
    expect(nextStep('change')).toBe('reframe');
    expect(nextStep('reframe')).toBe('keep');
    expect(nextStep('keep')).toBe('keep');
  });

  it('folds every step into one of the five dots, in order', () => {
    const dots = STEP_ORDER.map((s) => STEP_DOT[s]);
    // confirm/pattern/examine each get a dot; change/reframe share dot 4 —
    // six beats, five dots.
    expect(dots).toEqual([1, 2, 3, 4, 4, 5]);
  });

  it('caps well above the longest possible arc', () => {
    // The longest scripted run is one app line plus one reply per beat; the cap
    // is a backstop above that, not a wall.
    expect(MAX_TURNS).toBeGreaterThanOrEqual(STEP_ORDER.length * 2);
  });
});

describe('ventExcerpt', () => {
  it('passes short vents through trimmed', () => {
    expect(ventExcerpt('  ugh  ')).toBe('ugh');
  });

  it('keeps only the LAST 500 chars of a long vent (the freshest words)', () => {
    const long = `${'x'.repeat(600)}END`;
    const out = ventExcerpt(long);
    expect(out).toHaveLength(500);
    expect(out.endsWith('END')).toBe(true);
  });
});

describe('dayPill', () => {
  it('names the cycle day and flags the premenstrual window', () => {
    // Cycle start July 1, length 28: July 24 is day 24, 5 days before the
    // next predicted period -- inside the 7-day window.
    const pill = dayPill(CYCLE, new Date(2026, 6, 24));
    expect(pill).toEqual({ label: 'day 24', inWindow: true });
  });

  it('is outside the window early in the cycle', () => {
    const pill = dayPill(CYCLE, new Date(2026, 6, 8));
    expect(pill).toEqual({ label: 'day 8', inWindow: false });
  });

  it('returns null when she was unsure or data is missing', () => {
    expect(dayPill({ ...CYCLE, unsure: true }, new Date(2026, 6, 24))).toBeNull();
    expect(dayPill({ ...CYCLE, lastPeriod: null }, new Date(2026, 6, 24))).toBeNull();
    expect(dayPill({ ...CYCLE, length: null }, new Date(2026, 6, 24))).toBeNull();
  });

  it('feeds the prompt line only when a pill exists', () => {
    expect(cycleContextLine(null)).toBeNull();
    expect(cycleContextLine({ label: 'day 24', inWindow: true })).toContain('day 24');
    expect(cycleContextLine({ label: 'day 24', inWindow: true })).toContain('premenstrual');
    expect(cycleContextLine({ label: 'day 8', inWindow: false })).not.toContain('premenstrual');
  });
});

describe('buildTurnRequest', () => {
  it('never calls the model for the scripted-only beats (pattern, change)', () => {
    expect(buildTurnRequest('pattern', state())).toBeNull();
    expect(buildTurnRequest('change', state())).toBeNull();
  });

  // The beats that carry her confirmed thought forward.
  const THOUGHT_STEPS: RoughStep[] = ['examine', 'reframe', 'keep'];

  it.each(THOUGHT_STEPS)('%s: carries her thought, bounded, with instructions', (step) => {
    const req = buildTurnRequest(step, state({ thought: 'everything is falling apart' }));
    expect(req).not.toBeNull();
    expect(req!.instructions).toContain('never');
    expect(req!.prompt).toContain('falling apart');
  });

  it('confirm opens the session bounded and wanting chips (no vent to carry)', () => {
    const req = buildTurnRequest('confirm', state());
    expect(req).not.toBeNull();
    expect(req!.instructions).toContain('never');
    expect(req!.wantChips).toBe(true);
  });

  it('only confirm and examine want chips (the effort gradient)', () => {
    const s = state({ thought: 't', feeling: 'hurt' });
    expect(buildTurnRequest('confirm', s)!.wantChips).toBe(true);
    expect(buildTurnRequest('examine', s)!.wantChips).toBe(true);
    expect(buildTurnRequest('reframe', s)!.wantChips).toBe(false);
    expect(buildTurnRequest('keep', s)!.wantChips).toBe(false);
  });

  it('injects cycle context when present', () => {
    const req = buildTurnRequest('confirm', state({ cycleContext: 'It is day 24 of her cycle.' }));
    expect(req!.prompt).toContain('day 24');
  });

  it('quiet voice is enforced in instructions, not hoped for', () => {
    const req = buildTurnRequest('confirm', state());
    expect(req!.instructions).toContain('No exclamation points');
    expect(req!.instructions).toContain('Never diagnose');
  });
});

describe('scripted fallbacks (the session must always complete)', () => {
  it('has a scripted line for every beat of the arc', () => {
    expect(SCRIPT.confirmIntro.length).toBeGreaterThan(0);
    expect(SCRIPT.patternIntro.length).toBeGreaterThan(0);
    expect(SCRIPT.examine.length).toBeGreaterThan(0);
    expect(SCRIPT.reframe.length).toBeGreaterThan(0);
    expect(SCRIPT.keepQuote.length).toBeGreaterThan(0);
    expect(SCRIPT.examineChips.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps DESIGN.md voice: no exclamation points, no emoji anywhere', () => {
    const all = [
      ...Object.values(SCRIPT).flatMap((v) => (Array.isArray(v) ? v : [v])),
      ...FEELING_CHIPS,
      ...CONFIRM_THOUGHT_CHIPS,
    ].join(' ');
    expect(all).not.toMatch(/!/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('proposes her own words as the fallback thought, chip-sized', () => {
    expect(scriptedThoughtProposal('the relationship is falling apart')).toBe(
      'the relationship is falling apart',
    );
    const long = 'a'.repeat(120);
    expect(scriptedThoughtProposal(long)).toHaveLength(80);
    expect(scriptedThoughtProposal('   ')).toBe('This feels like too much');
  });
});

describe('buildKeep', () => {
  it('builds the full ladder from a generated quote + confirmed thought', () => {
    const keep = buildKeep(
      ' One quiet evening is not the relationship. ',
      state({ thought: 'the relationship is falling apart' }),
      { label: 'day 24', inWindow: true },
    );
    expect(keep.title).toBe('The thought you observed');
    expect(keep.quote).toBe('One quiet evening is not the relationship.');
    expect(keep.support).toContain('the relationship is falling apart');
    expect(keep.caption).toBe('day 24 · window · caught it, checked it, changed it');
  });

  it('still builds complete with nothing confirmed and no model (worst case)', () => {
    const keep = buildKeep(null, state({ ventExcerpt: '' }), null);
    expect(keep.quote).toBe(SCRIPT.keepQuote);
    expect(keep.support).toBe(SCRIPT.keepSupport);
    expect(keep.caption).toBe('caught it, checked it, changed it');
  });
});
