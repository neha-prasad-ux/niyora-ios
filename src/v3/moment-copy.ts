// Every word the flow says, and where each one came from.
//
// PROVENANCE is marked per line, because "who approved this" is the question
// that gets lost first:
//
//   [MAP]    verbatim from the canonical map. Approved. Do not restyle.
//   [SAFETY] verbatim and locked. Never generated, never paraphrased, never
//            explained. Changing one of these is a safety change.
//   [DRAFT]  mine, structurally correct, awaiting Neha's voice. Every one of
//            these is a placeholder. They are written to the voice rules (clear,
//            warm, specific, short, no wellness padding, no reassurance she did
//            not ask for) but they are not hers yet.
//
// The standing rule for review: a line ships unless something in it is false,
// unsupported, or misleading. Agents may reopen an approved line to challenge a
// claim, never to improve its style, or review never terminates.
//
// House style: SENTENCE CASE (Neha, 2026-07-27, overriding the map's
// all-lowercase drafting style). Plain words, middle dots for beats, no
// exclamation points except the one approved celebration. Sentence case reads
// as someone speaking plainly; all-lowercase reads as a style choice, and a
// style choice is a thing she has to notice while upset.

/** The closed sets. The model may rank these; it may never add to one. */
export const SETS = {
  /**
   * [DRAFT] Ten stuck thoughts. The model ranks the three closest to her text.
   * Five are from the spec's worked example; five are mine and need review.
   */
  stems: [
    "he doesn't want me around anymore", // [MAP]
    "i did something wrong and i don't know what", // [MAP]
    'This is going to keep happening', // [MAP]
    "i'm too much for people", // [MAP]
    'Nobody actually chooses me', // [MAP]
    "i'm the only one trying here", // [DRAFT]
    "Everyone can see it except me", // [DRAFT]
    "I should be over this by now", // [DRAFT]
    "If i say something it gets worse", // [DRAFT]
    "there's something wrong with me", // [DRAFT]
  ],

  /**
   * [DRAFT] One reframe per stem, same index. Deterministic once she picks.
   * Shape is fixed and authored: "you know {her fact}. you don't know
   * {the inference} yet." Both slots lift from her sentence, so the line that
   * does the work is the same line every time.
   */
  reframes: [
    'You know what he did. You don\'t know what it means yet.',
    'You know something is off. You don\'t know that it was you.',
    'You know it happened this time. You don\'t know it happens next time.',
    'You know you felt like a lot tonight. You don\'t know that you are.',
    'You know this one went wrong. You don\'t know that it always does.',
    'You know you have been carrying it. You don\'t know that nobody else would.',
    'You know how it looks to you. You don\'t know how it looks to them.',
    'You know it still stings. You don\'t know that it should have stopped.',
    'You know saying it feels risky. You don\'t know that it makes it worse.',
    'You know this is hard for you. You don\'t know that it is you.',
  ],

  /**
   * [DRAFT] Twelve activities for the hold, each with the line saying what it
   * is for. Three are the spec's worked examples. The line never claims a
   * mechanism: it says what it does for her.
   */
  activities: [
    { id: 'washing_up', label: 'Washing up', why: "Twenty minutes with your hands busy is the part that works. It isn't about the dishes." }, // [MAP]
    { id: 'walk', label: 'A walk', why: 'Moving while you wait is what stops the twenty minutes turning into rehearsal.' }, // [MAP]
    { id: 'shower', label: 'A shower', why: "You can't reach your phone in there. That's most of the benefit." }, // [MAP]
    { id: 'tidy', label: 'Tidying one surface', why: 'One finished thing, while the rest is unfinished. That is the whole point of it.' },
    { id: 'music', label: 'A song, loud', why: 'Something else to follow for three minutes. It does not have to be a calm one.' },
    { id: 'cook', label: 'Making something to eat', why: 'Your hands know this one, so your head gets to stop running it.' },
    { id: 'pet', label: 'The dog, the cat', why: 'Something that wants you and asks you nothing.' },
    { id: 'outside', label: 'Standing outside', why: 'A different set of things to look at. That is enough to interrupt it.' },
    { id: 'stretch', label: 'Stretching', why: 'Slow and physical, so the twenty minutes has a shape instead of a wait.' },
    { id: 'call', label: 'Ringing someone easy', why: 'Not the person this is about. Someone who is simple to talk to.' },
    { id: 'plants', label: 'Watering the plants', why: 'Small, finishable, and it does not matter if you do it badly.' },
    { id: 'shownothing', label: 'Sitting with a show on', why: 'The least active one, and still better than the phone in your hand.' },
  ],

  /**
   * [DRAFT] The gentle reframes, SMALL emotions only. She picks the one that
   * is true for her, which is PICK over a closed set: the model may eventually
   * rank these, never write one.
   *
   * PLACEHOLDER, and generic. The map wants roughly ten of these keyed to the
   * feeling word, so "angry" and "let down" do not get the same three lines.
   *
   * What they must not do, because this is the easiest beat in the flow to get
   * wrong:
   *   · not predict ("this will feel smaller tomorrow") — we cannot know
   *   · not minimise ("it is not that bad") — she rated it, we did not
   *   · not congratulate her for feeling less than someone else might
   */
  smallReframes: [
    'You are allowed to be annoyed by something small.',
    'Nothing about this needs deciding tonight.',
    'It can be real and still not be the whole evening.',
  ],

  /** [DRAFT] Eight anchors for the mixed lane. Good, not bespoke. */
  anchors: [
    'The peak is not the reading. It is just the loudest part.',
    'You do not have to decide what this means tonight.',
    'This has swung before and it came back down before.',
    'You are allowed to wait until you know more.',
    'Nothing needs answering in the next ten minutes.',
    'You can hold both: it might be real, it might be the swing.',
    'The version of this you believe at 2am is not the final one.',
    'You have been steadier than this and it was the same you.',
  ],

} as const;

