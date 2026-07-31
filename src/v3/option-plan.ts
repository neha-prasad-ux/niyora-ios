// The respond step, tailored to the feeling she named (Neha 2026-07-31: attach
// the emotion, tailor the options under it, instead of a separate situation
// router). One plan per feeling word from FEELING_SET:
//
//   · science  — the ONE earned line shown over the options (C8/M5). Not a
//                paragraph, not repeated grounding: one true, mature line about
//                this feeling. No "don't worry", no "harder day" framing.
//   · composer — which component leads the respond step. 'fill' opens the
//                fill-in template ("I felt __ when __, I need __") for the
//                relational feelings where saying it well is the work; 'cards'
//                keeps the ranked calming acts for the hot feelings, where
//                steadying comes before any message.
//   · template — the fill-in parts, when composer is 'fill'. The feeling itself
//                seeds the first blank so she starts mid-sentence, not blank.
//
// All copy here is [DRAFT], in the app voice (clear, warm, specific, no em
// dashes), awaiting Neha's pass. FEELING_SET is the source of truth for the
// labels; a feeling with no entry falls back to DEFAULT_PLAN (cards).

import type { TemplatePart } from '@/components/moment/fill-in-assemble';

export type Composer = 'cards' | 'fill';
export type OptionPlan = { science: string; composer: Composer; template?: TemplatePart[] };

const NEED_SUGGESTIONS = ['a heads-up next time', 'to be heard out', 'us to decide together', 'an apology'];

/** The "I felt __ when __, I need __" frame, seeded with the named feeling. */
function fillTemplate(feeling: string, triggerHints: string[]): TemplatePart[] {
  return [
    'I felt ',
    { key: 'feeling', placeholder: feeling.toLowerCase() },
    ' when ',
    { key: 'trigger', placeholder: 'what happened', suggestions: triggerHints },
    ', and I need ',
    { key: 'need', placeholder: 'what would help', suggestions: NEED_SUGGESTIONS },
    '.',
  ];
}

const fill = (science: string, feeling: string, triggerHints: string[]): OptionPlan => ({
  science,
  composer: 'fill',
  template: fillTemplate(feeling, triggerHints),
});

const cards = (science: string): OptionPlan => ({ science, composer: 'cards' });

// Keyed by FEELING_SET label. Hot feelings (Angry, Frustrated) lead with the
// calming acts; the relational ones lead with the fill-in, because there the
// work is saying it in a way that lands.
const PLANS: Record<string, OptionPlan> = {
  Dismissed: fill(
    'Being talked over feels bad, and that is real. Saying clearly what you needed helps you get heard next time.',
    'Dismissed',
    ['I was talked over', 'my point was skipped', 'I got interrupted'],
  ),
  'Not taken seriously': fill(
    'When you are brushed off, you want to prove yourself. One clear line about the effect works better than that.',
    'Not taken seriously',
    ['it was made a joke', "I didn't get credit", 'I was laughed off'],
  ),
  Hurt: fill(
    'Saying the hurt out loud makes it smaller. What you say once you feel calmer will come out better.',
    'Hurt',
    ['I was left out', 'you forgot', 'the plan changed without me'],
  ),
  'Let down': fill(
    'A broken plan can feel like a broken promise. Name the one thing that let you down, not the whole person.',
    'Let down',
    ['the plan was cancelled', 'it slipped again', 'I was left waiting'],
  ),
  Small: fill(
    'Feeling unseen makes you want to hide or to shout. A clear, simple ask sits between the two.',
    'Small',
    ['I was left out', 'no one asked me', 'I was spoken over'],
  ),
  Embarrassed: fill(
    'Being embarrassed in front of people feels big. Most of them will remember it far less than you do.',
    'Embarrassed',
    ['it happened in the meeting', 'in front of the team', 'in front of everyone'],
  ),
  Angry: cards(
    'The anger is real and it tells you something. It also fades faster than a message can be taken back, so wait a moment.',
  ),
  Frustrated: cards(
    'The "again" is the hard part. When you speak, name the pattern once, not every time it happened.',
  ),
};

export const DEFAULT_PLAN: OptionPlan = cards(
  'You named the feeling and calmed down. Now, does one of these feel like the right response?',
);

/** The plan for a named feeling. Falls back to the calming-cards default for any
 *  label not in the table (including an empty feeling). */
export function optionPlanFor(feeling: string): OptionPlan {
  return PLANS[feeling.trim()] ?? DEFAULT_PLAN;
}
