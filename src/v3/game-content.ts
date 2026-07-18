// Content for the V3 emotion-training game. Three chapters share one template
// (Irritability, Anxiety, Mood swings): each is a Chapter bundle whose field
// names match the per-level constants below, so the game runner reads any
// chapter through the same shape. Irritability is authored as the flat consts;
// Anxiety and Mood swings reuse them via the Chapter interface at the bottom.
//
// Drafted end-to-end in docs/pms/niyora-irritability-levels-draft.md and the
// mechanic in niyora-pms-game-design.md. Every line is the game voice: a frank,
// warm 30-year-old Californian friend. Specific over vague, simple words, no
// jargon, no shame, no hype. Copy rules (docs/pms/niyora-pms-visuals.md §5): no
// em dashes, no exclamation points, no emoji, no mantras.
//
// Self-distancing: she coaches a friend, Neha, the recurring character across
// chapters. Only VERIFIED / MEDIUM science ships; the gated hunger/sleep stats
// stay as GENERAL truths with no PMS-specific numbers (see the draft's gate).

export const FRIEND_NAME = 'Neha';

export type Intensity = 'little' | 'lot';

// L1 — swipe true / myth.
export interface L1Card {
  id: string;
  statement: string;
  isTrue: boolean;
  reveal: string;
}

// L2 — read the wave, binary tap.
export interface L2Scene {
  id: string;
  scene: string;
  answer: Intensity;
  why: string;
}

// L3 — match the move, card pick with hold-to-preview.
export type MoveTier = 'best' | 'lesser' | 'worst';
export interface L3Option {
  label: string;
  tier: MoveTier;
  future: string;
}
export interface L3Scene {
  id: string;
  intensity: Intensity;
  prompt: string;
  options: L3Option[];
}

// swipe/tap/preview/chips are the graded levels; breathe/compassion/script are
// the three interchangeable "power move" slots (level 4). A chapter picks one.
export type LevelKind = 'swipe' | 'tap' | 'preview' | 'breathe' | 'compassion' | 'script' | 'chips';

export interface GameLevel {
  id: string;
  n: number;
  title: string;
  kind: LevelKind;
  intro: string; // the spoken "Sound" line that opens the level
}

export const IRRITABILITY_LEVELS: GameLevel[] = [
  {
    id: 'irr-l1',
    n: 1,
    title: 'Know the water',
    kind: 'swipe',
    intro:
      "Real quick, let's clear up a few things about getting irritable. Swipe right if it is true, left if it is a myth.",
  },
  {
    id: 'irr-l2',
    n: 2,
    title: 'Read the wave',
    kind: 'tap',
    intro:
      'Here is the thing that changes everything. How worked up is she, a little or a lot? What helps is totally different depending on the answer.',
  },
  {
    id: 'irr-l3',
    n: 3,
    title: 'Match the move',
    kind: 'preview',
    intro:
      'You can read it now. So pick what actually helps. Not sure? Hold a card to see how it plays out before you commit.',
  },
  {
    id: 'irr-l4',
    n: 4,
    title: 'The power move',
    kind: 'breathe',
    intro:
      'The one move that brings you back to steady: a long, slow exhale. Here is how it works, then we do it together.',
  },
  {
    id: 'irr-l5',
    n: 5,
    title: 'The last test',
    kind: 'chips',
    intro:
      'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.',
  },
];

// L1 cards, Truth / Myth. Each statement is a clean positive claim so the choice
// is crisp. The hunger/sleep card stays general (no PMS-specific number) per the
// content gate; the prevalence card cites the verified figure among PMS sufferers
// (StatPearls / NIH: irritability ~95%, the most-reported PMS symptom), NOT 95%
// of all women.
export const L1_CARDS: L1Card[] = [
  {
    id: 'l1-common',
    statement: 'Irritability is the number one PMS symptom, ahead of the mood dips and the anxiety.',
    isTrue: true,
    reveal:
      'About 95 percent of people who get PMS feel it, more than any other symptom. If your fuse is short this week, you are in very good company, and it is the most normal thing in the world.',
  },
  {
    id: 'l1-vent',
    statement: 'Letting the anger out, snapping or venting it, usually leaves you more wound up, not calmer.',
    isTrue: true,
    reveal:
      'Venting feels like release, but it mostly rehearses the anger and keeps your body switched on. The calm comes from letting the heat drop, not from firing it off.',
  },
  {
    id: 'l1-suppress',
    statement: 'The grown-up move is to swallow it, keep smiling, and wait for it to blow over.',
    isTrue: false,
    reveal:
      'Clamped down, it does not clear, it leaks out later as a sharp tone or a bigger blowup. Naming it and giving it room is a different thing from bottling it, and it is what actually works.',
  },
  {
    id: 'l1-hungry',
    statement: 'Skipping meals or running short on sleep makes you quicker to snap.',
    isTrue: true,
    reveal:
      'A dip in blood sugar or a rough night shortens anyone\'s fuse. Before you read too much into the mood, check whether she has eaten and slept.',
  },
  {
    id: 'l1-hormones',
    statement: 'If your period turns you into someone who snaps, your hormones must be off.',
    isTrue: false,
    reveal:
      'Your hormones are doing exactly what they should. Your brain is just reading them louder this week. Nothing about you is broken.',
  },
];

// Intro + congrats copy for the Level 1 arc. Warm Californian voice: clear,
// specific, simple. No exclamation, no hype.
export const L1_INTRO = {
  kicker: 'Train your mind',
  subtitle: 'Simple, science-backed skills to handle hard feelings.',
  emotion: 'Emotion: Irritability',
  level: 'Level 1',
  round: 'Easy round',
};

export const L1_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You passed Level 1',
  body: 'That is the groundwork laid. Ready to see how you handle Level 2?',
};

export const L1_CLOSE =
  'So before you help anyone, check the basics. Is she hungry? Wiped out? That is step one.';

// Level 2 intro + the "cheat code" teaching page + the sublabels on the two
// buttons. Warm Californian voice; the science of reading intensity in plain
// words (Sheppes intensity flip, Gottman flooding, prefrontal shutdown), taught
// before she practices it.
export const L2_INTRO = {
  level: 'Level 2',
  title: 'Big or small?',
  subtitle: 'Emotions come big or small. Noticing which comes before any fix.',
};

export const L2_CHEAT = {
  kicker: 'Cheat code',
  title: 'How to spot the size',
  rows: [
    { label: 'Thinking', small: 'can still think it through', big: 'logic bounces off, tunnel vision' },
    { label: 'Body', small: 'mostly calm', big: 'heart racing, hot, shaky' },
    { label: 'Control', small: 'bugged, still in control', big: 'the feeling is running her' },
  ],
};

export const L2_SCENES: L2Scene[] = [
  {
    id: 'l2-a',
    scene: `${FRIEND_NAME} is annoyed her partner did not text back.`,
    answer: 'little',
    why: 'She is bugged, but she can still think it through.',
  },
  {
    id: 'l2-b',
    scene: `${FRIEND_NAME} has not slept, her partner blew off something she worked hard on, and her voice is shaking.`,
    answer: 'lot',
    why: 'No sleep and a shaking voice. Her body is flooded, so logic will not land yet.',
  },
  {
    id: 'l2-c',
    scene: `${FRIEND_NAME} is fuming, talking fast and loud about her day, but she still laughs when you tease her.`,
    answer: 'little',
    why: 'Loud and worked up on the surface, but still reachable and still joking. Loud is not the same as flooded.',
  },
  {
    id: 'l2-d',
    scene: `${FRIEND_NAME} is running for her flight when the desk says her passport is expired. Her hands are shaking and the words will not come.`,
    answer: 'lot',
    why: 'About as big as it gets. You cannot reason through a flood, so she takes ten minutes first, then sorts it out.',
  },
  {
    id: 'l2-e',
    scene: `${FRIEND_NAME}'s boss picks apart her work in front of the whole team. She goes quiet and her jaw is tight.`,
    answer: 'lot',
    why: 'Quiet is not the same as calm. The tight jaw and the silence say she is flooded. Ten minutes before she says a word.',
  },
];

export const L2_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You passed Level 2',
  body: 'You can read the size now. That is the read the whole game turns on.',
};

export const L2_CLOSE =
  'That is the whole skill. Read the size first. Nail that and the rest is easy.';

// Level 3 intro + the cheat code (the solution flips with the size) + four
// scenes reusing the Level 2 situations, so reading the size now drives the
// solution. Options are concrete (the actual thought or action), not abstract
// labels, so picking one is doing the skill. Push-it-down is always the worst
// and is flagged red in the UI. Best-fit flips with the size (Sheppes).
export const L3_INTRO = {
  level: 'Level 3',
  title: 'What helps most?',
  lead: 'Two things handle irritability best.',
  points: [
    { term: 'Reframe it', def: 'swap the harsh story for a kinder, likelier one' },
    { term: 'Take 20', def: 'a gap to cool down, then come back' },
  ],
};

export const L3_CHEAT = {
  kicker: 'Cheat code',
  title: 'When to reframe, when to take 20',
  rows: [
    { label: 'Reframe it', small: 'works best', big: 'not the best, it stings her', bad: false },
    { label: 'Take 20', small: 'skips an easy fix', big: 'best, helps her calm down', bad: false },
    { label: 'Push it down', small: 'not a good choice', big: 'comes back louder', bad: true },
  ],
};

export const L3_SCENES: L3Scene[] = [
  {
    id: 'l3-text',
    intensity: 'little',
    prompt: `${FRIEND_NAME} is annoyed her partner did not text back. What helps most?`,
    options: [
      {
        label: 'Decide she is being needy and drop it',
        tier: 'worst',
        future: 'Calling herself needy just stacks shame on the annoyance. Buried, it does not leave, it comes back louder.',
      },
      {
        label: 'Think "He is probably slammed at work"',
        tier: 'best',
        future: 'A fairer read, and it lands because she can still think. The annoyance eases.',
      },
      {
        label: 'Take 20 and get some space',
        tier: 'lesser',
        future: 'Fine, but this one is small. A quick reframe would have sorted it.',
      },
    ],
  },
  {
    id: 'l3-sleep',
    intensity: 'lot',
    prompt: `${FRIEND_NAME} has not slept, her partner blew off her hard work, and her voice is shaking. What helps most?`,
    options: [
      {
        label: 'Take 20 and let her body settle',
        tier: 'best',
        future: 'She is flooded. The gap lets the wave drop, then she can think.',
      },
      {
        label: 'Get straight back to work like nothing happened',
        tier: 'worst',
        future: 'Powering through a flood does not calm it, it drives it underground. It leaks out later, usually at someone who did nothing.',
      },
      {
        label: 'He probably did not mean it',
        tier: 'lesser',
        future: 'A fair read, but mid-flood it bounces right off. Her thinking is offline.',
      },
    ],
  },
  {
    id: 'l3-passport',
    intensity: 'lot',
    prompt: `${FRIEND_NAME}'s passport just expired at the gate. Her hands are shaking. What helps most?`,
    options: [
      {
        label: 'The agent is only doing their job',
        tier: 'lesser',
        future: 'True, but she is too worked up to hear it. The reframe has to wait.',
      },
      {
        label: 'Step away for 20 and breathe',
        tier: 'best',
        future: 'Flooded and shaking. First her body settles, then she sorts the passport.',
      },
      {
        label: 'Force a calm face and swallow it',
        tier: 'worst',
        future: 'A calm face over a flood is just a lid. Clamping down mid-crisis piles pressure on pressure, and the lid comes off louder later.',
      },
    ],
  },
  {
    id: 'l3-snapping',
    intensity: 'little',
    prompt: `${FRIEND_NAME} is fuming and talking fast about her day, but she still laughs when you tease her. What helps most?`,
    options: [
      {
        label: 'It is a rough day talking, not everyone turning on her',
        tier: 'best',
        future: 'Loud but still reachable, so a fairer read lands and the heat drops.',
      },
      {
        label: 'Tell her she is being dramatic and needs to calm down',
        tier: 'worst',
        future: 'Nobody has ever calmed down from being told to calm down. It just adds a fight to the bad day.',
      },
      {
        label: 'Send her off alone for 20',
        tier: 'lesser',
        future: 'Overkill. She is worked up but reachable, a quick reframe would do it without the timeout.',
      },
    ],
  },
];

