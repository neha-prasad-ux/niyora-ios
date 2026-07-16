// The "Rough moment" CBT session protocol: conversation as the interface,
// protocol as the engine. Looks like chat; underneath, a fixed five-beat CBT
// arc drives (vent -> feel heard -> examine -> reframe -> keep), with the
// thought/feeling confirm step opening beat 3. The model only fills bounded
// slots per step -- every step has a fully scripted fallback, so the session
// is incapable of not finishing (guardrail refusal, timeout, old device: the
// scripted line renders and the session moves on).
//
// Design doc: ~/.gstack/projects/neha-prasad-ux-niyora-ios/
//   neha-feat-pms-couples-section-design-20260711-191417.md
// Copy follows DESIGN.md voice: quiet, no exclamation points, no emojis,
// middle dots. Wellness, not medicine: no diagnosis, no treatment claims.

import { pmsOffsetDays } from '@/lib/pms-window';
import type { V3Answers } from '@/v3/v3-content';

// --- The protocol -------------------------------------------------------

/**
 * Engine steps. The session opens straight at `confirm` — she picks the core
 * thought from a fixed menu (no vent, no "feel heard" beat, no free text).
 * `pattern` (spot the distortion) and `change` (can you change it?) are
 * scripted-only beats. Six beats map to five progress dots via STEP_DOT.
 *
 *   confirm -> pattern -> examine -> change -> reframe -> keep
 *     (1)        (2)        (3)        (4)       (4)       (5)
 */
export type RoughStep = 'confirm' | 'pattern' | 'examine' | 'change' | 'reframe' | 'keep';

export const STEP_ORDER: RoughStep[] = [
  'confirm',
  'pattern',
  'examine',
  'change',
  'reframe',
  'keep',
];

export const STEP_DOT: Record<RoughStep, 1 | 2 | 3 | 4 | 5> = {
  confirm: 1,
  pattern: 2,
  examine: 3,
  change: 4,
  reframe: 4,
  keep: 5,
};

/** Next step in the arc; `keep` is terminal. Failure also advances (a degraded
 * session is shorter, never stuck -- that asymmetry is intentional). */
export function nextStep(step: RoughStep): RoughStep {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
}

/** Hard cap on rendered messages (either side). At the cap the session jumps
 * straight to `keep` and still produces a card. Sized above the longest
 * scripted run (eight beats, each with an app line and a reply). */
export const MAX_TURNS = 24;

// --- Compact state (what the model sees) ---------------------------------

/**
 * The model never sees the transcript. Beats 2-3 get a length-bounded excerpt
 * of the vent (the model needs her words to reflect them); beats 3+ use the
 * thought and feeling she confirmed herself, plus the last chip she tapped.
 */
export interface CompactState {
  ventExcerpt: string;
  thought: string | null;
  feeling: string | null;
  tappedChip: string | null;
  /** One sentence of cycle context, e.g. "It is day 24 of her cycle, inside the premenstrual window." */
  cycleContext: string | null;
}

export const EMPTY_COMPACT: CompactState = {
  ventExcerpt: '',
  thought: null,
  feeling: null,
  tappedChip: null,
  cycleContext: null,
};

/** Last `max` characters of the vent -- bounded by construction. */
export function ventExcerpt(text: string, max = 500): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(-max);
}

// --- Cycle context (the moat: the one thing a generic chatbot cannot know) --

export interface DayPill {
  /** e.g. "day 24" */
  label: string;
  /** true when inside the ~7-day premenstrual window */
  inWindow: boolean;
}

/** 1-based cycle day + window flag from the onboarding cycle answer. Null when
 * the cycle is unknown or "not sure" -- the pill simply doesn't render. */
export function dayPill(cycle: V3Answers['cycle'], today: Date = new Date()): DayPill | null {
  if (cycle.unsure || !cycle.lastPeriod || !cycle.length) return null;
  const offset = pmsOffsetDays(cycle.lastPeriod, cycle.length, today);
  if (offset == null) return null;
  // offset is relative to the nearest predicted period start (negative =
  // before it). Convert to a 1-based day within the current cycle.
  const day = offset >= 0 ? offset + 1 : cycle.length + offset + 1;
  const inWindow = offset < 0 && -offset <= 7;
  return { label: `day ${day}`, inWindow };
}

/** The one sentence of cycle context injected into prompts. */
export function cycleContextLine(pill: DayPill | null): string | null {
  if (!pill) return null;
  return pill.inWindow
    ? `It is ${pill.label} of her cycle, inside the premenstrual window, when thoughts can feel louder than they are.`
    : `It is ${pill.label} of her cycle.`;
}

// --- Model requests per step ---------------------------------------------

/** Shared system prompt. Bounds every generated turn. */
export const INSTRUCTIONS = [
  'You help a woman steady one difficult thought during a rough moment, using a gentle CBT-style structure.',
  'You are not a therapist and never present yourself as one. Never diagnose, never mention disorders or medication, never give medical advice.',
  "Voice: quiet and warm. One or two short sentences. No exclamation points. No emojis. No pep talk, no \"you've got this\". Plain words.",
  'Never dismiss the feeling. Never argue. You reflect, ask one small question, or offer one gentler way to hold the thought.',
].join(' ');

