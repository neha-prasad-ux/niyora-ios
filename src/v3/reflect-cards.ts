// Reflection card system, the shared contract for the moment-flow rebuild.
//
// Consumed by:
//   • moment.tsx        : renders the cards + runs the Reflect/Regulate/Respond spine
//   • moment-gemini.ts  : one SLOT_INSTRUCTION per card that needs AI-generated content
//   • moment-ai.ts      : the verbs that call those slots
//
// Design rules baked in here (do not relax without a design decision):
//   1. Every card ADDS a possibility; none SUBTRACTS her feeling.
//   2. A card's title is a plain question she can answer on its own.
//   3. The big text is a CONCRETE guess/echo, never an abstract prompt (kills skips).
//   4. "no" means different things:
//        - additive cards -> offer the next routed card
//        - reality cards  -> back off and VALIDATE, never push another reframe
//        - draft cards    -> open an edit field (she owns the words)
//   5. Cycle tuning changes the DOSE, never the VERDICT, and switches fully off on
//      crisis content (see PMS_NOTE gate).

export type ReflectCardId =
  | 'friend' // advise-a-friend, self-compassion (AI drafts, she edits)
  | 'simpler' // perspective: a plainer outside reason (2-3 guesses)
  | 'also_true' // catastrophizing, softened: other likelier endings + she'd get through the worst (absorbs old handle/future)
  | 'fact_or_fear' // fact vs fear (question, echoes her words)
  | 'middle' // all-or-nothing / absolutes (question)
  | 'whose_weight' // self-blame + decentring: what she can act on vs what isn't hers (guess)
  | 'know_or_guess' // mind-reading (question)
  | 'need' // needs-focus: what she needs, and whether gripping this is costing her (absorbs old helping)
  // Science-backed lenses (2026-08-10, merged to a sharper set 2026-08-13):
  | 'rule' // REBT shoulds: the rigid rule/"should" under the upset (2-3 guesses)
  | 'shame' // shame vs guilt: a thing she did vs a verdict on who she is (2-3 guesses)
  | 'signal' // emotion-as-information: what the feeling points to + what the calm part already knows (absorbs old wise)
  | 'pattern' // recurring theme across past entries (AI states it from history)
  // The one card with no AI content at all (2026-08-21). Diffuse overwhelm has
  // nothing to re-see, so this does not reframe: she writes down what is on her
  // and sorts it. See components/moment/load-card.tsx.
  | 'load';

// draft:    AI returns ONE line she can accept or edit (she owns the words).
// guess:    AI returns 2-3 short options she taps, or "none of these".
// question: no AI content, echoes her own words, she answers yes/no.
export type CardMode = 'draft' | 'guess' | 'question';

// another:  additive "no" -> advance to the next routed card.
// validate: reality "no" -> respect that it's real, stop reframing.
// edit:     draft second action -> open a field to tweak the line.
export type SecondAction = 'another' | 'validate' | 'edit';

export type ReflectCard = {
  id: ReflectCardId;
  title: string; // plain, answerable on its own
  subtitle?: string; // optional one-line why, under the title
  mode: CardMode;
  yes: string; // affirm button
  second: string; // the other button
  secondAction: SecondAction;
  slot?: string; // moment-gemini SLOT_INSTRUCTION key (only when mode !== 'question')
  maxOptions?: number; // guess cards: cap the number of tappable options (>3 is a menu)
};

