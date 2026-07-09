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

// L4 — say it or save it, slider on a timeline.
export interface L4Zone {
  id: 'now' | 'take20' | 'never';
  label: string;
  best: boolean;
  future: string;
}

// L6 — your move next time, tap-to-assemble chips.
export interface L6Slot {
  id: string;
  lead: string; // the words before the blank
  options: string[];
}

export type LevelKind = 'swipe' | 'tap' | 'preview' | 'slider' | 'breathe' | 'chips';

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
    title: 'Say it, or save it',
    kind: 'slider',
    intro:
      'Sometimes the annoyance is pointing at something real. The move is not swallowing it, it is saying it when she will actually be heard.',
  },
  {
    id: 'irr-l5',
    n: 5,
    title: 'Rehearse',
    kind: 'breathe',
    intro:
      "Remember that long exhale from before? Let's actually do it. This is what giving her space feels like from the inside.",
  },
  {
    id: 'irr-l6',
    n: 6,
    title: 'Your move next time',
    kind: 'chips',
    intro:
      "Last thing. Let's turn this into a plan for you, in your own words, so it is ready before you need it.",
  },
];

// L1 cards. Cards 3 and 4 stay general (no PMS stat) per the content gate; card
// 5 states the long-exhale physiology softly and pays off in L5.
export const L1_CARDS: L1Card[] = [
  {
    id: 'l1-hormones',
    statement: 'When PMS makes you snappy, something is wrong with your hormones.',
    isTrue: false,
    reveal:
      'Nope. Your hormones are normal. Your brain is just more sensitive to them right now. That is a real difference, and you are not broken.',
  },
  {
    id: 'l1-common',
    statement: 'Getting irritable before your period is common and normal.',
    isTrue: true,
    reveal: 'About half of women get this. You are in big company.',
  },
  {
    id: 'l1-hungry',
    statement: 'Being hungry makes you more irritable.',
    isTrue: true,
    reveal:
      'Low blood sugar turns the volume up on everything. Hangry is real, so eat something before you decide you hate everyone.',
  },
  {
    id: 'l1-sleep',
    statement: 'Bad sleep gives you a shorter fuse the next day.',
    isTrue: true,
    reveal: 'Less sleep, less patience. That is biology, not weakness.',
  },
  {
    id: 'l1-exhale',
    statement: 'Breathing out longer than you breathe in helps you calm down.',
    isTrue: true,
    reveal:
      'A long exhale tells your body to stand down. We will do the real thing, Wind Down, in a moment.',
  },
];

export const L1_CLOSE =
  'So before you help anyone, check the basics. Is she hungry? Wiped out? That is step one.';

export const L2_SCENES: L2Scene[] = [
  {
    id: 'l2-a',
    scene: `${FRIEND_NAME} is a little annoyed her partner did not text back.`,
    answer: 'little',
    why: 'Bugged, but she can still think straight.',
  },
  {
    id: 'l2-b',
    scene: `${FRIEND_NAME} has not slept, her partner blew off something she worked really hard on, and her voice is shaking.`,
    answer: 'lot',
    why: 'She is flooded. Words are not getting through right now.',
  },
  {
    id: 'l2-c',
    scene: `${FRIEND_NAME} is snapping at little stuff, but laughs when you point it out.`,
    answer: 'little',
    why: 'Still reachable.',
  },
];

export const L2_CLOSE =
  'That is the whole skill. Clock how worked up she is first. Nail that and the rest is easy.';

export const L3_SCENES: L3Scene[] = [
  {
    id: 'l3-little',
    intensity: 'little',
    prompt: `${FRIEND_NAME} is a little annoyed. What helps?`,
    options: [
      {
        label: 'Help her see it another way',
        tier: 'best',
        future: 'When she is only a little worked up, talking it through actually works.',
      },
      {
        label: 'Give her space',
        tier: 'lesser',
        future: 'She did not need space. You two could have just talked it out.',
      },
      {
        label: 'Tell her to push it down',
        tier: 'worst',
        future: 'That never works. It just comes back louder.',
      },
    ],
  },
  {
    id: 'l3-lot',
    intensity: 'lot',
    prompt: `${FRIEND_NAME} is flooded, running on no sleep. What helps?`,
    options: [
      {
        label: 'Help her see it another way',
        tier: 'lesser',
        future: 'Not right now. When she is this worked up, logic bounces off.',
      },
      {
        label: 'Give her space',
        tier: 'best',
        future: 'You cannot talk someone out of a flood. You wait for it to drop first.',
      },
      {
        label: 'Tell her to push it down',
        tier: 'worst',
        future: 'Same deal. It comes back louder.',
      },
    ],
  },
];

export const L3_PAYLOAD =
  'Same three choices. The only thing that changed was how worked up she was, and that flipped the right answer. That is the whole game.';

export const L4_SCENE = `Her partner genuinely blew off something ${FRIEND_NAME} cared about. That is real, not just PMS. When does she say something?`;

export const L4_ZONES: L4Zone[] = [
  {
    id: 'now',
    label: 'Right now, mid-meltdown',
    best: false,
    future: 'Too flooded. It turns into a fight and nothing gets fixed.',
  },
  {
    id: 'take20',
    label: 'Take 20, then say it straight',
    best: true,
    future: 'Calm enough that it actually lands.',
  },
  {
    id: 'never',
    label: 'Let it go, say nothing',
    best: false,
    future: 'It does not disappear, it piles up. Swallowing it is not the goal.',
  },
];

// L5 reuses the built Wind Down 4-7-8 technique (id in models/techniques.ts).
export const L5_TECHNIQUE_ID = 'wind-down';
export const L5_TEACH =
  'In for 4, hold 7, out for 8. The long exhale is the part that calms you down. That is the whole trick.';

export const L6_TEMPLATE = 'When I am {intensity} worked up and {trigger}, before I react I will {action}.';
export const L6_SLOTS: L6Slot[] = [
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

// Build the assembled L6 sentence from chosen slot values (id -> option).
export function buildL6Sentence(choices: Record<string, string>): string {
  return L6_TEMPLATE.replace(/\{(\w+)\}/g, (_, k: string) => choices[k] ?? '...');
}