export interface TurnRequest {
  instructions: string;
  prompt: string;
  wantChips: boolean;
}

/**
 * The scripted skeleton: opener, per-step fallback prose and chips. This is
 * the whole session when the model is unavailable (old device, Apple
 * Intelligence off) -- it must read complete on its own, not like an error.
 */
export const SCRIPT = {
  confirmIntro: 'Do you feel any of these is true?',
  // Spot the pattern: name the distortion in plain, first-person words, no
  // jargon. Scripted (a fixed, gentle set), never model-generated.
  patternIntro: 'Do you think any of these is true about how you feel?',
  patternChips: [
    'I am making it bigger than it is',
    'I am taking all the blame',
    'I am sure it will always be this way',
    'Not sure',
  ],
  patternAck: 'Naming the feeling takes some of its power off. That is not the whole truth.',
  examine: 'When you look at it from a little outside · how big is this concern, really?',
  examineChips: ['It feels huge right now', 'Smaller than it feels', 'It has visited before'],
  // Can you change it? One small step, or set it down for now.
  changeIntro: 'Is this something you can do anything about right now?',
  changeChips: ['Yes, there is one thing', 'No, not right now'],
  changeYes: 'Good. One small step is enough · the rest can wait.',
  changeNo: 'So it is okay to sleep on it, it can wait',
  reframe: 'A hard moment is real but not the whole story',
  keepQuote: 'This is not the whole story, it is a moment',
  keepSupport: 'You noticed the thought, reflected on it, and now you know it is a smaller than you perceived',
} as const;

/** Fallback thought proposal when the model can't offer one: her own words,
 * trimmed to chip length. */
export function scriptedThoughtProposal(excerpt: string): string {
  const t = excerpt.replace(/\s+/g, ' ').trim();
  if (!t) return 'This feels like too much';
  return t.length <= 80 ? t : `${t.slice(0, 79)}…`;
}

export const FEELING_CHIPS = ['hurt', 'angry', 'scared', 'tired', 'something else'] as const;

// The scripted (no-AI) distillation for the confirm beat: a small menu of the
// core thoughts that usually sit under a rough moment, so she recognises hers.
// These map to the universal core beliefs — worthless, abandoned, too-much,
// helpless, unloved. With AI on, the model proposes her specific phrasing
// instead and these are never shown.
export const CONFIRM_THOUGHT_CHIPS = [
  'I am not enough',
  'I am going to be left',
  'I am too much',
  'I cannot handle this',
  'No one really cares',
] as const;

/**
 * Build the bounded model request for a step, or null when the step never
 * calls the model (vent is hers alone; confirm's feeling row is scripted).
 */
export function buildTurnRequest(step: RoughStep, state: CompactState): TurnRequest | null {
  const cycle = state.cycleContext ? ` ${state.cycleContext}` : '';
  switch (step) {
    // `pattern` and `change` are scripted-only beats (a fixed, gentle set of
    // plain-word distortions and a yes/no agency check) — they never call the
    // model, so the effort gradient stays confirm + examine.
    case 'pattern':
    case 'change':
      return null;
    case 'confirm':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `She just had a rough moment.${cycle}\n` +
          'Name the single distressing thought most likely underneath, in her own vocabulary, under 12 words, first person. Put that thought in the chips (one or two candidate phrasings). The prose is one short sentence introducing it, like: Do you feel any of these is true?',
        wantChips: true,
      };
    case 'examine':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought right now: "${state.thought ?? state.ventExcerpt}". The feeling is mostly ${state.feeling ?? 'heavy'}.${cycle}\n` +
          'Ask one small, gentle CBT-style question that helps her look at the thought from a step outside (evidence, size, or whether it has visited before). The chips are two or three honest answers she might tap, in her vocabulary.',
        wantChips: true,
      };
    case 'reframe': {
      const tapped = state.tappedChip ? ` Looking at it, she said: "${state.tappedChip}".` : '';
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought right now: "${state.thought ?? state.ventExcerpt}". The feeling is mostly ${state.feeling ?? 'heavy'}.${tapped}${cycle}\n` +
          'Offer one gentler, believable way to hold the thought. Not a denial, not a silver lining · a smaller, truer version. One or two sentences.',
        wantChips: false,
      };
    }
    case 'keep':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought right now: "${state.thought ?? state.ventExcerpt}".${cycle}\n` +
          'Write the single line she keeps: the gentler version of the thought, first person or plain statement, under 12 words, no quotes around it.',
        wantChips: false,
      };
  }
}

// --- The Keep (result-ladder card: title, quote, support, caption) --------

export interface KeepCard {
  title: string;
  quote: string;
  support: string;
  caption: string;
}

export function buildKeep(
  quote: string | null,
  state: CompactState,
  pill: DayPill | null,
): KeepCard {
  const parts = [];
  if (pill) parts.push(pill.label + (pill.inWindow ? ' · window' : ''));
  parts.push('caught it, checked it, changed it');
  return {
    title: 'The thought you observed',
    quote: (quote ?? SCRIPT.keepQuote).trim(),
    support: state.thought
      ? `The spiral said: “${state.thought}”. You looked at it, and it got a little smaller.`
      : SCRIPT.keepSupport,
    caption: parts.join(' · '),
  };
}
