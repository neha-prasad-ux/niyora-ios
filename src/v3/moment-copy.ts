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
   * UNUSED as of 2026-07-28: the CBT stem beat that picked from these was cut
   * (see moment-flow's hold section). Kept only as a record of the approach.
   * Do not re-wire without revisiting why it went: it is a menu of core
   * negative beliefs, and reframing is the weak tool at high arousal.
   *
   * [DRAFT] Ten stuck thoughts. The model ranks the three closest to her text.
   * Five are from the spec's worked example; five are mine and need review.
   */
  stems: [
    "He doesn't want me around anymore", // [MAP]
    "I did something wrong and I don't know what", // [MAP]
    'This is going to keep happening', // [MAP]
    "I'm too much for people", // [MAP]
    'Nobody actually chooses me', // [MAP]
    "I'm the only one trying here", // [DRAFT]
    "Everyone can see it except me", // [DRAFT]
    "I should be over this by now", // [DRAFT]
    "If I say something it gets worse", // [DRAFT]
    "There's something wrong with me", // [DRAFT]
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
   * [DRAFT] The hold activities, as cards (icon + short title). Cut from twelve
   * to SIX 2026-07-28 (Neha) — twelve was a wall to read while flooded. The six
   * kept are all OFF-PHONE and hands-busy, which is the mechanism: the hold
   * works by getting her away from the device and the impulse to send. The `why`
   * shows on the timer screen after she picks, so the grid stays a clean choice.
   *
   * Dropped (still fine, just less core): a song loud, standing outside,
   * stretching, ringing someone easy, watering the plants, sitting with a show.
   * `icon` is an SF Symbol.
   */
  activities: [
    { id: 'washing_up', label: 'Washing up', icon: 'drop.fill', why: "Twenty minutes with your hands busy is the part that works. It isn't about the dishes." }, // [MAP]
    { id: 'walk', label: 'A walk', icon: 'figure.walk', why: 'Moving while you wait is what stops the twenty minutes turning into rehearsal.' }, // [MAP]
    { id: 'shower', label: 'A shower', icon: 'shower.fill', why: "You can't reach your phone in there. That's most of the benefit." }, // [MAP]
    { id: 'cook', label: 'Make something', icon: 'frying.pan.fill', why: 'Your hands know this one, so your head gets to stop running it.' },
    { id: 'tidy', label: 'Tidy one surface', icon: 'sparkles', why: 'One finished thing, while the rest is unfinished. That is the whole point of it.' },
    { id: 'pet', label: 'The dog, the cat', icon: 'pawprint.fill', why: 'Something that wants you and asks you nothing.' },
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
 * The guided breath, as a script (Neha 2026-07-28). The screen walks it: the
 * moon is the breath ball, `inhale`/`exhale` steps pace it (in for four, out for
 * six) and their copy changes through the cycle; `count` steps mark the rounds
 * down between breaths; `intro` opens it. Three rounds, the last one shortened
 * to near-silence, then the flow moves on. She can leave any time via the one
 * quiet "skip, I'm breathing calmly" button.
 *
 * The stretched vowels ("deeeeply") are deliberate texture, not typos: the word
 * is as long as the breath it asks for. [NEHA] throughout.
 */
export type BreathStep = { kind: 'intro' | 'inhale' | 'exhale' | 'count'; text: string };

export const BREATH_SCRIPT: readonly BreathStep[] = [
  { kind: 'intro', text: "Let's take a deep breath" },
  { kind: 'inhale', text: 'Inhale deeeeply' },
  { kind: 'exhale', text: 'Now, exhale slowly… really slow' },
  { kind: 'count', text: 'Just two more' },
  { kind: 'inhale', text: 'Inhale deeeeply' },
  { kind: 'exhale', text: 'Now, exhale slowly… really slow' },
  { kind: 'count', text: 'Last one' },
  { kind: 'inhale', text: 'Inhale…' },
  { kind: 'exhale', text: 'Exhale…' },
] as const;

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
  /**
   * How "do it now" is carried out on the when-page. 'message' opens the iOS
   * Messages compose (blank — she writes and sends; the app never drafts or
   * sends). Absent means the act is hers to do off-app, so "now" just moves the
   * flow on without opening anything.
   */
  channel?: 'message';
};

export const ACTS: readonly Act[] = [
  { id: 'A', rung: 'direct', label: 'Say it to them', evidence: 'assertiveness', confrontational: true, universalLine: true, channel: 'message' },
  { id: 'B', rung: 'direct', label: 'Ask for the thing', evidence: null, confrontational: true, channel: 'message' },
  { id: 'C', rung: 'direct', label: 'Hold a line', evidence: 'refusal', confrontational: true },
  { id: 'D', rung: 'direct', label: 'Own my part', evidence: 'recipient_only' },
  { id: 'E', rung: 'prep', label: 'Find out', evidence: null },
  { id: 'F', rung: 'prep', label: 'Get it ready', evidence: null },
  { id: 'G', rung: 'prep', label: 'Tell one person', evidence: 'listener_dependent', channel: 'message' },
  { id: 'H', rung: 'prep', label: 'Get someone whose job it is', evidence: null },
  { id: 'I', rung: 'prep', label: 'Work out what I want', evidence: null },
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
  G: "This helps most when they actually think it through with you. If they just agree with you, you'll feel better without much changing.",
  // [MAP] verbatim
  D: "This usually lands well with the person you hurt. It's less reliable at making you feel better, at least not straight away.",
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
  // --- intro / welcome ---------------------------------------------------
  // The three states previewed as cards before the first question (Neha
  // 2026-07-29), each in its own flow colour. Titles come from the phase labels
  // (Reflect / Regulate / Respond); these are the sub-lines.
  // An encouraging lead over the three step cards, so the first screen invites
  // rather than just lists. [DRAFT] awaiting Neha's voice.
  intro_head: "Let's work through this together", // [DRAFT] 2026-07-30
  intro_lead: "Three steps, and I'm with you for each one.", // [DRAFT] 2026-07-30
  intro_reflect: 'Explore your emotions', // [NEHA] 2026-07-29
  intro_regulate: 'Feel safe & stable', // [NEHA] 2026-07-29
  intro_respond: 'Respond thoughtfully to situations', // [NEHA] 2026-07-29
  intro_brand: 'with Moon AI', // [NEHA] 2026-07-29
  intro_cta: 'Think with me', // [NEHA] 2026-07-29
  // Snackbar shown when she taps "Later" on her chosen move: it is parked on
  // Today and the flow continues to the rating, rather than dumping her out.
  added_today: 'Added to today', // [NEHA] 2026-07-30

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
  // The echo confirm (Neha 2026-07-28): the moon says her words back, and she
  // says whether it landed before anything moves on. "No" opens a field to say
  // it again; only "yes" reveals the naming.
  ack_confirm: 'Did I get that right?', // [DRAFT]
  ack_yes: "Yes, that's it", // [DRAFT]
  ack_no: 'No, not quite', // [DRAFT]
  ack_fix: 'Tell me again, in your words.', // [DRAFT]

  together: "You're not in this alone tonight.", // [MAP]
  // Neha 2026-07-27, replacing the map's "putting words to it settles it".
  // Better for two reasons beyond preference: it is an invitation rather than a
  // claim about what naming does to her, and it reads as the lead-in to the
  // question underneath it instead of a standalone assertion.
  naming_science: "Let's give this emotion a name.", // [NEHA]
  feelings_ask: 'Which feeling is strongest?', // [NEHA] shortened 2026-07-28
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
  // Split in two: the moon says the first part, then a rule, then the question
  // sits smaller underneath it. One sentence carried both a statement and a
  // question, which made the question easy to skim past.
  // The group marker over the AI-written readings (the "moon voice" token).
  reframe_moon_label: "The moon's read", // [DRAFT]
  reframe_small_intro: 'Sometimes a different perspective helps.', // [NEHA]
  reframe_small_ask: "Wait, let's think. Is any of this true?", // [NEHA] 2026-07-29
  // A quiet label under the ask: these are angles to weigh, not claims. The word
  // "true" in the ask already carries that she is the one judging them.
  reframe_small_angles: 'The same situation, from a few angles:', // [NEHA] 2026-07-29
  // The way out of the pick. Without it the only way forward is to endorse one
  // of three readings, and a woman who believes none of them either picks the
  // least wrong one, which corrupts the answer, or leaves.
  reframe_small_none: 'None of these are true', // [NEHA] 2026-07-29
  reframe_small_check: 'Are you feeling any better?', // [NEHA] 2026-07-29
  // Not "reframe" (our word, not hers) and not a claim about her body: a soft,
  // hedged reason for asking her to try another angle at all.
  reframe_small_why: 'Sometimes we lock onto one version of it, and seeing another angle helps.', // [NEHA] 2026-07-29
  reframe_small_yes: 'Yes, I am', // [NEHA] 2026-07-29
  // The middle answer, so she is never cornered into claiming it helped or that
  // it did nothing. It lands the same as "yes": the closing rating reads the delta.
  reframe_small_little: 'A little bit', // [NEHA] 2026-07-29
  reframe_small_no: 'Not really', // [NEHA] 2026-07-29
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
  /**
   * The hold. Neha's beat, 2026-07-27, replacing the map's "let's make you feel
   * safe". Three deliberate departures from the drafted wording:
   *
   * 1. NO PERSON. The draft said "reacting to your husband". The app does not
   *    know she has one; she may have written about a manager, her sister, a
   *    friend. Naming a relationship she did not name is the invented-detail
   *    failure the whole grounding module exists to prevent, and it is the one
   *    she is least able to catch because it reads plausibly and is about her
   *    own life. If we ever want a person here it must be lifted from her own
   *    sentence, never supplied.
   * 2. NO PHYSIOLOGY CLAIM. "Emotions take 20 minutes to wind off" is stated as
   *    fact and is not quite what the evidence says: the twenty-minute reset
   *    holds with ACTIVE DISTRACTION, and an empty wait is rehearsal. So the
   *    line says what the wait does for her instead of what her body does.
   * 3. NO "IT IS NOT THE BEST THING TO DO". We offer and she chooses; the app
   *    cannot see her situation well enough to rank her options for her.
   */
  // Reframed as a challenge 2026-07-28 (Neha): a game to beat, not a warning to
  // heed. The stakes are hers, the win is holding off.
  make_safe_intro: 'Beat the urge to react challenge', // [NEHA] 2026-07-29
  // Body prep, before the challenge (Neha 2026-07-30). A self-check she ticks,
  // not a food or blood-sugar prompt: the "why" lines are gentle self-care, they
  // name no physiology mechanism and never say "eat now". See the note atop the
  // make_safe block on why an unscreened food prompt was pulled; keep it a
  // self-check. Items live in MAKE_SAFE_BODY below.
  make_safe_care_intro: 'Body prep', // [NEHA] 2026-07-30
  make_safe_care_ask: 'Check everything that is true.', // [NEHA] 2026-07-30
  // Shown only while the three are not all ticked: the honest way out when her
  // body is not ready, so the gate never traps her into ticking something false.
  make_safe_care_defer: 'I will come back to this later', // [NEHA] 2026-07-30
  make_safe_why: "Let's distract ourselves, then respond to the situation.", // [NEHA] 2026-07-29
  make_safe_ask: 'Do you want to react now?', // [NEHA] (unused since the challenge reframe)
  // Both un-shamed, and the skip is now framed as a valid state rather than a
  // failure: "I am calm to respond now" (Neha, 2026-07-29) says she is ready to
  // respond, not that she failed to wait. It still routes past the hold.
  make_safe_wait: 'Yey! I am ready', // [NEHA] 2026-07-29
  make_safe_now: 'I am calm to respond now', // [NEHA] 2026-07-29
  // The settling menu (Neha 2026-07-29): four ways to fill the wait, done in any
  // order, none required. "I am ready to respond" is the un-shamed exit.
  activities_intro: "Let's settle first. Do as many as you like.", // [NEHA] 2026-07-29
  activities_colour: 'Colour & share', // [NEHA] 2026-07-29
  activities_story: 'A story', // [NEHA] 2026-07-29
  activities_move: 'Move your body', // [NEHA] 2026-07-29
  // Wind Down (Neha 2026-07-30): the existing guided calm exercise (voice +
  // captions, the /session wind-down technique), not the plain paced breath.
  activities_breath: 'Wind down', // [NEHA] 2026-07-30
  activities_ready: 'I am ready to respond', // [NEHA] 2026-07-29

  // --- high lane ---------------------------------------------------------
  // One long exhale, for everyone, before the hold. Count only: the map's rule
  // is no vagus claim, and "the long out-breath is the part that does it" is
  // already at the edge of one, so it says what to do rather than what it does.
  // The breath is a guided sequence now (BREATH_SCRIPT, below the SETS block),
  // with the moon as the breath ball, three paced rounds and one quiet exit
  // (Neha 2026-07-28). The old single line + "two more rounds?" fork is gone.
  breathe_skip: "Skip, I'm breathing calmly", // [NEHA]
  // The "how long have you got?" beat was removed 2026-07-28 (see moment-flow's
  // hold section): the button that reaches the hold already says "twenty
  // minutes", so this asked what she had just answered. Copy kept, unwired, in
  // case the short-hold fillers ever return.
  high_howlong: 'How long have you got?', // [MAP]
  high_none: 'No time', // [MAP]
  high_few: 'A few minutes', // [MAP]
  high_twenty: 'Twenty minutes', // [MAP]

  // The pick that fills the hold. No copy existed for it: the map has the
  // twelve activities but never the line that asks her to choose one.
  high_pick_activity: 'Pick one thing to do with the time.', // [DRAFT]
  // Why picking beats waiting. Sanctioned framing: the twenty-minute reset
  // holds with active distraction, and an empty wait is rehearsal — so the line
  // says what having something to do is FOR, not what her body is doing.
  high_pick_activity_why:
    'Not an empty wait. Something to do with your hands is what keeps the twenty minutes from turning into going over it again.', // [DRAFT]

  /**
   * [SAFETY] On EVERY hold branch, not only the twenty minute one, because
   * thirty seconds is long enough to send a text. A hold without this protects
   * nothing.
   */
  // The hold's safety instruction, reworded by Neha 2026-07-28. Still the load-
  // bearing line (don't act during the wait); the benefit sits under it.
  hold_guard: "Don't react to the situation for 20 minutes.", // [NEHA]
  hold_guard_benefit: 'This gives you time to be your best.', // [NEHA]

  /** [MAP] Approved 2026-07-27. The one exclamation point in the app. */
  hold_done: 'Yey! Twenty minutes, the hard part done.',
  /**
   * [MAP] Returning early. Do NOT offer to skip: an empty wait is rehearsal, so
   * fill it rather than sending her back to sit. "I'm ready now" stays
   * available, never greyed, never argued with.
   */
  hold_early: "You've got {left} left. Here's something to do with them.",
  hold_ready: "I'm ready now", // [MAP]

  // high_cbt_stem and high_ladder were CUT 2026-07-28 (see moment-flow's hold
  // section): the stuck-thought menu and the "other practices" loop went with
  // the CBT reframe. Copy kept, unwired.
  high_cbt_stem: 'Which one is closest to what your head is saying?', // [MAP] (cut)
  high_ladder: 'Want to try some other practices?', // [MAP] (cut)
  // The post-hold readiness rating, replacing "Any better?" (Neha 2026-07-28).
  arousal_check: 'Do you think you are now in a better place to react?', // [NEHA]
  arousal_check_low: 'Not yet', // [DRAFT]
  arousal_check_high: 'Ready', // [DRAFT]
  // Shown when she rates the readiness check low. Permission, not a block: the
  // act menu still follows, with "none of these feel possible" as the way out.
  arousal_check_wait: "If you feel like you're not in the space to respond, don't. We can wait.", // [NEHA]

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

  // Interim line for the `ready_reward` beat: the light/celebration itself is
  // deferred with the reward system, so this just bridges settle -> what to do.
  ready_reward: 'The settling is done. Now, what you might do.', // [DRAFT]

  // --- the act -----------------------------------------------------------
  // Neha 2026-07-29: leads with the doing ("let's respond") and reassures with
  // no-right-answer, which is the same sense the old line carried, reworded.
  options: "Let's respond to the situation. Does any of these look good?", // [NEHA] 2026-07-29
  options_why: 'There is no right or wrong move here.', // [NEHA] 2026-07-29
  options_more: 'Show me some others', // [MAP]
  options_none: 'None of these feel possible right now', // [MAP]

  // The "when" page (Neha 2026-07-29): her chosen move at the top, then when to
  // do it. "Now" carries it out (opens Messages for a message act); "later"
  // steps out to Today; "another" reopens the menu. Order is hers.
  act_now: 'I will do it now', // [NEHA] 2026-07-29
  act_later: 'Later', // [NEHA] 2026-07-29
  act_another: "Let's try another option", // [NEHA] 2026-07-29

  // The draft step (Gemini): when she picks "now", the moon writes a start she
  // can change, then send or do. All [DRAFT], awaiting Neha's voice.
  act_draft_hint: 'A start, in your words. Change anything.', // [DRAFT]
  act_draft_loading: 'Writing you a start', // [DRAFT]
  act_draft_change_ph: 'Tell the moon what to change', // [DRAFT] (unused since M19 buttons)
  act_draft_change: 'Edit with Moon', // [DRAFT] label over the quick-rewrite chips
  act_draft_send: 'Open in Messages', // [DRAFT]
  act_draft_do: 'I will do this', // [DRAFT]
  act_draft_skip: 'Skip, I have got it', // [DRAFT]

  // Shown ONLY when she rated it high and chose to act now without the hold.
  // An offer above the acts, never a wall in front of them: she can still pick
  // an act right below it. Says what the distance is FOR, does not shame the
  // choice to skip it, and does not rank her options. [DRAFT] awaiting Neha.
  options_hold_nudge:
    'You rated this a big one. Whatever you pick will keep till you have twenty minutes between you and it.', // [DRAFT]
  options_hold_take: 'Take twenty minutes first', // [DRAFT]

  // Shown after she picks "say it to them", on its own screen, carrying the
  // universal DV line below it. A plain lead-in, not a warning label. [DRAFT].
  options_dv_head: 'Before you do, one thing worth knowing.', // [DRAFT]

  // --- nothing feels possible --------------------------------------------
  // Merged 2026-07-28 (Neha) into one moon line: not fixing it tonight is fair,
  // looking at it counts, one small kind thing now. The old separate beats
  // (unctrl_warmth "you came and looked... it counts", unctrl_act "one small
  // comfort...", unctrl_door "it will be here tomorrow") were four reassurances
  // in a row where the honest answer to "nothing is possible" is one.
  unctrl_honor:
    "We're not fixing this tonight, and that's a fair call. You looked at it, which was the hard part. Do one small kind thing now, and let the rest keep.", // [DRAFT]

  // --- the if-then -------------------------------------------------------
  // "Fill in to remember" (Neha 2026-07-29): a coping if-then she keeps for the
  // next time the same anxiety hits, filled with the move she just chose. The
  // old "If ___ happens, then I ___" double-blank folded into this: the trigger
  // is fixed ("if I feel anxious for this reason"), she fills only the response.
  // The when-page (act_*) replaced the old time_it beat (now / tomorrow / not
  // sure).
  today_action_head: 'Fill in to remember', // [NEHA] 2026-07-29
  today_action_if: 'If I feel anxious for this reason, then I will', // [NEHA] 2026-07-29
  today_action_hint: 'what you will do', // [DRAFT]
  today_action_why: 'A plan tied to a specific moment is the kind that actually fires. Vague ones do not.', // [DRAFT]

  // --- close -------------------------------------------------------------
  // `we_good` was merged into the closing rating 2026-07-28 (Neha): the number
  // she gives IS the "we good", so a separate yes/no page asked the same thing
  // twice. "Not yet" is how she asks for something she has not tried.
  intensity_out: 'And now?', // [MAP]
  intensity_out_not_yet: 'Not yet, show me something else', // [NEHA] approved 2026-07-28

  // The one celebration in the app (Neha 2026-07-29): a wrapped gift opens into
  // a scratch card, she scratches it to reveal an earned character, and it is
  // saved to her Soul. It rewards a hard act completed, never a feeling or a
  // score. "The Space Mover" names what she did — made space between the feeling
  // and the reaction. Name is a placeholder ("or something", Neha).
  close_congrats: 'You handled that.', // [NEHA] 2026-07-29
  close_gift: 'A little something for you.', // [DRAFT]
  close_gift_cta: 'Open it', // [DRAFT]
  close_scratch: 'Scratch to reveal', // [DRAFT]
  close_badge_name: 'The Space Mover', // [DRAFT] placeholder name
  close_badge_why: 'You made space between the feeling and the reaction.', // [DRAFT]
  close_saved: 'Saved to your Soul.', // [DRAFT]
  close_done: 'Done', // [DRAFT]
} as const;

export type CopyKey = keyof typeof COPY;

// The Body prep checklist on the make_safe challenge screen (Neha 2026-07-30).
// Three things she confirms are true before the hold. The "why" (examples) is
// deliberately gentle self-care, not physiology: no mechanism, no "eat now", no
// blood-sugar claim — the same guard rails that pulled the earlier food prompt.
export const MAKE_SAFE_BODY: readonly { id: string; label: string; examples: string }[] = [
  {
    id: 'fed',
    label: 'You are not hungry',
    examples: 'It is easier to stay steady when your body is looked after.',
  },
  {
    id: 'rested',
    label: 'You are not tired',
    examples: 'Rested, you have more room to respond, not just react.',
  },
  {
    id: 'slept',
    label: 'You had a sound sleep',
    examples: 'Good sleep makes the day feel more manageable.',
  },
];