/**
 * The two DV rules are DIFFERENT rules and must not be modelled as one flag.
 *
 *   confrontational  when the screen fires, these are removed from the
 *                    candidate array BEFORE ranking. Not softened, not
 *                    caveated: by the time an option is on screen the idea is
 *                    already in the room.
 *   universalLine    carries the universal line for EVERY woman, screen or no
 *                    screen. Only "say it to them" does.
 *
 * They are independent layers. The line catches the women the screen misses.
 * The suppression catches the women who read the line and do not apply it to
 * themselves, which in coercive relationships is common: recognising your own
 * situation in a general statement is usually the last thing to happen.
 */
export type Act = {
  id: string;
  rung: 'direct' | 'prep' | 'self' | 'gated';
  label: string;
  /** null means UNGRADED, and an ungraded act gets no science line, ever. */
  evidence: string | null;
  confrontational?: boolean;
  universalLine?: boolean;
  /** A stop and a referral. Never a chip in any topic. */
  gated?: boolean;
};

export const ACTS: readonly Act[] = [
  { id: 'A', rung: 'direct', label: 'Say it to them', evidence: 'assertiveness', confrontational: true, universalLine: true },
  { id: 'B', rung: 'direct', label: 'Ask for the thing', evidence: null, confrontational: true },
  { id: 'C', rung: 'direct', label: 'Hold a line', evidence: 'refusal', confrontational: true },
  { id: 'D', rung: 'direct', label: 'Own my part', evidence: 'recipient_only' },
  { id: 'E', rung: 'prep', label: 'Find out', evidence: null },
  { id: 'F', rung: 'prep', label: 'Get it ready', evidence: null },
  { id: 'G', rung: 'prep', label: 'Tell one person', evidence: 'listener_dependent' },
  { id: 'H', rung: 'prep', label: 'Get someone whose job it is', evidence: null },
  { id: 'I', rung: 'prep', label: 'Work out what i want', evidence: null },
  { id: 'J', rung: 'self', label: 'Take something off my plate', evidence: null },
  { id: 'K', rung: 'self', label: 'Let it be', evidence: null },
  { id: 'L', rung: 'self', label: 'Look after myself', evidence: null },
  { id: 'M', rung: 'gated', label: 'Get safe', evidence: null, gated: true },
];

/**
 * The three she is offered: always one direct, one preparatory, one
 * self-directed, so a confrontational option is never alone.
 *
 * `dvScreenFired` is the suppression, and it is an array filter running before
 * anything ranks or renders. A suppression that depends on a model choosing
 * correctly is not a suppression.
 */
export function offerableActs(dvScreenFired: boolean): Act[] {
  return ACTS.filter((a) => {
    if (a.gated) return false;
    if (dvScreenFired && a.confrontational) return false;
    return true;
  });
}

