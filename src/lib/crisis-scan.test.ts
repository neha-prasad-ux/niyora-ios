// The asymmetry under test: self-directed crisis language must always trigger
// (under-triggering is the failure that matters), while venting hyperbole
// about others must never trigger (or she learns the feature can't hold the
// very thing it exists for).

import { CRISIS_COPY, scanForCrisis } from './crisis-scan';

describe('scanForCrisis · must trigger', () => {
  it.each([
    'I want to kill myself',
    'sometimes i think about suicide',
    'I just want to end my life',
    'i wish I was dead',
    'they would be better off without me',
    'I have no reason to live',
    'i keep wanting to hurt myself',
    'thinking about self harm again',
    'thinking about self-harm again',
    'I might just end it all tonight',
    'kms',
    'honestly?? I WANT TO DIE.',
  ])('%s', (text) => {
    expect(scanForCrisis(text)).toBe(true);
  });

  it('catches the phrase buried inside a long vent', () => {
    const vent = `He ignored me all evening and we fought about nothing and I ate alone and honestly I don’t want to be alive right now and I hate that I feel this way`;
    expect(scanForCrisis(vent)).toBe(true);
  });

  it('handles curly and straight apostrophes the same', () => {
    expect(scanForCrisis('I don’t want to be alive')).toBe(true);
    expect(scanForCrisis("I don't want to be alive")).toBe(true);
  });
});

describe('scanForCrisis · must NOT trigger (venting hyperbole, common in this domain)', () => {
  it.each([
    'I could kill him for ignoring me all evening',
    'ugh he makes me want to scream',
    'this evening was killing me',
    'I am so tired I could die of embarrassment',
    'my feet are killing me',
    'he said he wants to die on that hill, fine',
    'I want to end this argument',
    'the fight hurt me so much',
    '',
    'ugh',
  ])('%s', (text) => {
    expect(scanForCrisis(text)).toBe(false);
  });

  it('does not substring-match inside other words', () => {
    // "kms" must be a standalone word, not the tail of "walkms" etc.
    expect(scanForCrisis('we walked 3kms tonight')).toBe(false);
  });
});

describe('CRISIS_COPY', () => {
  it('is complete, quiet, and human-written (no exclamation points)', () => {
    const all = [
      CRISIS_COPY.title,
      CRISIS_COPY.body,
      CRISIS_COPY.emergency,
      CRISIS_COPY.back,
      ...CRISIS_COPY.lines.flatMap((l) => [l.label, l.detail]),
    ].join(' ');
    expect(all).not.toMatch(/!/);
    expect(CRISIS_COPY.lines.length).toBeGreaterThanOrEqual(2);
    expect(all).toContain('988');
  });
});
