// All practices grouped by category. v1 ships the data; the session screen
// reads phases + visual colors from the breathing entries. Locked state is
// hard-coded for now; progression unlocking arrives with the Soul tier work.

import type { MotionType } from '../lib/motions';

export type Category = 'breathing' | 'mindfulness';

// 'hold2' is the hold that follows the exhale (vs 'hold' after the inhale).
// It reads as "hold" to the user but lets the visualiser keep the field at its
// dispersed extent instead of pulling it back toward centre.
export type PhaseType = 'inhale' | 'hold' | 'hold2' | 'exhale';

export type BreathPhase = {
  type: PhaseType;
  label: string;
  duration: number; // seconds
};

// HSL background tint that the session screen fades through during each
// phase. Numbers match the Mac `visual.colors[phase]` triples exactly
// (hue, saturation %, lightness %). Lightness is intentionally very low
// because this is the *background* color, not the particle color.
export type PhaseColors = {
  inhale: readonly [number, number, number];
  hold: readonly [number, number, number];
  exhale: readonly [number, number, number];
};

export type BreathingTechnique = {
  id: string;
  name: string;
  subtitle: string;
  durationSeconds: number;
  category: 'breathing';
  locked: boolean;
  instructions: string;
  // Optional one-line physical context shown under the name during a session,
  // for techniques whose action isn't obvious from the phase words (e.g. which
  // nostril, tongue position). Omit for self-explanatory ones like Box Breath.
  context?: string;
  phases: readonly BreathPhase[];
  rounds: number;
  colors: PhaseColors;
  motion: MotionType;
};

// A single guided line shown during a mindfulness session, held on screen
// for `duration` seconds (fades in/out at the edges). Mirrors the Mac
// MindfulPrompt.
export type MindfulPrompt = {
  text: string;
  duration: number; // seconds
};

export type MindfulnessTechnique = {
  id: string;
  name: string;
  subtitle: string;
  durationSeconds: number;
  category: 'mindfulness';
  locked: boolean;
  instructions: string;
  prompts: readonly MindfulPrompt[];
  // Background tint shifts inhale -> exhale across the prompts.
  colors: PhaseColors;
  motion: MotionType;
};

export type Technique = BreathingTechnique | MindfulnessTechnique;