export const REFLECT_CARDS: Record<ReflectCardId, ReflectCard> = {
  friend: {
    id: 'friend',
    title: 'What would you say if this was a friend?',
    subtitle: 'Seeing it from the outside often makes it clearer.',
    mode: 'draft',
    yes: "That's it",
    second: 'Let me edit',
    secondAction: 'edit',
    slot: 'reflect_friend',
  },
  simpler: {
    id: 'simpler',
    title: 'Could there be a simpler reason?',
    mode: 'guess',
    yes: 'Maybe',
    second: "No, it's more",
    secondAction: 'another',
    slot: 'reflect_simpler',
    maxOptions: 3,
  },
  also_true: {
    id: 'also_true',
    title: 'What if these are true too?',
    mode: 'guess',
    yes: 'Fair',
    second: 'Still scared',
    secondAction: 'another',
    slot: 'reflect_also_true',
    maxOptions: 3,
  },
  fact_or_fear: {
    id: 'fact_or_fear',
    title: 'Is it a fact, or your mind prepping you for the worst?',
    mode: 'question',
    yes: 'Prepping me',
    second: "It's real",
    secondAction: 'validate',
  },
  middle: {
    // All-or-nothing → show the middle ground between the two extremes as reads.
    id: 'middle',
    title: 'Is there any middle here?',
    mode: 'guess',
    yes: 'Ready',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_scale',
    maxOptions: 3,
  },
  whose_weight: {
    // Self-blame + decentring merged: what she can actually work on vs what isn't
    // hers to move, offered as concrete reads.
    id: 'whose_weight',
    title: 'How much of this can you actually work on?',
    mode: 'guess',
    yes: 'Ready',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_responsibility',
    maxOptions: 3,
  },
  know_or_guess: {
    id: 'know_or_guess',
    title: 'Do you know, or are you guessing?',
    mode: 'question',
    yes: 'Guessing',
    second: 'I know',
    secondAction: 'validate',
  },
  need: {
    // Needs-focus: a broadly-applicable lens for the variety walk, under the
    // situation, what does she actually need right now.
    id: 'need',
    title: 'What do you actually need right now?',
    mode: 'guess',
    yes: 'Maybe',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_need',
    maxOptions: 3,
  },
  // --- Science-backed lenses (2026-08-10, merged to a sharper set 2026-08-13).
  // The old ACT `helping` folded into `need`, DBT `wise` into `signal`, and CBT
  // `handle` + temporal `future` into `also_true`, so each surviving lens is one
  // distinct move rather than four that blurred together. ---
  rule: {
    // Special card (like the fact-sort pair): renders the REBT chain she can see
    // (event -> hidden rule -> where it lands) then tests the rule, instead of a
    // flat reads list. See RULE_LABELS + ruleBreakdown() (Neha 2026-08-13).
    id: 'rule',
    title: "Let's break it down",
    mode: 'guess',
    yes: 'Fair',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_rule',
    maxOptions: 3,
  },
  shame: {
    id: 'shame',
    title: 'Is this about something you did, or who you are?',
    mode: 'guess',
    yes: 'Something I did',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_shame',
    maxOptions: 3,
  },
  signal: {
    id: 'signal',
    title: 'What might this feeling be pointing to?',
    mode: 'guess',
    yes: 'Maybe',
    second: 'Show me more',
    secondAction: 'another',
    slot: 'reflect_signal',
    maxOptions: 3,
  },
  load: {
    id: 'load',
    title: 'What is actually on you right now?',
    mode: 'guess', // an interaction, like scale and responsibility. No slot: no AI.
    yes: 'Done',
    second: 'Show me more',
    secondAction: 'another',
  },
  pattern: {
    id: 'pattern',
    title: 'This keeps coming back',
    mode: 'draft',
    yes: 'Look closer',
    second: 'Not now',
    secondAction: 'another',
    slot: 'reflect_pattern',
  },
};

// Fact-sort cards: instead of echoing the whole thought and asking one yes/no,
// these split it into separate claims and sort each as a fact or her own read,
// then soften the reads and help her act on the facts. Only the two cards that
// are literally about fact-vs-interpretation use this.
export const FACTSORT_CARDS: ReflectCardId[] = ['fact_or_fear', 'know_or_guess'];

export type Claim = { text: string; fact: boolean };

