import {
  REFLECT_CARDS,
  detectSignals,
  detectTimeframe,
  routeCards,
  secondLensFor,
  lensForText,
} from './reflect-cards';

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

  it('leads with the load card when she brought no event to re-see', () => {
    // Diffuse overwhelm: nothing to reframe, so every reading lens would be
    // reframing something that is not there.
    expect(routeCards(detectSignals('everything is too much today'))[0]).toBe('load');
  });

  it('never offers the load card when she did bring something', () => {
    for (const t of ['my mum said something again', 'he walked out mid sentence', 'i always ruin everything']) {
      expect(routeCards(detectSignals(t))).not.toContain('load');
    }
  });

  it('lets a proven recurrence beat diffuseness, because pattern has content', () => {
    expect(routeCards(detectSignals('x', true))[0]).toBe('pattern');
  });

  it('surfaces the pattern card only when history recurs', () => {
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
    // Both lenses left the chat on 2026-08-21. `middle` is a scale she places and
    // `whose_weight` is an allocation she makes, and a chat turn can render
    // neither, so routing there silently served their old reads: exactly the
    // content those cards were replaced for.
    it('never routes the chat to a lens that is an interaction', () => {
      for (const t of [
        'it completely ruined everything',
        'I keep thinking it is all my fault',
        'there is nothing I can do about it',
      ]) {
        const lens = lensForText(t);
        expect(lens).not.toBe('middle');
        expect(lens).not.toBe('whose_weight');
      }
    });

    it('sends self-blame to the lens that separates the act from the self', () => {
      expect(lensForText('I keep thinking it is all my fault')).toBe('shame');
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

  describe('timeframe (2026-08-19)', () => {
    const MUM = 'every single time i visit my mum she finds something to say about my weight. it has been like this for fifteen years.';
    const FIGHT = "we are in the middle of a fight right now. he walked out while i was still talking and i'm shaking.";

    it('reads a years-long pattern as long-standing', () => {
      expect(detectTimeframe(MUM)).toBe('longstanding');
    });

    it('reads a fight still going on as acute', () => {
      expect(detectTimeframe(FIGHT)).toBe('acute');
    });

    it('prefers long-standing when both markers are present', () => {
      // "last night" is acute, but the same-argument-again framing is what changes
      // what a read is allowed to be.
      expect(detectTimeframe('we had the same argument about money again last night')).toBe(
        'longstanding',
      );
    });

    it('falls back to recent, which tunes nothing', () => {
      expect(detectTimeframe('i messed up the presentation')).toBe('recent');
    });

    it('demotes simpler below the pattern lenses on a long-standing issue', () => {
      const cards = routeCards(detectSignals(MUM, true));
      expect(cards[0]).toBe('pattern');
      expect(cards.indexOf('simpler')).toBeGreaterThan(cards.indexOf('need'));
      expect(cards.indexOf('simpler')).toBeGreaterThan(cards.indexOf('whose_weight'));
    });

    it('leads with what she needs when it is happening right now', () => {
      expect(routeCards(detectSignals(FIGHT))[0]).toBe('need');
    });

    it('reorders only: every card routed by her signals is still offered', () => {
      const sig = detectSignals(MUM, true);
      const timed = routeCards(sig);
      const untimed = routeCards({ ...sig, timeframe: 'recent' });
      expect([...timed].sort()).toEqual([...untimed].sort());
    });
  });

  describe('middle is gated on a stated absolute (2026-08-19)', () => {
    it('offers middle when she actually used an absolute', () => {
      expect(routeCards(detectSignals('i always ruin everything that matters'))).toContain('middle');
    });

    it('does NOT offer middle when there is no absolute to split', () => {
      // The failure it was cut for: handed a diffuse mood it had nothing to work
      // on and padded with her own sentence back at her.
      expect(routeCards(detectSignals('everything is too much today'))).not.toContain('middle');
    });

    it('still never dead-ends without middle in the tail', () => {
      const cards = routeCards(detectSignals('everything is too much today'));
      expect(cards).toContain('friend');
      expect(cards.length).toBeGreaterThan(2);
    });
  });
});
