// Content for the V3 emotion-training game, first chapter: Irritability.
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

// L5 — your move next time, tap-to-assemble chips.
export interface L5Slot {
  id: string;
  lead: string; // the words before the blank
  options: string[];
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
    title: 'Rehearse',
    kind: 'breathe',
    intro:
      "Remember that long exhale from before? Let's actually do it. This is what taking 20 feels like from the inside.",
  },
  {
    id: 'irr-l5',
    n: 5,
    title: 'Your move next time',
    kind: 'chips',
    intro:
      "Last thing. Let's turn this into a plan for you, in your own words, so it is ready before you need it.",
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

// Level 4 · Rehearse. The long exhale from L1, done for real. A self-contained
// 4-7-8 breath: the technique she has been pointed at all game, now felt from the
// inside. No right or wrong, so the reward here is simply doing it.
export const L4_INTRO = {
  level: 'Level 4',
  title: 'Rehearse',
  subtitle: 'You know the moves. Now feel the one that settles a big wave, from the inside.',
};

export const L4_TEACH = {
  kicker: 'Cheat code',
  title: 'The 4-7-8 breath',
  body: 'In for 4, hold for 7, out for 8. The long exhale is the part that tells your body to calm down. That is the whole trick.',
};

export const L4_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You passed Level 4',
  body: 'That long exhale is yours now. It is what taking 20 feels like from the inside.',
};

// Level 5 · Your move next time. Turn the whole chapter into one if-then plan in
// her own words, tap-to-assemble. The chapter closes here, with the kind word.
export const L5_INTRO = {
  level: 'Level 5',
  title: 'Your move next time',
  subtitle: 'Turn all of this into one plan, in your own words, ready before you need it.',
};

export const L5_TEMPLATE = 'When I am {intensity} worked up and {trigger}, before I react I will {action}.';
export const L5_SLOTS: L5Slot[] = [
  { id: 'intensity', lead: 'When I am', options: ['a little', 'a lot'] },
  {
    id: 'trigger',
    lead: 'and',
    options: ['someone blows me off', 'I am running on no sleep', 'I am hungry and snappy'],
  },
  {
    id: 'action',
    lead: 'before I react I will',
    options: ['take 20 minutes', 'step outside', 'breathe out slow', 'say it later'],
  },
];

export const L5_CONGRATS = {
  title: 'Congratulations',
  subtitle: 'You finished Irritability',
  body: 'You can read the size, pick the move that fits, and you have a plan for next time. That is the whole chapter.',
};

export const KIND_WORD = {
  title: 'One kind thing to yourself',
  body: 'You are doing something hard here. That counts.',
  hold: 'Hold to give yourself a break',
  done: 'That counts. Come back to it any time.',
};

// The chapter, for the dashboard's Level card.
export const CHAPTER = {
  id: 'irritability',
  title: 'Irritability',
  levels: IRRITABILITY_LEVELS,
};

// Build the assembled L5 sentence from chosen slot values (id -> option).
export function buildL5Sentence(choices: Record<string, string>): string {
  return L5_TEMPLATE.replace(/\{(\w+)\}/g, (_, k: string) => choices[k] ?? '...');
}