export const L3_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You passed Level 3',
  body: 'You can pick the solution that fits the size now. That is the move the whole game builds to.',
};

export const L3_PAYLOAD =
  'Same three solutions every time. All that changed was the size, and that flipped what helped. That is the whole game.';

// Level 4 · The power move. We have not taught a breath yet, so this level
// establishes it from scratch: the long exhale, why it works, then five slow
// rounds done together. No right or wrong, so the reward is doing it.
export const L4_INTRO = {
  level: 'Level 4',
  title: 'The power move',
  subtitle: 'You can read your emotions now. Here is the one move that brings you back to safe and steady.',
};

export const L4_TEACH = {
  kicker: 'The cheat code',
  title: 'Make your exhale longer',
  rule: 'Breathe in for 4, out for 8. The long exhale is the part that calms you.',
  doses: [
    { size: 'Small feeling', amount: '3 slow rounds' },
    { size: 'Big feeling', amount: 'Get 20 minutes away, breathing slow' },
  ],
  cta: "Let's breathe",
};

export const L4_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You passed Level 4',
  body: 'That long exhale is your power move now. Five slow rounds, any time you need to come back to steady.',
};

// Level 5 · The last test. A capstone: one real moment run end to end. She reads
// the size (L2), picks the move (L3), then does the power move (L4). The chapter
// closes here, with the kind word. Reuses the L3 best/lesser/worst tiers.
export const L5_INTRO = {
  level: 'Level 5',
  title: 'The last test',
  subtitle: 'One real moment, start to finish. Read it, handle it, breathe.',
};

export interface L5Capstone {
  scene: string;
  size: Intensity;
  sizeWhy: string;
  prompt: string;
  options: L3Option[];
}

export const L5_CAPSTONE: L5Capstone = {
  scene: `It is a rough PMS day. ${FRIEND_NAME} just snapped at her partner, her chest is tight, and she is close to tears over something small.`,
  size: 'lot',
  sizeWhy: 'Chest tight and close to tears. Her body is flooded, so thinking will not land yet.',
  prompt: 'What helps her most right now?',
  options: [
    {
      label: 'Take 20 and let her body settle',
      tier: 'best',
      future: 'The gap lets the wave drop. Then she can think, and talk.',
    },
    {
      label: 'Talk it out with her partner now',
      tier: 'worst',
      future: 'Mid-flood it turns into a fight. It has to wait until she is calm.',
    },
    {
      label: 'Tell herself it is not a big deal',
      tier: 'lesser',
      future: 'A fair thought, but flooded it bounces off. Her thinking is offline.',
    },
  ],
};

// Beat 3: the breath, as knowledge (she practiced the doing in Level 4). The
// long exhale is the answer, and it is the same whatever the size.
export const L5_BREATH_Q = {
  stepLabel: 'The breath',
  prompt: 'To feel calm, big or small, how do you breathe?',
  options: [
    { label: 'Breathe in and out the same', correct: false },
    { label: 'Breathe in longer than you breathe out', correct: false },
    { label: 'Breathe out longer than you breathe in', correct: true },
  ],
  whyRight: 'The long exhale is the part that calms you. Out longer than in, every time, big or small.',
  whyWrong: 'It is the exhale that calms you. You breathe out longer than you breathe in.',
};

// Beat 4: put the whole method in order. The array is the correct sequence;
// the UI presents it scrambled. No fail, so a wrong order still reveals the right
// one, it only costs the clean-run ring.
export const L5_REORDER = {
  stepLabel: 'Put it in order',
  prompt: 'When you get irritated, what do you do?',
  steps: [
    'Check if I am hungry or tired',
    'Read the size, big or small',
    'Small feeling, rephrase it',
    'Big feeling, take 20 and breathe slow',
  ],
  whyRight: 'That is the whole method, start to finish.',
  whyWrong: 'Not the order yet. Move the steps around and try again.',
};

// The capstone deck: four moments to route. One basics-first (she is running on
// empty), two small (reachable, reframe), one big (flooded, take 20). Reusing the
// L2/L3 situations so the last test is the same skill, now at speed. The correct
// route reveals the affirming why; a wrong route nudges toward the right read.
export const L5_DECK: Deck = {
  stepLabel: 'Route each moment',
  gates: {
    basics: { lead: 'Basics first', move: 'food or sleep' },
    small: { lead: 'Small', move: 'reframe it' },
    big: { lead: 'Big', move: 'take 20' },
  },
  cards: [
    {
      id: 'irr-d1',
      scene: `${FRIEND_NAME} has been snapping at everyone since lunch. All she has had today is a coffee.`,
      route: 'basics',
      foil: 'big',
      reveal: 'A coffee is not lunch. Feed her first, then see what is actually left.',
      nudge: 'Check what she has eaten before you read the feeling.',
    },
    {
      id: 'irr-d2',
      scene: `${FRIEND_NAME} is annoyed her partner did not text back, but she still laughs when you tease her about it.`,
      route: 'small',
      foil: 'big',
      reveal: 'Still reachable, so a kinder read lands and the annoyance eases.',
      nudge: 'She is still laughing. How big is this really?',
    },
    {
      id: 'irr-d3',
      scene: `${FRIEND_NAME} has not slept, her partner blew off her hard work, and her voice is shaking.`,
      route: 'big',
      foil: 'basics',
      reveal: 'Flooded. The gap lets the wave drop, then she can think and talk.',
      nudge: 'Shaking voice, no sleep. Is she really still thinking straight?',
    },
    {
      id: 'irr-d4',
      scene: `${FRIEND_NAME} keeps grumbling about small stuff but shrugs it off when you check in.`,
      route: 'small',
      foil: 'big',
      reveal: 'Small and reachable. A fairer read settles it, no space needed.',
      nudge: 'She shrugs it off. This one is not as big as it looks.',
    },
  ],
};

export const L5_CONGRATS = {
  title: 'Congratulations',
  body: 'You have crossed every level in mastering irritability. Try to apply them in real life, and share your thoughts with me. I would love to know.',
};

// --- The Chapter bundle ------------------------------------------------------
// One emotion's whole content, in the exact shapes the game runner consumes.
// Field names match the flat constants above so a level component can destructure
// them straight off the active chapter. Every chapter follows the same 5-level
// template: know the water, read the size, pick the move, breathe, recap.

export interface Congrats {
  title: string;
  subtitle?: string;
  body: string;
}
export interface CheatRow {
  label: string;
  small: string;
  big: string;
}
export interface CheatRowBad extends CheatRow {
  bad: boolean;
}
export interface BreathQuestion {
  stepLabel: string;
  prompt: string;
  options: { label: string; correct: boolean }[];
  whyRight: string;
  whyWrong: string;
}
export interface Reorder {
  stepLabel: string;
  prompt: string;
  steps: string[];
  whyRight: string;
  whyWrong: string;
}

// The Level 5 routing deck: the capstone interaction. She reads a short moment
// and routes it to the gate that fits, tap-first (the card flies to the gate she
// taps; a swipe does the same for whoever tries it). Three gates, all meaningful:
// basics-first (food/sleep), small (the light in-the-moment move), big (step away
// and breathe). Reading the size and picking the move become one gesture, done
// across several moments at speed, so the reads become reflex. Gentle: a wrong
// route nudges and lets her re-route, it never scolds.
export type DeckRoute = 'basics' | 'small' | 'big';
export interface DeckGate {
  lead: string; // the read, e.g. 'Small' / 'Big' / 'Basics first'
  move: string; // the move it maps to, e.g. 'reframe it'
}
export interface DeckCard {
  id: string;
  scene: string;
  route: DeckRoute; // the gate that fits
  foil: DeckRoute; // the tempting wrong gate shown alongside it (2-choice test)
  reveal: string; // affirming why, shown when she routes it right
  nudge: string; // gentle "look again" when she routes it wrong; never the answer
}
export interface Deck {
  stepLabel: string;
  gates: { basics: DeckGate; small: DeckGate; big: DeckGate };
  cards: DeckCard[];
}

// The self-compassion power move (Confidence chapter). Two guided beats she taps
// through, then she picks one kind line to keep. No right or wrong, like the breath.
export interface CompassionContent {
  teach: { kicker: string; title: string; beats: string[] };
  practice: { label: string; line: string; cue: string }[]; // the tap-through beats
  kindPrompt: string; // the prompt above the kind-line options
  kindLines: string[]; // she picks one
}

// The script-builder power move (Assertiveness chapter). She builds the four-part
// line by choosing, one part per page: each step offers the version that lands and
// a tempting decoy, a different failure mode each time (blame, judgment, hedge,
// threat). The correct picks assemble into her line. AI feedback comes later; the
// copy is fixed.
export interface ScriptStep {
  part: string; // 'Name it'
  hint: string; // 'the facts, no blame'
  correct: string; // the version that lands; assembles into the final line
  decoy: string; // the tempting mistake she chooses against
  why: string; // why the decoy backfires, shown when she taps it
}
export interface ScriptContent {
  teach: { kicker: string; title: string; rows: { part: string; hint: string }[] };
  scenario: string;
  steps: ScriptStep[];
  sayIt: string; // the "read it out loud" close on the assembled line
}

export interface Chapter {
  id: string;
  emotion: string; // display name for the home card, e.g. 'Irritability'
  track?: 'growth' | 'workplace'; // which shelf; defaults to growth when absent
  // Optional display labels for the two intensity poles. Growth chapters leave
  // these undefined and read Small / Big everywhere. Speaking up reframes the
  // read as a decision, so it overrides the hero + answer buttons to Now / Later
  // and the L2/L3 cheat columns to Speak now / Speak later.
  poles?: { small: string; big: string }; // hero + answer buttons
  cheatCols?: { small: string; big: string }; // L2 & L3 cheat column headers
  levels: GameLevel[];
  L1_CARDS: L1Card[];
  L1_INTRO: { kicker: string; subtitle: string; emotion: string; level: string; round: string };
  L1_CONGRATS: Congrats;
  L2_INTRO: { level: string; title: string; subtitle: string };
  L2_CHEAT: { kicker: string; title: string; rows: CheatRow[] };
  L2_SCENES: L2Scene[];
  L2_CONGRATS: Congrats;
  // Level 3 (match the move) is optional: Speaking up drops it, since for that
  // course the "move" is just the now/wait read L2 already makes. Chapters that
  // keep a 'preview' level must provide all four; the runner renders L3 by kind,
  // so a chapter with no 'preview' level never touches these.
  L3_INTRO?: { level: string; title: string; lead: string; points: { term: string; def: string }[] };
  L3_CHEAT?: { kicker: string; title: string; rows: CheatRowBad[] };
  L3_SCENES?: L3Scene[];
  L3_CONGRATS?: Congrats;
  L4_INTRO: { level: string; title: string; subtitle: string };
  L4_TEACH: { kicker: string; title: string; rule: string; doses: { size: string; amount: string }[]; cta: string };
  L4_CONGRATS: Congrats;
  L5_INTRO: { level: string; title: string; subtitle: string };
  L5_CAPSTONE: L5Capstone;
  L5_BREATH_Q: BreathQuestion;
  L5_REORDER: Reorder; // the method, now the source of the keepsake fork on congrats
  L5_DECK: Deck; // the capstone routing interaction
  L5_CONGRATS: Congrats;
  // Present only when the chapter's level-4 kind is 'compassion' or 'script'.
  // The 'breathe' chapters (growth + work nerves) leave these undefined and use
  // L4_INTRO/L4_TEACH/L4_CONGRATS. Compassion/script chapters reuse L4_INTRO and
  // L4_CONGRATS for the intro/congrats screens and put the body here.
  L4_COMPASSION?: CompassionContent;
  L4_SCRIPT?: ScriptContent;
}

