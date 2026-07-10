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

export type LevelKind = 'swipe' | 'tap' | 'preview' | 'breathe' | 'chips';

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
    id: 'l1-train',
    statement: 'Learning to handle your emotions can make PMS easier.',
    isTrue: true,
    reveal:
      'Handling hard feelings is a skill, not a fixed trait. The more you practice, the lighter your rough weeks get. That is exactly what we are building here.',
  },
  {
    id: 'l1-common',
    statement: 'Irritability is the number one PMS symptom.',
    isTrue: true,
    reveal:
      'Of everyone who gets PMS, about 95 percent feel irritable. That beats the mood swings, the sadness, and the anxiety. You are in very good company.',
  },
  {
    id: 'l1-hormones',
    statement: 'If PMS makes you snap, your hormones must be off.',
    isTrue: false,
    reveal:
      'Your hormones are completely normal. Your brain is just reading them louder this week. That is a real thing, and it does not mean something is wrong with you.',
  },
  {
    id: 'l1-hungry',
    statement: 'Skipping meals or sleep makes you more irritable.',
    isTrue: true,
    reveal:
      'When your blood sugar dips or you are low on sleep, everything feels more annoying. So before you spiral, eat something and get some rest.',
  },
  {
    id: 'l1-exhale',
    statement: 'To calm down, breathe in longer than you breathe out.',
    isTrue: false,
    reveal:
      'It is actually the other way around. A slow, long exhale is what tells your body to relax. We will practice the real thing, Wind Down, soon.',
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
    scene: `${FRIEND_NAME} is snapping at little stuff, but she laughs when you point it out.`,
    answer: 'little',
    why: 'Still reachable. She is not past talking.',
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
        label: 'It is not a big deal, let it go',
        tier: 'worst',
        future: 'Waving it off buries it. It comes back louder.',
      },
      {
        label: 'He is probably slammed at work',
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
        label: 'She is tough, she can power through',
        tier: 'worst',
        future: 'Powering through a flood does not calm it. It leaks out later.',
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
        label: 'Stay composed and keep it in',
        tier: 'worst',
        future: 'Clamping down mid-crisis piles on pressure. It comes back louder.',
      },
    ],
  },
  {
    id: 'l3-snapping',
    intensity: 'little',
    prompt: `${FRIEND_NAME} is snapping at little stuff, but she laughs when you point it out. What helps most?`,
    options: [
      {
        label: 'It is a rough day, not everyone turning on her',
        tier: 'best',
        future: 'Still reachable, so a fairer read lands and she softens.',
      },
      {
        label: 'Tell her to ignore it',
        tier: 'worst',
        future: 'Ignoring it lets it stack up. Small now, bigger later.',
      },
      {
        label: 'Send her off alone for 20',
        tier: 'lesser',
        future: 'Overkill. She did not need space, a quick reframe would do it.',
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

export interface Chapter {
  id: string;
  emotion: string; // display name for the home card, e.g. 'Irritability'
  levels: GameLevel[];
  L1_CARDS: L1Card[];
  L1_INTRO: { kicker: string; subtitle: string; emotion: string; level: string; round: string };
  L1_CONGRATS: Congrats;
  L2_INTRO: { level: string; title: string; subtitle: string };
  L2_CHEAT: { kicker: string; title: string; rows: CheatRow[] };
  L2_SCENES: L2Scene[];
  L2_CONGRATS: Congrats;
  L3_INTRO: { level: string; title: string; lead: string; points: { term: string; def: string }[] };
  L3_CHEAT: { kicker: string; title: string; rows: CheatRowBad[] };
  L3_SCENES: L3Scene[];
  L3_CONGRATS: Congrats;
  L4_INTRO: { level: string; title: string; subtitle: string };
  L4_TEACH: { kicker: string; title: string; rule: string; doses: { size: string; amount: string }[]; cta: string };
  L4_CONGRATS: Congrats;
  L5_INTRO: { level: string; title: string; subtitle: string };
  L5_CAPSTONE: L5Capstone;
  L5_BREATH_Q: BreathQuestion;
  L5_REORDER: Reorder;
  L5_CONGRATS: Congrats;
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
      statement: 'Anxiety that climbs before your period usually eases once it starts.',
      isTrue: true,
      reveal:
        'The calming brain chemistry that dips late in your cycle comes back as your period begins, so the edge tends to lift within a day or two. Knowing it is cyclical, not permanent, takes some of its bite out.',
    },
    {
      id: 'anx-l1-threat',
      statement: 'If you feel anxious, something must actually be wrong.',
      isTrue: false,
      reveal:
        'Anxiety is your body preparing for a threat, not proof there is one. Before your period it can fire the alarm louder over smaller things. The feeling is real, the danger usually is not.',
    },
    {
      id: 'anx-l1-suppress',
      statement: 'Telling yourself to stop worrying can make the worry louder.',
      isTrue: true,
      reveal:
        'The harder you push a thought away, the more your brain keeps checking it is gone, which holds it front and center. The way out is not to fight it. You name it, then come back to what is real right now.',
    },
    {
      id: 'anx-l1-avoid',
      statement: 'Avoiding what makes you anxious makes the anxiety grow.',
      isTrue: true,
      reveal:
        'Every time you dodge it, your brain learns the thing was dangerous, so next time the fear is bigger. Facing it in small steps is what shrinks it.',
    },
    {
      id: 'anx-l1-exhale',
      statement: 'To calm down, breathe in longer than you breathe out.',
      isTrue: false,
      reveal:
        'It is the other way around. A slow, long exhale is the signal that tells your body the alarm can switch off. We will practice the real thing soon.',
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
      scene: `${FRIEND_NAME} feels a low buzz of nerves about the week, but she can still laugh it off.`,
      answer: 'little',
      why: 'Still reachable. The nerves are there, but they are not running her.',
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
      statement: 'Putting a feeling into words takes some of its power away.',
      isTrue: true,
      reveal:
        'This is what naming it means: you say what you feel, like this is a wave of sadness, out loud or in your head. When you label a feeling instead of bottling it, your brain settles a little and the wave loses its grip. Saying it is what starts to shrink it.',
    },
    {
      id: 'mood-l1-rejection',
      statement: 'Before your period, a neutral text can feel like a real rejection.',
      isTrue: true,
      reveal:
        'Late in the cycle your brain gets more tuned to signs of rejection, so a short reply or a flat look can sting more than it was meant to. The hurt is real. The rejection usually is not.',
    },
    {
      id: 'mood-l1-verdict',
      statement: 'What you feel in the moment is the truth about your whole life.',
      isTrue: false,
      reveal:
        'A swing makes everything feel bigger and more permanent than it is. The feeling is real, but it is a wave, not a verdict. Wait for the tide to drop before you trust the read.',
    },
    {
      id: 'mood-l1-passes',
      statement: 'A mood swing usually crests and fades if you do not act on it.',
      isTrue: true,
      reveal:
        'Left alone, the wave rises, breaks, and drops, often within the hour. Most of the damage comes from acting while it is high, not from the wave itself.',
    },
    {
      id: 'mood-l1-exhale',
      statement: 'To calm down, breathe in longer than you breathe out.',
      isTrue: false,
      reveal:
        'It is the other way around. A slow, long exhale is what tells your body to settle. We will practice the real thing soon.',
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
      scene: `${FRIEND_NAME} feels a little extra sensitive today but can still let things go.`,
      answer: 'little',
      why: 'Still reachable. The feeling is there, but it is not running her.',
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
  L5_CONGRATS: {
    title: 'Congratulations',
    body: 'You have crossed every level in riding your mood waves. Try it in real life, and tell me how it goes. I would love to know.',
  },
};

// All chapters, in play order. The home lists these; the game runner resolves
// ?chapter against them and falls back to Irritability.
export const CHAPTERS: Chapter[] = [IRRITABILITY, ANXIETY, MOOD_SWINGS];

export function getChapter(id?: string): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? IRRITABILITY;
}

