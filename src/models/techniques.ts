// All practices grouped by category. v1 ships the data; the session screen
// reads phases + visual colors from the breathing entries. Locked state is
// hard-coded for now; progression unlocking arrives with the Soul tier work.

import type { MotionType } from '../lib/motions';

export type Category = 'breathing' | 'mindfulness';

export type PhaseType = 'inhale' | 'hold' | 'exhale';

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
  phases: readonly BreathPhase[];
  rounds: number;
  colors: PhaseColors;
  motion: MotionType;
};

export type MindfulnessTechnique = {
  id: string;
  name: string;
  subtitle: string;
  durationSeconds: number;
  category: 'mindfulness';
  locked: boolean;
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
      { type: 'hold', label: 'hold', duration: 4 },
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
    durationSeconds: 25,
    category: 'mindfulness',
    locked: false,
  },
  {
    id: 'bring-someone',
    name: 'Bring Someone to Mind',
    subtitle: 'warms the mood',
    durationSeconds: 25,
    category: 'mindfulness',
    locked: false,
  },
  {
    id: 'hold-yourself',
    name: 'Hold Yourself',
    subtitle: 'signals safety',
    durationSeconds: 30,
    category: 'mindfulness',
    locked: false,
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
