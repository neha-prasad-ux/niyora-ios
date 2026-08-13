import { REFLECT_CARDS, detectSignals, routeCards, secondLensFor, lensForText } from './reflect-cards';

describe('reflect-cards routing', () => {
  it('always returns the safe defaults, never dead-ends', () => {
    const cards = routeCards(detectSignals(''));
    expect(cards).toContain('friend');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('routes an interpersonal worry to simpler/mind-reading first', () => {
    const cards = routeCards(detectSignals('she is annoyed with me and thinks I failed'));
    expect(cards[0]).toBe('know_or_guess'); // mind-reading detected first
    expect(cards).toContain('simpler');
  });

  it('routes a future/worst-case spiral to also_true + fact_or_fear', () => {
    const cards = routeCards(detectSignals("what if I fail and everyone thinks I'm a disaster"));
    expect(cards).toContain('also_true');
    expect(cards).toContain('fact_or_fear');
  });

  it('routes self-blame to whose_weight', () => {
    const cards = routeCards(detectSignals('this is my fault, I ruined everything'));
    expect(cards).toContain('whose_weight');
  });

  it('surfaces the pattern card only when history recurs', () => {
    expect(routeCards(detectSignals('x', true))[0]).toBe('pattern');
    expect(routeCards(detectSignals('x', false))).not.toContain('pattern');
  });

  it('always offers the universal science-backed lenses in the walk', () => {
    const cards = routeCards(detectSignals('x'));
    for (const id of ['signal', 'need', 'rule'] as const) {
      expect(cards).toContain(id);
    }
  });

  it('surfaces signal and need early in the walk, not buried at the tail', () => {
    // The merge fix (Neha 7/8): before, signal/future sat near the end and rarely
    // fired. signal + need now lead the variety tail.
    const cards = routeCards(detectSignals('x'));
    expect(cards.indexOf('signal')).toBeLessThan(cards.indexOf('friend'));
    expect(cards.indexOf('signal')).toBeLessThanOrEqual(cards.indexOf('rule'));
  });

  it('gates the shame lens to its signal', () => {
    expect(routeCards(detectSignals('this is all my fault'))).toContain('shame');
    expect(routeCards(detectSignals('the meeting went fine'))).not.toContain('shame');
  });

  it('every reality card validates on "no", every draft card opens an edit', () => {
    for (const c of Object.values(REFLECT_CARDS)) {
      if (c.mode === 'question') expect(c.secondAction).toBe('validate');
      if (c.mode === 'draft' && c.id !== 'pattern') expect(c.secondAction).toBe('edit');
    }
  });

  describe('secondLensFor', () => {
    it('surfaces a lens for a signal the added context newly introduces', () => {
      const before = detectSignals('my sister keeps calling me');
      const after = detectSignals('my sister keeps calling me, it completely ruined my whole day');
      // "completely / ruined / whole" adds the `absolute` signal → middle.
      expect(secondLensFor(before, after, 'simpler')).toBe('middle');
    });

    it('returns null when the context adds no new signal', () => {
      const sig = detectSignals('my sister keeps calling me');
      expect(secondLensFor(sig, sig, 'simpler')).toBeNull();
    });

    it('never returns the card she is already on', () => {
      const before = detectSignals('my sister keeps calling me');
      const after = detectSignals('my sister keeps calling me, it ruined everything completely');
      // absolute → middle, but she's already on middle → skip it, none other gained.
      expect(secondLensFor(before, after, 'middle')).toBeNull();
    });
  });

  describe('lensForText (open chat)', () => {
    it('maps all-or-nothing language to the in-between lens', () => {
      expect(lensForText('it completely ruined everything')).toBe('middle');
    });

    it('maps self-blame to whose_weight', () => {
      expect(lensForText('I keep thinking it is all my fault')).toBe('whose_weight');
    });

    it('only returns reading shapes, never a fact-sort question card', () => {
      const id = lensForText('he probably thinks I am annoying and hates me');
      expect(id).not.toBe('fact_or_fear');
      expect(id).not.toBe('know_or_guess');
    });

    it('returns null when nothing strong fits, so the chat falls back to a reply', () => {
      expect(lensForText('what is 2 plus 2')).toBeNull();
    });
  });
});
