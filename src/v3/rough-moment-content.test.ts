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

  // The corpus emits `cycle:` ONLY when the premenstrual flag is set
  // (assemble.py build_user), and always as "day N, premenstrual window".
  // Outside the window it sends nothing at all, so neither do we.
  it('feeds the compact corpus phrase, and only inside the window', () => {
    expect(cycleContextLine(null)).toBeNull();
    expect(cycleContextLine({ label: 'day 8', inWindow: false })).toBeNull();
    expect(cycleContextLine({ label: 'day 24', inWindow: true })).toBe(
      'day 24, premenstrual window',
    );
  });
});

describe('buildTurnRequest', () => {
  it('never calls the model for the scripted-only beats (pattern, change)', () => {
    expect(buildTurnRequest('pattern', state())).toBeNull();
    expect(buildTurnRequest('change', state())).toBeNull();
  });

  // The rev-2 rule: the model may echo, pick or transform, and may never
  // compose. These three are the compose beats — a CBT stem, a gentler
  // reading, the line she keeps — and all three produced near-nonsense on the
  // phone in the run where acknowledge passed. They are not flagged off, they
  // are unreachable: no slot, so no request, so nothing for a caller to send.
  const COMPOSE_STEPS: RoughStep[] = ['examine', 'reframe', 'keep'];

  it.each(COMPOSE_STEPS)('%s: cannot reach the model at all', (step) => {
    expect(buildTurnRequest(step, state({ thought: 'everything is falling apart' }))).toBeNull();
  });

  it('confirm is the one model beat left, and it never asks for chips', () => {
    const req = buildTurnRequest('confirm', state());
    expect(req).not.toBeNull();
    expect(req!.instructions).toContain('never');
    // Chips at this beat are the authored core-thought menu. A model that
    // writes her options is composing, whatever the beat is called.
    expect(req!.wantChips).toBe(false);
  });

  it('declines the turn when she has typed nothing, rather than echoing air', () => {
    expect(buildTurnRequest('confirm', state({ ventExcerpt: '' }))).toBeNull();
  });

  it('sends only her own words, never the chip she tapped', () => {
    const req = buildTurnRequest(
      'confirm',
      state({ ventExcerpt: 'he went quiet all evening', tappedChip: 'I am not enough' }),
    );
    expect(req!.prompt).toContain('he went quiet all evening');
    expect(req!.prompt).not.toContain('I am not enough');
  });

  it('injects cycle context when present, on its own line', () => {
    const req = buildTurnRequest('confirm', state({ cycleContext: 'day 24, premenstrual window' }));
    expect(req!.prompt).toContain('\ncycle: day 24, premenstrual window');
  });

  // The system turn must stay byte-identical to the trained one
  // (gemma4-runpod assemble.py:29-30). Every row of v4_wide_deduped carries
  // exactly this string. Editing it is what produced third-person and
  // degenerate output on device.
  it('sends the trained system string verbatim', () => {
    const req = buildTurnRequest('confirm', state());
    expect(req!.instructions).toBe(
      'you reply to a woman having a hard moment. warm, plain, like a close friend in her 30s. ' +
        'say her own words back. never advise. lowercase, max 2 sentences, no dashes.',
    );
  });

  // The user turn is the corpus shape: a bracketed flow-node slot, then only
  // the fields that are present, newline-joined.
  it('sends the corpus user shape, tagged with the trained slot', () => {
    const req = buildTurnRequest('confirm', state());
    expect(req!.prompt.startsWith('[acknowledge]\n')).toBe(true);
    expect(req!.prompt).toContain('she wrote: "');
    // `she feels:` is suppressed for acknowledge, matching training.
    expect(req!.prompt).not.toContain('she feels:');
  });

  it('maps the one model beat to a slot that has training data, and nothing else', () => {
    expect(buildTurnRequest('confirm', state())!.prompt).toContain('[acknowledge]');
    // Every other beat in the arc is authored copy.
    const rest: RoughStep[] = ['pattern', 'examine', 'change', 'reframe', 'keep'];
    for (const step of rest) expect(buildTurnRequest(step, state())).toBeNull();
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
