// Hardcoded content for the five lifestyle factors (stress is the live dial,
// handled by the breath / distress loop, so it has no card here). Each opens
// from the week page during the luteal window.
//
// Voice: neutrally warm, like a smart friend who knows the science. No em
// dashes, no "it's fine / it's normal", no "this will help" promises. Honesty
// rules (from the v2 scope research appendix): grade the evidence plainly.
// Calcium is the firm one (RCTs). The blood-sugar link is reasoned from
// adjacent research, not a dedicated PMS trial. Gut & inflammation is the
// softest: included as a gentle, low-risk habit, never as a proven fix
// (premenstrual inflammation as a driver is mixed and was not over-claimed).

import type { PmsFactorId } from '@/store/pms-factors';

// The factors that have a content card (everything except the live 'stress' dial).
export type PmsContentFactorId = Exclude<PmsFactorId, 'stress'>;

export type PmsFactorContent = {
  title: string;
  lead: string;
  points: readonly string[];
  // The honest evidence note shown at the foot of the card.
  evidence: string;
};

export const PMS_FACTOR_CONTENT_CARDS: Record<PmsContentFactorId, PmsFactorContent> = {
  sleep: {
    title: 'Sleep',
    lead: 'Short sleep before your period sharpens every other symptom. The nights right before bleeding are often the most broken, and thin sleep makes the dip land harder.',
    points: [
      'A steady wind-down time, even a loose one, steadies the next day.',
      'Cooler and darker helps. Your body runs a little warmer this phase.',
      'If your mind races at night, that is the phase talking, not a flaw in you.',
    ],
    evidence: 'Sleep shifts across the cycle are well documented, and protecting sleep is one of the steadier levers you have.',
  },
  steadyMeals: {
    title: 'Steady meals',
    lead: 'A blood-sugar crash can copy the mood dip almost exactly: shaky, short-fused, suddenly tearful. Eating steadily takes one trigger off the table.',
    points: [
      'Some protein or fat with each meal slows the crash.',
      'Smaller and more often beats one long gap.',
      'A crash and a mood dip feel identical from the inside, so eating first is worth a try.',
    ],
    evidence: 'The blood-sugar link is reasoned from related research rather than a dedicated PMS trial. Steady eating is low-risk and easy to test for yourself.',
  },
  calcium: {
    title: 'Calcium',
    lead: 'Of all the everyday levers, calcium has the strongest evidence for easing premenstrual mood.',
    points: [
      'The studied range is about 1000 to 1200 mg a day, from food or a supplement.',
      'Milk, yogurt, fortified plant milks, leafy greens, and calcium-set tofu all count.',
      'It builds over weeks, so it is a quiet daily habit rather than a same-day fix.',
    ],
    evidence: 'This one is backed by randomized trials, the firmest of the factors here. Have a quick word with your doctor before starting a supplement.',
  },
  movement: {
    title: 'Movement',
    lead: 'Gentle movement lifts mood and eases the tension in the days before your period. It does not have to be a workout.',
    points: [
      'A walk counts. Stretching counts. Slow counts.',
      'Lighter and kinder beats hard and punishing this week.',
      'Even ten minutes shifts something.',
    ],
    evidence: 'Regular activity shows a moderate effect on premenstrual mood. Gentle is the point, not intensity.',
  },
  gutInflammation: {
    title: 'Gut & inflammation',
    lead: 'This one is softer than the others. Calming inflammation may take a little edge off, and the foods that do it are good for you anyway.',
    points: [
      'Omega-3 from oily fish, walnuts, or flax. A bit more fibre. Some fermented foods.',
      'A little less ultra-processed food, when that is easy.',
      'No overhaul needed. Small, kind swaps.',
    ],
    evidence: 'The direct evidence here is mixed and smaller than for calcium. It is in because these are gentle, low-risk habits with broad benefits, not because it is a proven fix.',
  },
};

// Type guard: does this factor have a content card?
export function hasFactorCard(id: PmsFactorId): id is PmsContentFactorId {
  return id !== 'stress';
}
