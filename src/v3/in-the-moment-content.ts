// The "In the moment" flow: the moon AI meeting her mid-feeling. Conversation
// as the interface, protocol as the engine — the same shape as rough-moment,
// but this flow OPENS with her raw text (she types the thing), and the model
// earns its place by reflecting HER words back and offering HER feelings. With
// the model off there is no honest slice to show, so unlike rough-moment this
// flow is meant to run model-backed (REFLECT_AI=1 + a bundled on-device model);
// the scripted fallbacks exist only so a dropped turn never dead-ends her.
//
// This module owns everything model-agnostic: the step arc, the compact state
// the model sees, the per-step prompt builder, the scripted fallbacks, the
// tiered crisis scan, and feeling→lane routing. The screen (in-the-moment.tsx)
// renders it as a chat and calls ReflectModel (src/lib/reflect-model.ts).
//
// Briefs: /ai-briefs/ (00-entry, 01-naming-beat, 02-body-check, 03/04 lanes,
// 08-we-good). This is the VERTICAL SLICE: entry → crisis scan → naming beat →
// body check → one arousal lane → close. Act 2, the mixed lane, the escalation
// ladder, and the full-screen breathing takeover are follow-ups.
//
// Voice (the moon): warm, plain, California-30s, contractions, no clinical
// words, sentence case, ≤2 lines. Guardrails: no advice/next-step, no
// diagnosis, no "just hormones", no invented facts.

import { cycleContextLine, dayPill, type DayPill } from '@/v3/rough-moment-content';

export { cycleContextLine, dayPill };
export type { DayPill };

// --- The arc ------------------------------------------------------------

// The steps the screen drives through. Only `acknowledge`, `feelings`, and
// `feelheard` call the model (see buildMomentRequest); the rest are scripted
// beats or pure UI (checkboxes, breath, activation buttons).
export type MomentStep =
  | 'entry' //        she types the raw thing
  | 'safeCheck' //    soft crisis tier: "are you safe right now?"
  | 'acknowledge' //  REFLECT: say the situation back
  | 'feelings' //     CLASSIFY: offer 3 feelings, she confirms
  | 'nameit' //       scripted: "naming it is the first step" + reward
  | 'feelheard' //    REFLECT: her feeling in her words
  | 'body' //         hungry / tired / moved checkboxes
  | 'high' //         high-arousal lane (angry/anxious/overwhelmed)
  | 'ladder' //       high-lane escalation: switch strategy when arousal won't drop
  | 'low' //          low-arousal lane (flat/numb/drained)
  | 'mixed' //        mixed/labile lane: name the swing, trust no peak
  | 'mixedCheckRead' // REFLECT: her specific rejection-thought, back to her
  | 'mixedAnchor' //  REFRAME: one steadying anchor
  | 'arousalCheck' // "any better?" — the lane's honest check
  | 'act2' //         "let's explore how you handle this" — REFRAME
  | 'timeit' //       "when matters": today vs let it wait
  | 'close' //        we good → close
  | 'more'; //        "not really" → reopened field for added context

// Progress dots: entry+naming (1), body (2), lane (3), handle+time (4), close (5).
export const MOMENT_DOT: Record<MomentStep, 1 | 2 | 3 | 4 | 5> = {
  entry: 1,
  safeCheck: 1,
  acknowledge: 1,
  feelings: 1,
  nameit: 1,
  feelheard: 1,
  body: 2,
  high: 3,
  ladder: 3,
  low: 3,
  mixed: 3,
  mixedCheckRead: 3,
  mixedAnchor: 3,
  arousalCheck: 3,
  act2: 4,
  timeit: 4,
  close: 5,
  more: 5,
};

/** Hard cap on rendered messages (either side), so a stuck model can't run the
 *  chat forever. Sized above the longest scripted run. */
export const MOMENT_MAX_TURNS = 30;

// --- Compact state (what the model sees) --------------------------------

/**
 * The model never sees the transcript — only this. Her raw entry (bounded),
 * the feeling she confirmed herself, the lane it routed to, and the one
 * sentence of cycle context a generic chatbot could never know.
 */