export const FACTSORT = {
  title: 'Which of these are facts, and which are feelings?',
  fact: 'Fact',
  feeling: 'Feeling',
  feelingsHead: 'Another way to see it',
  factsHead: 'What actually happened',
  cta: 'Continue',
} as const;

// The rule card's chain labels (Neha 2026-08-13). The card walks her moment out
// as event -> the hidden rule -> where it lands, then tests the rule. The chain
// is the diagnostic setup (no reactions); `testsHead` opens the reactable reads.
export const RULE_LABELS = {
  event: 'What happened',
  rule: "The rule you're holding",
  consequence: 'How it feels',
  testsHead: 'Is any of it true?',
} as const;

// Cheap lexical read of her text + guessed feeling. No AI. Sets the routing lane.
// ponytail: regex heuristic, deliberately shallow. Upgrade to the AI `pick` slot if
// routing accuracy measurably falls short in testing.
export type ReflectSignals = {
  aboutPerson: boolean; // someone did/said something -> simpler / mind-reading
  predicting: boolean; // future/worst-case words -> also_true / fact_or_fear
  absolute: boolean; // a stated absolute CLAIM (always/never/ruined) -> middle
  mindReading: boolean; // assuming someone's inner state -> know_or_guess
  selfBlame: boolean; // taking all the fault -> whose_weight / friend
  beyondControl: boolean; // out of her hands -> whose_weight (agency)
  recurring: boolean; // history shows the same theme -> pattern
  /** No event, no person, no absolute, no prediction: nothing to re-see, only a
   *  pile to put down. The precondition for `load` (2026-08-21). */
  diffuse: boolean;
  // WHEN it is happening (2026-08-19 scenario run). The distortion signals above say
  // which lens FITS; this says which of them can still land. A 15-year pattern routed
  // to `simpler` got "your mum might be worried about you", an explanation for a
  // single incident, offered to a woman who has run it a thousand times. And a woman
  // writing mid-fight got three analysis cards before anything to steady her.
  //   acute        happening now / just happened, her body is still in it
  //   longstanding carried for months or years, or the same thing on repeat
  //   recent       a one-off that has already finished (the default, no tuning)
  timeframe: Timeframe;
};

export type Timeframe = 'acute' | 'longstanding' | 'recent';