// Chapter 1 · Irritability, from the flat constants above.
export const IRRITABILITY: Chapter = {
  id: 'irritability',
  emotion: 'Irritability',
  levels: IRRITABILITY_LEVELS,
  L1_CARDS,
  L1_INTRO,
  L1_CONGRATS,
  L2_INTRO,
  L2_CHEAT,
  L2_SCENES,
  L2_CONGRATS,
  L3_INTRO,
  L3_CHEAT,
  L3_SCENES,
  L3_CONGRATS,
  L4_INTRO,
  L4_TEACH,
  L4_CONGRATS,
  L5_INTRO,
  L5_CAPSTONE,
  L5_BREATH_Q,
  L5_REORDER,
  L5_DECK,
  L5_CONGRATS,
};

// The breath is the same physiological move in every chapter: the long exhale.
// Kept identical so the skill she learns in one chapter carries to the next.
const BREATH_Q_SHARED: BreathQuestion = {
  stepLabel: 'The breath',
  prompt: 'To feel calm, big or small, how do you breathe?',
  options: [
    { label: 'Breathe in and out the same', correct: false },
    { label: 'Breathe in longer than you breathe out', correct: false },
    { label: 'Breathe out longer than you breathe in', correct: true },
  ],
  whyRight: 'The long exhale is the part that calms you. Out longer than in, every time, big or small.',
  whyWrong: 'It is the exhale that calms you. You breathe out longer than you breathe in.',
};

// Chapter 2 · Anxiety. Same template, tuned to tension: small anxiety is a worry
// you can name and ground; big anxiety is a body-level alarm you step away from
// and breathe down. The worst move is pushing it away, which feeds the loop.
export const ANXIETY: Chapter = {
  id: 'anxiety',
  emotion: 'Anxiety',
  levels: [
    {
      id: 'anx-l1',
      n: 1,
      title: 'Know the water',
      kind: 'swipe',
      intro:
        "Real quick, let's clear up a few things about anxiety before your period. Swipe right if it is true, left if it is a myth.",
    },
    {
      id: 'anx-l2',
      n: 2,
      title: 'Read the wave',
      kind: 'tap',
      intro:
        'Here is what changes everything. How anxious is she, a little or a lot? What helps depends entirely on the answer.',
    },
    {
      id: 'anx-l3',
      n: 3,
      title: 'Match the move',
      kind: 'preview',
      intro:
        'You can read it now. So pick what actually calms her. Not sure? Hold a card to see how it plays out before you commit.',
    },
    {
      id: 'anx-l4',
      n: 4,
      title: 'The power move',
      kind: 'breathe',
      intro:
        'The one move that pulls you out of a spin: a long, slow exhale. Here is how it works, then we do it together.',
    },
    {
      id: 'anx-l5',
      n: 5,
      title: 'The last test',
      kind: 'chips',
      intro:
        'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.',
    },
  ],
  L1_CARDS: [
    {
      id: 'anx-l1-cycle',
      statement: 'Anxiety that climbs before your period usually eases within a day or two of it starting.',
      isTrue: true,
      reveal:
        'The calming brain chemistry that dips late in your cycle comes back as your period begins, so the edge tends to lift fast. Knowing it is cyclical, not permanent, takes some of the bite out.',
    },
    {
      id: 'anx-l1-suppress',
      statement: 'Telling yourself to stop worrying can make the worry louder.',
      isTrue: true,
      reveal:
        'The harder you push a thought away, the more your brain keeps checking it is gone, which holds it front and center. You name it, then come back to what is real right now.',
    },
    {
      id: 'anx-l1-check',
      statement: 'When a worry will not quit, checking it one more time is the fastest way to put it to rest.',
      isTrue: false,
      reveal:
        'Checking calms you for a second, then the doubt grows back a little stronger and asks to be checked again. Reassurance is a loop, not an exit. Naming the worry is what loosens it.',
    },
    {
      id: 'anx-l1-avoid',
      statement: 'Avoiding what makes you anxious quietly makes the anxiety bigger.',
      isTrue: true,
      reveal:
        'Every time you dodge it, your brain learns the thing was dangerous, so next time the fear is bigger. Facing it in small steps is what shrinks it.',
    },
    {
      id: 'anx-l1-body',
      statement: 'A pounding heart before a big moment is a sign something is about to go wrong.',
      isTrue: false,
      reveal:
        'That pounding is your body getting ready, the same surge that sharpens a sprinter. Read as readiness instead of dread and it works for you. The feeling is real, the danger usually is not.',
    },
  ],
  L1_INTRO: {
    kicker: 'Train your mind',
    subtitle: 'Simple, science-backed skills to steady an anxious week.',
    emotion: 'Emotion: Anxiety',
    level: 'Level 1',
    round: 'Easy round',
  },
  L1_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 1',
    body: 'That is the groundwork laid. Ready to see how you handle Level 2?',
  },
  L2_INTRO: {
    level: 'Level 2',
    title: 'Big or small?',
    subtitle: 'Anxiety comes big or small. Noticing which comes before any fix.',
  },
  L2_CHEAT: {
    kicker: 'Cheat code',
    title: 'How to spot the size',
    rows: [
      { label: 'Thinking', small: 'one worry you can name', big: 'what-if loops, cannot land on one thought' },
      { label: 'Body', small: 'a little tense or restless', big: 'racing heart, tight chest, shallow breath' },
      { label: 'Control', small: 'can still start the next thing', big: 'frozen, or avoiding it altogether' },
    ],
  },
  L2_SCENES: [
    {
      id: 'anx-l2-a',
      scene: `${FRIEND_NAME} keeps rechecking one email she already sent.`,
      answer: 'little',
      why: 'A single worry she can name. She is tense, but still thinking clearly.',
    },
    {
      id: 'anx-l2-b',
      scene: `${FRIEND_NAME} has a presentation in an hour. Her heart is pounding, her thoughts are racing, and she cannot sit still.`,
      answer: 'lot',
      why: 'Pounding heart and racing thoughts. Her body is in full alarm, so logic will not land yet.',
    },
    {
      id: 'anx-l2-c',
      scene: `${FRIEND_NAME} is fizzing before a call, tapping her pen and talking fast, but she can still crack a joke and follow the plan.`,
      answer: 'little',
      why: 'Lots of nervous energy, but she is still reachable and thinking clearly. Wired is not the same as flooded.',
    },
    {
      id: 'anx-l2-d',
      scene: `${FRIEND_NAME} is spiraling about a medical result, chest tight, googling every worst case at 2am.`,
      answer: 'lot',
      why: 'Tight chest and a what-if spiral. She is flooded, so first the body settles, then she thinks.',
    },
    {
      id: 'anx-l2-e',
      scene: `${FRIEND_NAME}'s card gets declined at the till with a queue behind her. Her face goes hot and the words stick.`,
      answer: 'lot',
      why: 'Hot face, stuck words, a crowd. Her system is flooded. A slow breath before anything else.',
    },
  ],
  L2_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 2',
    body: 'You can read the size now. That is the read the whole game turns on.',
  },
  L3_INTRO: {
    level: 'Level 3',
    title: 'What helps most?',
    lead: 'Two moves handle anxiety best.',
    points: [
      { term: 'Name and ground', def: 'label the worry, then come back to what is real right now' },
      { term: 'Step away and breathe', def: 'leave the trigger for a bit and slow your exhale' },
    ],
  },
  L3_CHEAT: {
    kicker: 'Cheat code',
    title: 'When to name it, when to step away',
    rows: [
      { label: 'Name and ground', small: 'works best', big: 'not enough on its own', bad: false },
      { label: 'Step away and breathe', small: 'more than she needs', big: 'best, it settles the alarm', bad: false },
      { label: 'Push it away', small: 'not a good choice', big: 'comes back stronger', bad: true },
    ],
  },
  L3_SCENES: [
    {
      id: 'anx-l3-email',
      intensity: 'little',
      prompt: `${FRIEND_NAME} keeps rechecking one email she already sent. What helps most?`,
      options: [
        {
          label: 'Name it, this is a worry, not a fact',
          tier: 'best',
          future: 'Naming it puts a gap between her and the thought. It loses its grip and she moves on.',
        },
        {
          label: 'Push the worry down and power on',
          tier: 'worst',
          future: 'Buried, it keeps buzzing under everything. It comes back stronger.',
        },
        {
          label: 'Leave the room for 20 and breathe',
          tier: 'lesser',
          future: 'Fine, but this one is small. Naming it would have settled it faster.',
        },
      ],
    },
    {
      id: 'anx-l3-present',
      intensity: 'lot',
      prompt: `${FRIEND_NAME} has a presentation in an hour, heart pounding, thoughts racing. What helps most?`,
      options: [
        {
          label: 'Step away for a few and breathe slow',
          tier: 'best',
          future: 'She is flooded. A few slow exhales drop the alarm, then her head clears.',
        },
        {
          label: 'Power through the panic and hope',
          tier: 'worst',
          future: 'Powering through a flood does not calm it. It leaks into the room.',
        },
        {
          label: 'Tell herself there is nothing to fear',
          tier: 'lesser',
          future: 'A fair thought, but mid-spiral it bounces off. Her body has to settle first.',
        },
      ],
    },
    {
      id: 'anx-l3-spiral',
      intensity: 'lot',
      prompt: `${FRIEND_NAME} is spiraling about a result at 2am, chest tight. What helps most?`,
      options: [
        {
          label: 'Close the laptop, step away, breathe slow',
          tier: 'best',
          future: 'Flooded and tight. First the body settles, then the 2am googling loses its pull.',
        },
        {
          label: 'Keep reading every worst case to be sure',
          tier: 'worst',
          future: 'Chasing certainty feeds the spiral. Each search makes the next one feel needed.',
        },
        {
          label: 'Remind herself the odds are low',
          tier: 'lesser',
          future: 'True, but too worked up to hear it. The reframe has to wait for calm.',
        },
      ],
    },
    {
      id: 'anx-l3-buzz',
      intensity: 'little',
      prompt: `${FRIEND_NAME} has a low buzz of nerves about the week but can laugh it off. What helps most?`,
      options: [
        {
          label: 'Name it, nerves, not danger',
          tier: 'best',
          future: 'Still reachable, so naming it lands and the buzz eases.',
        },
        {
          label: 'Tell her to ignore it',
          tier: 'worst',
          future: 'Ignoring it lets it stack up. Small now, louder later.',
        },
        {
          label: 'Send her off alone for 20 minutes',
          tier: 'lesser',
          future: 'Overkill. She did not need to leave, naming it would do it.',
        },
      ],
    },
  ],
  L3_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 3',
    body: 'You can pick the calm that fits the size now. That is the move the whole game builds to.',
  },
  L4_INTRO: {
    level: 'Level 4',
    title: 'The power move',
    subtitle: 'You can read your anxiety now. Here is the one move that switches the alarm off.',
  },
  L4_TEACH: {
    kicker: 'The cheat code',
    title: 'Make your exhale longer',
    rule: 'Breathe in for 4, out for 8. The long exhale is the part that calms the alarm.',
    doses: [
      { size: 'Small feeling', amount: '3 slow rounds' },
      { size: 'Big feeling', amount: 'Step away and keep breathing slow' },
    ],
    cta: "Let's breathe",
  },
  L4_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 4',
    body: 'That long exhale is your power move now. Three slow rounds, any time the alarm gets loud.',
  },
  L5_INTRO: {
    level: 'Level 5',
    title: 'The last test',
    subtitle: 'One real moment, start to finish. Read it, handle it, breathe.',
  },
  L5_CAPSTONE: {
    scene: `It is a rough PMS day. ${FRIEND_NAME}'s chest is tight, her thoughts are racing about tomorrow, and she cannot slow down.`,
    size: 'lot',
    sizeWhy: 'Tight chest and racing thoughts. Her body is in alarm, so thinking will not land yet.',
    prompt: 'What helps her most right now?',
    options: [
      {
        label: 'Step away and breathe slow for a few',
        tier: 'best',
        future: 'The slow exhales drop the alarm. Then her thoughts stop sprinting.',
      },
      {
        label: 'Solve every worry right now, tonight',
        tier: 'worst',
        future: 'Chasing every worry mid-flood spins her faster. It has to wait until she is calm.',
      },
      {
        label: 'Tell herself it will be fine',
        tier: 'lesser',
        future: 'A kind thought, but flooded it bounces off. Her body has to settle first.',
      },
    ],
  },
  L5_BREATH_Q: BREATH_Q_SHARED,
  L5_REORDER: {
    stepLabel: 'Put it in order',
    prompt: 'When anxiety hits, what do you do?',
    steps: [
      'Check if I am hungry or tired',
      'Read the size, big or small',
      'Small feeling, name it and ground',
      'Big feeling, step away and breathe slow',
    ],
    whyRight: 'That is the whole method, start to finish.',
    whyWrong: 'Not the order yet. Move the steps around and try again.',
  },
  L5_DECK: {
    stepLabel: 'Route each moment',
    gates: {
      basics: { lead: 'Basics first', move: 'food or sleep' },
      small: { lead: 'Small', move: 'name and ground' },
      big: { lead: 'Big', move: 'step away' },
    },
    cards: [
      {
        id: 'anx-d1',
        scene: `${FRIEND_NAME} is on edge and jumpy, and it hits you she has been running on no breakfast and four hours of sleep.`,
        route: 'basics',
        foil: 'big',
        reveal: 'Empty and wired first. Get her fed and rested before you read the worry.',
        nudge: 'Check her body basics before the worry itself.',
      },
      {
        id: 'anx-d2',
        scene: `${FRIEND_NAME} keeps rechecking one email she already sent, but she can still laugh it off.`,
        route: 'small',
        foil: 'big',
        reveal: 'One worry she can name, and she is still reachable. Naming it and grounding lands.',
        nudge: 'She can still laugh. How big is this worry really?',
      },
      {
        id: 'anx-d3',
        scene: `${FRIEND_NAME} has a presentation in an hour. Her heart is pounding, her thoughts are racing, and she cannot sit still.`,
        route: 'big',
        foil: 'small',
        reveal: 'Full alarm. She steps away and slows her exhale before anything else.',
        nudge: 'Pounding heart, racing thoughts. Is logic landing right now?',
      },
      {
        id: 'anx-d4',
        scene: `${FRIEND_NAME} feels a low buzz of nerves about the week but can still get on with her day.`,
        route: 'small',
        foil: 'big',
        reveal: 'Still steady. Name it and come back to what is real, no need to step away.',
        nudge: 'The nerves are there, but are they running her?',
      },
    ],
  },
  L5_CONGRATS: {
    title: 'Congratulations',
    body: 'You have crossed every level in steadying anxiety. Try it in real life, and tell me how it goes. I would love to know.',
  },
};

