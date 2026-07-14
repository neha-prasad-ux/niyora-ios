// The Steady-yourself copy must read complete on its own and hold DESIGN.md
// voice: no exclamation points, no emojis, a kinder read for every recognise
// choice.

import {
  BREATH_DONE_LINE,
  BREATH_IN_LINE,
  BREATH_LEAD,
  BREATH_OUT_LINE,
  BREAK_TITLE,
  BREAK_WHY,
  BREAK_PING_LINE,
  BREAK_TASK_LINE,
  CLOSE_LINE,
  FEW_MORE_WHY,
  GENTLE_LINE_INTRO,
  KINDER_READ,
  QUICK_OPTIONS,
  QUICK_OPTIONS_TITLE,
  REFLECT_OFFER_TITLE,
  REFLECT_OFFER_WHY,
  RESET_CARRY_LINE,
  WHAT_HAPPENED,
} from './steady-yourself-content';

describe('recognise options', () => {
  it('offers five distinct choices ending in the catch-all', () => {
    expect(WHAT_HAPPENED).toHaveLength(5);
    const ids = WHAT_HAPPENED.map((w) => w.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids[ids.length - 1]).toBe('else');
  });

  it('has a kinder read for every recognise choice', () => {
    for (const w of WHAT_HAPPENED) {
      expect(KINDER_READ[w.id]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('quick options (I cannot spare 20)', () => {
  it('offers three choices ending in the exit', () => {
    expect(QUICK_OPTIONS).toHaveLength(3);
    expect(QUICK_OPTIONS[QUICK_OPTIONS.length - 1].id).toBe('exit');
    expect(new Set(QUICK_OPTIONS.map((o) => o.id)).size).toBe(3);
  });
});

describe('DESIGN.md voice', () => {
  it('has no exclamation points or emojis anywhere in the copy', () => {
    const all = [
      ...WHAT_HAPPENED.map((w) => w.label),
      ...Object.values(KINDER_READ),
      BREATH_LEAD,
      BREATH_IN_LINE,
      BREATH_OUT_LINE,
      BREATH_DONE_LINE,
      FEW_MORE_WHY,
      BREAK_TITLE,
      BREAK_WHY,
      BREAK_TASK_LINE,
      BREAK_PING_LINE,
      REFLECT_OFFER_TITLE,
      REFLECT_OFFER_WHY,
      QUICK_OPTIONS_TITLE,
      ...QUICK_OPTIONS.map((o) => o.label),
      RESET_CARRY_LINE,
      GENTLE_LINE_INTRO,
      CLOSE_LINE,
    ].join(' ');
    expect(all).not.toMatch(/!/);
    expect(all).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
