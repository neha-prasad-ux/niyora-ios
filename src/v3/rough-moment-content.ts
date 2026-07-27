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

/**
 * Cycle context, in the compact form the corpus was built with.
 *
 * gemma4-runpod assemble.py build_user() emits `cycle: day 24, premenstrual
 * window` and only when the premenstrual flag is set. The long sentence this
 * used to produce ("It is day 24 of her cycle, inside the premenstrual window,
 * when thoughts can feel louder than they are.") never appeared in training,
 * and off-distribution context is what makes a 2B degenerate.
 */
export function cycleContextLine(pill: DayPill | null): string | null {
  if (!pill || !pill.inWindow) return null;
  return `${pill.label}, premenstrual window`;
}

// --- Model requests per step ---------------------------------------------

/**
 * The system turn, BYTE-IDENTICAL to the one the corpus was trained with
 * (gemma4-runpod assemble.py:29-30). Every one of the 2,542 rows in
 * v4_wide_deduped carries exactly this string and no other.
 *
 * Do not "improve" it. The previous version here was a four-sentence
 * sentence-case CBT brief that the model had never seen, and on device it
 * produced third-person and near-degenerate output ("One minute today feels
 * like one thing today, one thing today at once."). The same model on the
 * trained string answers "he ignored you all evening, that's enough today."
 *
 * Note the deliberate absence of the word "moon": a small model
 * free-associates on lunar imagery from that token alone and writes poetry
 * instead of reflection. "Moon" is the app-facing persona name, never a
 * model-facing one.
 */
export const INSTRUCTIONS =
  'you reply to a woman having a hard moment. warm, plain, like a close friend in her 30s. ' +
  'say her own words back. never advise. lowercase, max 2 sentences, no dashes.';

/**
 * The corpus slot each model beat is sent as. Beat names are OURS; slot names
 * are the flow node ids the model was trained on, so this map is where the two
 * vocabularies meet. Row counts are from v4_wide_deduped.
 *
 *   confirm -> acknowledge      (424 rows) reflect her words, invent nothing
 *   examine -> high_cbt_stem    (233 rows) one question, must end in '?'
 *   reframe -> high_cbt_reframe (270 rows) declarative, gentler frame
 *   keep    -> reframe_small    (203 rows) the small, truer line she keeps
 *
 * `pattern` and `change` are scripted and never reach the model.
 */
const BEAT_SLOT: Partial<Record<RoughStep, string>> = {
  confirm: 'acknowledge',
  examine: 'high_cbt_stem',
  reframe: 'high_cbt_reframe',
  keep: 'reframe_small',
};

/**
 * Build the user turn in the corpus shape (assemble.py build_user): a bracketed
 * slot tag, then only the fields that are present, newline-joined, in this
 * fixed order. `she feels:` is suppressed for acknowledge, matching training.
 */
function buildUser(
  slot: string,
  parts: { herText?: string | null; feeling?: string | null; cycle?: string | null; note?: string | null },
): string {
  const lines = [`[${slot}]`];
  if (parts.herText) lines.push(`she wrote: "${parts.herText}"`);
  if (parts.feeling && slot !== 'acknowledge') lines.push(`she feels: ${parts.feeling}`);
  if (parts.cycle) lines.push(`cycle: ${parts.cycle}`);
  if (parts.note) lines.push(parts.note);
  return lines.join('\n');
}

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
  // `pattern` and `change` are scripted-only beats (a fixed, gentle set of
  // plain-word distortions and a yes/no agency check) — they never call the
  // model, so the effort gradient stays confirm + examine.
  const slot = BEAT_SLOT[step];
  if (!slot) return null;

  // Her own words, which every beat is grounded in. `confirm` has only the
  // vent; later beats prefer the thought she confirmed herself.
  const herText = step === 'confirm' ? state.ventExcerpt : (state.thought ?? state.ventExcerpt);

  // The one piece of situational context the corpus carries beyond her text:
  // what she tapped. Kept as a bare note line, which is how training rows that
  // had extra context wrote it.
  const note =
    step === 'reframe' && state.tappedChip ? `she tapped "${state.tappedChip}".` : null;

  return {
    instructions: INSTRUCTIONS,
    prompt: buildUser(slot, {
      herText,
      feeling: state.feeling,
      cycle: state.cycleContext,
      note,
    }),
    // Chips are authored, never generated (see reflect-model-parse). The flag
    // only tells the caller whether to render a chip row.
    wantChips: step === 'confirm' || step === 'examine',
  };
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