// Chapter 3 · Mood swings (affective lability). Same template, tuned to the wave:
// small is a dip you can name and let pass; big is a surge you are about to act
// on, so you delay the move and breathe until it crests. The worst move is acting
// on it now, the regret amplifier.
export const MOOD_SWINGS: Chapter = {
  id: 'mood-swings',
  emotion: 'Mood swings',
  levels: [
    {
      id: 'mood-l1',
      n: 1,
      title: 'Know the water',
      kind: 'swipe',
      intro:
        "Real quick, let's clear up a few things about mood swings before your period. Swipe right if it is true, left if it is a myth.",
    },
    {
      id: 'mood-l2',
      n: 2,
      title: 'Read the wave',
      kind: 'tap',
      intro:
        'Here is what changes everything. How big is the wave, a little or a lot? What helps depends entirely on the answer.',
    },
    {
      id: 'mood-l3',
      n: 3,
      title: 'Match the move',
      kind: 'preview',
      intro:
        'You can read it now. So pick what actually helps. Not sure? Hold a card to see how it plays out before you commit.',
    },
    {
      id: 'mood-l4',
      n: 4,
      title: 'The power move',
      kind: 'breathe',
      intro:
        'The one move that lets a wave pass without wrecking anything: a long, slow exhale. Here is how it works, then we do it together.',
    },
    {
      id: 'mood-l5',
      n: 5,
      title: 'The last test',
      kind: 'chips',
      intro:
        'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.',
    },
  ],
  L1_CARDS: [
    {
      id: 'mood-l1-name',
      statement: 'Putting the feeling into words, like this is a wave of sadness, takes some of its power away.',
      isTrue: true,
      reveal:
        'Labeling a feeling instead of bottling it settles the brain a little and loosens the wave\'s grip. Saying what it is, out loud or in your head, is what starts to shrink it.',
    },
    {
      id: 'mood-l1-passes',
      statement: 'A mood swing usually rises, crests, and fades on its own if you do not act on it.',
      isTrue: true,
      reveal:
        'Left alone, the wave breaks and drops, often within the hour. Most of the damage comes from acting while it is high, not from the wave itself.',
    },
    {
      id: 'mood-l1-trust',
      statement: 'The feeling is that strong for a reason, so you should trust it and act while it is real.',
      isTrue: false,
      reveal:
        'A swing makes everything feel bigger and more permanent than it is. The feeling is real, but it is a wave, not a verdict. Wait for the tide to drop before you trust the read.',
    },
    {
      id: 'mood-l1-rejection',
      statement: 'Before your period, a neutral text or a flat look can land like a real rejection.',
      isTrue: true,
      reveal:
        'Late in the cycle your brain tunes up to signs of rejection, so a short reply can sting more than it was meant to. The hurt is real. The rejection usually is not.',
    },
    {
      id: 'mood-l1-hold',
      statement: 'If you can hold the tears back and keep it together, the wave passes quicker.',
      isTrue: false,
      reveal:
        'Holding it in does not speed it up, it just adds a second job on top of the feeling. Letting the tears come, without acting on the story behind them, is what lets the wave move through.',
    },
  ],
  L1_INTRO: {
    kicker: 'Train your mind',
    subtitle: 'Simple, science-backed skills to ride a swingy week.',
    emotion: 'Emotion: Mood swings',
    level: 'Level 1',
    round: 'Easy round',
  },
  L1_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 1',
    body: 'That is the groundwork laid. Ready to see how you handle Level 2?',
  },
  L2_INTRO: {
    level: 'Level 2',
    title: 'Big or small?',
    subtitle: 'A mood wave comes big or small. Noticing which comes before any fix.',
  },
  L2_CHEAT: {
    kicker: 'Cheat code',
    title: 'How to spot the size',
    rows: [
      { label: 'Thinking', small: 'a dip you can name', big: 'all-or-nothing, everything is falling apart' },
      { label: 'Body', small: 'a lump in the throat, quick tears', big: 'full tears, cannot talk' },
      { label: 'Control', small: 'can pause before reacting', big: 'about to send it or say it' },
    ],
  },
  L2_SCENES: [
    {
      id: 'mood-l2-a',
      scene: `${FRIEND_NAME} tears up at an advert, then laughs at herself.`,
      answer: 'little',
      why: 'A quick wave she can name. She feels it, but she is still steady.',
    },
    {
      id: 'mood-l2-b',
      scene: `${FRIEND_NAME} reads one short text, decides everyone is sick of her, and is typing a long reply she means to send now.`,
      answer: 'lot',
      why: 'One text became a verdict about everything, and she is about to act on it. That is a big wave.',
    },
    {
      id: 'mood-l2-c',
      scene: `${FRIEND_NAME} wells up at a song and her voice wobbles, then she laughs at herself and carries on.`,
      answer: 'little',
      why: 'Tears on the surface, but she is still steady underneath and lets it pass. Teary is not the same as flooded.',
    },
    {
      id: 'mood-l2-d',
      scene: `${FRIEND_NAME} is crying hard, sure the friendship is over, and cannot get a sentence out.`,
      answer: 'lot',
      why: 'Full tears and a cannot-talk flood. The wave is at its peak, so nothing gets decided yet.',
    },
    {
      id: 'mood-l2-e',
      scene: `${FRIEND_NAME}'s partner makes a small joke and she is suddenly furious and close to tears, phone in hand.`,
      answer: 'lot',
      why: 'A small spark, a big surge, a phone in hand. She is flooded and about to act. Wait first.',
    },
  ],
  L2_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 2',
    body: 'You can read the size now. That is the read the whole game turns on.',
  },
  L3_INTRO: {
    level: 'Level 3',
    title: 'What helps most?',
    lead: 'Two moves handle a mood wave best.',
    points: [
      { term: 'Name and let it pass', def: 'say what you feel, like this is a wave of sadness, then give it a minute to crest' },
      { term: 'Delay and soothe', def: 'do not send or decide now, step away and be kind to yourself' },
    ],
  },
  L3_CHEAT: {
    kicker: 'Cheat code',
    title: 'When to let it pass, when to delay',
    rows: [
      { label: 'Name and let it pass', small: 'works best', big: 'not enough on its own', bad: false },
      { label: 'Delay and soothe', small: 'more than she needs', big: 'best, it saves her the regret', bad: false },
      { label: 'Act on it now', small: 'not a good choice', big: 'the regret amplifier', bad: true },
    ],
  },
  L3_SCENES: [
    {
      id: 'mood-l3-advert',
      intensity: 'little',
      prompt: `${FRIEND_NAME} tears up at an advert, then laughs at herself. What helps most?`,
      options: [
        {
          label: 'Name it, I feel tender right now, it passes',
          tier: 'best',
          future: 'She said what it was, a wave of tender, not a verdict. Named, it moves through and a minute later it is gone.',
        },
        {
          label: 'Decide something is wrong with her',
          tier: 'worst',
          future: 'Turning a small wave into a verdict makes it stick. It snowballs.',
        },
        {
          label: 'Put the phone down and leave for 20',
          tier: 'lesser',
          future: 'Fine, but this one is small. Naming it would have been enough.',
        },
      ],
    },
    {
      id: 'mood-l3-text',
      intensity: 'lot',
      prompt: `${FRIEND_NAME} read one text, decided everyone is sick of her, and is about to send a long reply. What helps most?`,
      options: [
        {
          label: 'Do not send it yet, step away and breathe',
          tier: 'best',
          future: 'Flooded, she would regret that reply. The gap lets the wave drop, then she can see clearly.',
        },
        {
          label: 'Send the reply while it feels true',
          tier: 'worst',
          future: 'Sending mid-wave says things she does not mean. It cannot be unsent.',
        },
        {
          label: 'Tell herself they are probably not upset',
          tier: 'lesser',
          future: 'A fair read, but mid-flood it bounces off. First the wave has to drop.',
        },
      ],
    },
    {
      id: 'mood-l3-cry',
      intensity: 'lot',
      prompt: `${FRIEND_NAME} is crying hard, sure the friendship is over, cannot get a sentence out. What helps most?`,
      options: [
        {
          label: 'Let the tears come, step away, breathe slow',
          tier: 'best',
          future: 'The wave is at its peak. Give the body time, and the certainty fades with it.',
        },
        {
          label: 'Text the friend that it is over',
          tier: 'worst',
          future: 'A flood is not the moment to end anything. It comes back as regret.',
        },
        {
          label: 'List the reasons it is probably fine',
          tier: 'lesser',
          future: 'True, but too flooded to hear it. The reasons can wait for calm.',
        },
      ],
    },
    {
      id: 'mood-l3-sensitive',
      intensity: 'little',
      prompt: `${FRIEND_NAME} feels extra sensitive but can still let things go. What helps most?`,
      options: [
        {
          label: 'Name it, I feel extra sensitive today, it passes',
          tier: 'best',
          future: 'She named the feeling out loud, so it lands and the edge softens. Still reachable, no need to leave.',
        },
        {
          label: 'Tell her to toughen up',
          tier: 'worst',
          future: 'Pushing it down stacks it up. Small now, bigger later.',
        },
        {
          label: 'Send her off alone for 20',
          tier: 'lesser',
          future: 'Overkill. She did not need space, naming it would do it.',
        },
      ],
    },
  ],
  L3_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 3',
    body: 'You can pick what fits the size of the wave now. That is the move the whole game builds to.',
  },
  L4_INTRO: {
    level: 'Level 4',
    title: 'The power move',
    subtitle: 'You can read the wave now. Here is the one move that lets it pass without any damage.',
  },
  L4_TEACH: {
    kicker: 'The cheat code',
    title: 'Make your exhale longer',
    rule: 'Breathe in for 4, out for 8. The long exhale buys the time for the wave to crest.',
    doses: [
      { size: 'Small feeling', amount: '3 slow rounds' },
      { size: 'Big feeling', amount: 'Breathe slow and wait before you decide' },
    ],
    cta: "Let's breathe",
  },
  L4_CONGRATS: {
    title: 'Congratulations',
    subtitle: 'You passed Level 4',
    body: 'That long exhale is your power move now. Three slow rounds, any time a wave threatens to pull you under.',
  },
  L5_INTRO: {
    level: 'Level 5',
    title: 'The last test',
    subtitle: 'One real moment, start to finish. Read it, handle it, breathe.',
  },
  L5_CAPSTONE: {
    scene: `It is a rough PMS day. ${FRIEND_NAME} read a short text, decided her friend is done with her, and she is crying with the phone in her hand.`,
    size: 'lot',
    sizeWhy: 'Tears, a verdict from one text, phone in hand. She is flooded and about to act.',
    prompt: 'What helps her most right now?',
    options: [
      {
        label: 'Put the phone down, step away, breathe',
        tier: 'best',
        future: 'The gap lets the wave drop. Then the text is a text again, not a verdict.',
      },
      {
        label: 'Reply now and settle it once and for all',
        tier: 'worst',
        future: 'Replying mid-flood says what she does not mean. It cannot be taken back.',
      },
      {
        label: 'Tell herself the friendship is fine',
        tier: 'lesser',
        future: 'A fair thought, but flooded it bounces off. The wave has to drop first.',
      },
    ],
  },
  L5_BREATH_Q: BREATH_Q_SHARED,
  L5_REORDER: {
    stepLabel: 'Put it in order',
    prompt: 'When a mood wave hits, what do you do?',
    steps: [
      'Check if I am hungry or tired',
      'Read the size, big or small',
      'Small feeling, name it and let it pass',
      'Big feeling, delay and breathe slow',
    ],
    whyRight: 'That is the whole method, start to finish.',
    whyWrong: 'Not the order yet. Move the steps around and try again.',
  },
  L5_DECK: {
    stepLabel: 'Route each moment',
    gates: {
      basics: { lead: 'Basics first', move: 'food or sleep' },
      small: { lead: 'Small', move: 'let it pass' },
      big: { lead: 'Big', move: 'delay and soothe' },
    },
    cards: [
      {
        id: 'mood-d1',
        scene: `${FRIEND_NAME} has been up and down all morning, and she skipped both breakfast and lunch in the rush.`,
        route: 'basics',
        foil: 'small',
        reveal: 'Empty tank first. Food and a breath before you read the wave.',
        nudge: 'Check the basics before you read the mood.',
      },
      {
        id: 'mood-d2',
        scene: `${FRIEND_NAME} tears up at an advert, then laughs at herself.`,
        route: 'small',
        foil: 'big',
        reveal: 'A quick wave she can name. She feels it, and it passes.',
        nudge: 'She laughs right after. How big is this wave?',
      },
      {
        id: 'mood-d3',
        scene: `${FRIEND_NAME} read one short text, decided everyone is done with her, and is crying too hard to speak.`,
        route: 'big',
        foil: 'small',
        reveal: 'Flooded. She holds off on deciding anything and is gentle with herself first.',
        nudge: 'She cannot get a sentence out. Is she deciding clearly right now?',
      },
      {
        id: 'mood-d4',
        scene: `${FRIEND_NAME} feels a little extra sensitive today but can still let small things go.`,
        route: 'small',
        foil: 'big',
        reveal: 'Still steady. Name it and let it pass, no big move needed.',
        nudge: 'She can still let things go. This wave is small.',
      },
    ],
  },
  L5_CONGRATS: {
    title: 'Congratulations',
    body: 'You have crossed every level in riding your mood waves. Try it in real life, and tell me how it goes. I would love to know.',
  },
};

