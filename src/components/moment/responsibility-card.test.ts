import { responsibilityResult, sentenceCase } from './responsibility-card';

// The allocation arithmetic, which is the whole mechanism of the card. Pure
// logic, extracted here so it can be checked without a renderer: her share is
// ALWAYS the remainder, and the hands can never sum past 100, because a negative
// remainder would read as her being owed responsibility.

/** Mirrors the bump() guard in responsibility-card.tsx. */
function bump(
  hands: { label: string; share: number }[],
  i: number,
  dir: 1 | -1,
  step = 10,
): { label: string; share: number }[] {
  const used = hands.reduce((n, h) => n + h.share, 0);
  const herShare = Math.max(0, 100 - used);
  return hands.map((x, n) => {
    if (n !== i) return x;
    const next = x.share + dir * step;
    if (next < 0 || next > x.share + herShare) return x;
    return { ...x, share: next };
  });
}

const share = (hands: { share: number }[]) =>
  Math.max(0, 100 - hands.reduce((n, h) => n + h.share, 0));

describe('responsibility allocation', () => {
  it('starts with the whole thing on her, which is where she already put it', () => {
    const hands = [{ label: 'the deadline moved', share: 0 }];
    expect(share(hands)).toBe(100);
  });

  it('every share she gives away comes off her own', () => {
    let hands = [
      { label: 'the deadline moved', share: 0 },
      { label: 'nobody told me', share: 0 },
    ];
    hands = bump(hands, 0, 1);
    hands = bump(hands, 0, 1);
    hands = bump(hands, 1, 1);
    expect(hands[0].share).toBe(20);
    expect(hands[1].share).toBe(10);
    expect(share(hands)).toBe(70);
  });

  it('never lets the hands sum past 100, so her share cannot go negative', () => {
    let hands = [{ label: 'the deadline moved', share: 0 }];
    for (let i = 0; i < 20; i++) hands = bump(hands, 0, 1);
    expect(hands[0].share).toBe(100);
    expect(share(hands)).toBe(0);
  });

  it('never takes a hand below zero', () => {
    let hands = [{ label: 'the deadline moved', share: 0 }];
    hands = bump(hands, 0, -1);
    expect(hands[0].share).toBe(0);
    expect(share(hands)).toBe(100);
  });

  it('giving a share back returns it to her', () => {
    let hands = [{ label: 'the deadline moved', share: 0 }];
    hands = bump(hands, 0, 1);
    hands = bump(hands, 0, 1);
    expect(share(hands)).toBe(80);
    hands = bump(hands, 0, -1);
    expect(share(hands)).toBe(90);
  });

  it('holds with several hands competing for what is left', () => {
    let hands = [
      { label: 'the deadline moved', share: 0 },
      { label: 'nobody told me', share: 0 },
      { label: 'i was already covering for someone', share: 0 },
    ];
    for (let i = 0; i < 5; i++) hands = bump(hands, 0, 1); // 50
    for (let i = 0; i < 4; i++) hands = bump(hands, 1, 1); // 40
    for (let i = 0; i < 4; i++) hands = bump(hands, 2, 1); // wants 40, only 10 left
    expect(hands[0].share + hands[1].share + hands[2].share).toBeLessThanOrEqual(100);
    expect(hands[2].share).toBe(10);
    expect(share(hands)).toBe(0);
  });
});

// The line under her share (2026-08-21). It states what happened and stops. The
// rule that matters is at 100: if she has given nothing away, nudging her to
// share it out would be the app arguing with the answer it just asked her for.
describe('responsibilityResult', () => {
  it('names the distance she moved', () => {
    expect(responsibilityResult(40)).toBe('You started with all of it. You are at 40.');
  });

  it('does not press her when she keeps all of it', () => {
    const all = responsibilityResult(100);
    expect(all).toBe('You have put all of it on yourself.');
    expect(all).not.toMatch(/but|only|really|actually|maybe/i);
  });

  it('handles giving all of it away', () => {
    expect(responsibilityResult(0)).toBe('You have put none of it on yourself.');
  });

  it('never uses a dash, she reads this one', () => {
    for (const n of [0, 40, 100]) expect(responsibilityResult(n)).not.toMatch(/[-–—]/);
  });
});

// Sentence case, guaranteed in the component (2026-08-21). The model drifts to
// lowercase however the prompt is worded, and these strings render as her own
// sentences: "your content creation attempts ended" (seen on device).
describe('sentenceCase', () => {
  it('lifts a lowercase model reply', () => {
    expect(sentenceCase('your content creation attempts ended')).toBe(
      'Your content creation attempts ended',
    );
  });

  it('leaves a correct sentence alone', () => {
    expect(sentenceCase('You snapped at your daughter.')).toBe('You snapped at your daughter.');
  });

  it('never crashes on an empty or missing string', () => {
    expect(sentenceCase('')).toBe('');
    expect(sentenceCase('   ')).toBe('');
  });
});

// Removing a factor (2026-08-21). Without this the only way out of a mistyped or
// wrong hand is backing out of the whole card and losing the rest. The share it
// was holding has to return to her, or the numbers stop adding up.
function removeHand(hands: { label: string; share: number }[], i: number) {
  return hands.filter((_, n) => n !== i);
}

describe('removing a factor', () => {
  it('returns its share to her', () => {
    const hands = [
      { label: 'no money then', share: 40 },
      { label: 'no internet', share: 20 },
    ];
    expect(share(hands)).toBe(40);
    const after = removeHand(hands, 0);
    expect(share(after)).toBe(80);
  });

  it('removes the right one when two read alike', () => {
    const hands = [
      { label: 'no time', share: 10 },
      { label: 'no time at all', share: 30 },
    ];
    const after = removeHand(hands, 0);
    expect(after).toHaveLength(1);
    expect(after[0].label).toBe('no time at all');
  });

  it('removing the last one puts everything back on her', () => {
    expect(share(removeHand([{ label: 'x', share: 70 }], 0))).toBe(100);
  });
});
