// The science reveal shown after the first guided breath in onboarding. One
// fact is chosen at random per run. Each is a verified, plain-language truth
// about breathing and stress, paired with a line tying it to the breath the
// user just took. The closer is fixed and shown under whichever fact appears.
//
// Accuracy notes (so future edits keep the bar): breaths/day (~20k), the
// long-exhale -> vagus/baroreflex calming response, and the fast-vs-slow
// framing are well established. The whale/mouse line is framed as a pattern in
// nature, NOT a personal "you will live longer" claim.

export type BreathFact = {
  // The truth, in two lines (rendered stacked).
  fact: string;
  // The reward line tying it to the breath they just took.
  you: string;
};

export const BREATH_FACTS: readonly BreathFact[] = [
  {
    fact: 'You take about 20,000 breaths a day, almost none on purpose.',
    you: 'Congrats on your step one.',
  },
  {
    fact: 'Fast breath is your body prepping to run, worry, attack. Slow breath is to say "it’s alright."',
    you: 'You just said it.',
  },
  {
    fact: 'A slow exhale wakes the sensors in your heart that tell your brain "it’s alright."',
    you: 'You just woke them.',
  },
  {
    fact: 'Whales breathe 6 times a minute and live past 100. Mice breathe 100 times a minute and are gone in 2 years. Slow wins.',
    you: 'You just slowed down.',
  },
];

// Pick a fact by index, wrapping so any integer is valid. Kept pure and
// index-based so callers (and tests) stay deterministic; the screen passes a
// random index at runtime.
export function pickFact(index: number): BreathFact {
  const len = BREATH_FACTS.length;
  const i = ((Math.trunc(index) % len) + len) % len;
  return BREATH_FACTS[i];
}
