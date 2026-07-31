// What the app decides about her sentence, and where that decision is made.
//
// One function, three verdicts. Today it is entirely deterministic: no model
// runs, and the flow is complete without one. When a model lands it goes BEHIND
// this function, never in front of it, because the two rules that matter most
// are not things weights can be relied on to keep:
//
//   · the crisis scan runs on her RAW text, before anything else touches it
//   · the echo may contain only her own words
//
// Both are enforced here, so a different provider inherits them for free.

import { scanForCrisis } from '@/lib/crisis-scan';
import { echoBlocked, groundedReflection } from '@/lib/ground-floor';

export type Verdict =
  /** Stop the flow and hand off. Nothing else runs. */
  | { kind: 'crisis' }
  /** She wrote something, but not a thing that happened. Ask for the event. */
  | { kind: 'unclear'; reason: 'too-short' | 'no-event' | 'nothing-to-echo' }
  /** Say it back, then name it. */
  | { kind: 'clear'; echo: string };

/** Words that describe a state rather than an event. "I feel awful" is not yet
 *  a thing that happened, and the flow needs the thing that happened. */
const FEELING_ONLY =
  /^\s*(i\s*(a?m|'m|feel|'ve been|have been)\s+)?(so\s+|really\s+|very\s+|just\s+)?(sad|angry|upset|awful|terrible|low|down|anxious|stressed|tired|numb|fine|ok(ay)?|bad|horrible|rubbish|empty|lost|done|over it)\b(\s+(today|tonight|right now|now|honestly|lately|again|already|still|all day|at the moment|as usual))*[\s.!]*$/i;

// There was a HAS_VERB whitelist here: a sentence had to contain one of ~35
// past-tense verbs or it was sent to clarify. It was removed 2026-07-27 because
// it misfired constantly — "she rolled her eyes at me", "he was late again",
// "nobody backed me up" are all concrete events and all failed it.
//
// The tolerance here is ASYMMETRIC and the whitelist had it the wrong way
// round. Clarifying when she has already told us costs her the sense of being
// heard, at the exact beat whose whole job is being heard. Not clarifying when
// we should have costs one thinner echo, and `groundedReflection` already
// declines safely when there is nothing in her sentence to carve. So the only
// things that route to clarify now are the cases we can be confident about.

export const MIN_WORDS = 4;

/**
 * Read her text and decide what happens next.
 *
 * Order is deliberate and load-bearing: crisis first, always, on the raw string.
 * A triggering message must never reach a model, be held in memory, or be
 * echoed back to her.
 */
export function analyse(raw: string): Verdict {
  const text = raw.trim();

  // 1. Crisis. Before everything, on every message, not only the first.
  if (scanForCrisis(text)) return { kind: 'crisis' };

  // 2. Long enough to be a sentence at all.
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return { kind: 'unclear', reason: 'too-short' };

  // 3. Try to say it back BEFORE judging whether it reads as an event.
  //
  //    `groundedReflection` carves a clause out of her own sentence and flips
  //    the person, so it cannot invent. It declines for two specific reasons:
  //    her read of someone else's intent (rule 07), and an attack on herself.
  //    Both are asked about differently from a merely thin entry, so its
  //    verdict has to be consulted before the crude heuristics below, or she
  //    gets a generic "what happened?" when we know exactly what was wrong.
  const carved = groundedReflection(text);
  if (carved.reason === 'attribution' || carved.reason === 'self-attack') {
    return { kind: 'unclear', reason: 'nothing-to-echo' };
  }

  // 4. Only a state, with no event attached: "I feel awful", nothing more.
  if (FEELING_ONLY.test(text)) return { kind: 'unclear', reason: 'no-event' };

  // 5. The carve is the real test of whether there is a thing here. It declines
  //    when her sentence holds no clause worth saying back, which is a far
  //    better signal than any keyword list, because it is the same code that
  //    has to produce the echo.
  if (!carved.text || echoBlocked(carved.text)) {
    return { kind: 'unclear', reason: 'no-event' };
  }

  return { kind: 'clear', echo: carved.text };
}

/**
 * The feelings offered after the echo, ranked by cue fit to what she wrote.
 *
 * Aligned to the 19 constellation emotions (M7, Neha 2026-07-31): each feeling
 * carries the `constellation` it belongs to, so naming it lights that badge on
 * the Soul sky and drives the option plan (option-plan.ts). Situational labels
 * are kept (Dismissed, Let down...) because the cue scorer reads her text far
 * better with them than with broad words, and several nuanced feelings can share
 * one constellation. The set stays CLOSED: the model may only reorder it.
 *
 * [DRAFT] labels + cues, awaiting Neha's pass. Constellations match
 * docs/moon-ai-constellations.md.
 */
export type FeelingWord = {
  label: string;
  /** Words in her text that make this one likely. Lowercase, matched loosely. */
  cues: string[];
  /** The constellation badge this feeling belongs to. */
  constellation: string;
};

