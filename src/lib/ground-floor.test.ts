// The echo is the one beat that promises to use only her own words, so the
// promise gets tests. This module shipped with none.

import { echoBlocked, groundedReflection, isGrounded, isRephrase } from './ground-floor';

describe('the echo says her words back, correctly', () => {
  // The failure a wireframe of this flow accidentally demonstrated: flipping
  // person on a passive sentence turns "it happened to her" into "she did it",
  // which blames her for the thing she came in upset about.
  it('keeps the passive voice passive, so being interrupted is not her doing it', () => {
    const r = groundedReflection('I was interrupted again in a meeting.');
    expect(r.text).toBe('So, you were interrupted again in a meeting.');
    expect(r.text).not.toMatch(/you interrupted/i);
  });

  it('flips her pronouns without touching anyone else’s', () => {
    const r = groundedReflection('he ignored me all evening and I feel awful');
    expect(r.text).toContain('he ignored you');
  });

  // The screenshot bug: her entry front-loaded praise of him and put the wound
  // ("I feel guilty...") last. The old first-clause carve reflected the praise.
  it('reflects the clause that carries the wound, not the preamble', () => {
    const r = groundedReflection(
      'he likes building products and reading about tech. I end up feeling guilty when I do things I like.',
    );
    expect(r.text).toContain('guilty');
    expect(r.text).not.toMatch(/building products/i);
  });

  it('declines rather than guessing when there is nothing to carve', () => {
    expect(groundedReflection('ugh').text).toBeNull();
    expect(groundedReflection('').text).toBeNull();
  });

  // "I never want to see this as a rephrase" (Neha). A long paste played back
  // almost whole is a parrot, not a reflection — decline it, both paths.
  it('never plays a long sentence back near-verbatim', () => {
    const paste =
      'I feel he has lots of discipline, he likes building products, reading content about business, computer, software and technology';
    const r = groundedReflection(paste);
    expect(r.text).toBeNull();
    expect(r.reason).toBe('rephrase');
    expect(isRephrase(paste, `So, ${paste.replace(/\bI\b/g, 'you')}.`)).toBe(true);
  });

  it('still reflects a short event in full, which is not a parrot', () => {
    expect(isRephrase('I was interrupted again in a meeting', 'So, you were interrupted again in a meeting.')).toBe(false);
    expect(groundedReflection('I was interrupted again in a meeting.').text).toBe(
      'So, you were interrupted again in a meeting.',
    );
  });

  it('does not flag a genuine short gist of a long entry as a rephrase', () => {
    const long =
      'he barely looked up from his laptop the whole evening and when I tried to talk he just nodded without hearing a word';
    expect(isRephrase(long, 'so that felt like being invisible in your own home')).toBe(false);
  });
});

describe('what the app must never say back', () => {
  // The five universal core beliefs the app itself lists in
  // CONFIRM_THOUGHT_CHIPS. Echoing one is the app agreeing with it.
  const CORE = [
    'I am not enough',
    'I am going to be left',
    'I am too much',
    'I cannot handle this',
    'No one really cares',
  ];

  it.each(CORE)('refuses to echo a core belief: %s', (belief) => {
    expect(echoBlocked(belief)).toBe(true);
    const r = groundedReflection(`${belief} and it has been like this for weeks`);
    expect(r.text).toBeNull();
    expect(r.reason).toBe('self-attack');
  });

  it.each(["i'm worthless", 'i am such a mess', 'everyone leaves me', 'i ruin everything'])(
    'catches the common phrasings too: %s',
    (line) => {
      expect(echoBlocked(line)).toBe(true);
    },
  );

  it('still catches plain name-calling', () => {
    expect(echoBlocked('i was being pathetic about it')).toBe(true);
  });

  it('does not block ordinary sentences that merely start with "I am"', () => {
    expect(echoBlocked('I am waiting for him to reply')).toBe(false);
    expect(echoBlocked('I am not sure what he meant')).toBe(false);
    expect(echoBlocked('I was interrupted again in a meeting')).toBe(false);
  });

  it('never echoes her read of someone else’s intent', () => {
    const r = groundedReflection('he is pulling away from me and I know it');
    expect(r.text).toBeNull();
  });
});

describe('grounding cannot do this job on its own', () => {
  // The reason echoBlocked is checked separately on the model's reply: a
  // self-attack echo is perfectly grounded, because every word came from her.
  it('rates a self-attack echo as fully grounded, which is why it is not enough', () => {
    const hers = 'i am too much for everyone';
    expect(isGrounded(hers, "so, you're too much for everyone.")).toBe(true);
    expect(echoBlocked("so, you're too much for everyone.")).toBe(true);
  });

  it('catches an invented detail she never wrote', () => {
    expect(isGrounded('left on read for a day lol', 'so you texted him saturday and heard nothing')).toBe(
      false,
    );
  });
});