// ============================================================================
// WORKPLACE TRACK. Same 5-level template as the emotion chapters, so the runner,
// the store, the chapter card and the recap all carry over unchanged. Only the
// level-4 power move differs: Work nerves breathes, Confidence runs a
// self-compassion break, Speaking up builds a script. Content is grounded in the
// verified landscape (docs/women-at-work/niyora-women-at-work-landscape.md): the
// same CBT + self-compassion engine, pointed at the wider world.
// ============================================================================

// Chapter 4 · Nerves at work. The Anxiety method, re-scened to the office: small
// nerves you name and ground, big nerves you step away from and breathe down.
export const WORK_ANXIETY: Chapter = {
  id: 'work-anxiety',
  emotion: 'Nerves at work',
  track: 'workplace',
  levels: [
    { id: 'wanx-l1', n: 1, title: 'Know the water', kind: 'swipe',
      intro: "Real quick, let's clear up a few things about nerves at work. Swipe right if it is true, left if it is a myth." },
    { id: 'wanx-l2', n: 2, title: 'Read the wave', kind: 'tap',
      intro: 'Here is what changes everything. How big are the nerves, a little or a lot? What helps depends entirely on the answer.' },
    { id: 'wanx-l3', n: 3, title: 'Match the move', kind: 'preview',
      intro: 'You can read it now. So pick what actually calms her. Not sure? Hold a card to see how it plays out before you commit.' },
    { id: 'wanx-l4', n: 4, title: 'The power move', kind: 'breathe',
      intro: 'The one move that pulls you out of a spin before a big moment: a long, slow exhale. Here is how it works, then we do it together.' },
    { id: 'wanx-l5', n: 5, title: 'The last test', kind: 'chips',
      intro: 'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.' },
  ],
  L1_CARDS: [
    { id: 'wanx-l1-energy', statement: 'A rush of nerves before a big moment can actually sharpen you.',
      isTrue: true, reveal: 'That jolt is your body getting ready, more fuel not less. Read as readiness instead of dread and the same feeling works for you. The trick is what you call it.' },
    { id: 'wanx-l1-avoid', statement: 'Dodging the thing that scares you at work makes the fear grow.',
      isTrue: true, reveal: 'Every time you skip the speak-up or the ask, your brain learns it was dangerous, so next time the fear is bigger. Doing it in small steps is what shrinks it.' },
    { id: 'wanx-l1-check', statement: 'If a message is worrying you, rereading it a few times is the quickest way to feel sure.',
      isTrue: false, reveal: 'Each reread calms you for a moment, then hands the doubt back a little bigger. Checking is a loop, not an exit. Naming the worry is what loosens it.' },
    { id: 'wanx-l1-cram', statement: 'The more anxious you feel before a presentation, the more you should cram right up to the start.',
      isTrue: false, reveal: 'Cramming on a racing mind does not stick and only winds you tighter. Once the prep is done, the job is to settle the body, not to pile on more.' },
    { id: 'wanx-l1-suppress', statement: 'Telling yourself to stop being nervous before you walk in tends to make it louder.',
      isTrue: true, reveal: 'The harder you push the nerves away, the more your brain keeps checking they are gone, which holds them front and center. You name them, then come back to what is real right now.' },
  ],
  L1_INTRO: { kicker: 'Grow at work', subtitle: 'Simple, science-backed skills to steady your nerves at work.', emotion: 'At work: Nerves', level: 'Level 1', round: 'Easy round' },
  L1_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 1', body: 'That is the groundwork laid. Ready to see how you handle Level 2?' },
  L2_INTRO: { level: 'Level 2', title: 'Big or small?', subtitle: 'Nerves come big or small. Noticing which comes before any fix.' },
  L2_CHEAT: { kicker: 'Cheat code', title: 'How to spot the size', rows: [
    { label: 'Thinking', small: 'one worry you can name', big: 'what-if loops, mind goes blank' },
    { label: 'Body', small: 'a little tense or fidgety', big: 'racing heart, tight chest, shaky' },
    { label: 'Control', small: 'can still start the task', big: 'frozen, or avoiding it altogether' },
  ] },
  L2_SCENES: [
    { id: 'wanx-l2-a', scene: `${FRIEND_NAME} presents in an hour. Her heart is quick, but she is calmly running her opening line.`, answer: 'little', why: 'A quick heart on its own does not make it big. She is still thinking clearly and prepping. Reachable, so small.' },
    { id: 'wanx-l2-b', scene: `${FRIEND_NAME} says she is fine about the review. She looks calm, but she has reread one email for ten minutes and cannot start her real work.`, answer: 'lot', why: 'Calm face, but she is stuck and cannot function. Frozen counts as big, even when it looks quiet.' },
    { id: 'wanx-l2-c', scene: `${FRIEND_NAME} is wound up before a call, pacing and talking fast, but she can still answer a question and crack a joke.`, answer: 'little', why: 'Lots of energy, but she is still in the driver seat. Loud is not the same as flooded. She can be reached.' },
    { id: 'wanx-l2-d', scene: `${FRIEND_NAME} went quiet in a meeting and gave short answers, and now she cannot shake that she blew it.`, answer: 'lot', why: 'Quiet and short is the tell, plus a thought she cannot put down. She is flooded under the calm surface.' },
    { id: 'wanx-l2-e', scene: `${FRIEND_NAME} has knots before giving feedback, but she has written out what she wants to say.`, answer: 'little', why: 'Knots, yes, but she can plan and prepare. Still in control, still small.' },
  ],
  L2_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 2', body: 'You can read the size now. That is the read the whole game turns on.' },
  L3_INTRO: { level: 'Level 3', title: 'What helps most?', lead: 'Two moves handle work nerves best.', points: [
    { term: 'Name and ground', def: 'label the worry, then come back to what is real right now' },
    { term: 'Step away and breathe', def: 'leave the trigger for a bit and slow your exhale' },
  ] },
  L3_CHEAT: { kicker: 'Cheat code', title: 'When to name it, when to step away', rows: [
    { label: 'Name and ground', small: 'works best', big: 'not enough on its own', bad: false },
    { label: 'Step away and breathe', small: 'more than she needs', big: 'best, it settles the alarm', bad: false },
    { label: 'Check and re-check', small: 'feels safe, feeds the loop', big: 'feeds the loop, faster', bad: true },
  ] },
  L3_SCENES: [
    { id: 'wanx-l3-msg', intensity: 'little', prompt: `${FRIEND_NAME} is tense about a message she already sent her manager. What helps most?`, options: [
      { label: 'Name it, this is a worry, not a fact', tier: 'best', future: 'Naming it puts a gap between her and the thought. It loses its grip and she moves on.' },
      { label: 'Reread the message a few more times to be sure', tier: 'worst', future: 'Checking calms her for a second, then the doubt grows back bigger. Each reread teaches her she cannot trust the last one.' },
      { label: 'Step away from her desk for a while and breathe', tier: 'lesser', future: 'Not wrong, but this one is small. Naming it would settle it without the break.' },
    ] },
    { id: 'wanx-l3-present', intensity: 'lot', prompt: `${FRIEND_NAME} presents in an hour, heart pounding, thoughts racing, cannot focus. What helps most?`, options: [
      { label: 'Step away for a few and breathe slow', tier: 'best', future: 'She is flooded. A few slow exhales drop the alarm, then her head clears.' },
      { label: 'Run the whole deck one more time to feel ready', tier: 'worst', future: 'Cramming on a racing mind does not stick, and it winds her tighter. The prep is done, the body is not.' },
      { label: 'Tell herself there is nothing to fear', tier: 'lesser', future: 'A fair thought, but mid-spiral it bounces off. Her body has to settle first.' },
    ] },
    { id: 'wanx-l3-froze', intensity: 'lot', prompt: `${FRIEND_NAME} went quiet in a meeting and cannot shake that she blew it. What helps most?`, options: [
      { label: 'Step out, breathe slow, let the wave drop', tier: 'best', future: 'Flooded and stuck on it. First the body settles, then the thought loses its grip.' },
      { label: 'Ask a colleague if it really went that badly', tier: 'worst', future: 'A yes calms her for a minute, a maybe spikes her. Reassurance hands the worry to someone else and it comes right back.' },
      { label: 'Remind herself one quiet moment is not a verdict', tier: 'lesser', future: 'True, but too worked up to hear it. The reframe has to wait for calm.' },
    ] },
    { id: 'wanx-l3-buzz', intensity: 'little', prompt: `${FRIEND_NAME} has a low buzz of nerves about a review but can still work. What helps most?`, options: [
      { label: 'Name it, nerves, not danger', tier: 'best', future: 'Still reachable, so naming it lands and the buzz eases.' },
      { label: 'Google how to survive a performance review', tier: 'worst', future: 'An hour of worst-case reading later, the buzz is a spiral. Chasing certainty feeds the fear.' },
      { label: 'Take a long walk to shake it off', tier: 'lesser', future: 'Pleasant, but overkill here. Naming it would do it in a moment.' },
    ] },
  ],
  L3_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 3', body: 'You can pick the calm that fits the size now. That is the move the whole game builds to.' },
  L4_INTRO: { level: 'Level 4', title: 'The power move', subtitle: 'You can read your nerves now. Here is the one move that switches the alarm off before you walk in.' },
  L4_TEACH: { kicker: 'The cheat code', title: 'Make your exhale longer', rule: 'Breathe in for 4, out for 8. The long exhale is the part that calms the alarm.', doses: [
    { size: 'Small feeling', amount: '3 slow rounds' },
    { size: 'Big feeling', amount: 'Step away and keep breathing slow' },
  ], cta: "Let's breathe" },
  L4_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 4', body: 'That long exhale is your power move now. Three slow rounds, any time the alarm gets loud before a big moment.' },
  L5_INTRO: { level: 'Level 5', title: 'The last test', subtitle: 'One real work moment, start to finish. Read it, handle it, breathe.' },
  L5_CAPSTONE: { scene: `${FRIEND_NAME} is up next to present. Her chest is tight, her thoughts are racing, and she cannot slow down.`, size: 'lot', sizeWhy: 'Tight chest and racing thoughts. Her body is in alarm, so thinking will not land yet.', prompt: 'What helps her most right now?', options: [
    { label: 'Step away and breathe slow for a few', tier: 'best', future: 'The slow exhales drop the alarm. Then her thoughts stop sprinting and she can walk in.' },
    { label: 'Rehearse every line one more frantic time', tier: 'worst', future: 'Cramming mid-flood spins her faster. It has to wait until she is steady.' },
    { label: 'Tell herself it will be fine', tier: 'lesser', future: 'A kind thought, but flooded it bounces off. Her body has to settle first.' },
  ] },
  L5_BREATH_Q: BREATH_Q_SHARED,
  L5_REORDER: { stepLabel: 'Put it in order', prompt: 'When nerves hit before a work moment, what do you do?', steps: [
    'Check if I am hungry or tired',
    'Read the size, big or small',
    'Small feeling, name it and ground',
    'Big feeling, step away and breathe slow',
  ], whyRight: 'That is the whole method, start to finish.', whyWrong: 'Not the order yet. Move the steps around and try again.' },
  L5_DECK: {
    stepLabel: 'Route each moment',
    gates: {
      basics: { lead: 'Basics first', move: 'food or sleep' },
      small: { lead: 'Small', move: 'name and ground' },
      big: { lead: 'Big', move: 'step away' },
    },
    cards: [
      {
        id: 'wanx-d1',
        scene: `${FRIEND_NAME} is wired before a call and snappy in the chat, running on no lunch and a rough night.`,
        route: 'basics',
        foil: 'big',
        reveal: 'Empty and tired first. Steady the body before you read the nerves.',
        nudge: 'Check food and sleep before the nerves.',
      },
      {
        id: 'wanx-d2',
        scene: `${FRIEND_NAME} presents in an hour but is calmly running her opening line, heart a little quick.`,
        route: 'small',
        foil: 'big',
        reveal: 'A quick heart alone is not big. Name it, ground, and she is ready.',
        nudge: 'She is still prepping calmly. How big is this?',
      },
      {
        id: 'wanx-d3',
        scene: `${FRIEND_NAME} says she is fine, but she has reread one email for ten minutes and cannot start her work.`,
        route: 'big',
        foil: 'small',
        reveal: 'Frozen counts as big, even when it looks quiet. She steps away and breathes first.',
        nudge: 'She is stuck and cannot function. Is that really small?',
      },
      {
        id: 'wanx-d4',
        scene: `${FRIEND_NAME} has knots before giving feedback but has written out what she wants to say.`,
        route: 'small',
        foil: 'big',
        reveal: 'Knots, but she can plan. Name it, ground, and go.',
        nudge: 'She can still prepare. This one is small.',
      },
    ],
  },
  L5_CONGRATS: { title: 'Congratulations', body: 'You have crossed every level in steadying your nerves at work. Try it before your next big moment, and tell me how it goes. I would love to know.' },
};

