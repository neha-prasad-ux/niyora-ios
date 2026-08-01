// The three-way routing decides whether a woman in crisis reaches a helpline,
// so it gets tests rather than a walk-through.

import { analyse, namedFeeling, offerFeelings, pinFeeling } from './moment-analyse';

describe('crisis comes first, always', () => {
  it('routes a disclosure to the handoff even when it is a perfectly clear event', () => {
    // Clear, concrete, would otherwise be echoed straight back at her.
    expect(analyse('he shouted at me and i want to kill myself').kind).toBe('crisis');
  });

  it('routes a disclosure that is far too short to be "clear"', () => {
    expect(analyse('kms').kind).toBe('crisis');
  });
});

describe('is it a thing that happened?', () => {
  it('asks again when there are barely any words', () => {
    const v = analyse('bad day');
    expect(v).toEqual({ kind: 'unclear', reason: 'too-short' });
  });

  it('asks again when she named a feeling rather than an event', () => {
    expect(analyse('i am so angry').kind).toBe('unclear');
    expect(analyse('i feel awful today honestly').kind).toBe('unclear');
  });

  it('accepts a concrete event', () => {
    const v = analyse('I was interrupted again in a meeting');
    expect(v.kind).toBe('clear');
  });

  // These all failed the old verb whitelist and were sent back to be asked
  // again, which reads as the app not having listened at the one beat whose
  // job is listening. Regression guard.
  it.each([
    'she rolled her eyes at me in front of the team',
    'he was late again and never messaged',
    'nobody backed me up in that meeting',
    'my sister brought it up at dinner again',
    'the whole group went without me',
  ])('does not send a clear event back to clarify: %s', (line) => {
    expect(analyse(line).kind).toBe('clear');
  });
});

describe('what it says back', () => {
  it('keeps the passive voice, so being interrupted is not her doing it', () => {
    const v = analyse('I was interrupted again in a meeting');
    expect(v.kind).toBe('clear');
    if (v.kind !== 'clear') return;
    expect(v.echo).toContain('you were interrupted');
    expect(v.echo).not.toMatch(/you interrupted/i);
  });

  it('refuses to echo her read of his intent, and asks for the event instead', () => {
    // Rule 07: never say her attribution about someone else back to her.
    const v = analyse('he is pulling away from me and i can tell he doesn’t care');
    expect(v).toEqual({ kind: 'unclear', reason: 'nothing-to-echo' });
  });

  it('refuses to echo a core belief back at her', () => {
    const v = analyse('i am too much for everyone and they all leave');
    expect(v).toEqual({ kind: 'unclear', reason: 'nothing-to-echo' });
  });

  it('never invents a detail she did not write', () => {
    const v = analyse('he walked out halfway through dinner');
    if (v.kind !== 'clear') throw new Error('expected clear');
    // every content word in the echo came from her
    const hers = new Set('he walked out halfway through dinner'.split(/\s+/));
    const novel = v.echo
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !hers.has(w) && w !== 'you');
    expect(novel).toEqual([]);
  });
});

describe('a long feeling-dump is accepted, not interrogated', () => {
  it('does not answer verbosity with "what happened"', () => {
    // She wrote a lot, with no discrete event and "for some reason" (no known
    // cause). The old path declined the carve as a rephrase and routed her to
    // "and what happened, to bring that on?" — asking for what she just said she
    // does not have. Now it is clear-enough to proceed (empty echo, no carve).
    const v = analyse(
      "For some reason I feel like I wanna be alone I don't wanna do anything I don't wanna shop and I think this would hurt my husband what do I do",
    );
    expect(v.kind).toBe('clear');
    if (v.kind === 'clear') expect(v.echo).toBe('');
  });
});

describe('the feelings offered', () => {
  it('offers three, from the closed set', () => {
    const three = offerFeelings('I was interrupted again in a meeting');
    expect(three).toHaveLength(3);
    expect(new Set(three).size).toBe(3);
  });

  it('responds to what she actually wrote', () => {
    const interrupted = offerFeelings('I was interrupted again in a meeting');
    const cancelled = offerFeelings('he promised and then cancelled on me');
    expect(interrupted).not.toEqual(cancelled);
    expect(interrupted).toContain('Dismissed');
    expect(cancelled).toContain('Let down');
  });

  it('still offers three when nothing matches, rather than none', () => {
    expect(offerFeelings('the weather was odd yesterday')).toHaveLength(3);
  });

  it('offers low-state feelings for a withdrawal entry, not relational ones', () => {
    // "wanna stay in bed, dont feel like doing anything" is a flat/withdrawal
    // state; it must not fall back to Dismissed/Not taken seriously/Angry.
    const three = offerFeelings(
      "For some reason I don't feel like going out or do anything I just wanna be on bed and not do anything",
    );
    expect(three).toContain('Numb'); // routes to the low lane (behavioral activation)
    expect(three).not.toContain('Dismissed');
    expect(three).not.toContain('Angry');
  });
});

describe('a feeling she named outright is never buried by the model reorder', () => {
  it('finds the feeling word she typed', () => {
    expect(namedFeeling('I end up feeling guilty when I do things I like')).toBe('Guilty');
    expect(namedFeeling('he interrupted me in the meeting')).toBeNull(); // an event, no feeling word
  });

  it('does not treat our multiword framing as her word', () => {
    // "seriously" alone must not match "Not taken seriously".
    expect(namedFeeling('take this seriously')).toBeNull();
  });

  it('pins her word to the top, whether the model demoted or dropped it', () => {
    expect(pinFeeling('Guilty', ['Dismissed', 'Angry', 'Guilty'])).toEqual(['Guilty', 'Dismissed', 'Angry']);
    expect(pinFeeling('Guilty', ['Dismissed', 'Angry'])).toEqual(['Guilty', 'Dismissed', 'Angry']);
    expect(pinFeeling(null, ['Dismissed', 'Angry'])).toEqual(['Dismissed', 'Angry']);
  });
});
