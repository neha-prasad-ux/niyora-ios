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
  | 'raw_entry'
  | 'safe_check'
  | 'crisis_handoff'
  | 'intensity_in'
  // naming
  | 'clarify'
  | 'acknowledge'
  | 'together'
  | 'naming_science'
  | 'feelings'
  | 'name_reward'
  | 'feel_heard'
  | 'reframe_small'
  // body
  | 'make_safe'
  | 'lane_split'
  // high lane
  | 'high_breathe'
  | 'high_more'
  | 'high_reward1'
  | 'high_howlong'
  | 'high_onebreath'
  | 'high_stepaway'
  | 'high_pick_activity'
  | 'high_activity_context'
  | 'high_timer_end'
  | 'high_cbt_stem'
  | 'high_cbt_reframe'
  | 'arousal_check'
  | 'high_ladder'
  // low lane
  | 'low_activate'
  | 'low_justone'
  | 'low_reward'
  | 'low_better'
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
  | 'unctrl_warmth'
  | 'unctrl_act'
  | 'unctrl_ifthen'
  | 'unctrl_door'
  // timing and close
  | 'time_it'
  | 'today_action'
  | 'after_checklist'
  | 'we_good'
  | 'we_good_more'
  | 'intensity_out'
  | 'human_nudge'
  | 'close';