// Chapter 5 · Confidence. The graded levels teach reading and reframing self-doubt;
// the power move is a self-compassion break (the meta-analytically strongest lever).
export const CONFIDENCE: Chapter = {
  id: 'confidence',
  emotion: 'Confidence',
  track: 'workplace',
  levels: [
    { id: 'conf-l1', n: 1, title: 'Know the water', kind: 'swipe',
      intro: "Real quick, let's clear up a few things about confidence at work. Swipe right if it is true, left if it is a myth." },
    { id: 'conf-l2', n: 2, title: 'Read the wave', kind: 'tap',
      intro: 'Here is what changes everything. How loud is the self-doubt, a little or a lot? What helps depends entirely on the answer.' },
    { id: 'conf-l3', n: 3, title: 'Match the move', kind: 'preview',
      intro: 'You can read it now. So pick what actually helps. Not sure? Hold a card to see how it plays out before you commit.' },
    { id: 'conf-l4', n: 4, title: 'The power move', kind: 'compassion',
      intro: 'The one move for when you are hard on yourself: a kind word, the way you would give a friend. Here is how it works, then we do it together.' },
    { id: 'conf-l5', n: 5, title: 'The last test', kind: 'chips',
      intro: 'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.' },
  ],
  L1_CARDS: [
    { id: 'conf-l1-impostor', statement: 'Feeling like a fraud at work is common, even among people who are very good.',
      isTrue: true, reveal: 'Around half of people feel it, and it climbs with how capable you actually are. It is a feeling, not a fact about your work. You are in a big, quiet club.' },
    { id: 'conf-l1-action', statement: 'You have to feel confident before you can do the hard thing.',
      isTrue: false, reveal: 'It runs the other way. You do the thing a little scared, it goes okay, and the confidence follows. Waiting to feel ready is the trap. Action builds it, not the other way around.' },
    { id: 'conf-l1-compare', statement: 'Measuring yourself against how sorted everyone else looks fuels the doubt.',
      isTrue: true, reveal: 'You are comparing your inside to their outside. Everyone else is winging parts of it too, they just do it quietly. The reel is not the room.' },
    { id: 'conf-l1-harsh', statement: 'Being hard on yourself is what keeps your standards high.',
      isTrue: false, reveal: 'A harsh inner voice mostly makes you anxious and slower. Talking to yourself the way you would a friend is what actually keeps you steady and sharp. Kind beats cruel, every time.' },
    { id: 'conf-l1-evidence', statement: 'Recalling a real past win can quiet a flare of self-doubt.',
      isTrue: true, reveal: 'Doubt deals in feelings. Evidence deals in facts. One concrete thing you handled before is a fact the doubt cannot argue with.' },
  ],
  L1_INTRO: { kicker: 'Grow at work', subtitle: 'Simple, science-backed skills for a steadier sense of yourself at work.', emotion: 'At work: Confidence', level: 'Level 1', round: 'Easy round' },
  L1_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 1', body: 'That is the groundwork laid. Ready to see how you handle Level 2?' },
  L2_INTRO: { level: 'Level 2', title: 'Big or small?', subtitle: 'Self-doubt comes big or small. Noticing which comes before any fix.' },
  L2_CHEAT: { kicker: 'Cheat code', title: 'How to spot the size', rows: [
    { label: 'Thinking', small: 'a passing am-I-good-enough', big: 'I-do-not-belong, on a loop' },
    { label: 'Body', small: 'a small dip, still steady', big: 'hot face, sinking stomach, want to hide' },
    { label: 'Control', small: 'can still speak up', big: 'shrinking, going quiet, pulling back' },
  ] },
  L2_SCENES: [
    { id: 'conf-l2-a', scene: `${FRIEND_NAME} has an idea in a meeting and feels a flicker of is-this-obvious, but her hand is already half up.`, answer: 'little', why: 'A flicker, and she is still moving toward speaking. Small doubt, still in the driver seat.' },
    { id: 'conf-l2-b', scene: `${FRIEND_NAME} smiles and says she is thrilled about the promotion, then quietly starts listing everyone more qualified than her.`, answer: 'lot', why: 'The smile hides it. That list is the I-do-not-belong loop starting up. Big, even when it looks fine.' },
    { id: 'conf-l2-c', scene: `${FRIEND_NAME} got sharp feedback and feels the sting, but she can already see one fair point in it.`, answer: 'little', why: 'It stings, but she is still weighing it clearly. Reachable, so it is small.' },
    { id: 'conf-l2-d', scene: `${FRIEND_NAME} keeps rereading one critical Slack line and has stopped opening her other work.`, answer: 'lot', why: 'One line has taken over and she cannot function around it. That is the big one, however quiet it looks.' },
    { id: 'conf-l2-e', scene: `${FRIEND_NAME} wonders out loud if she has enough experience for a role, and pulls up the job description to check.`, answer: 'little', why: 'A real question she is actually checking, not a spiral. Still steady.' },
  ],
  L2_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 2', body: 'You can read the size now. That is the read the whole game turns on.' },
  L3_INTRO: { level: 'Level 3', title: 'What helps most?', lead: 'Two moves handle self-doubt best.', points: [
    { term: 'Name it and check the facts', def: 'call it doubt, then recall one real win it cannot argue with' },
    { term: 'Be kind and steady', def: 'talk to yourself like a friend, and take the next small step anyway' },
  ] },
  L3_CHEAT: { kicker: 'Cheat code', title: 'When to check the facts, when to be kind', rows: [
    { label: 'Name it and check the facts', small: 'works best', big: 'not enough on its own', bad: false },
    { label: 'Be kind and steady', small: 'more than she needs', big: 'best, it steadies her', bad: false },
    { label: 'Prove it to everyone', small: 'the bar just moves', big: 'the bar keeps moving', bad: true },
  ] },
  L3_SCENES: [
    { id: 'conf-l3-idea', intensity: 'little', prompt: `${FRIEND_NAME} feels an is-this-obvious flicker before sharing an idea. What helps most?`, options: [
      { label: 'Name it, that is doubt, and say it anyway', tier: 'best', future: 'Named, the flicker loses its grip, and saying it is how the confidence grows.' },
      { label: 'Wait to see if someone smarter says it first', tier: 'worst', future: 'Holding back feels humble, but it teaches her to stay quiet, and someone else gets the credit for her idea.' },
      { label: 'Quietly recall a past win before she speaks', tier: 'lesser', future: 'Fine, but this one is small. Naming it and speaking would do it.' },
    ] },
    { id: 'conf-l3-table', intensity: 'lot', prompt: `${FRIEND_NAME} is spiraling that the senior table will find out she does not belong. What helps most?`, options: [
      { label: 'Be kind to herself and take one small step in', tier: 'best', future: 'Flooded, she needs steadying before facts. A kind word and one small action settle her.' },
      { label: 'Study how the others got their seats to measure up', tier: 'worst', future: 'Measuring against them always finds a gap. Comparison is the fuel the spiral runs on.' },
      { label: 'Silently list her own qualifications', tier: 'lesser', future: 'A fair move, but mid-spiral the facts bounce off. She has to soften first.' },
    ] },
    { id: 'conf-l3-feedback', intensity: 'lot', prompt: `${FRIEND_NAME} got good feedback but cannot stop rereading the one critical line. What helps most?`, options: [
      { label: 'Be gentle, one note is not the whole verdict', tier: 'best', future: 'The kindness drops the flood. Then the one line is just one line again.' },
      { label: 'Ask her manager to reassure her it was fine', tier: 'worst', future: 'The reassurance calms her for an hour, then the doubt is back and needs topping up. It never fills the hole.' },
      { label: 'Weigh the praise against the one critique', tier: 'lesser', future: 'Sensible, but too worked up to hold both. Calm has to come first.' },
    ] },
    { id: 'conf-l3-apply', intensity: 'little', prompt: `${FRIEND_NAME} hesitates to apply, unsure she ticks enough boxes. What helps most?`, options: [
      { label: 'Name the doubt and check the actual boxes', tier: 'best', future: 'Still steady, so the facts land. She sees she is closer than the doubt claimed.' },
      { label: 'Add one more course before she feels ready', tier: 'worst', future: 'There is always one more course. Waiting to feel ready is how the role passes her by.' },
      { label: 'Give herself a quick pep talk first', tier: 'lesser', future: 'Not wrong, but overkill here. A quick box-check would do it.' },
    ] },
  ],
  L3_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 3', body: 'You can pick what fits the size of the doubt now. That is the move the whole game builds to.' },
  L4_INTRO: { level: 'Level 4', title: 'The power move', subtitle: 'You can read the doubt now. Here is the one move for when you are being hard on yourself.' },
  L4_TEACH: { kicker: 'The cheat code', title: 'Give yourself the kind word', rule: 'Notice it is hard, remember you are not the only one, then say one kind thing.', doses: [
    { size: 'Small feeling', amount: 'One kind line' },
    { size: 'Big feeling', amount: 'The full three-beat reset' },
  ], cta: "Let's do it" },
  L4_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 4', body: 'That kind word is your power move now. Any time you catch yourself being hard on yourself.' },
  L4_COMPASSION: {
    teach: { kicker: 'The cheat code', title: 'The three-beat reset', beats: [
      'Notice it. Say, this one is hard right now.',
      'Remember, everyone who has stood here has felt it too.',
      'Say one kind thing, the way you would to a friend.',
    ] },
    practice: [
      { label: 'Notice', line: 'This one is hard right now.', cue: 'I feel this' },
      { label: 'Not alone', line: 'Everyone who has sat at that table has felt this too.', cue: 'I am not the only one' },
    ],
    kindPrompt: 'Now the kind thing. Pick the line you would offer a friend standing here.',
    kindLines: [
      'I am still learning, and that is enough today.',
      'I have handled hard things before. I can handle this.',
      'I am allowed to take up space here.',
    ],
  },
  L5_INTRO: { level: 'Level 5', title: 'The last test', subtitle: 'One real work moment, start to finish. Read it, handle it, be kind.' },
  L5_CAPSTONE: { scene: `${FRIEND_NAME} walks into a room of people more senior than her, certain they will see she does not belong.`, size: 'lot', sizeWhy: 'A full I-do-not-belong loop before a big moment. She is flooded, so facts will not land yet.', prompt: 'What helps her most right now?', options: [
    { label: 'Be kind to herself and take one small step in', tier: 'best', future: 'The kindness settles the flood. Then she can be in the room instead of watching herself.' },
    { label: 'Size herself up against the most senior person there', tier: 'worst', future: 'Measuring against them always finds a gap. Comparison is the fuel the spiral runs on.' },
    { label: 'Silently list why she earned the seat', tier: 'lesser', future: 'A fair move, but mid-spiral the facts bounce off. She has to soften first.' },
  ] },
  L5_BREATH_Q: {
    stepLabel: 'The kind word',
    prompt: 'When you catch yourself being hard on yourself, what is the move?',
    options: [
      { label: 'Push through and ignore the feeling', correct: false },
      { label: 'Tell yourself to just be more confident', correct: false },
      { label: 'Say one kind thing, the way you would to a friend', correct: true },
    ],
    whyRight: 'You talk to yourself the way you would to a friend. Kind, honest, on your side.',
    whyWrong: 'The move is the kind word. You talk to yourself the way you would to a friend.',
  },
  L5_REORDER: { stepLabel: 'Put it in order', prompt: 'When self-doubt hits at work, what do you do?', steps: [
    'Check if I am hungry or tired',
    'Read the size, big or small',
    'Small doubt, name it and recall a real win',
    'Big doubt, be kind and take one small step',
  ], whyRight: 'That is the whole method, start to finish.', whyWrong: 'Not the order yet. Move the steps around and try again.' },
  L5_DECK: {
    stepLabel: 'Route each moment',
    gates: {
      basics: { lead: 'Basics first', move: 'food or sleep' },
      small: { lead: 'Small', move: 'recall a win' },
      big: { lead: 'Big', move: 'be kind' },
    },
    cards: [
      {
        id: 'conf-d1',
        scene: `${FRIEND_NAME} is doubting everything today, and it clicks that she is running on no sleep and no lunch.`,
        route: 'basics',
        foil: 'big',
        reveal: 'Empty and tired makes everything look worse. Steady the body first.',
        nudge: 'Check the basics before you weigh the doubt.',
      },
      {
        id: 'conf-d2',
        scene: `${FRIEND_NAME} feels an is-this-obvious flicker before sharing an idea, but her hand is already half up.`,
        route: 'small',
        foil: 'big',
        reveal: 'A small flicker, still moving. Name it and recall one real win.',
        nudge: 'She is already reaching to speak. How big is this?',
      },
      {
        id: 'conf-d3',
        scene: `${FRIEND_NAME} smiles about the promotion, then quietly lists everyone more qualified than her.`,
        route: 'big',
        foil: 'small',
        reveal: 'That list is the I-do-not-belong loop. A kind word first, then one small step.',
        nudge: 'Under the smile, is she spiralling or steady?',
      },
      {
        id: 'conf-d4',
        scene: `${FRIEND_NAME} got sharp feedback and feels the sting but can already see one fair point in it.`,
        route: 'small',
        foil: 'big',
        reveal: 'Still weighing it clearly. Name the sting and recall what she does well.',
        nudge: 'She can still see it fairly. This is small.',
      },
    ],
  },
  L5_CONGRATS: { title: 'Congratulations', body: 'You have crossed every level in steadying your confidence at work. Try it before your next big moment, and tell me how it goes. I would love to know.' },
};