export const FEELING_SET: readonly FeelingWord[] = [
  { label: 'Dismissed', constellation: 'inadequacy', cues: ['interrupt', 'talked over', 'ignored', 'brush', 'cut me off', 'skipped'] },
  { label: 'Not taken seriously', constellation: 'inadequacy', cues: ['interrupt', 'talked over', 'laughed', 'joke', 'credit'] },
  { label: 'Angry', constellation: 'anger', cues: ['shouted', 'yelled', 'snapped', 'rude', 'unfair', 'furious', 'mad'] },
  { label: 'Hurt', constellation: 'hurt', cues: ['said', 'told me', 'forgot', 'left me', 'cancelled', 'without me'] },
  { label: 'Let down', constellation: 'hurt', cues: ['promised', 'cancelled', 'forgot', 'late', 'never'] },
  { label: 'Betrayed', constellation: 'betrayal', cues: ['lied', 'behind my back', 'cheated', 'trust', 'betrayed', 'went behind'] },
  { label: 'Rejected', constellation: 'rejection', cues: ['left on read', 'said no', 'turned down', 'not wanted', 'rejected', 'ignored'] },
  { label: 'Abandoned', constellation: 'abandonment', cues: ['left', 'walked out', 'on my own', 'no one there', 'gone', 'abandoned'] },
  { label: 'Small', constellation: 'inadequacy', cues: ['nobody', 'no one', 'invisible', 'without me', 'not enough'] },
  { label: 'Embarrassed', constellation: 'shame', cues: ['front of', 'everyone', 'team', 'laughed', 'meeting', 'embarrassed'] },
  { label: 'Ashamed', constellation: 'shame', cues: ['stupid', 'my fault', 'humiliated', 'ashamed', 'pathetic'] },
  { label: 'Guilty', constellation: 'guilt', cues: ['my fault', 'should have', 'sorry', 'let them down', 'guilty'] },
  { label: 'Frustrated', constellation: 'frustration', cues: ['again', 'keeps', 'always', 'every time', 'still'] },
  { label: 'Irritable', constellation: 'irritability', cues: ['on edge', 'every little thing', 'snappy', 'irritable', 'wound up'] },
  { label: 'Anxious', constellation: 'anxiety', cues: ['worried', 'nervous', 'what if', 'panic', 'anxious', 'on edge'] },
  { label: 'Dreading', constellation: 'dread', cues: ['tomorrow', 'have to', 'facing', 'coming up', 'cant face', 'dreading'] },
  { label: 'Overwhelmed', constellation: 'overwhelm', cues: ['too much', 'cant cope', 'everything', 'drowning', 'buried', 'overwhelmed'] },
  { label: 'Scared', constellation: 'fear', cues: ['scared', 'afraid', 'terrified', 'frightened', 'threat'] },
  { label: 'Sad', constellation: 'sadness', cues: ['cried', 'crying', 'tears', 'down', 'low', 'sad'] },
  { label: 'Grieving', constellation: 'grief', cues: ['lost', 'gone', 'died', 'passed', 'miss'] },
  { label: 'Numb', constellation: 'numbness', cues: ['nothing', 'empty', 'blank', 'numb', 'dont care', 'shut down'] },
  { label: 'Lonely', constellation: 'loneliness', cues: ['alone', 'no one', 'by myself', 'nobody', 'lonely', 'left out'] },
  { label: 'Jealous', constellation: 'jealousy', cues: ['she got', 'they have', 'why not me', 'jealous', 'envy', 'everyone else'] },
];

/**
 * The three feeling words offered after the echo.
 *
 * This is PICK, done deterministically: it scores a CLOSED, authored list
 * against cues in her own text and takes the top three. No model, and when one
 * arrives its only job is to reorder this same list. It can never add a word,
 * which is what keeps a suppression an array filter rather than a hope.
 *
 * THE LIST ITSELF IS A PLACEHOLDER. The map specifies 22 approved feeling
 * words; that vocabulary does not exist in this repo and these eight are mine.
 * The scoring below does not care how long the list is, so replacing it is a
 * data change, not a code change.
 */
/**
 * Which lane a feeling word puts her in.
 *
 * Derived, never asked. She has just told us the word; asking "wound up, flat,
 * or all over the place?" one screen later reads as a form rather than a
 * conversation.
 *
 * HIGH is the default on purpose. An unrecognised word is far more likely to be
 * a wound-up one in this flow, and the high lane is the one that offers the
 * hold — so an unknown word errs toward waiting rather than toward acting.
 */
export type Lane = 'high' | 'low' | 'mixed';

const LOW_WORDS = /\b(flat|numb|drained|empty|tired of it|low|heavy|nothing|blank)\b/i;
const MIXED_WORDS =
  /\b(all over the place|up and down|swinging|confused|torn|not sure|mixed)\b/i;

export function laneFor(feeling: string): Lane {
  if (MIXED_WORDS.test(feeling)) return 'mixed';
  if (LOW_WORDS.test(feeling)) return 'low';
  return 'high';
}

export function offerFeelings(herText: string, count = 3): string[] {
  const t = herText.toLowerCase();
  const scored = FEELING_SET.map((f, i) => ({
    label: f.label,
    hits: f.cues.filter((c) => t.includes(c)).length,
    // Stable tiebreak on the authored order, so no-match input still gives a
    // sensible spread rather than an arbitrary one.
    i,
  }));
  scored.sort((a, b) => b.hits - a.hits || a.i - b.i);
  return scored.slice(0, count).map((s) => s.label);
}
