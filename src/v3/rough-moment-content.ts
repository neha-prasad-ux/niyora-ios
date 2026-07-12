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
 * Engine steps. `confirm` is the beat 2->3 boundary (she confirms the thought
 * and names the feeling herself -- the user is the extractor, so no free-text
 * NLP is needed). The five progress dots map via STEP_DOT.
 *
 *   vent -> heard -> confirm -> examine -> reframe -> keep
 *    (1)     (2)      (3)        (3)        (4)       (5)
 */
export type RoughStep = 'vent' | 'heard' | 'confirm' | 'examine' | 'reframe' | 'keep';

export const STEP_ORDER: RoughStep[] = ['vent', 'heard', 'confirm', 'examine', 'reframe', 'keep'];

export const STEP_DOT: Record<RoughStep, 1 | 2 | 3 | 4 | 5> = {
  vent: 1,
  heard: 2,
  confirm: 3,
  examine: 3,
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
 * straight to `keep` and still produces a card. */
export const MAX_TURNS = 12;

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
  opener: 'What happened? Say it however it comes.',
  ventMore: 'Anything else that belongs in it?',
  ventMoreChip: 'that’s all of it',
  ventThin: 'Even a few words are enough. What is the loudest part right now?',
  heard: 'That sounds heavy. Thank you for putting it into words.',
  confirmIntro: 'Underneath it, there is usually one thought doing the shouting · is it this?',
  confirmOwnChip: 'let me say it in my own words',
  feelingIntro: 'And the feeling, mostly?',
  examine: 'When you look at it from a little outside · how big is tonight, really?',
  examineChips: ['It feels huge right now', 'Smaller than it feels', 'It has visited before'],
  reframe: 'One hard evening is one hard evening. It is real, and it is not the whole story.',
  keepQuote: 'Tonight was one moment, not the whole story.',
  keepSupport: 'You caught the thought, looked at it, and it got a little smaller.',
} as const;

/** Fallback thought proposal when the model can't offer one: her own words,
 * trimmed to chip length. */
export function scriptedThoughtProposal(excerpt: string): string {
  const t = excerpt.replace(/\s+/g, ' ').trim();
  if (!t) return 'Tonight feels like too much';
  return t.length <= 80 ? t : `${t.slice(0, 79)}…`;
}

export const FEELING_CHIPS = ['hurt', 'angry', 'scared', 'tired', 'something else'] as const;

/**
 * Build the bounded model request for a step, or null when the step never
 * calls the model (vent is hers alone; confirm's feeling row is scripted).
 */
export function buildTurnRequest(step: RoughStep, state: CompactState): TurnRequest | null {
  const cycle = state.cycleContext ? ` ${state.cycleContext}` : '';
  switch (step) {
    case 'vent':
      return null;
    case 'heard':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `She just wrote this about her evening:${cycle}\n"${state.ventExcerpt}"\n` +
          'Reflect it back in one or two warm sentences so she feels heard. Use some of her own words. Do not advise, do not question yet.',
        wantChips: false,
      };
    case 'confirm':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `She wrote:${cycle}\n"${state.ventExcerpt}"\n` +
          'Name the single distressing thought most likely underneath, in her own vocabulary, under 12 words, first person. Put that thought in the chips (one or two candidate phrasings). The prose is one short sentence introducing it, like: Underneath it, there is usually one thought doing the shouting · is it this?',
        wantChips: true,
      };
    case 'examine':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought tonight: "${state.thought ?? state.ventExcerpt}". The feeling is mostly ${state.feeling ?? 'heavy'}.${cycle}\n` +
          'Ask one small, gentle CBT-style question that helps her look at the thought from a step outside (evidence, size, or whether it has visited before). The chips are two or three honest answers she might tap, in her vocabulary.',
        wantChips: true,
      };
    case 'reframe': {
      const tapped = state.tappedChip ? ` Looking at it, she said: "${state.tappedChip}".` : '';
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought tonight: "${state.thought ?? state.ventExcerpt}". The feeling is mostly ${state.feeling ?? 'heavy'}.${tapped}${cycle}\n` +
          'Offer one gentler, believable way to hold the thought. Not a denial, not a silver lining · a smaller, truer version. One or two sentences.',
        wantChips: false,
      };
    }
    case 'keep':
      return {
        instructions: INSTRUCTIONS,
        prompt:
          `Her thought tonight: "${state.thought ?? state.ventExcerpt}".${cycle}\n` +
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
    title: 'Tonight’s thought',
    quote: (quote ?? SCRIPT.keepQuote).trim(),
    support: state.thought
      ? `The spiral said: “${state.thought}”. You looked at it, and it got a little smaller.`
      : SCRIPT.keepSupport,
    caption: parts.join(' · '),
  };
}
