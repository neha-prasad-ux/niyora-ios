// The in-the-moment flow, as data.
//
// This is a transcription of the canonical map (rev 2026-07-25), NOT an
// evolution of the shipped rough-moment arc. That arc came from an earlier idea
// and grew a hand-coded chain of callbacks, which is why it could not be
// extended without re-importing its own assumptions. Two of its beats
// (`pattern`, `change`) exist in no spec at all and survived purely because
// each change started from the code instead of the map.
//
// So the graph is a table. The screen is an interpreter over it. Adding a beat
// is a row; changing an order is a field. That also makes the flow testable
// against the spec rather than against itself.
//
// OWNERSHIP is the load-bearing column. The model may echo, pick or transform.
// It may never compose. Anything it cannot do by those three verbs is authored
// copy, written once, fixed forever.
//
//   echo      her sentence back, no new content words        (77% on device)
//   pick      rank a closed authored set, never write one    (a list op)
//   transform a mechanical rewrite of her own sentence       (correct by construction)
//   authored  fixed copy
//   she       her words in her slots
//   safety    verbatim, never generated, never explained
//   ui        a control: a field, a scale, a timer, a breath
//   reward    light (moon-reward-spec)
//   branch    a fork
//
// Safety suppressions are ARRAY FILTERS that run before generation, never
// caveats added after. By the time an option is on screen the idea is already
// in the room.

export type Owner =
  | 'echo'
  | 'pick'
  | 'transform'
  | 'authored'
  | 'she'
  | 'safety'
  | 'ui'
  | 'reward'
  | 'branch';

export type NodeId =
  // entry
  | 'intro'
  | 'raw_entry'
  | 'safe_check'
  | 'crisis_handoff'
  // naming
  | 'clarify'
  | 'acknowledge'
  | 'together'
  | 'naming_science'
  | 'feelings'
  | 'reflect'
  // settle
  | 'breathe'
  // the hold
  | 'make_safe'
  | 'lane_split'
  | 'activities'
  | 'arousal_check'
  // mixed lane
  | 'mixed_name_swing'
  | 'mixed_validate'
  | 'mixed_check_read'
  | 'mixed_swing_real'
  | 'mixed_real'
  | 'mixed_anchor'
  // the act
  | 'ready_reward'
  | 'options'
  | 'act'
  // nothing feels possible
  | 'unctrl_honor'
  // timing and close
  | 'sendoff'
  | 'close';

// Three states, named for what the app does in each (Neha 2026-07-28): reflect
// (what happened, name it, reframe), regulate (breath, hold, the wait), react
// (what to do, the message, close). They double as the progress map she sees,
// so she always knows where she stands and that this goes somewhere. `the plan`
// folded into `react`.
export type Phase = 'reflect' | 'regulate' | 'react';

export type FlowNode = {
  id: NodeId;
  owner: Owner;
  /** Which of the four progress phases this beat sits in. The bar names phases
   *  rather than counting steps, because the flow branches and a bar that lies
   *  is worse than no bar. */
  phase: Phase;
  /** The corpus slot, for model beats only. Beat names are ours; slot names are
   *  what the fine-tune was trained on. Absent => never calls the model. */
  slot?: string;
  /** Straight-line successor. Absent when `branches` decides, or when terminal. */
  next?: NodeId;
  /** Forks. `when` is the branch key the screen resolves. */
  branches?: { when: string; next: NodeId }[];
  /** Nothing follows: the session ends here. */
  terminal?: boolean;
  /** What this beat is for, in her terms, shown at choice points and faded
   *  after about three exposures. Never on safety beats: an explanation there
   *  reads as persuasion, and we do not persuade her about her own safety. */
  why?: boolean;
  note?: string;
};

/**
 * The graph. Order in this array is documentation only; `next` and `branches`
 * are the truth, and the test asserts every edge lands somewhere real.
 */