export function threeRungs(from: Act[]): Act[] {
  const pick = (rung: Act['rung']) => from.find((a) => a.rung === rung);
  return [pick('direct'), pick('prep'), pick('self')].filter((a): a is Act => a != null);
}

/**
 * Outcome lines. We offer, she chooses: where an act is weak FOR HER, the fix
 * is never to hide it, it is to say the honest outcome next to it and let her
 * weigh it. Hiding it is deciding on her behalf.
 */
export const OUTCOME = {
  // [MAP] verbatim
  G: "this helps most when they actually think it through with you. If they just agree with you, you'll feel better without much changing.",
  // [MAP] verbatim
  D: "this usually lands well with the person you hurt. It's less reliable at making you feel better, at least not straight away.",
} as const;

/**
 * [SAFETY] Shown to EVERYONE whenever "say it to them" is offered, not only
 * when the screen fires.
 *
 * Universal is the whole point. Shown only on a hit it is a disclosure: it
 * tells her the app has concluded she is being abused, on a device someone else
 * may be reading. Shown to every woman it discloses nothing, diagnoses nothing,
 * and reaches the women detection misses, which matters because the screen will
 * fail on real cases.
 *
 * It also asks her to assess nothing. That was the flaw in "only if you feel
 * safe with them" as a gate: coercive control distorts precisely that
 * judgement, and a woman being controlled often does believe she is safe.
 */
export const UNIVERSAL_DV_LINE =
  "worth knowing: confronting someone doesn't work when there's abuse in the picture. That's a different situation and it needs different help.";