// Chapter 6 · Speaking up. The graded levels teach reading whether she is steady
// enough to speak and choosing to say it; the power move builds a four-part script.
// v1 is instruction-first: the line is prewritten and specific. AI feedback later.
export const ASSERTIVENESS: Chapter = {
  id: 'assertiveness',
  emotion: 'Speaking up',
  track: 'workplace',
  poles: { small: 'Now', big: 'Later' },
  cheatCols: { small: 'Speak now', big: 'Speak later' },
  levels: [
    { id: 'assert-l1', n: 1, title: 'Know the water', kind: 'swipe',
      intro: "Real quick, let's clear up a few things about speaking up at work. Swipe right if it is true, left if it is a myth." },
    { id: 'assert-l2', n: 2, title: 'Read the wave', kind: 'tap',
      intro: 'Here is what changes everything. Is she steady enough to say it now, a little worked up or a lot? What helps depends entirely on the answer.' },
    { id: 'assert-l4', n: 3, title: 'The power move', kind: 'script',
      intro: 'The one move that lets you speak up without a fight: build the line before you need it. Here is the shape, then we build one together.' },
    { id: 'assert-l5', n: 4, title: 'The last test', kind: 'chips',
      intro: 'Last one. Put the whole chapter into a single plan, in your own words, so it is ready before you need it.' },
  ],
  L1_CARDS: [
    { id: 'assert-l1-aggressive', statement: 'Being assertive means being blunt or forceful.',
      isTrue: false, reveal: 'Assertive is saying what you need and leaving room for the other person. Aggressive rolls over them. They look alike for a second and land completely differently.' },
    { id: 'assert-l1-team', statement: 'Asking for something at work lands better when you frame it as a win for the team, not just for you.',
      isTrue: true, reveal: 'Same ask, warmer yes. Tying it to something you both gain turns a personal demand into a shared win, and it sidesteps some of the pushback a solo ask can draw. It is why a good ask ends on the upside for both of you.' },
    { id: 'assert-l1-natural', statement: 'Women are just naturally less assertive than men.',
      isTrue: false, reveal: 'Not really. Women speak up as clearly as anyone. What differs is the reception: the same firm ask draws more pushback for a woman than a man. The skill is yours to build. The unfair part is not your fault.' },
    { id: 'assert-l1-abrasive', statement: 'Say the exact same firm thing a man says, and a woman is likelier to be called abrasive.',
      isTrue: true, reveal: "That is bias in the room, not a flaw in your delivery. Naming it matters for one reason, so you do not read someone else's double standard as your own mistake and go quiet. You keep saying it clearly. The problem is theirs to fix." },
    { id: 'assert-l1-knack', statement: 'Speaking up well is a knack. You either have it or you do not.',
      isTrue: false, reveal: 'It is a skill, not a personality. The people who sound natural are usually following a shape: name the thing, say how it lands, ask for the change, and give the upside. Learn the shape and it is yours too, even on a nervous day.' },
  ],
  L1_INTRO: { kicker: 'Grow at work', subtitle: 'Simple, science-backed skills to speak up and be heard.', emotion: 'At work: Speaking up', level: 'Level 1', round: 'Easy round' },
  L1_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 1', body: 'That is the groundwork laid. Ready to see how you handle Level 2?' },
  L2_INTRO: { level: 'Level 2', title: 'Speak now or later?', subtitle: 'Your state of mind decides whether to speak now or later. Learning to read it comes first.' },
  L2_CHEAT: { kicker: 'Cheat code', title: 'How to spot the size', rows: [
    { label: 'Thinking', small: 'can plan the words', big: 'just want to snap or shut down' },
    { label: 'Body', small: 'a little tense', big: 'hot, heart racing, jaw tight' },
    { label: 'Control', small: 'can speak evenly', big: 'it would come out sharp' },
  ] },
  L2_SCENES: [
    { id: 'assert-l2-a', scene: `${FRIEND_NAME}'s teammate took credit for her work in the meeting. She saw it coming, so it does not throw her, and her voice and face stay even.`, answer: 'little', why: 'Steady, not blindsided. She saw it coming and kept level, so she can say it now, kind and clear.' },
    { id: 'assert-l2-b', scene: `${FRIEND_NAME} sounds calm, but she is gripping her pen and her replies have gone short and clipped.`, answer: 'lot', why: 'The calm voice is a lid. The grip and the clipped replies say she is worked up underneath. Better to wait.' },
    { id: 'assert-l2-c', scene: `${FRIEND_NAME} is bummed about being passed over, but she can still laugh and hear the other side.`, answer: 'little', why: 'Low, but still open and thinking. Feeling down is not the same as too worked up, so she can speak now.' },
    { id: 'assert-l2-d', scene: `${FRIEND_NAME} got dumped with a deadline that is not hers. She is quiet now, jaw tight, replaying it on a loop.`, answer: 'lot', why: 'Quiet, tight, and stuck on a loop. That is worked up, even without a raised voice. Steady first, then speak.' },
    { id: 'assert-l2-e', scene: `${FRIEND_NAME} needs to correct a colleague and feels a little awkward, but she can say it plainly.`, answer: 'little', why: 'Awkward but level. She can name it kindly and clearly, so now works.' },
    { id: 'assert-l2-f', scene: `${FRIEND_NAME} was talked over for the third time. Her jaw is tight and she is gripping her pen under the table.`, answer: 'lot', why: 'Tight jaw, gripping her pen. She is too worked up, so it would come out sharp. Wait, then speak.' },
    { id: 'assert-l2-g', scene: `${FRIEND_NAME} wants to ask for a day off. She feels a small flutter, but she is calm and can say it plainly.`, answer: 'little', why: 'A small flutter, but steady underneath. She can just ask, now.' },
  ],
  L2_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 2', body: 'You can read the size now. That is the read the whole game turns on.' },
  L4_INTRO: { level: 'Level 3', title: 'The power move', subtitle: 'You know when to speak now. Here is how to build the line so it lands clean.' },
  L4_TEACH: { kicker: 'The cheat code', title: 'The four-part line', rule: 'Name the facts, say how it lands, ask for the change, and give the upside.', doses: [
    { size: 'Small ask', amount: 'The ask and the why' },
    { size: 'Bigger ask', amount: 'All four parts' },
  ], cta: "Let's build it" },
  L4_CONGRATS: { title: 'Congratulations', subtitle: 'You passed Level 3', body: 'That four-part line is your power move now. Build it before the moment, and you walk in ready.' },
  L4_SCRIPT: {
    teach: { kicker: 'The cheat code', title: 'The four-part line', rows: [
      { part: 'Name it', hint: 'the facts, no blame' },
      { part: 'How it lands', hint: 'the effect on you or the work' },
      { part: 'Ask', hint: 'the clear change you want' },
      { part: 'Because', hint: 'the upside for both of you' },
    ] },
    scenario: 'A teammate keeps interrupting when you speak.',
    steps: [
      { part: 'Name it', hint: 'the facts, no blame',
        correct: 'In the last few meetings, I have been cut off before I finished my point.',
        decoy: 'You keep interrupting me and talking over everyone.',
        why: 'That opens with blame, so he goes defensive before he hears the ask.' },
      { part: 'How it lands', hint: 'the effect on you or the work',
        correct: 'It makes it hard for me to get my ideas into the room.',
        decoy: 'It is rude and pretty unprofessional.',
        why: 'That is a label, not an effect. It makes it about his character, not the work.' },
      { part: 'Ask', hint: 'the clear change you want',
        correct: 'Could we let each other finish before jumping in?',
        decoy: 'Could you maybe try to be a bit better about that?',
        why: 'Too vague to act on, and the hedge invites a shrug.' },
      { part: 'Because', hint: 'the upside for both of you',
        correct: 'We will both do our best thinking if we hear the whole thing.',
        decoy: 'Otherwise I will have to bring it up with our manager.',
        why: 'A threat turns a fair ask into a fight. The upside is what makes it land.' },
    ],
    sayIt: 'Read your whole line out loud once, so it is in your mouth and not just your head.',
  },
  L5_INTRO: { level: 'Level 4', title: 'The last test', subtitle: 'A few real work moments, quick. Read each one and make the call.' },
  L5_CAPSTONE: { scene: `${FRIEND_NAME} was just talked over again in a meeting and she is furious, gripping her pen under the table.`, size: 'lot', sizeWhy: 'Furious and gripping. Right now it would come out as an attack. She needs to steady first.', prompt: 'What helps her most right now?', options: [
    { label: 'Take a breath, wait, then raise it with her line', tier: 'best', future: 'The heat drops, so her four-part line lands as a fair ask instead of a blowup.' },
    { label: 'Laugh it off now and vent about it after', tier: 'worst', future: 'Joking hides it and venting changes nothing. The one person who could fix it never hears the ask.' },
    { label: 'Cut back in sharply to finish her point', tier: 'lesser', future: 'Understandable, but mid-flood it becomes a clash. Better once she is steady.' },
  ] },
  L5_BREATH_Q: {
    stepLabel: 'The line',
    prompt: 'What is the shape of a line that gets you heard?',
    options: [
      { label: 'Whatever comes out when you are angry', correct: false },
      { label: 'Soften it until the ask disappears', correct: false },
      { label: 'Name it, how it lands, the ask, and the why', correct: true },
    ],
    whyRight: 'Name the facts, say how it lands, ask for the change, and give the upside. Warm and clear.',
    whyWrong: 'The line has four parts: name it, how it lands, the ask, and the why. Warm and clear.',
  },
  L5_REORDER: { stepLabel: 'Put it in order', prompt: 'When you need to speak up at work, what do you do?', steps: [
    'Check if I am hungry or tired',
    'Read the size, am I steady or too worked up',
    'Steady, say it now, kind and clear',
    'Too worked up, wait, then use my four-part line',
  ], whyRight: 'That is the whole method, start to finish.', whyWrong: 'Not the order yet. Move the steps around and try again.' },
  L5_DECK: {
    stepLabel: 'Route each moment',
    gates: {
      basics: { lead: 'Basics first', move: 'food or sleep' },
      small: { lead: 'Now', move: 'say it, kind and clear' },
      big: { lead: 'Later', move: 'wait, then your line' },
    },
    cards: [
      {
        id: 'assert-d1',
        scene: `${FRIEND_NAME} worked through the whole night and walked straight into an early meeting. She cannot think straight.`,
        route: 'basics',
        foil: 'big',
        reveal: 'Running on no sleep. Get her rested before she says a word, or it comes out as pure exhaustion.',
        nudge: 'Before you read the mood, check the sleep.',
      },
      {
        id: 'assert-d2',
        scene: `${FRIEND_NAME}'s teammate took the credit for her work. She did not react in the moment, and now she is calmly drafting what to say.`,
        route: 'small',
        foil: 'big',
        reveal: 'Quiet then, but steady now and already planning. She can send it, kind and clear.',
        nudge: 'She is calm and drafting. Ready to speak, or actually too worked up?',
      },
      {
        id: 'assert-d3',
        scene: `${FRIEND_NAME} was talked over for the third time. Her jaw is tight and she is gripping her pen under the table.`,
        route: 'big',
        foil: 'small',
        reveal: 'Too worked up, it would come out as an attack. She waits, then uses her line.',
        nudge: 'Tight jaw, gripped pen. Would it come out clean right now?',
      },
      {
        id: 'assert-d4',
        scene: `${FRIEND_NAME} needs to correct a colleague and feels a little awkward, but she can say it plainly.`,
        route: 'small',
        foil: 'big',
        reveal: 'Awkward but steady. She names it kindly and clearly, now.',
        nudge: 'Awkward, but is she actually worked up?',
      },
    ],
  },
  L5_CONGRATS: { title: 'Congratulations', body: 'You have crossed every level in speaking up at work. Try it the next time something needs saying, and tell me how it goes. I would love to know.' },
};