const RX = {
  person: /\b(he|she|they|him|her|them|his|their|mom|mum|mummy|dad|nan|gran|granny|friend|boss|partner|husband|wife|boyfriend|girlfriend)\b/i,
  // Widened 2026-08-20. "i am flying tomorrow and am worried something goes wrong"
  // is a textbook anticipatory fear and matched NOTHING: the old list only caught
  // her if she used will/won't/never/disaster/what if. A woman bracing for
  // something rarely announces it in those words, she says she is worried, or
  // nervous, or dreading it. Missing the signal sent her to `signal` first, the
  // weakest card, with the right one (other endings, and the day after) third.
  predicting:
    /\b(will|won't|going to|gonna|never|always|ruin|fail|disaster|everyone|nobody|end up|what if|worried|worry|worrying|scared|afraid|anxious about|nervous|dreading|dread|in case|might (happen|go|be)|goes wrong|go wrong|what happens if|tomorrow|next week|coming up|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
  // An absolute CLAIM, not merely an absolute word (Neha 2026-08-19). This signal
  // exists only to fire the `middle` card, whose protocol needs a stated extreme to
  // put a scale under. The old one matched the bare word "everything", so
  // "everything is too much today" read as all-or-nothing thinking when it is
  // overwhelm, and `middle` had nothing to split: it answered "it is a heavy day",
  // her own sentence handed back. These two are read together in detectSignals.
  absoluteHard: /\b(always|never|nothing|nobody|no one|ruined|completely|totally)\b/i,
  absoluteQuant: /\b(everything|everyone)\b/i,
  // "everything is too much", "it all feels so much": intensity, not a verdict.
  overwhelmIdiom:
    /\b(everything|everyone|it all|all of it)\s+(is|feels|seems|was|has been)\s+(too much|so much|a lot|overwhelming|heavy|hard)/i,
  mindReading: /\b(thinks?|hates?|annoyed|angry at me|doesn't (like|care)|mad at me|judging|disappointed in me)\b/i,
  selfBlame: /\b(my fault|i ruined|i messed|i'm (a )?(failure|terrible|awful|stupid|bad)|i should(n't)? have|because of me)\b/i,
  beyondControl: /\b(out of my (hands|control)|can't (change|control|do anything)|nothing i can do|up to (him|her|them|fate))\b/i,
  // Checked BEFORE acute on purpose: "we had the same argument again last night"
  // carries both, and the long-standing framing is the one that changes the answer.
  longstanding:
    /\b(for (years|months|ages|so long)|\d+ ?(years|months)|every (single )?time|keeps? (happening|coming back)|same (argument|fight|conversation|thing|talk)|again and again|over and over|nothing (ever )?changes|as long as i can remember|since i was|always been|still (let|get|feel|do|have)|been like this|for the last few (months|years))\b/i,
  acute:
    /\b(right now|just (now|said|told|walked|happened|got|left|texted|sent)|in the middle of|minutes ago|this morning|tonight|today|i'?m shaking|i am shaking|about to|in an hour|is in the kitchen|has just)\b/i,
};

export function detectTimeframe(text: string): Timeframe {
  const t = text || '';
  if (RX.longstanding.test(t)) return 'longstanding';
  if (RX.acute.test(t)) return 'acute';
  return 'recent';
}

export function detectSignals(text: string, recurring = false): ReflectSignals {
  const t = text || '';
  return {
    aboutPerson: RX.person.test(t),
    predicting: RX.predicting.test(t),
    absolute:
      RX.absoluteHard.test(t) || (RX.absoluteQuant.test(t) && !RX.overwhelmIdiom.test(t)),
    mindReading: RX.mindReading.test(t),
    selfBlame: RX.selfBlame.test(t),
    beyondControl: RX.beyondControl.test(t),
    recurring,
    timeframe: detectTimeframe(t),
    // Deliberately computed LAST and from the others: diffuse means every other
    // signal came back empty, which is exactly when no reading lens has grip.
    diffuse:
      t.trim().length > 0 &&
      !RX.person.test(t) &&
      !RX.predicting.test(t) &&
      !RX.mindReading.test(t) &&
      !RX.selfBlame.test(t) &&
      !RX.beyondControl.test(t) &&
      !(RX.absoluteHard.test(t) || (RX.absoluteQuant.test(t) && !RX.overwhelmIdiom.test(t))),
  };
}

// Pick the ordered set of cards for this thought. First is the best fit; an additive
// "no" walks to the next. ALWAYS returns at least the safe defaults, so the flow can
// never dead-end. Safe/low-risk cards (outside, friend) are guaranteed at the tail.
export function routeCards(sig: ReflectSignals): ReflectCardId[] {
  const out: ReflectCardId[] = [];
  const push = (id: ReflectCardId) => {
    if (!out.includes(id)) out.push(id);
  };

  // Diffuse overwhelm leads with `load`: no event, no person, no absolute, no
  // prediction, so every reading lens would be reframing something that is not
  // there. Gated hard, because a woman who DID bring an event should never be
  // handed an inventory instead of a read.
  if (sig.diffuse) push('load');
  if (sig.recurring) push('pattern');
  if (sig.mindReading) push('know_or_guess');
  if (sig.aboutPerson) push('simpler');
  if (sig.absolute) push('middle');
  if (sig.predicting) {
    // also_true now carries the old `handle` coping angle too (the worst isn't the
    // only ending, and she'd get through it if it came), so no separate push.
    push('also_true');
    push('fact_or_fear');
  }
  if (sig.selfBlame || sig.beyondControl) push('whose_weight');
  if (sig.selfBlame) push('shame'); // a thing she did vs a verdict on who she is

  // Variety tail: after the best-fit lens, offer the other broadly-applicable
  // reading SHAPES so "Reflect more" keeps handing her a genuinely different frame
  // rather than running dry and dropping to the open chat. The universal lenses
  // (signal / need / rule, 2026-08-13 merged set) apply to almost any moment.
  // signal + need lead the tail on purpose, before the merge they sat near the
  // end and almost never fired (Neha 7/8); now they surface early. `friend` stays
  // the gentle last. The fact-sort question cards are NOT added here, they are an
  // interaction, gated to their signal above.
  push('signal');
  push('need');
  push('also_true');
  // `middle` is NOT in the variety tail (Neha 2026-08-19). Its protocol needs an
  // absolute she actually stated, so in the tail it fired on entries that had none
  // and either declined (an empty card) or padded: handed "everything is too much
  // today" it produced "it is a heavy day", her own sentence. It measured the worst
  // adds-nothing rate of any card, and Neha's read of the content matched. It still
  // fires from `sig.absolute` above, which is the only place it has anything to do.
  push('whose_weight');
  push('rule');
  push('friend');

  // Time-aware reorder (2026-08-19). Nothing is added or removed here, so every
  // safety property of the set above still holds and the flow still cannot
  // dead-end. All this changes is WHICH of the routed lenses she meets first.
  //   longstanding: lead with the lenses that work on a pattern (what rule she is
  //     holding, what she needs, what is actually hers to move) and demote
  //     `simpler`, whose whole shape is a gentler reason for one incident.
  //   acute: lead with what she needs right now and what the feeling is flagging,
  //     because mid-moment she cannot take in an analysis.
  // `load` leads whatever the timeframe says. Diffuse overwhelm is a statement
  // about WHAT she brought (nothing to re-see), and the timeframe only orders
  // lenses that already have grip. "Everything is too much today" is both diffuse
  // and acute, and the acute lead was pushing the one card built for it down the
  // list (2026-08-21).
  // Recurrence beats diffuseness when both fire: `pattern` has real content, her
  // own past entries on this thread, and an inventory does not. She is better
  // served by "this keeps coming back" than by a list, when we can prove it.
  const lead: ReflectCardId[] = sig.diffuse
    ? sig.recurring
      ? ['pattern', 'load']
      : ['load']
    : sig.timeframe === 'longstanding'
      ? ['pattern', 'rule', 'need', 'whose_weight']
      : sig.timeframe === 'acute'
        ? ['need', 'signal']
        : [];
  const demote: ReflectCardId[] = sig.timeframe === 'longstanding' ? ['simpler'] : [];
  if (lead.length === 0) return out;
  const has = (ids: ReflectCardId[]) => ids.filter((id) => out.includes(id));
  return [
    ...has(lead),
    ...out.filter((id) => !lead.includes(id) && !demote.includes(id)),
    ...has(demote),
  ];
}

/**
 * The second-lens pick (Neha 2026-08-10): after she adds context on a reading
 * card, if the ADDED text surfaces a signal her original entry did not, that is a
 * genuinely new frame worth showing alongside the current one ("we could also see
 * it like this"). Returns the reading card for the first newly-gained signal that
 * isn't the card she's already on, or null when the context only sharpened the
 * same thread (then we just regenerate the current reads, no second lens).
 *
 * Only READING shapes are eligible, the two fact-sort question cards are an
 * interaction, wrong to drop in as a passive "also".
 */
export function secondLensFor(
  before: ReflectSignals,
  after: ReflectSignals,
  currentId: ReflectCardId,
): ReflectCardId | null {
  const gained = (k: keyof ReflectSignals) => !before[k] && after[k];
  const map: [keyof ReflectSignals, ReflectCardId][] = [
    ['absolute', 'middle'],
    ['selfBlame', 'whose_weight'],
    ['beyondControl', 'whose_weight'],
    ['aboutPerson', 'simpler'],
    ['predicting', 'also_true'],
    ['recurring', 'pattern'],
  ];
  for (const [sig, id] of map) {
    if (gained(sig) && id !== currentId) return id;
  }
  return null;
}

/**
 * The reading lens a free-typed message fits, for the open chat (Neha 2026-08-10):
 * so "keep reflecting" answers with a real template (reads-as-points) when her
 * words carry a signal, not a loose chatbot line. Returns null when nothing strong
 * fires, then the chat falls back to the short scope-guarded reflective reply.
 *
 * Reading shapes ONLY (no fact-sort question cards, they're an interaction, wrong
 * to auto-fire mid-chat). `mindReading`/`aboutPerson` both land on `simpler` (a
 * gentler reason for what someone did); `recurring` never fires from text alone.
 */
export function lensForText(text: string): ReflectCardId | null {
  const sig = detectSignals(text);
  // `middle` and `whose_weight` are deliberately absent (2026-08-21). Both are
  // INTERACTIONS now, a scale she places and an allocation she makes, and a chat
  // turn cannot render either. Routing to them here silently fell back to their
  // old reads, which is the content they were replaced for. Anything absolute or
  // self-blaming that arrives in the chat lands on the tail below instead.
  const map: [keyof ReflectSignals, ReflectCardId][] = [
    ['predicting', 'also_true'],
    ['mindReading', 'simpler'],
    ['aboutPerson', 'simpler'],
    ['selfBlame', 'shame'],
  ];
  for (const [k, id] of map) {
    if (sig[k]) return id;
  }
  return null;
}

// ---- Shared copy for the rebuilt flow (one home so every agent uses the same words) ----

// The 3-beat intro that tells her the shape before she starts.
export const INTRO_BEATS = ['Reflect', 'Regulate', 'Respond'] as const;

// Shown ONLY when the AI genuinely needs a beat (prefetch usually hides it).
export const AI_THINKING = 'One sec, finding a clearer way to see this.';

// The emotion opener: Moon proposes, she confirms/swaps. Show only when the feeling
// isn't already clear in her text (routing/affect-labeling benefit without the chore).
export const FEELING_GUESS = {
  title: 'Does one of these feelings fit?',
  yes: 'Yeah',
  other: 'Something else',
  count: 3, // number of feeling words to offer
} as const;

// Regulate gate, optional, tied to responding. Reuses make_safe's Wait/Now.
export const SETTLE = {
  title: 'Want a moment to settle before you respond?',
  why: 'It makes the next part land better.',
  yes: 'Yes, I would',
  no: 'No, I need to respond now',
} as const;

// Cycle-aware note. VISIBLE piece is pull-only: she taps `pull`, never auto-shown.
// Gate (all must hold): getPmsPrefs().pmsMode && lastPeriodStart != null &&
//   isInPmsWindow(lastPeriodStart, cycleLength, new Date()) && NOT crisis content.
// "lastPeriodStart != null" is the "only if she's added period data" rule.
// PMS deliberately no longer changes the reflect tone or reads (Neha 2026-08-11):
// the reads must be identical whether or not she is in the window. The ONLY PMS
// behaviour is the auto heads-up note (PMS_NOTE). Kept as an empty string so the
// `pmsActive.current ? REFLECT_CYCLE_NOTE : ''` prompt sites inject nothing. Do
// NOT re-populate, the PMS tone dose was removed on purpose.
export const REFLECT_CYCLE_NOTE = '';

export const PMS_NOTE = {
  pull: 'Feeling bigger than usual today?',
  // Short enough for a banner (Neha 2026-08-11). Heads-up + validation + the
  // volume-up framing; no "it eases in a few days" (that reads as "it'll pass").
  body:
    'You may be in the days before your period, when feelings can land bigger. ' +
    "That's your body turning up the volume, and they're every bit as real.",
  cta: 'Got it',
} as const;