export interface MomentState {
  /** Her raw entry, trimmed to a bounded excerpt. */
  rawText: string;
  /** The feeling she tapped to confirm (null until the naming beat). */
  feeling: string | null;
  /** Routed silently from `feeling`; drives which lane runs. */
  lane: Lane | null;
  /** One sentence of cycle context, or null on a normal/unknown day. */
  cycleContext: string | null;
}

export const EMPTY_MOMENT: MomentState = {
  rawText: '',
  feeling: null,
  lane: null,
  cycleContext: null,
};

/** Last `max` characters of her entry — bounded by construction, so a wall of
 *  text can't blow the model's context. */
export function momentExcerpt(text: string, max = 500): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(-max);
}

// --- Tiered crisis scan (safety; the model is NEVER the arbiter) ---------
//
// First-pass, deliberately conservative keyword scan. It only FLAGS a tier;
// every line the user then sees is scripted and fixed (below). The exact hard-
// tier resource copy is a safety-spec + Neha decision, not something the model
// (or this scan) invents — see CRISIS_HARD.

export type CrisisTier = 'none' | 'soft' | 'hard';

// Venting hyperbole that must NOT trip the scan ("I could kill him", "I want to
// die of embarrassment", "this is killing me"). Checked first; if the only
// risky-looking hit is hyperbole, the tier is `none`.
const HYPERBOLE = [
  /\bkill (him|her|them|you|my boss|everyone)\b/i,
  /\b(could|gonna|wanna|want to) (kill|murder) (him|her|them|you|everyone)\b/i,
  /\bdie of (embarrassment|boredom|laughing|cringe)\b/i,
  /\b(this|it|he|she|they)('?s| is| are) killing me\b/i,
  /\bkill me now\b/i,
  /\bi could (just )?die\b/i,
];

// Explicit self-harm intent / plan / means → hard handoff.
const HARD = [
  /\b(kill|hurt|harm|cut) myself\b/i,
  /\b(end|take) my (own )?life\b/i,
  /\bi (want|need|am going|plan) to die\b/i,
  /\b(commit )?suicide\b/i,
  /\bsuicidal\b/i,
  /\b(overdose|od) (on|myself)\b/i,
  /\bdon'?t want to (be here|live|wake up)\b/i,
  /\bbetter off (dead|without me)\b/i,
];

// Ambiguous hopelessness → one soft check ("are you safe right now?").
const SOFT = [
  /\bwhat'?s the point\b/i,
  /\bcan'?t do this anymore\b/i,
  /\bgive up\b/i,
  /\bno reason to\b/i,
  /\bnothing matters\b/i,
  /\bi'?m done\b/i,
  /\bcan'?t go on\b/i,
];

/**
 * Classify her raw entry into a crisis tier. Clear hyperbole spans are stripped
 * FIRST so their words ("kill", "die") can't trip the hard/soft scan — that way
 * "i want to die of embarrassment" reads as none, while "i want to die" alone
 * reads as hard. After stripping, hard beats soft beats none. The screen renders
 * the matching scripted line — this function chooses no copy.
 *
 * ALWAYS ON, EVERY CYCLE PHASE. This scan is never gated, weighted, or relaxed
 * by cycle phase, and it errs toward firing. Evidence: suicide deaths +26% and
 * attempts +17% AT MENSTRUATION, vs +13% admissions premenstrually (2019
 * meta-analysis). Weighting attention to the luteal window would relax exactly
 * as risk peaks. A false positive costs one gentle question; a false negative
 * costs everything.
 */
export function scanCrisis(text: string): CrisisTier {
  let t = text.toLowerCase();
  for (const r of HYPERBOLE) t = t.replace(r, ' ');
  if (HARD.some((r) => r.test(t))) return 'hard';
  if (SOFT.some((r) => r.test(t))) return 'soft';
  return 'none';
}

/** VERBATIM soft-tier line (safety/precision — never paraphrased). */
export const CRISIS_SOFT_LINE = 'are you safe right now?';

/**
 * Hard-tier handoff. Honest and non-clinical, but INTENTIONALLY carries no
 * specific hotline number — the exact, region-correct resource copy is a
 * safety-spec + Neha decision, and inventing one would be worse than none.
 * The screen shows this verbatim and stops the emotional flow.
 */
export const CRISIS_HARD = {
  title: 'this is bigger than this moment',
  body: "i'm really glad you told me. this is more than i can hold with you here, and you shouldn't be holding it on your own.",
  // NAMED RESOURCES (added 2026-07-25, Neha approved).
  // Saying "i'm not a crisis line" and then naming nowhere is THE documented
  // failure: of chatbot crisis responses rated high-harm, 15.2% gave no specific
  // 24/7 resource and 53.3% never asked directly if the person was unsafe
  // (Bentley et al., JMIR AI 2026). California SB 243 also makes a published
  // crisis protocol a PRECONDITION to operating, with a private right of action.
  us: '988 — call or text, any time',
  global: 'findahelpline.com — free, confidential, wherever you are',
  ask: 'is there someone who can be with you right now?',
} as const;

/**
 * Crisis resources are shown as PLAIN TEXT, never a tap-to-dial link.
 * NNEDV documents call logs AND carrier billing records as a surveillance
 * surface an abuser can often reach as the account holder — and she cannot
 * delete the bill. A `tel:` link makes that choice for her.
 * Region is chosen from her LOCALE as a guess with a visible picker.
 * NEVER IP geolocation.
 */
export const CRISIS_LINK_IS_TAPPABLE = false;

// --- Feeling → lane routing (silent; no extra question) ------------------

export type Lane = 'high' | 'low' | 'mixed';

const HIGH_FEELINGS = [
  'angry',
  'furious',
  'mad',
  'anxious',
  'scared',
  'afraid',
  'panicked',
  'overwhelmed',
  'stressed',
  'tense',
  'frustrated',
];
const LOW_FEELINGS = ['flat', 'numb', 'drained', 'empty', 'exhausted', 'tired', 'low', 'hollow'];
// Labile / rejection-sensitive: emotions swinging fast, or a rejection read.
const MIXED_FEELINGS = [
  'rejected',
  'sensitive',
  'all over',
  'up and down',
  'conflicted',
  'torn',
  'unsettled',
  'confused',
  'insecure',
];

/**
 * Route a confirmed feeling to an arousal lane. Checked mixed → low → high;
 * unknown/ambiguous feelings default to `high` — the briefs' safety rule
 * (over-serve regulation rather than skip it).
 */
export function laneForFeeling(feeling: string): Lane {
  const f = feeling.toLowerCase().trim();
  if (MIXED_FEELINGS.some((w) => f.includes(w))) return 'mixed';
  if (LOW_FEELINGS.some((w) => f.includes(w))) return 'low';
  if (HIGH_FEELINGS.some((w) => f.includes(w))) return 'high';
  return 'high';
}

// --- Model requests per step --------------------------------------------

/**
 * Shared system prompt — the persona + guardrails, bounding every turn.
 *
 * NEVER put the word "moon" in here. "The moon" is the app-facing persona name
 * (see the UI copy and comments in this file), never a model-facing token: the
 * fine-tune baseline showed a small model free-associates on lunar imagery from
 * that word alone ("the light spills across the valley, indifferent") and writes
 * poetry instead of reflecting her back. See ai-briefs/finetune-results.md.
 */
export const MOMENT_INSTRUCTIONS = [
  'You are a warm, steady presence who helps a woman through a hard feeling in the moment.',
  'You are not a therapist and never present as one. Never diagnose, never name a disorder or medication, never give medical advice, never say a feeling is "just hormones".',
  'Ground everything in exactly what she said. Reuse her own nouns and details. Never add a person, place, event, or reason she did not mention. If you are unsure of a detail, leave it out.',
  'Voice: warm, plain, like a close friend in her thirties. Use contractions. Lowercase, plain sentences. One or two short sentences, then stop.',
  'Never use: em dashes or dashes of any kind, quotation marks, markdown, bullet points, headings, stage directions, or narration about a character. Write only what you would say straight to her. No pep talk, no "you\'ve got this", no exclamation points, no emojis.',
  'You only ever: reflect her words back, offer feeling words, or offer one gentler way to hold a thought. Never give advice or a next step.',
].join(' ');

export interface MomentRequest {
  instructions: string;
  prompt: string;
  wantChips: boolean;
}

/**
 * The scripted skeleton: every line the flow can render without the model.
 * These exist so a dropped/timed-out turn never dead-ends her — not as a
 * shippable no-AI experience (this flow needs the model to be worth running).
 */
export const MOMENT_SCRIPT = {
  // Asks for an EVENT, not a feeling. "what's going on?" invites "i feel awful",
  // which gives the model nothing concrete to reflect and sends her straight to
  // the clarify gate. Asking what HAPPENED pulls for the facts we actually need.
  entryInvite: 'tell me what happened.',
  // Naming beat — the first response, in order: reflect the issue in her words
  // (AI, varies), then a fixed companioning line, then the naming-helps science
  // (BEFORE the pick), then the picker prompt. `acknowledge` is the model-written
  // slot; the rest are fixed.
  acknowledge: 'okay. that sounds like a lot to be holding.',
  together: "you're not in this alone, let's handle this together.",
  // Softened 2026-07-25. Was: "research says people who describe feelings with
  // precise words rather than generic ones cope better." Lieberman 2007 supports
  // affect LABELING; the precise-vs-generic claim is emotional granularity
  // (Barrett) — textbook, not a citation we hold. Don't say "research says" in
  // front of a claim we can't produce.
  namingScience: 'putting words to a feeling actually settles it down a bit. that\'s why we start here.',
  feelingsPrompt: "which one's closest to you?",
  feelingsChips: ['angry', 'overwhelmed', 'hurt'],
  feelheard: (feeling: string | null) =>
    feeling ? `that ${feeling} makes complete sense right now.` : 'that makes complete sense right now.',
  // Body check
  bodyIntro: 'quick gut check before we go on. have you eaten, slept, and moved your body lately?',
  bodyChips: ['all good', 'not really'],
  bodyGap: "okay. see if you can grab a bite or step outside soon, i'll put it on your today.",
  bodyFine: "good. you're taking care of the basics.",
  // High-arousal lane
  highSafe: "let's just get you feeling safe first. nothing to solve yet.",
  // VERBATIM — never paraphrase the count. 4+6 = 10s = 6 breaths/min, which is
  // exactly the pace the slow-breathing/HRV meta-analysis supports. Keep the
  // COUNT; never claim the mechanism ("fastest lever on the vagus nerve") —
  // the pace is evidenced, the exhale-ratio mechanism is mixed.
  breatheCue: 'in for four, out for six',
  breatheStart: 'breathe out slowly with me.',
  breatheMore: 'want three more?',
  breatheMoreChips: ['yes', "i'm good"],
  highReward: "your body's coming down. that's the hard part.",
  // High-lane escalation ladder: when arousal won't drop, switch strategy and
  // escalate, never repeat the same breath. Ordered rungs.
  ladderExhausted:
    "you've tried a lot, and it's still loud. that's not failing. let's set it down for now and come back to it.",
  // Low-arousal lane (activation, NOT calming — no breath, no break)
  lowIntro: 'just one small thing to lift you a notch. pick whatever feels least like effort.',
  lowChips: ['sunlight', 'a song i love', 'a warm drink', 'pet the dog'],
  lowJustOne: 'just the one. done is enough.',
  // Mixed / labile lane (rejection-sensitive): name the swing, trust no peak
  mixedNameSwing: "this is a swing, and swings lie loudest at the top. we don't have to trust the peak.",
  mixedRide: "you're allowed to feel all of this. you just don't have to move on it yet.",
  mixedCheckRead: 'the read right now is that something feels wrong between you and someone.',
  mixedChips: ["it's a swing", "no, it's real"],
  mixedSwing: "okay. let's not give the peak the last word, it'll settle like it always does.",
  mixedReal: "then it's worth taking seriously. not right now at the peak, but we won't dismiss it.",
  mixedAnchor: 'this passes, it always has. you\'re okay in the meantime.',
  // Arousal / feeling check
  arousalCheck: 'any better?',
  arousalChips: ['a little', 'not yet'],
  moreTodo: "okay. we've got other ways to try, we'll come back to it.",
  // Act 2 — "let's explore how you handle this" (generic REFRAME for now; the
  // per-situation module fan-out + message-drafting is a follow-up)
  act2Intro: "okay. now the part that actually helps: how you handle this. here's one way to hold it.",
  act2Reframe: "it's real, and it's one moment, not the whole story. you get to choose the next small move.",
  // Time it — "when matters"
  timeitWhy: 'timing matters. a hard thing lands better when you\'re steady, not at the peak.',
  timeitWhyWindow:
    "timing matters right now. you're in the window where things feel louder, so this may read truer in a few days.",
  timeitChips: ['today', 'let it wait'],
  timeitToday: "okay, i'll put it on your today.",
  timeitWait: 'good call. waiting for a steadier moment is the strong move, not avoidance.',
  // Close
  weGood: 'we good?',
  weGoodChips: ['yeah', 'not really'],
  // CHANGED 2026-07-25. Was: "you showed up for yourself here. i'm around
  // whenever you need me." — that second clause is ATTACHMENT LANGUAGE, the
  // specific mechanism named across the Character.AI complaints ("I'm always
  // going to be here for you", said to a 13-year-old who had disclosed suicidal
  // ideation 55 times). It implies an ongoing relationship with the app.
  // Close on HER capability and the real world, never on the moon's availability.
  close: 'you handled that. go be in your evening.',

  // THE HUMAN NUDGE. Fires on the FREQUENCY signal (several sessions in a day,
  // or every day this week) — never every session, or it becomes wallpaper.
  // Why it exists: MIT/OpenAI found usage VOLUME predicts loneliness and
  // dependence, and NNEDV warns a chatbot's comfort "might also delay you from
  // reaching out to a real person." The correct response to high usage is to
  // send her away, not to engage her more.
  // Three things it must keep:
  //  - "not the person this is about" — "tell someone" can otherwise route her
  //    straight back to whoever hurt her, which is dangerous in a DV situation
  //  - "help you think rather than just agree" — talking through an upset gave
  //    NO recovery at 3d/7d/2mo; it only worked when the listener prompted
  //    actual thinking (Nils & Rimé)
  //  - "not only for emergencies" — "i have nobody" is loneliness, NOT a crisis.
  //    Routing it to a suicide line is a category error, it reads as alarming,
  //    and it teaches her to stop admitting isolation. findahelpline lists
  //    ordinary support too.
  // NO pep talk ("you are strong") — it bounces off exactly when she feels worst.
  humanNudge: [
    'one thing before you go.',
    "i'm not a substitute for a person, and i shouldn't be the only one who knows about this.",
    'is there someone you could tell? not the person this is about, someone outside it, who\'ll help you think rather than just agree with you.',
    "and if there's nobody right now, findahelpline.com has people you can talk to, and not only for emergencies.",
  ],
  closeMore: "tell me what's still sitting wrong, and we'll try something you haven't yet.",
} as const;

/**
 * Enforce the moon's voice on a model turn's prose. The 1B ignores the "no
 * dashes / no quotes / stay short" asks in the prompt often enough that we clean
 * the output here too: strip markdown, turn dashes into commas, drop quotation
 * marks (never apostrophes), fold any list into one line, cap to two sentences,
 * and start lowercase. Cosmetic only — it cannot fix a hallucinated fact, but it
 * kills the em-dash / stage-direction / markdown sprawl the raw 1B produces.
 */
export function tameProse(raw: string): string {
  let t = raw.trim();
  // Strip markdown emphasis, bullets, and headings.
  t = t.replace(/\*\*/g, '').replace(/(^|\s)[*#]+\s/g, '$1');
  // Any dash (em, en, or a spaced hyphen) becomes a comma.
  t = t.replace(/\s*[—–]\s*/g, ', ').replace(/\s+-\s+/g, ', ');
  // Drop quotation marks and backticks, but NOT in-word apostrophes.
  t = t.replace(/[“”"`]/g, '');
  t = t.replace(/^[‘’']+/, '').replace(/[‘’']+$/, '');
  // Fold newlines/lists into one line.
  t = t.replace(/\s+/g, ' ').trim();
  // Keep at most the first two sentences.
  const sentences = t.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    t = sentences
      .slice(0, 2)
      .map((s) => s.trim())
      .join(' ');
  }
  // The moon starts lowercase.
  if (t) t = t[0].toLowerCase() + t.slice(1);
  return t.trim();
}

/**
 * High-lane escalation rungs, in order. Ran one at a time when the arousal
 * check reads "not yet" — switch strategy and escalate, NEVER repeat the same
 * breath (so no rung is a breathing round). Each rung is a scripted beat with a
 * single confirming chip. Exhausting the ladder routes to a gentle close.
 */
export const LADDER_RUNGS: readonly { key: string; intro: string; chip: string }[] = [
  { key: 'cold', intro: "let's shock the system a little. cold water on your face or the backs of your wrists.", chip: 'done' },
  { key: 'move', intro: 'move it out. shake your arms out or walk it off for a minute.', chip: 'done' },
  { key: 'fixBody', intro: 'back to basics. water, a bite, a window open, fix the easiest one.', chip: 'done' },
  { key: 'cap', intro: 'cap it. give the spiral a box: ten minutes to feel it, then we set it down.', chip: 'okay' },
  { key: 'acceptProtect', intro: 'okay. the feeling can stay, we just protect you from acting on it, and the decision waits.', chip: 'okay' },
];

/**
 * Build the bounded model request for a step, or null when the step never
 * calls the model (scripted beats, checkboxes, breath, activation buttons).
 */
export function buildMomentRequest(step: MomentStep, state: MomentState): MomentRequest | null {
  const cycle = state.cycleContext ? ` ${state.cycleContext}` : '';
  switch (step) {
    case 'acknowledge':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `She just wrote this, word for word: "${state.rawText}".${cycle}\n` +
          'In one short line, say the specific thing that happened back to her, naming the exact people and things she mentioned, so she knows you actually read it. Use only her words and facts. Do not describe her emotion, do not comfort her, do not add anything she did not say. Start lowercase.',
        wantChips: false,
      };
    case 'feelings':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `She just wrote: "${state.rawText}".${cycle}\n` +
          'Offer three feelings she might be having right now, as plain everyday words (like angry, anxious, overwhelmed, hurt, flat, numb, drained, lonely, ashamed). The prose is one short line offering them, not a verdict — like "maybe one of these fits?". Put the three single feeling words in the chips.',
        wantChips: true,
      };
    case 'feelheard':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `She said she feels ${state.feeling ?? 'heavy'}, about this, word for word: "${state.rawText}".${cycle}\n` +
          'In one short line, tie that feeling to the exact thing she said happened, using only her words, so it lands as "yes, that is exactly it". Do not add any new detail, person, or reason. Do not give advice. Start lowercase.',
        wantChips: false,
      };
    case 'mixedCheckRead':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `Her emotions are swinging fast and she's rejection-sensitive right now. She wrote: "${state.rawText}". Her feeling: "${state.feeling ?? 'unsettled'}".${cycle}\n` +
          'Reflect the specific worried thought she is holding — the rejection read, like "he\'s pulling away from you" or "everyone\'s upset with you" — back to her in her words, so it can be looked at. Name only the read. Do not reassure yet, do not argue. One short line.',
        wantChips: false,
      };
    case 'mixedAnchor':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `Her thought: "${state.rawText}". Her feeling: "${state.feeling ?? 'unsettled'}".${cycle}\n` +
          'Offer one steadying anchor — a true, stable line she can hold while the swing passes. Not a denial, not a silver lining. One or two short sentences.',
        wantChips: false,
      };
    case 'act2':
      return {
        instructions: MOMENT_INSTRUCTIONS,
        prompt:
          `She wrote, word for word: "${state.rawText}". She feels ${state.feeling ?? 'heavy'}.${cycle}\n` +
          'Speaking straight to her (say "you", never tell a story about a character), offer one gentler, believable way to hold this. A smaller, truer version, not a denial or a silver lining. One or two short sentences. No advice, no steps.',
        wantChips: false,
      };
    // Scripted / UI-only steps never call the model.
    case 'entry':
    case 'safeCheck':
    case 'nameit':
    case 'body':
    case 'high':
    case 'ladder':
    case 'low':
    case 'mixed':
    case 'arousalCheck':
    case 'timeit':
    case 'close':
    case 'more':
      return null;
  }
}
