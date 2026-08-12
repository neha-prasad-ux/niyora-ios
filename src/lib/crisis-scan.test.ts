// The asymmetry under test: self-directed crisis language must always trigger
// (under-triggering is the failure that matters), while venting hyperbole
// about others must never trigger (or she learns the feature can't hold the
// very thing it exists for).

import { CRISIS_COPY, scanForCrisis, scanForAbuse, DV_RESOURCE, DV_INTL_URL } from './crisis-scan';

describe('the abuse scan catches physical violence, not idioms', () => {
  it.each([
    'he hit me', // the reported disclosure (scan runs on HER 1st-person input)
    'my husband slapped me last night',
    'he punched me',
    'he choked me',
    'he beats me when he drinks',
    'he put his hands on me',
    "he's violent",
    'i think he is abusive',
    'this is domestic violence',
  ])('fires on a disclosure: %s', (line) => {
    expect(scanForAbuse(line)).toBe(true);
  });

  it.each([
    'it hit me that i forgot',
    'the news really hit me hard',
    'that comment hit me',
    'he hurt me', // emotional hurt is deliberately NOT a trigger
    'it beats me why he did that',
    'we watched a movie',
  ])('does not fire on: %s', (line) => {
    expect(scanForAbuse(line)).toBe(false);
  });

  it('DV_RESOURCE is present, quiet, and non-diagnostic (no "you are being abused")', () => {
    const all = [
      DV_RESOURCE.intro,
      DV_RESOURCE.label,
      DV_RESOURCE.detail,
      DV_RESOURCE.intlLabel,
      DV_RESOURCE.intlDetail,
    ].join(' ');
    expect(all).not.toMatch(/!/);
    expect(all.toLowerCase()).not.toMatch(/you are being abused|we (detected|noticed)/);
  });

  it('DV_RESOURCE labels the US line and offers a non-US fallback (audit M-2)', () => {
    // The US short-code is labelled US, so a non-US user is not left thinking a
    // dead text is her only option...
    expect(DV_RESOURCE.detail).toMatch(/\bUS\b/);
    expect(DV_RESOURCE.detail).toContain('88788');
    // ...and a by-country directory sits beside it.
    expect(`${DV_RESOURCE.intlLabel} ${DV_RESOURCE.intlDetail}`.toLowerCase()).toContain(
      'findahelpline',
    );
    expect(DV_INTL_URL).toBe('https://findahelpline.com');
  });
});

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
    // audit C-1: concrete self-harm methods the floor used to miss
    'I keep thinking about how to hang myself',
    'maybe I should just overdose',
    'I want to take all my pills tonight',
    'I could just jump in front of a train',
    'sometimes I want to shoot myself',
    'I think about slitting my wrists',
    'I dont want to wake up tomorrow',
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
    // C-1 deliberately did NOT add "kill me" / "want it to be over": they collide
    // with everyday venting. These must stay quiet or the crisis screen cries wolf.
    'this traffic is going to kill me',
    'kill me, another Monday already',
    'I just want this meeting to be over',
    'I want this day to be over',
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