// All chapters, in play order, split by shelf. The emotion shelf (CHAPTERS) feeds
// the Now tab's coached action and the "Train your mind" list; the workplace shelf
// is its own list. The runner resolves ?chapter against every chapter.
export const CHAPTERS: Chapter[] = [IRRITABILITY, ANXIETY, MOOD_SWINGS];
export const WORK_CHAPTERS: Chapter[] = [WORK_ANXIETY, CONFIDENCE, ASSERTIVENESS];

// Friendly, benefit-first names for each course (chapter), keyed by chapter id —
// what she gets, not the symptom. Used where a course is named to her (the Now
// card's coached ask), in place of the clinical `emotion`.
export const COURSE_TITLE: Record<string, string> = {
  irritability: 'Stay steady',
  anxiety: 'Calm the spiral',
  'mood-swings': 'Ride the waves',
  'work-anxiety': 'Steady your nerves',
  confidence: 'Sound confident',
  assertiveness: 'Speak up',
};
const ALL_CHAPTERS: Chapter[] = [...CHAPTERS, ...WORK_CHAPTERS];

export function getChapter(id?: string): Chapter {
  return ALL_CHAPTERS.find((c) => c.id === id) ?? IRRITABILITY;
}

export function chaptersForTrack(track?: string): Chapter[] {
  return track === 'workplace' ? WORK_CHAPTERS : CHAPTERS;
}

// The next thing to do across all chapters: continue the one in progress, else
// start the first untouched one, else everything is done. `next` names the
// concrete target level so callers (the Grow shelf, the Now tab's train action)
// can deep-link straight into it.
export type TrainSummary = {
  statusWord: 'Continue' | 'Start' | 'Complete';
  detail: string;
  next: { chapterId: string; levelId: string; n: number } | null;
};

// The Now tab's coached train action reads the growth shelf only, so workplace
// progress never becomes the PMS-day nudge. The Grow shelf reads each track.
export function trainSummary(training: { completed: string[] }): TrainSummary {
  return summarize(CHAPTERS, training);
}

export function workSummary(training: { completed: string[] }): TrainSummary {
  return summarize(WORK_CHAPTERS, training);
}

function summarize(chapters: Chapter[], training: { completed: string[] }): TrainSummary {
  const inProgress = chapters.find((c) => {
    const done = c.levels.filter((l) => training.completed.includes(l.id)).length;
    return done > 0 && done < c.levels.length;
  });
  if (inProgress) {
    const level = inProgress.levels.find((l) => !training.completed.includes(l.id))!;
    return {
      statusWord: 'Continue',
      detail: `${inProgress.emotion}, Level ${level.n}`,
      next: { chapterId: inProgress.id, levelId: level.id, n: level.n },
    };
  }
  const untouched = chapters.find((c) => !c.levels.some((l) => training.completed.includes(l.id)));
  if (untouched) {
    const level = untouched.levels[0];
    return {
      statusWord: 'Start',
      detail: `Begin with ${untouched.emotion}`,
      next: { chapterId: untouched.id, levelId: level.id, n: level.n },
    };
  }
  return { statusWord: 'Complete', detail: 'You have trained them all', next: null };
}