export type Phase = 'what happened' | 'settle' | 'what to do' | 'the plan';

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
    id: 'raw_entry',
    owner: 'ui',
    phase: 'what happened',
    next: 'intensity_in',
    note: 'Free text. Asks for an EVENT, not a feeling. The crisis scan runs on this and on every later message, before the model and before anything is held.',
  },
  {
    id: 'safe_check',
    owner: 'safety',
    phase: 'what happened',
    branches: [
      { when: 'safe', next: 'intensity_in' },
      { when: 'not_safe', next: 'crisis_handoff' },
    ],
    note: 'Only on an ambiguous scan hit. Never explained.',
  },
  {
    id: 'crisis_handoff',
    owner: 'safety',
    phase: 'what happened',
    terminal: true,
    note: 'STOPS the flow. Counts as a completed session for the badge: every ending counts except abandonment.',
  },
  {
    id: 'intensity_in',
    owner: 'ui',
    phase: 'what happened',
    next: 'clarify',
    note: '0 to 10, taken BEFORE acknowledge because acknowledge is one of the things being measured. Also routes big vs small, rather than asking her the same thing twice.',
  },

  // --- naming --------------------------------------------------------------
  {
    id: 'clarify',
    owner: 'echo',
    phase: 'what happened',
    slot: 'clarify',
    next: 'acknowledge',
    note: 'Only when her entry is thin. Asks for the concrete thing using her own words.',
  },
  {
    id: 'acknowledge',
    owner: 'echo',
    phase: 'what happened',
    slot: 'acknowledge',
    next: 'together',
    note: 'The one beat measured working on device. Never her read of his intent.',
  },
  { id: 'together', owner: 'authored', phase: 'what happened', next: 'naming_science' },
  {
    id: 'naming_science',
    owner: 'authored',
    phase: 'what happened',
    next: 'feelings',
    note: 'Putting words to it settles it. No "research says", no mechanism claim.',
  },
  {
    id: 'feelings',
    owner: 'pick',
    phase: 'what happened',
    slot: 'feelings',
    next: 'name_reward',
    why: true,
    note: 'Three from the 22 approved words. Ranking a list already written, so a suppression is an array filter.',
  },
  { id: 'name_reward', owner: 'reward', phase: 'what happened', next: 'feel_heard' },
  {
    id: 'feel_heard',
    owner: 'echo',
    phase: 'what happened',
    slot: 'feel_heard',
    next: 'reframe_small',
  },
  {
    id: 'reframe_small',
    owner: 'authored',
    phase: 'what happened',
    branches: [
      { when: 'small_lands', next: 'we_good' },
      { when: 'small_no', next: 'make_safe' },
      { when: 'big', next: 'make_safe' },
    ],
    note: 'EVERYONE gets this, not only small emotions (Neha, 2026-07-27, overriding the map). Authored: a gentler reading is new content however gently phrased. She PICKS which of three is true, so the app never asserts one; the model may eventually rank them and may never write one.',
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
  { id: 'make_safe', owner: 'authored', phase: 'settle', next: 'lane_split' },
  {
    id: 'lane_split',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'high', next: 'high_breathe' },
      { when: 'low', next: 'low_activate' },
      { when: 'mixed', next: 'mixed_name_swing' },
    ],
    note: 'Routed by the feeling she picked, not by cycle phase. One flow: phase is context, never a fork.',
  },

  // --- high lane -----------------------------------------------------------
  {
    id: 'high_breathe',
    owner: 'ui',
    phase: 'settle',
    next: 'high_more',
    why: true,
    note: 'In for four, out for six. Count only, no vagus claim. Reuses the per-phase breath haptics so she can do it with her eyes shut and the phone face down.',
  },
  {
    id: 'high_more',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'yes', next: 'high_breathe' },
      { when: 'no', next: 'high_reward1' },
    ],
  },
  { id: 'high_reward1', owner: 'reward', phase: 'settle', next: 'high_howlong' },
  {
    id: 'high_howlong',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'none', next: 'high_onebreath' },
      { when: 'few', next: 'high_stepaway' },
      { when: 'twenty', next: 'high_pick_activity' },
    ],
  },
  {
    id: 'high_onebreath',
    owner: 'authored',
    phase: 'settle',
    next: 'high_activity_context',
    why: true,
    note: '30-second filler. Carries the don-t-send line like every other branch: 30 seconds is long enough to send a text.',
  },
  {
    id: 'high_stepaway',
    owner: 'authored',
    phase: 'settle',
    next: 'high_activity_context',
    why: true,
  },
  {
    id: 'high_pick_activity',
    owner: 'authored',
    phase: 'settle',
    next: 'high_activity_context',
    why: true,
    note: 'The 20 minute hold with a timer. An empty wait is rehearsal, so she picks something to do.',
  },
  {
    id: 'high_activity_context',
    owner: 'authored',
    phase: 'settle',
    next: 'high_timer_end',
    note: 'Twelve activities, twelve lines. The model has no job here. It is also the beat where the fine-tune broke the no-mechanism rule in 36% of its training targets.',
  },
  { id: 'high_timer_end', owner: 'reward', phase: 'settle', next: 'high_cbt_stem' },
  {
    id: 'high_cbt_stem',
    owner: 'pick',
    phase: 'settle',
    slot: 'high_cbt_stem',
    next: 'high_cbt_reframe',
    note: 'Ten authored stems. The model ranks the three closest to her text and never writes one.',
  },
  {
    id: 'high_cbt_reframe',
    owner: 'authored',
    phase: 'settle',
    next: 'arousal_check',
    note: 'One line per stem, deterministic once she has picked. Shape: you know {her observed fact}, you do not know {the inference} yet.',
  },
  {
    id: 'arousal_check',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'better', next: 'ready_reward' },
      { when: 'not_yet', next: 'high_ladder' },
    ],
    note: 'A routing question asked while she is still working. NOT the closing rating.',
  },
  {
    id: 'high_ladder',
    owner: 'authored',
    phase: 'settle',
    next: 'arousal_check',
    note: 'An offer of other things to try, not a ladder: a hierarchy implies she is failing her way up it, and none of these have trial evidence anyway.',
  },

  // --- low lane ------------------------------------------------------------
  {
    id: 'low_activate',
    owner: 'authored',
    phase: 'settle',
    next: 'low_justone',
    why: true,
    note: 'One small thing: sunlight, a song, a warm drink, the dog. Engaging, never soothing. The flat need an act most, not least.',
  },
  { id: 'low_justone', owner: 'authored', phase: 'settle', next: 'low_reward' },
  { id: 'low_reward', owner: 'reward', phase: 'settle', next: 'low_better' },
  {
    id: 'low_better',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'yes', next: 'ready_reward' },
      { when: 'no', next: 'low_activate' },
    ],
  },

  // --- mixed lane ----------------------------------------------------------
  { id: 'mixed_name_swing', owner: 'authored', phase: 'settle', next: 'mixed_validate' },
  { id: 'mixed_validate', owner: 'authored', phase: 'settle', next: 'mixed_check_read' },
  {
    id: 'mixed_check_read',
    owner: 'echo',
    phase: 'settle',
    slot: 'mixed_check_read',
    next: 'mixed_swing_real',
  },
  {
    id: 'mixed_swing_real',
    owner: 'branch',
    phase: 'settle',
    branches: [
      { when: 'swing', next: 'mixed_anchor' },
      { when: 'real', next: 'mixed_real' },
    ],
    note: 'She sorts it and we do not argue either way. The beat that de-weighted her read is removed: it could talk a woman out of an accurate read of someone genuinely pulling away, or genuinely unsafe.',
  },
  {
    id: 'mixed_real',
    owner: 'echo',
    phase: 'settle',
    slot: 'mixed_real',
    next: 'mixed_anchor',
    note: 'May restate, never endorse.',
  },
  {
    id: 'mixed_anchor',
    owner: 'authored',
    phase: 'settle',
    next: 'ready_reward',
    note: 'Eight authored anchors. An anchor she can hold does not need to be bespoke, it needs to be good.',
  },

  // --- the act -------------------------------------------------------------
  { id: 'ready_reward', owner: 'reward', phase: 'what to do', next: 'options' },
  {
    id: 'options',
    owner: 'pick',
    phase: 'what to do',
    slot: 'controllability',
    why: true,
    branches: [
      { when: 'picks', next: 'act' },
      { when: 'show_others', next: 'options' },
      { when: 'none_possible', next: 'unctrl_honor' },
    ],
    note: 'Three acts from the closed set of 13, always one direct, one preparatory, one self-directed, her nouns filled in. A menu, not a diagnosis: we stopped assessing whether her situation is fixable and started asking what she wants to do. The DV screen removes confrontational acts from the candidate array BEFORE ranking, and the universal line ships with "say it to them" for everyone, not only on a screen hit.',
  },
  {
    id: 'act',
    owner: 'she',
    phase: 'what to do',
    next: 'time_it',
    note: 'An authored scaffold she fills. The message she sends to a real person is the highest-stakes output in the app, and drafting it for her is the beat form measured at 26%.',
  },

  // --- nothing feels possible ---------------------------------------------
  {
    id: 'unctrl_honor',
    owner: 'authored',
    phase: 'what to do',
    next: 'unctrl_warmth',
    note: 'A valid answer with a full ending of its own. No "but maybe", no re-asking.',
  },
  { id: 'unctrl_warmth', owner: 'authored', phase: 'what to do', next: 'unctrl_act' },
  {
    id: 'unctrl_act',
    owner: 'authored',
    phase: 'what to do',
    next: 'unctrl_ifthen',
    note: 'One tiny comfort act, now. Soothing here is deliberate and is the opposite of the low lane: this is a woman who has declined to fix anything.',
  },
  {
    id: 'unctrl_ifthen',
    owner: 'she',
    phase: 'the plan',
    next: 'unctrl_door',
    note: 'A coping if-then, not a fixing one. Same mechanism as today_action, surviving instead of solving.',
  },
  { id: 'unctrl_door', owner: 'authored', phase: 'the plan', next: 'we_good' },

  // --- timing and close ----------------------------------------------------
  {
    id: 'time_it',
    owner: 'branch',
    phase: 'the plan',
    next: 'today_action',
    note: 'Now, tomorrow, not sure. "Do it now anyway" stays a real un-shamed option.',
  },
  {
    id: 'today_action',
    owner: 'she',
    phase: 'the plan',
    why: true,
    branches: [
      { when: 'has_after', next: 'after_checklist' },
      { when: 'no_after', next: 'we_good' },
    ],
    note: 'if ___ happens, then i ___. She fills both slots; the trigger is seeded from her own opening sentence, tense-shifted, so the facts are correct by construction and the model never invents a him or a dinner.',
  },
  {
    id: 'after_checklist',
    owner: 'authored',
    phase: 'the plan',
    next: 'we_good',
    note: 'Only for acts that have an after.',
  },
  {
    id: 'we_good',
    owner: 'branch',
    phase: 'the plan',
    branches: [
      { when: 'yes', next: 'intensity_out' },
      { when: 'no', next: 'we_good_more' },
    ],
  },
  {
    id: 'we_good_more',
    owner: 'echo',
    phase: 'the plan',
    slot: 'we_good_more',
    next: 'we_good',
    note: 'One node doing two jobs: the ask is echo, the untried options are an authored list minus what she already did.',
  },
  {
    id: 'intensity_out',
    owner: 'ui',
    phase: 'the plan',
    next: 'human_nudge',
    note: 'And now? Never "how much better do you feel", which presupposes improvement and inflates a measure the evidence already distrusts. The delta is the result, not either number.',
  },
  {
    id: 'human_nudge',
    owner: 'authored',
    phase: 'the plan',
    next: 'close',
    note: 'Fires on the frequency signal only, never every session: usage volume is what predicts loneliness, so the right response to a high number is to send her away.',
  },
  { id: 'close', owner: 'authored', phase: 'the plan', terminal: true },
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

export const ENTRY: NodeId = 'raw_entry';
