// Hardcoded content for the three PMS help groups, opened from the week page
// during the luteal window. Each group folds in the underlying levers: calm
// (in-the-moment calming + gentle movement), sleep, and food (steady blood
// sugar + calcium + gentle anti-inflammatory eating).
//
// Voice: neutrally warm, like a smart friend who knows the science. No em
// dashes, no "it's fine / it's normal", no "this will help" promises. Honesty
// rules (v2 scope research appendix): calcium is the firm one (RCTs); the
// blood-sugar and anti-inflammatory links are gentler, reasoned from adjacent
// research, never over-claimed. No "imbalance", never "leaky gut".

import type { PmsFactorId } from '@/store/pms-factors';

// All three groups have a content card.
export type PmsContentFactorId = PmsFactorId;

export type PmsFactorContent = {
  title: string;
  lead: string;
  points: readonly string[];
  // The honest evidence note shown at the foot of the card.
  evidence: string;
  // Optional in-card action (the calm group offers to start the loop now).
  actionLabel?: string;
  actionRoute?: string;
};

export const PMS_FACTOR_CONTENT_CARDS: Record<PmsContentFactorId, PmsFactorContent> = {
  calm: {
    title: 'Calm your body and mind',
    lead: 'When the tension spikes before your period, calming your body first is what helps most. Gentle movement helps too, and neither has to be a big effort.',
    points: [
      'A slow breath or a short calming moment settles the spike.',
      'A walk or some easy stretching lifts mood and eases tension.',
      'Even a few minutes counts. Lighter and kinder is the point this week.',
    ],
    evidence: 'Calming activities and gentle movement both show a moderate effect on premenstrual mood. Intensity is not the point, showing up gently is.',
    actionLabel: 'Start a calming moment',
    actionRoute: '/distress-loop',
  },
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
  food: {
    title: 'Food for steadier days',
    lead: 'What you eat can take a couple of triggers off the table before your period: a steadier blood sugar, the minerals that ease the dip, and gentler meals.',
    points: [
      'Some protein or fat with each meal slows the blood-sugar crash that can copy the mood dip.',
      'Calcium has the strongest evidence here. Milk, yogurt, fortified plant milks, leafy greens, calcium-set tofu.',
      'Omega-3, more fibre, and fermented foods, with a little less ultra-processed when that is easy.',
    ],
    evidence: 'Calcium is backed by randomized trials, the firmest lever. The blood-sugar and anti-inflammatory links are gentler and reasoned from adjacent research. A quick word with your doctor before any supplement.',
  },
};

// Every group has a content card, so this is always true. Kept so callers can
// stay group-agnostic if a non-content entry is ever added.
export function hasFactorCard(id: PmsFactorId): id is PmsContentFactorId {
  return id in PMS_FACTOR_CONTENT_CARDS;
}