export const TECHNIQUES: readonly Technique[] = [
  // ── Breathing ──
  {
    id: 'box',
    name: 'Box Breath',
    subtitle: 'calms under pressure',
    durationSeconds: 65,
    category: 'breathing',
    locked: false,
    instructions: 'In 4, hold 4, out 4, hold 4. Steady rhythm. Breathe through nose.',
    rounds: 4,
    phases: [
      { type: 'inhale', label: 'inhale', duration: 4 },
      { type: 'hold', label: 'hold', duration: 4 },
      { type: 'exhale', label: 'exhale', duration: 4 },
      { type: 'hold2', label: 'hold', duration: 4 },
    ],
    colors: {
      inhale: [230, 28, 12],
      hold: [250, 18, 11],
      exhale: [210, 22, 11],
    },
    motion: 'converge',
  },
  {
    id: 'ocean',
    name: 'Ocean Breath',
    subtitle: 'slows heart rate',
    durationSeconds: 60,
    category: 'breathing',
    locked: true,
    instructions: "Soft 'haaa' sound at the back of your throat. Breathe through nose.",
    context: 'Soft "haaa" sound at the back of your throat',
    rounds: 6,
    phases: [
      { type: 'inhale', label: 'inhale through nose', duration: 4 },
      { type: 'exhale', label: 'exhale slowly', duration: 6 },
    ],
    colors: {
      inhale: [185, 30, 12],
      hold: [190, 20, 11],
      exhale: [175, 25, 11],
    },
    motion: 'wave',
  },
  {
    id: 'cooling',
    name: 'Cooling Breath',
    subtitle: 'lowers body heat',
    durationSeconds: 60,
    category: 'breathing',
    locked: true,
    instructions: 'Curl your tongue. Inhale through it, exhale through nose.',
    context: 'Curl your tongue and inhale through it',
    rounds: 5,
    phases: [
      { type: 'inhale', label: 'inhale through mouth', duration: 4 },
      { type: 'hold', label: 'hold', duration: 2 },
      { type: 'exhale', label: 'exhale through nose', duration: 6 },
    ],
    colors: {
      inhale: [200, 35, 13],
      hold: [210, 20, 11],
      exhale: [195, 30, 10],
    },
    motion: 'snowfall',
  },
  {
    id: 'alternate-nostril',
    name: 'Alternate Nostril',
    subtitle: 'reset between tasks',
    durationSeconds: 72,
    category: 'breathing',
    locked: true,
    instructions: 'Inhale left, exhale right. Then inhale right, exhale left.',
    context: 'Close one nostril, then switch each breath',
    rounds: 3,
    phases: [
      { type: 'inhale', label: 'inhale left', duration: 4 },
      { type: 'hold', label: 'hold', duration: 4 },
      { type: 'exhale', label: 'exhale right', duration: 4 },
      { type: 'inhale', label: 'inhale right', duration: 4 },
      { type: 'hold', label: 'hold', duration: 4 },
      { type: 'exhale', label: 'exhale left', duration: 4 },
    ],
    colors: {
      inhale: [270, 25, 12],
      hold: [45, 20, 11],
      exhale: [280, 20, 11],
    },
    motion: 'alternate',
  },
  {
    id: 'left-nostril',
    name: 'Left Nostril',
    subtitle: 'switches into rest',
    durationSeconds: 60,
    category: 'breathing',
    locked: true,
    instructions: 'Press right nostril closed. Breathe in and out through the left.',
    context: 'Close your right nostril, breathe through the left',
    rounds: 5,
    phases: [
      { type: 'inhale', label: 'inhale left', duration: 4 },
      { type: 'hold', label: 'hold', duration: 2 },
      { type: 'exhale', label: 'exhale right', duration: 6 },
    ],
    colors: {
      inhale: [220, 18, 13],
      hold: [230, 12, 11],
      exhale: [215, 15, 10],
    },
    motion: 'lunar',
  },
  {
    id: 'belly',
    name: 'Belly Breath',
    subtitle: 'eases the body',
    durationSeconds: 60,
    category: 'breathing',
    locked: false,
    instructions: 'Let your belly rise on the in-breath, soften on the out. Breathe through nose.',
    rounds: 6,
    phases: [
      { type: 'inhale', label: 'breathe into belly', duration: 4 },
      { type: 'exhale', label: 'release slowly', duration: 6 },
    ],
    colors: {
      inhale: [90, 22, 12],
      hold: [60, 18, 11],
      exhale: [35, 25, 11],
    },
    motion: 'belly',
  },
  {
    id: 'wind-down',
    name: 'Wind Down',
    subtitle: 'deep relaxation',
    durationSeconds: 75,
    category: 'breathing',
    locked: false,
    instructions: 'Inhale 4, hold 7, exhale 8. The long exhale is the key.',
    rounds: 4,
    phases: [
      { type: 'inhale', label: 'inhale', duration: 4 },
      { type: 'hold', label: 'hold', duration: 7 },
      { type: 'exhale', label: 'exhale slowly', duration: 8 },
    ],
    colors: {
      inhale: [270, 25, 13],
      hold: [275, 18, 11],
      exhale: [285, 22, 10],
    },
    motion: 'sedation',
  },

  // ── Mindfulness ──
  {
    id: 'be-kind',
    name: 'Be Kind to Yourself',
    subtitle: 'softens self-criticism',
    durationSeconds: 24,
    category: 'mindfulness',
    locked: false,
    instructions: 'Read each phrase slowly. Let it land.',
    prompts: [
      { text: 'this is a moment of difficulty', duration: 8 },
      { text: 'difficulty is part of being human', duration: 8 },
      { text: 'may I be kind to myself right now', duration: 8 },
    ],
    colors: {
      inhale: [25, 28, 12],
      hold: [30, 22, 11],
      exhale: [20, 25, 11],
    },
    motion: 'warmPulse',
  },
  {
    id: 'let-it-drift',
    name: 'Let It Drift',
    subtitle: 'loosens stuck thoughts',
    durationSeconds: 33,
    category: 'mindfulness',
    locked: true,
    instructions: 'Notice a thought. Place it on a leaf. Watch it float away.',
    prompts: [
      { text: "notice what's on your mind", duration: 6 },
      { text: 'place the thought on a leaf', duration: 7 },
      { text: 'watch it float gently downstream', duration: 8 },
      { text: 'let the stream carry it away', duration: 7 },
      { text: 'the stream flows on', duration: 5 },
    ],
    colors: {
      inhale: [140, 22, 12],
      hold: [150, 18, 11],
      exhale: [130, 20, 10],
    },
    motion: 'river',
  },
  {
    id: 'bring-someone',
    name: 'Bring Someone to Mind',
    subtitle: 'warms the mood',
    durationSeconds: 24,
    category: 'mindfulness',
    locked: false,
    instructions: 'Picture one person who matters. Feel the warmth.',
    prompts: [
      { text: 'think of one person', duration: 8 },
      { text: 'feel that warmth', duration: 8 },
      { text: 'let it settle', duration: 8 },
    ],
    colors: {
      inhale: [35, 30, 13],
      hold: [40, 25, 12],
      exhale: [30, 28, 11],
    },
    motion: 'warmPulse',
  },
  {
    id: 'hold-yourself',
    name: 'Hold Yourself',
    subtitle: 'signals safety',
    durationSeconds: 28,
    category: 'mindfulness',
    locked: false,
    instructions: 'Wrap your arms around yourself. Hold gently.',
    prompts: [
      { text: 'wrap your arms around yourself', duration: 6 },
      { text: 'hold gently', duration: 8 },
      { text: 'feel the warmth of your own care', duration: 8 },
      { text: 'you are held', duration: 6 },
    ],
    colors: {
      inhale: [20, 30, 13],
      hold: [25, 25, 12],
      exhale: [15, 28, 11],
    },
    motion: 'converge',
  },
  {
    id: 'kind-words',
    name: 'Kind Words',
    subtitle: 'quiets the inner critic',
    durationSeconds: 28,
    category: 'mindfulness',
    locked: true,
    instructions: 'Read each line silently. Repeat it to yourself.',
    prompts: [
      { text: 'I am enough', duration: 7 },
      { text: 'I am doing my best', duration: 7 },
      { text: 'I deserve kindness', duration: 7 },
      { text: 'I am exactly where I need to be', duration: 7 },
    ],
    colors: {
      inhale: [45, 25, 12],
      hold: [50, 20, 11],
      exhale: [40, 22, 11],
    },
    motion: 'ambient',
  },
  {
    id: 'five-senses',
    name: 'Five Senses',
    subtitle: 'grounds you in the body',
    durationSeconds: 33,
    category: 'mindfulness',
    locked: false,
    instructions: 'Notice 5 you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.',
    prompts: [
      { text: '5 things you can see', duration: 7 },
      { text: '4 things you can touch', duration: 7 },
      { text: '3 things you can hear', duration: 7 },
      { text: '2 things you can smell', duration: 6 },
      { text: '1 thing you can taste', duration: 6 },
    ],
    colors: {
      inhale: [160, 20, 12],
      hold: [120, 18, 11],
      exhale: [80, 22, 11],
    },
    motion: 'sensory',
  },
  {
    id: 'soft-gaze',
    name: 'Soft Gaze',
    subtitle: 'relaxes tired eyes',
    durationSeconds: 33,
    category: 'mindfulness',
    locked: true,
    instructions: 'Soften your eyes on the centre point. Let everything else blur.',
    prompts: [
      { text: 'soften your gaze', duration: 5 },
      { text: 'rest your eyes on the centre', duration: 10 },
      { text: 'let everything else blur', duration: 10 },
      { text: 'just seeing', duration: 8 },
    ],
    colors: {
      inhale: [270, 18, 12],
      hold: [265, 15, 11],
      exhale: [275, 12, 10],
    },
    motion: 'orbit',
  },
];

export function unlockedTechniques(): readonly Technique[] {
  return TECHNIQUES.filter((t) => !t.locked);
}

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

export function isBreathing(t: Technique): t is BreathingTechnique {
  return t.category === 'breathing';
}

export function isMindfulness(t: Technique): t is MindfulnessTechnique {
  return t.category === 'mindfulness';
}
