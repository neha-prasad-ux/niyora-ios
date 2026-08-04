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
import type { Act } from '@/v3/moment-copy';

// Grounded fill-in for the option labels (Neha 2026-08-01, "grounded fill-in
// only"). The person in a label is lifted VERBATIM from her own text — a relation
// she named, or the pronoun she used — never one she didn't. So a label can never
// introduce a "husband" she never mentioned: it is correct by construction, the
// same principle as the echo carve. No person found → the authored label stands.
// Mechanical on purpose: no model runs, so there is nothing to ground-check.
const RELATION =
  /\bmy (husband|wife|partner|boyfriend|girlfriend|fianc[ée]e?|fiance|bf|gf|sister|brother|mum|mom|mother|dad|father|boss|manager|friend|colleague|son|daughter|roommate|ex)\b/i;

/** The person she is talking about, in her own words, or null. Relation first
 *  (most grounded), then the pronoun she used. */
export function personRef(herText: string): string | null {
  const m = RELATION.exec(herText);
  if (m) return `your ${m[1].toLowerCase()}`;
  if (/\b(he|him|his)\b/i.test(herText)) return 'him';
  if (/\b(she|her|hers)\b/i.test(herText)) return 'her';
  if (/\b(they|them|their)\b/i.test(herText)) return 'them';
  return null;
}

// Label templates for the acts that address a person. {person} is filled from
// personRef; acts with no person (prep/self) are absent here and keep their
// authored label. Keyed by Act.id. [DRAFT] voice.
const PERSONALISED: Record<string, (p: string) => string> = {
  A: (p) => `Tell ${p} how you feel`, // Say it to them
  B: (p) => `Ask ${p} for what you need`, // Ask for the thing
  C: (p) => `Tell ${p} what's not okay`, // Hold a line
  D: (p) => `Own your part with ${p}`, // Own my part
};

/** The label to show for an act: her person filled in where the act addresses
 *  one, else the authored label. The act's identity and safety flags are
 *  untouched — this is display only. */
export function personalisedLabel(a: Act, herText: string): string {
  const make = PERSONALISED[a.id];
  if (!make) return a.label;
  const p = personRef(herText);
  return p ? make(p) : a.label;
}

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
// Keyed by FEELING_SET label. Relational-wound feelings lead with the fill-in
// (compose a measured message); hot, heavy and self-directed feelings lead with
// the calming act cards, because there settling comes before any response.
const PLANS: Record<string, OptionPlan> = {
  // --- relational wounds: fill-in composer ---
  Dismissed: fill(
    "It stings to get talked over. Say what you needed, plainly, and you're way more likely to get heard.",
    'Dismissed',
    ['I was talked over', 'my point was skipped', 'I got interrupted'],
  ),
  'Not taken seriously': fill(
    "When you get brushed off, you want to prove yourself. One clear line about how it felt does more.",
    'Not taken seriously',
    ['it was made a joke', "I didn't get credit", 'I was laughed off'],
  ),
  Hurt: fill(
    "Saying it out loud makes it lighter. It'll come out better once you've cooled off a little.",
    'Hurt',
    ['I was left out', 'you forgot', 'the plan changed without me'],
  ),
  'Let down': fill(
    'A broken plan can feel like a broken promise. Name the one thing that let you down, not the whole person.',
    'Let down',
    ['the plan was cancelled', 'it slipped again', 'I was left waiting'],
  ),
  Betrayed: fill(
    "Broken trust really hurts, and that's fair. Say how it felt before you decide anything big.",
    'Betrayed',
    ['you went behind my back', 'I found out', 'a promise was broken'],
  ),
  Rejected: fill(
    "A no can feel like it's about you. It's one moment, it's not the whole story of who you are.",
    'Rejected',
    ['I was turned down', 'I was left on read', 'I was not included'],
  ),
  Abandoned: fill(
    "Being left can bring up a lot. Just say what you need, instead of testing whether they stay.",
    'Abandoned',
    ['you left', 'I was on my own', 'no one showed up'],
  ),
  Small: fill(
    "Feeling invisible makes you want to hide or blow up. A simple, clear ask sits right in the middle.",
    'Small',
    ['I was left out', 'no one asked me', 'I was spoken over'],
  ),
  Guilty: fill(
    "Guilt usually means you care. Own your part simply, and go easy on yourself.",
    'Guilty',
    ['I let you down', 'I said something I regret', 'I forgot'],
  ),
  // --- hot, heavy, self-directed: calming cards ---
  Angry: cards(
    'The anger is real and it tells you something. It also fades faster than a message can be taken back, so wait a moment.',
  ),
  Frustrated: cards(
    'The "again" is the hard part. When you speak, name the pattern once, not every time it happened.',
  ),
  Irritable: cards(
    'Small things feel huge when you are already worn thin. A short reset now saves the snap later.',
  ),
  Anxious: cards(
    'Your body is on high alert, not seeing the future. Slow the breath first, then look at what is real.',
  ),
  Overwhelmed: cards(
    'When everything feels like too much, do one thing only. The rest can wait its turn.',
  ),
  Scared: cards(
    'Fear is trying to keep you safe. Name what you are afraid of, then check what is true right now.',
  ),
  Dreading: cards(
    'Dread makes what is ahead look bigger than it is. Break it into the very next small step.',
  ),
  Sad: cards(
    'Sadness is heavy, and it is allowed. You do not have to fix it right now, just let it move through.',
  ),
  Grieving: cards(
    'Grief comes in waves, not a straight line. Be as gentle with yourself as you would with a friend.',
  ),
  Numb: cards(
    'Feeling nothing is still something. One small, kind action can bring you back into the room.',
  ),
  Lonely: cards(
    'Feeling alone is painful and very human. Reaching out to one person, even briefly, helps more than waiting.',
  ),
  Ashamed: cards(
    'Shame says hide. The kinder truth is that you made a mistake, you are not one.',
  ),
  Embarrassed: cards(
    'Being embarrassed in front of people feels big. Most of them will remember it far less than you do.',
  ),
  Jealous: cards(
    'Comparing is human, and it hurts. Their win is not your loss, even when it feels that way.',
  ),
};

// Fallback for any feeling not in the table above (Neha 2026-08-02: keep the 24
// tailored lines, use her generic line only here).
export const DEFAULT_PLAN: OptionPlan = cards(
  'Knowing next steps is nice, you can pick any.',
);

/** The plan for a named feeling. Falls back to the calming-cards default for any
 *  label not in the table (including an empty feeling). */
export function optionPlanFor(feeling: string): OptionPlan {
  return PLANS[feeling.trim()] ?? DEFAULT_PLAN;
}