export const MOMENT_FLOW: FlowNode[] = [
  // --- entry ---------------------------------------------------------------
  {
    id: 'intro',
    owner: 'authored',
    phase: 'reflect',
    next: 'raw_entry',
    note: 'The 3-beat Reflect / Regulate / Respond preview, shown once at flow start so she knows the shape (INTRO_BEATS). Was skipped 2026-07-31; brought back 2026-08-09 with the reflect-card rebuild.',
  },
  {
    id: 'raw_entry',
    owner: 'ui',
    phase: 'reflect',
    next: 'clarify',
    note: 'Free text. Asks for an EVENT, not a feeling. The crisis scan runs on this and on every later message, before the model and before anything is held. A clear entry goes straight to the echo (acknowledge); a thin one clarifies first. The upfront 0-10 rating was cut 2026-08-09 (felt arbitrary/boring).',
  },
  {
    id: 'safe_check',
    owner: 'safety',
    phase: 'reflect',
    branches: [
      { when: 'safe', next: 'clarify' },
      { when: 'not_safe', next: 'crisis_handoff' },
    ],
    note: 'Only on an ambiguous scan hit. Never explained.',
  },
  {
    id: 'crisis_handoff',
    owner: 'safety',
    phase: 'reflect',
    terminal: true,
    note: 'STOPS the flow. Counts as a completed session for the badge: every ending counts except abandonment.',
  },
  // --- naming --------------------------------------------------------------
  {
    id: 'clarify',
    owner: 'echo',
    phase: 'reflect',
    slot: 'clarify',
    next: 'acknowledge',
    note: 'Only when her entry is thin. Asks for the concrete thing using her own words, then it is said back (acknowledge).',
  },
  {
    id: 'acknowledge',
    owner: 'echo',
    phase: 'reflect',
    slot: 'acknowledge',
    next: 'together',
    note: 'The one beat measured working on device. Never her read of his intent.',
  },
  { id: 'together', owner: 'authored', phase: 'reflect', next: 'naming_science' },
  {
    id: 'naming_science',
    owner: 'authored',
    phase: 'reflect',
    next: 'feelings',
    note: 'Putting words to it settles it. No "research says", no mechanism claim.',
  },
  {
    id: 'feelings',
    owner: 'pick',
    phase: 'reflect',
    slot: 'feelings',
    next: 'reflect',
    why: true,
    note: 'Three from the 22 approved words. Ranking a list already written, so a suppression is an array filter. Rendered inside acknowledge as the AI feeling GUESS (Moon proposes, she confirms), skipped when she already named a feeling in her text.',
  },
  // name_reward and feel_heard were removed 2026-07-28 (Neha): the screen has
  // always jumped from the merged acknowledge card straight to the reframe, so
  // both were dead nodes. name_reward also broke the celebration rule -- naming
  // a feeling is not a hard act, and light is for acts, not states -- and
  // feel_heard was a second echo on top of the one acknowledge already carries.
  {
    id: 'reflect',
    owner: 'authored',
    phase: 'reflect',
    why: true,
    next: 'make_safe',
    note: 'The reflect-card system (2026-08-09), replacing the old late-arriving reframe. detectSignals + routeCards order a set of REFLECT_CARDS; the screen shows one at a time. draft/guess cards are AI-drafted (per-card slot, called via reflectCard/compose — owner stays authored because it is a draft she rules on, never an asserted fact, exactly like the old reframe); question cards echo HER words with no AI call. An additive "no" walks to the next card; a reality "no" backs off and validates and STOPS. Any acceptance, validation or exhaustion converges on make_safe (regulate). EVERYONE reaches it, and it is now the FIRST thing after naming, not the fifth screen.',
  },

  // --- settle ---------------------------------------------------------------
  //
  // The body check (slept / moved / eaten and their follow-ups) was REMOVED
  // 2026-07-27 at Neha's call. It sat between naming the feeling and the lanes
  // and asked three questions before anything had helped her yet. What went
  // with it: body_check, body_ask_soon, body_eat, body_do_now,
  // body_today_action, body_tired, body_reward.
  //
  // Worth knowing if it comes back: the sleep leg was the best-evidenced thing
  // in this beat (day-to-day sleep and fatigue moved the regulation biomarker
  // where cycle phase showed no population rhythm at all), and the food leg was
  // the one with nothing under it.
  // A guided exhale sequence 2026-07-28 (Neha): the moon becomes the breath
  // ball, three paced rounds with copy that changes through each inhale/exhale
  // (BREATH_SCRIPT in moment-copy), a light tick at every turn. It runs the
  // three and moves on, or she leaves early with the one quiet "skip, I'm
  // breathing calmly" button. No "two more rounds?" fork any more -- both the
  // finished sequence and the skip land on the hold.
  {
    id: 'breathe',
    owner: 'ui',
    phase: 'regulate',
    why: true,
    next: 'activities',
    note: 'In for four, out for six, so the exhale is the long half. Count only, no vagus claim. The settling breath on the regulate path: make_safe "wait" (she chose to settle) leads here, then on to the settling menu. Regulate is optional now — only if she picks it at the SETTLE gate.',
  },
  {
    id: 'make_safe',
    owner: 'authored',
    phase: 'regulate',
    why: true,
    branches: [
      { when: 'wait', next: 'breathe' },
      { when: 'now', next: 'lane_split' },
    ],
    note: 'The SETTLE gate (2026-08-09): "want a moment to settle before you respond?". Regulate is optional and tied to responding. "Yes" (wait) takes the settling breath then the menu; "no" (now) goes straight to responding. Names no person: the draft said "your husband" and the app does not know she has one. Says what the wait does FOR HER rather than what her body does, because the twenty-minute reset holds with active distraction and an empty wait is rehearsal. Both answers are un-shamed. "Wait" opens the settling menu (`activities`): ways to fill the wait, none forced, "I am ready to respond" the exit — then the readiness check. "Now" jumps to deciding the reaction, not to a 1-vs-5-minute fork.',
  },
  // The LANE SPLIT and the low and mixed lanes were removed 2026-07-27 at
  // Neha's call. make_safe now goes straight to the hold or straight to the
  // menu, so there was no longer a fork to route them from.
  //
  // What went: lane_split, high_reward1, and the whole low lane (one small
  // engaging act, since the flat need an act most rather than least) and mixed
  // lane (name the swing, check the read, an anchor — with the rule that she
  // sorts swing-from-real and we do not argue either way).
  //
  // The HIGH lane's hold survives, because "wait twenty minutes" needs it.

  {
    id: 'lane_split',
    owner: 'branch',
    phase: 'regulate',
    branches: [
      { when: 'high', next: 'options' },
      { when: 'low', next: 'activities' },
      { when: 'mixed', next: 'mixed_name_swing' },
    ],
    note: 'NOT A PAGE (Neha, 2026-07-27). She is never asked which lane she is in: it is derived from the feeling she already named. High (wound up) goes straight to respond; low (flat/shut down) reuses the built `activities` menu as its behavioral-activation step (Neha 2026-08-01 — "use what we built in the high lane"): one small engaging thing lifts a flat state, and it reuses a menu she already has rather than a text-only stub (the old low_activate chain was removed). Cycle phase is context here, never a fork.',
  },

  // --- the hold: a menu of ways to settle -----------------------------------
  //
  // After "Yey, I'm ready" she lands on `activities` (Neha 2026-07-29): a small
  // menu of ways to settle — colour & share (the Polaroid card, /paint), a
  // wholesome real-life story (/story), move your body (/move: go out of the
  // room, breathe, come back), and a breath (/breathe). Each is a full-screen
  // route she does and marks done (src/lib/hold-activities.ts); she can do as
  // many as she likes. "I'm ready to respond" is ALWAYS there, un-shamed, and it
  // is what advances the flow. This replaced the direct-to-colouring hold and the
  // 20-minute timer (a countdown over a make-something-nice task read as
  // pressure). make_safe "wait" and options "take_hold" both enter here.
  {
    id: 'activities',
    owner: 'authored',
    phase: 'regulate',
    next: 'arousal_check',
    note: 'The settling menu. Four ways to fill the wait, done in any order, none required; "I am ready to respond" is the un-shamed exit that moves the flow on. Not a timer, not a single forced task. Goes STRAIGHT to the readiness check now (Neha 2026-07-29): the old high_timer_end "twenty minutes done" celebration was cut from here, because the one celebration in the app moved to the very end (the scratch-card reward at close). A mid-flow "yey, hard part done" competed with that and rewarded the wait rather than the whole act.',
  },
  // The CBT stem + matched reframe (high_cbt_stem / high_cbt_reframe) were CUT
  // 2026-07-28 (Neha). Two reasons that compound: (1) reframing is the weak
  // tool at high arousal -- the evidence favours distance/distraction, which is
  // what the hold already is, so a second reframe argues against the flow's own
  // logic; (2) it offered a menu of ten pre-written negative beliefs, a
  // rumination list that also handed her the exact core beliefs the app is
  // careful never to echo. Asking her to reframe instead was redundant: we
  // already have her problem statement from the entry. The hold IS the
  // intervention for the big emotion; after it, straight to "any better?".
  // After the hold, she rates whether she is in a better place to react. A
  // rating, not a yes/no (Neha 2026-07-28): the hold is the intervention and
  // this reads whether it landed, then straight to the act menu. There is no
  // closing rating any more (removed 2026-08-01); the flow ends on the sendoff.
  {
    id: 'arousal_check',
    owner: 'ui',
    phase: 'regulate',
    next: 'options',
    note: '"Do you think you are now in a better place to react?" She rates it, then goes to what to do. high_ladder (the "want other practices?" loop) was cut with the CBT beat -- an empty offer that also implied she was failing her way up a ladder.',
  },


  // --- low lane ------------------------------------------------------------
  // The low lane now REUSES the built `activities` menu (lane_split low →
  // activities) as its behavioral-activation step, so the old skeletal beats
  // (low_activate → low_justone → low_reward → low_better) were removed
  // 2026-08-01 (Neha, "use what we built in the high lane"). If the low lane
  // ever wants ACTIVATION-specific content (engaging, not soothing) distinct from
  // the settling menu, it gets its own beat then — but a menu it already has beats
  // a text-only stub.

  // --- mixed lane ----------------------------------------------------------
  { id: 'mixed_name_swing', owner: 'authored', phase: 'regulate', next: 'mixed_validate' },
  { id: 'mixed_validate', owner: 'authored', phase: 'regulate', next: 'mixed_check_read' },
  {
    id: 'mixed_check_read',
    owner: 'echo',
    phase: 'regulate',
    slot: 'mixed_check_read',
    next: 'mixed_swing_real',
  },
  {
    id: 'mixed_swing_real',
    owner: 'branch',
    phase: 'regulate',
    branches: [
      { when: 'swing', next: 'mixed_anchor' },
      { when: 'real', next: 'mixed_real' },
    ],
    note: 'She sorts it and we do not argue either way. The beat that de-weighted her read is removed: it could talk a woman out of an accurate read of someone genuinely pulling away, or genuinely unsafe.',
  },
  {
    id: 'mixed_real',
    owner: 'echo',
    phase: 'regulate',
    slot: 'mixed_real',
    next: 'mixed_anchor',
    note: 'May restate, never endorse.',
  },
  {
    id: 'mixed_anchor',
    owner: 'authored',
    phase: 'regulate',
    next: 'ready_reward',
    note: 'Eight authored anchors. An anchor she can hold does not need to be bespoke, it needs to be good.',
  },

  // --- the act -------------------------------------------------------------
  { id: 'ready_reward', owner: 'reward', phase: 'react', next: 'options' },
  {
    id: 'options',
    owner: 'pick',
    phase: 'react',
    slot: 'controllability',
    why: true,
    branches: [
      { when: 'picks', next: 'act' },
      { when: 'take_hold', next: 'activities' },
      { when: 'none_possible', next: 'unctrl_honor' },
    ],
    note: 'Three acts from the closed set of 13, always one direct, one preparatory, one self-directed, her nouns filled in. A menu, not a diagnosis: we stopped assessing whether her situation is fixable and started asking what she wants to do. The DV screen removes confrontational acts from the candidate array BEFORE ranking, and the universal line ships with "say it to them" for everyone, not only on a screen hit. `take_hold` is the offer shown ONLY when she rated it high AND chose to act now without the twenty-minute hold: a real path back into the hold, never a wall in front of the acts (Neha, 2026-07-28).',
  },
  {
    id: 'act',
    owner: 'she',
    phase: 'react',
    branches: [
      { when: 'now', next: 'sendoff' },
      { when: 'later', next: 'sendoff' },
      { when: 'another', next: 'options' },
    ],
    note: 'The "when" page (Neha 2026-07-29): her chosen move, and three replies — do it now, later, try another. "Now" DOES the thing (for a message act it opens the iOS share sheet), then goes STRAIGHT to the closing rating — the if-then "Fill in to remember" was removed 2026-08-01 (Neha) as confusing after she had already acted. "Later" SAVES the move to Today, shows an "Added to today" snackbar, and continues to the closing rating. "Another" goes back to the menu.',
  },

  // --- nothing feels possible ---------------------------------------------
  //
  // Consolidated 2026-07-28 (Neha): the four beats here (honor / warmth /
  // comfort / door) were four Continue taps for one thought, and on the
  // "nothing is possible" path a string of separate reassurances reads as the
  // app not hearing the "nothing". `honor` now carries all three sentiments in
  // one moon line -- not fixing it tonight is fair, looking at it counts, do
  // one small kind thing -- and leads STRAIGHT to the plan. What went:
  // unctrl_warmth, unctrl_act, unctrl_door.
  {
    id: 'unctrl_honor',
    owner: 'authored',
    phase: 'react',
    next: 'close',
    note: 'A valid answer with a full ending of its own. No "but maybe", no re-asking. Merges the old honor + warmth + comfort lines into one moon line, then goes straight to close. The coping if-then that used to follow (unctrl_ifthen) was removed 2026-08-01 (Neha) with the rest of the if-then.',
  },

  // --- timing and close ----------------------------------------------------
  // The closing "And now?" 0-10 rating (intensity_out) and its "not yet, show me
  // something else" loop (we_good_more) were REMOVED 2026-08-01 (Neha): a self-
  // rating at the end pulls her back into monitoring her feelings exactly when
  // she should disengage, and the flow already checks how she feels several
  // times. This was the in/out delta measure; given up on purpose for a better
  // ending. The flow now closes on a warm sendoff, then the reward.
  {
    id: 'sendoff',
    owner: 'authored',
    phase: 'react',
    next: 'close',
    note: 'The warm ending (Neha 2026-08-01): names the three phases done and hands her back her evening — go do what you like, feelings take about an hour to settle, keep busy, have fun. No rating, no "how do you feel" one more time. Then the reward.',
  },
  // human_nudge ("you've been here a lot, go be with someone") was removed from
  // the path 2026-07-28 (Neha): it is a pure usage-frequency beat -- fires only
  // on a high-usage signal, never on emotion size -- so it belongs with the
  // reward / light / usage system, which is deliberately deferred until every
  // flow exists rather than judged one beat at a time. To be reintroduced then.
  {
    id: 'close',
    owner: 'reward',
    phase: 'react',
    terminal: true,
    note: 'The one celebration in the app, and it is for a hard act she completed, never for a feeling or a score. A wrapped gift opens into a scratch card; she scratches it to reveal an earned character — "The Space Mover" — for making space between the feeling and the reaction. Saved to her Soul. Reward art stays opaque on the Soul page (a named badge discloses nothing about what she felt). NOTE: the Soul persistence + surfacing is still to wire; badge keying is the open question deferred with the reward system.',
  },
];

const BY_ID = new Map(MOMENT_FLOW.map((n) => [n.id, n]));

export function node(id: NodeId): FlowNode {
  const n = BY_ID.get(id);
  if (!n) throw new Error(`unknown flow node: ${id}`);
  return n;
}

/** Where a beat goes next. `key` picks the branch; ignored on straight edges. */
export function advance(id: NodeId, key?: string): NodeId | null {
  const n = node(id);
  if (n.terminal) return null;
  if (n.branches) {
    const hit = n.branches.find((b) => b.when === key);
    return hit ? hit.next : null;
  }
  return n.next ?? null;
}

/** The beats that call the model, and the corpus slot each is sent as. */
export const MODEL_NODES = MOMENT_FLOW.filter((n) => n.slot != null);

// The flow opens on the 3-beat Reflect / Regulate / Respond intro (brought back
// 2026-08-09 with the reflect-card rebuild) so she knows the shape before the
// first question, then straight to "tell me what happened".
export const ENTRY: NodeId = 'intro';
