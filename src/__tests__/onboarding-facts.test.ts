import {
  BREATH_FACT_CLOSER,
  BREATH_FACTS,
  pickFact,
} from '@/lib/onboarding-facts';

describe('onboarding facts', () => {
  it('ships the four vetted facts', () => {
    expect(BREATH_FACTS).toHaveLength(4);
  });

  it('pickFact wraps any integer index to a valid fact', () => {
    expect(pickFact(0)).toBe(BREATH_FACTS[0]);
    expect(pickFact(4)).toBe(BREATH_FACTS[0]);
    expect(pickFact(5)).toBe(BREATH_FACTS[1]);
    expect(pickFact(-1)).toBe(BREATH_FACTS[3]);
  });

  it('every fact has both a fact line and a you line', () => {
    for (const f of BREATH_FACTS) {
      expect(f.fact.trim().length).toBeGreaterThan(0);
      expect(f.you.trim().length).toBeGreaterThan(0);
    }
  });

  it('has a two-line closer', () => {
    expect(BREATH_FACT_CLOSER).toHaveLength(2);
  });

  it('honours the voice rules: no em dashes, no exclamation points', () => {
    const allCopy = [
      ...BREATH_FACTS.flatMap((f) => [f.fact, f.you]),
      ...BREATH_FACT_CLOSER,
    ];
    for (const line of allCopy) {
      expect(line).not.toContain('—');
      expect(line).not.toContain('!');
    }
  });
});
