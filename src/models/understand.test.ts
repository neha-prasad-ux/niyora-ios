import {
  UNDERSTAND_CARDS,
  getUnderstandCard,
  understandForFeeling,
  type PmsFeeling,
} from './understand';

const ALL_FEELINGS: readonly PmsFeeling[] = [
  'irritable',
  'anxious',
  'low',
  'foggy',
  'overwhelmed',
];

describe('understand card bodies', () => {
  // The acceptance guard: copy is fact-checked and used verbatim, and the voice
  // forbids em dashes in user-facing prose.
  it('contain no em-dash character in any card body', () => {
    for (const c of UNDERSTAND_CARDS) {
      expect(c.body).not.toContain('—');
    }
  });

  it('contain no em-dash character in any card title', () => {
    for (const c of UNDERSTAND_CARDS) {
      expect(c.title).not.toContain('—');
    }
  });
});

describe('understand catalogue', () => {
  it('has unique ids', () => {
    const ids = UNDERSTAND_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has both contexts present', () => {
    const contexts = new Set(UNDERSTAND_CARDS.map((c) => c.context));
    expect(contexts.has('general')).toBe(true);
    expect(contexts.has('pms')).toBe(true);
  });

  it('every feeling has both a general and a pms reframe card', () => {
    for (const f of ALL_FEELINGS) {
      const general = UNDERSTAND_CARDS.find(
        (c) => c.scope === 'feeling' && c.feeling === f && c.context === 'general',
      );
      const pms = UNDERSTAND_CARDS.find(
        (c) => c.scope === 'feeling' && c.feeling === f && c.context === 'pms',
      );
      expect(general).toBeDefined();
      expect(pms).toBeDefined();
    }
  });

  it('core and universal cards carry no single feeling; feeling cards always do', () => {
    for (const c of UNDERSTAND_CARDS) {
      if (c.scope === 'feeling') expect(c.feeling).not.toBeNull();
      else expect(c.feeling).toBeNull();
    }
  });

  it('core cards live only in the pms context, universal only in general', () => {
    for (const c of UNDERSTAND_CARDS) {
      if (c.scope === 'core') expect(c.context).toBe('pms');
      if (c.scope === 'universal') expect(c.context).toBe('general');
    }
  });

  it('every card with science attribution carries a source string', () => {
    // Core, pms-feeling and the universal card cite sources; general-feeling
    // reframes intentionally do not.
    for (const c of UNDERSTAND_CARDS) {
      if (c.scope === 'core' || c.scope === 'universal' || (c.scope === 'feeling' && c.context === 'pms')) {
        expect(c.source).toBeTruthy();
      }
    }
  });
});

describe('getUnderstandCard', () => {
  it('returns a card for a known id', () => {
    expect(getUnderstandCard('core-end-date')?.title).toBe('This has an end date');
  });

  it('returns undefined for an unknown id', () => {
    expect(getUnderstandCard('nope')).toBeUndefined();
  });
});

describe('understandForFeeling', () => {
  it('leads with the matching feeling card for the chosen context', () => {
    const general = understandForFeeling('anxious', 'general');
    expect(general[0]?.id).toBe('anxious-general');

    const pms = understandForFeeling('anxious', 'pms');
    expect(pms[0]?.id).toBe('anxious-pms');
  });

  it('appends the cross-cutting cards for the context', () => {
    // pms shows the core cards alongside; general shows the universal card.
    const pms = understandForFeeling('low', 'pms');
    expect(pms.some((c) => c.scope === 'core')).toBe(true);
    expect(pms.every((c) => c.context === 'pms')).toBe(true);

    const general = understandForFeeling('low', 'general');
    expect(general.some((c) => c.id === 'feeling-safe')).toBe(true);
    expect(general.every((c) => c.context === 'general')).toBe(true);
  });

  it('never mixes contexts in a single result', () => {
    for (const f of ALL_FEELINGS) {
      for (const ctx of ['general', 'pms'] as const) {
        const cards = understandForFeeling(f, ctx);
        expect(cards.every((c) => c.context === ctx)).toBe(true);
      }
    }
  });
});