/** What the flow says, per beat. */
export const COPY = {
  // --- entry -------------------------------------------------------------
  raw_entry: 'Tell me what happened', // [MAP]
  // Neha 2026-07-27, shortened from "Tell the issue in your words, let us work
  // on handling it together". Keeps both halves: her words, and that the next
  // part is shared. "Handle" rather than "fix", because the flow does not
  // promise to fix her situation.
  //
  // The middle sentence was added because the placeholder is the only place the
  // app can teach what kind of answer works. Everything downstream is built out
  // of HER sentence: the echo carves a clause from it, and the if-then trigger
  // is seeded from it. A concrete "what was said or done" gives both something
  // real to work with; "I feel terrible" gives them nothing.
  raw_entry_placeholder:
    "In your own words. What was said or done, and by whom. We'll handle it together.", // [NEHA]
  safe_check: 'Are you safe right now?', // [SAFETY]
  safe_yes: "I'm safe", // [SAFETY]
  safe_no: 'Not really', // [SAFETY]
  intensity_in: 'How big does it feel right now?', // [MAP]

  // --- naming ------------------------------------------------------------
  together: "You're not in this alone tonight.", // [MAP]
  // Neha 2026-07-27, replacing the map's "putting words to it settles it".
  // Better for two reasons beyond preference: it is an invitation rather than a
  // claim about what naming does to her, and it reads as the lead-in to the
  // question underneath it instead of a standalone assertion.
  naming_science: "Let's give this emotion a name.", // [NEHA]
  feelings_ask: 'Which of the emotions do you feel the most?', // [NEHA]
  feelings_other: 'Something else', // [DRAFT]
  feelings_other_hint: 'Your word for it.', // [DRAFT]
  // Her word in an authored sentence: a transform, not composition. The second
  // half is deliberately flat. Anything warmer here ("that makes sense", "no
  // wonder") is the app agreeing with a reading of her situation it cannot
  // actually have.
  // [DRAFT] The gentle line, SMALL emotions only. Placeholder, and the hardest
  // sentence in the flow to get right, so worth saying what it must not do:
  //   · not predict ("this will feel smaller tomorrow") — we cannot know
  //   · not minimise ("it is not that bad") — she rated it, we did not
  //   · not congratulate her for feeling less than someone else would
  // What it CAN honestly say is that naming a small one is often most of the
  // work, because that is the same claim the naming beat already makes.
  reframe_small_ask: 'Sometimes a different perspective helps. Do you think any of these is true?', // [NEHA]
  reframe_small_check: 'Does this help?', // [NEHA]
  reframe_small_yes: 'That helps', // [DRAFT]
  reframe_small_no: 'Not really', // [DRAFT]
  reframe_small_bigger: "It's bigger than that", // [DRAFT]
  feelings_why: 'Naming it is the part that takes the edge off. Picking roughly right is enough.', // [DRAFT]

  // --- body --------------------------------------------------------------
  // The body check (slept / moved / eaten) and its follow-ups were removed
  // 2026-07-27 at Neha's call: three questions between naming the feeling and
  // the lanes, before anything had helped her yet. The copy went with them.
  //
  // If it returns, the food leg needs the most care. It is unevidenced, the
  // app's own audit flags an unscreened food prompt as a risk with binge eating
  // elevated through the luteal phase, and "make sure you are not low on blood
  // sugar" is a physiology claim the voice rules ban outright.
  make_safe: "Let's make you feel safe", // [MAP]

  // --- high lane ---------------------------------------------------------
  high_breathe: 'In for four, out for six', // [MAP]
  high_breathe_why: 'The long out-breath is the part that does it. You do not have to feel anything shift.', // [DRAFT]
  high_more: 'Want three more?', // [MAP]
  high_howlong: 'How long have you got?', // [MAP]
  high_none: 'No time', // [MAP]
  high_few: 'A few minutes', // [MAP]
  high_twenty: 'Twenty minutes', // [MAP]

  /**
   * [SAFETY] On EVERY hold branch, not only the twenty minute one, because
   * thirty seconds is long enough to send a text. A hold without this protects
   * nothing.
   */
  hold_guard: "Don't act on this or send anything till the timer's up", // [SAFETY]

  /** [MAP] Approved 2026-07-27. The one exclamation point in the app. */
  hold_done: 'Yey! Twenty minutes, the hard part done.',
  /**
   * [MAP] Returning early. Do NOT offer to skip: an empty wait is rehearsal, so
   * fill it rather than sending her back to sit. "I'm ready now" stays
   * available, never greyed, never argued with.
   */
  hold_early: "You've got {left} left. Here's something to do with them.",
  hold_ready: "i'm ready now", // [MAP]

  high_cbt_stem: 'Which one is closest to what your head is saying?', // [MAP]
  arousal_check: 'Any better?', // [MAP]
  high_ladder: 'Want to try some other practices?', // [MAP]

  // --- low lane ----------------------------------------------------------
  low_activate: 'One small thing. Not a good one, just one.', // [DRAFT]
  low_why: 'Flat is the state where doing something works better than working out why. Small counts.', // [DRAFT]
  low_justone: 'Just the one, done is enough', // [MAP]
  low_better: 'Feeling better?', // [MAP]

  // --- mixed lane --------------------------------------------------------
  mixed_name_swing: 'Name the swing, trust no peak', // [MAP]
  mixed_validate: "It is swinging hard. That is the thing to ride, not the thing to solve.", // [DRAFT]
  mixed_swing_real: 'Does this feel like the swing, or like something real?', // [DRAFT]
  mixed_swing: "The swing", // [DRAFT]
  mixed_real_label: 'Something real', // [DRAFT]

  // --- the act -----------------------------------------------------------
  options: "There's no one right move here. Does any of these sound good?", // [MAP]
  options_why: 'Three, so you can recognise one instead of having to think one up.', // [DRAFT]
  options_more: 'Show me some others', // [MAP]
  options_none: 'None of these feel possible right now', // [MAP]

  // --- nothing feels possible --------------------------------------------
  unctrl_honor: "Then we're not fixing this tonight. That's a fair read.", // [MAP] + [DRAFT] tail
  unctrl_warmth: 'You came and looked at it. That was the hard part, and it counts.', // [DRAFT]
  unctrl_act: 'One small comfort, now. Warmth, food, a shower, music, the dog.', // [DRAFT]
  unctrl_door: 'It will be here tomorrow if you want it. No pressure either way.', // [DRAFT]

  // --- timing and close --------------------------------------------------
  time_it: 'When?', // [DRAFT]
  time_now: 'Now', // [MAP]
  time_tomorrow: 'Tomorrow', // [MAP]
  time_unsure: 'Not sure', // [MAP]

  today_action: 'If ______ happens, then I ______', // [MAP]
  today_action_why: 'A plan tied to a specific moment is the kind that actually fires. Vague ones do not.', // [DRAFT]

  we_good: 'We good?', // [MAP]
  intensity_out: 'And now?', // [MAP]
  close: 'You handled that. Go be in your evening.', // [MAP]
} as const;

export type CopyKey = keyof typeof COPY;
