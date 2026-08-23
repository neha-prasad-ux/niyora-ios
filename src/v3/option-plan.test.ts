import { FEELING_SET } from './moment-analyse';
import { optionPlanFor, DEFAULT_PLAN, personRef, personalisedLabel } from './option-plan';
import { ACTS, offerableActs } from './moment-copy';
import { isBlank } from '@/components/moment/fill-in-assemble';

const act = (id: string) => ACTS.find((a) => a.id === id)!;

describe('abuse suppression removes every act aimed at the person', () => {
  it('drops the whole direct rung (confront AND self-blame) when abuse is detected', () => {
    const dv = offerableActs(true);
    expect(dv.some((a) => a.rung === 'direct')).toBe(false); // no confront, no "own my part"
    expect(dv.some((a) => a.confrontational)).toBe(false);
    // she still keeps ways to prepare and to look after herself
    expect(dv.some((a) => a.rung === 'prep')).toBe(true);
    expect(dv.some((a) => a.rung === 'self')).toBe(true);
  });

  it('offers the direct rung normally when there is no abuse flag', () => {
    expect(offerableActs(false).some((a) => a.rung === 'direct')).toBe(true);
  });
});

describe('option labels are personalised by grounded fill-in only', () => {
  it('lifts the person she named, verbatim, never inventing one', () => {
    expect(personRef('I feel he has lots of discipline')).toBe('him');
    expect(personRef('my husband keeps ignoring me')).toBe('your husband');
    expect(personRef('she promised and forgot')).toBe('her');
    // No person at all → null, so the authored label stands (no invented "him").
    expect(personRef('the meeting ran long and nothing got decided')).toBeNull();
  });

  it('fills the person into person-addressing acts, leaves the rest authored', () => {
    // A = "Say it to them" → her pronoun filled in
    expect(personalisedLabel(act('A'), 'I feel he keeps brushing me off')).toBe('Say it to him');
    // C = "Hold a line" (label reworded 2026-08-02)
    expect(personalisedLabel(act('C'), 'my sister crossed a line')).toBe(
      "Tell your sister what's not okay",
    );
    // I = "Work out what I want" has no person slot → authored label unchanged
    expect(personalisedLabel(act('I'), 'I feel he brushed me off')).toBe(act('I').label);
  });

  it('keeps the authored label when she named no person', () => {
    expect(personalisedLabel(act('A'), 'nothing got decided in the meeting')).toBe(act('A').label);
  });
});

test('every feeling word has its own plan, not the fallback', () => {
  for (const f of FEELING_SET) {
    expect(optionPlanFor(f.label)).not.toBe(DEFAULT_PLAN);
  }
});

test('fill composers seed the feeling and expose three blanks', () => {
  for (const f of FEELING_SET) {
    const plan = optionPlanFor(f.label);
    if (plan.composer !== 'fill') continue;
    const blanks = (plan.template ?? []).filter(isBlank);
    expect(blanks.map((b) => b.key)).toEqual(['feeling', 'trigger', 'need']);
    // The feeling seeds the first blank's placeholder so she starts mid-sentence.
    expect(blanks[0].placeholder).toBe(f.label.toLowerCase());
  }
});

test('an unknown feeling falls back to the calming default', () => {
  expect(optionPlanFor('')).toBe(DEFAULT_PLAN);
  expect(optionPlanFor('Nonexistent')).toBe(DEFAULT_PLAN);
});

describe('two people named (2026-08-20)', () => {
    // She is upset with the lead. The colleague did nothing. Aiming her message at
    // the wrong person is worse than not personalising at all, so it declines.
    const TWO = 'i have been covering for my colleague for months and today my lead thanked her';

    it('declines to guess which one she means', () => {
      expect(personRef(TWO)).toBeNull();
    });

    it('falls back to the authored label rather than naming the wrong person', () => {
      const label = personalisedLabel(act('A'), TWO);
      expect(label).toBe('Say it to them');
      expect(label).not.toContain('colleague');
    });

    it('still personalises when the same person is named twice', () => {
      expect(personRef('my mum said it again, my mum always does')).toBe('your mum');
    });

    it('knows the work relations, so a lead counts as a second person', () => {
      expect(personRef('my lead ignored it')).toBe('your lead');
    });
  });

  describe('act A says what the act is (2026-08-20)', () => {
    it('is a boundary, not a feelings report', () => {
      const label = personalisedLabel(act('A'), 'my mum again');
      expect(label).toBe('Say it to your mum');
      expect(label).not.toMatch(/how you feel/i);
    });
  });
