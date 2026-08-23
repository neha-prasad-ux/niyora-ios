// The Gemini provider for the Moon flow. `moment.tsx` talks only to the
// MomentProvider port (v3/moment-ai); this file is one implementation of it,
// plus the per-slot system prompts from docs/moon-gemini-prompts.md.
//
// Cloud, not on-device: this replaces the Gemma seam (src/lib/reflect-model).
// The product guardrails do NOT live here. pick() and the other wrappers in
// moment-ai wrap whatever this returns, so an absent or failed model degrades to authored copy
// and the flow still completes. Everything here can return null, and null is
// never an error.
//
// The app holds NO Google key. It calls Gemini through Firebase AI Logic: auth is
// the Firebase project (GoogleService-Info.plist baked into the build), and App
// Check (Apple App Attest, started in src/lib/firebase.ts) attests the request so
// the Vertex endpoint accepts only the real Niyora app. The Vertex backend means
// Google Cloud enterprise terms apply: her words are not used for training and
// not human-reviewed by default. See docs/launch-prep.md gate #1.
//
// Safe by default: with the flag off or Firebase not configured in the build,
// getMomentProvider() returns NO_PROVIDER and the flow is byte-identical to the
// deterministic build. Set EXPO_PUBLIC_MOMENT_AI=1 to light it up.

import { getApp } from '@react-native-firebase/app';
import {
  getAI,
  getGenerativeModel,
  SchemaType,
  VertexAIBackend,
  type SchemaRequest,
} from '@react-native-firebase/ai';
import { MOMENT_AI } from '@/config/features';
import { NO_PROVIDER, type MomentProvider } from '@/v3/moment-ai';
import { scrub } from './pii';
import { SLOT_INSTRUCTION, VOICE } from './moment-prompts';

const LOCATION = 'us-central1';
// Verified against this project's Vertex backend (firebasevertexai) 2026-08-19:
// us-central1 serves gemini-2.5-pro, -flash and -flash-lite. Every gemini-3 name
// 404s here. If you bump this, re-verify the model exists in LOCATION or every
// call silently falls back to authored copy.
//
// Pro, not flash (2026-08-19 scenario run). Pro with a small thinking budget came
// back BOTH better and faster than flash with a large one: 2.9s at budget 128 and
// 5.1s at 512, against 3.2s for flash at 512, and the reads stopped being generic.
// On the same entry flash offered "you might be hoping for a visit where you feel
// fully accepted", pro offered "you go there hoping for a mother, and you get a
// critic". The reads ARE the product on this beat, so it gets the better model.
const MODEL = 'gemini-2.5-pro';
// Reasoning tokens the model may spend before it writes. 0 (what shipped until
// now) means it cannot run a check-then-delete rule at all, which is the shape of
// every anti-echo rule in the prompts, and it left ~2% of cards arriving empty.
const THINKING_BUDGET = 512;

// Per-slot budgets (2026-08-21). 512 is right for a card that writes three reads
// and wasteful for a slot that answers yes or no. Measured on 8 entries:
// has_event scored 8/8 at both 128 and 512, but 512 spent five times the tokens
// (2877 against 524) and 1.6s more per call. Thinking bills at the OUTPUT rate
// and was 88% of the whole moment's output, so this is the cheapest real saving
// available, and it makes two beats she waits on noticeably quicker.
//
// NEVER set this to 0 on a pro model. Verified the same day: at budget 0
// gemini-2.5-pro returns an EMPTY body, so every call would silently produce
// nothing and the flow would fall back to authored copy with no error anywhere.
// 128 is the floor.
//
// The crisis classifier is deliberately absent: it self-limits to around 60
// thinking tokens anyway, and it is the one call where being cheap is not a
// trade worth making.
const SLOT_THINKING: Record<string, number> = {
  has_event: 128, // a yes or no
  feelings: 128, // reordering a closed list
};

// --- Response schemas (2026-08-19) ---------------------------------------
//
// The JSON slots used to ask for their shape in prose and moment-ai.ts pieced the
// reply back together by slicing from the first "{" to the last "}". That worked
// most of the time, and "most of the time" on this beat means a card that quietly
// falls back to authored copy because the model opened with "Here is the JSON:".
// responseMimeType + responseSchema make Vertex ENFORCE the shape at decode time,
// so a malformed reply is not caught, it is impossible.
//
// This does NOT replace the defensive parsing in moment-ai.ts. That stays as the
// floor: a slot with no schema here, a schema Vertex rejects, or a response that
// arrives truncated all still land in the same try/catch and still degrade to
// authored copy. Nothing below may ever throw.
//
// Only the JSON slots appear here. Draft/text slots (clarify, has_event, feelings,
// act_help, revise, reflect_friend, reflect_pattern, reflect_chat, reflect_expand)
// return a bare line and MUST NOT get a schema, or the line arrives wrapped in
// quotes and JSON escapes.
const strings = (max: number): SchemaRequest => ({
  type: SchemaType.ARRAY,
  items: { type: SchemaType.STRING },
  maxItems: max,
});

// Guess slots: up to 3 tappable options, [] is a legitimate decline (nothing to
// add), so `options` is required but may be empty.
const GUESS_SCHEMA: SchemaRequest = {
  type: SchemaType.OBJECT,
  properties: { options: strings(3) },
  required: ['options'],
};

const RESPONSE_SCHEMA: Record<string, SchemaRequest> = {
  // The two interaction cards (2026-08-20): she places / she allocates, so the
  // model returns the setup rather than reads. Enforced shapes, because a missing
  // end of the scale or a missing factor makes the interaction unrenderable.
  reflect_scale: {
    type: SchemaType.OBJECT,
    properties: {
      claim: { type: SchemaType.STRING },
      word: { type: SchemaType.STRING },
      zero: { type: SchemaType.STRING },
      hundred: { type: SchemaType.STRING },
    },
    required: ['claim', 'word', 'zero', 'hundred'],
  },
  reflect_responsibility: {
    type: SchemaType.OBJECT,
    properties: {
      outcome: { type: SchemaType.STRING },
      hers: { type: SchemaType.STRING },
    },
    required: ['outcome', 'hers'],
  },
  reflect_simpler: GUESS_SCHEMA,
  reflect_also_true: GUESS_SCHEMA,
  reflect_need: GUESS_SCHEMA,
  reflect_shame: GUESS_SCHEMA,
  reflect_signal: GUESS_SCHEMA,
  reflect_factsort: {
    type: SchemaType.OBJECT,
    properties: {
      claims: {
        type: SchemaType.ARRAY,
        maxItems: 4,
        items: {
          type: SchemaType.OBJECT,
          properties: { text: { type: SchemaType.STRING }, fact: { type: SchemaType.BOOLEAN } },
          required: ['text', 'fact'],
        },
      },
    },
    required: ['claims'],
  },
  reflect_rule: {
    type: SchemaType.OBJECT,
    properties: {
      event: { type: SchemaType.STRING },
      rule: { type: SchemaType.STRING },
      consequence: { type: SchemaType.STRING },
      tests: strings(3),
    },
    // All four required: ruleBreakdown() declines when rule or tests are missing,
    // and a chain with a hole in it cannot be rendered anyway. The model declines
    // by returning an empty rule/tests, not by dropping the keys.
    required: ['event', 'rule', 'consequence', 'tests'],
  },
  reflect_factsort_advise: {
    type: SchemaType.OBJECT,
    // reads is one gentler line PER read she sorted, so it is not capped at 3 the
    // way the guess slots are. The caller pairs them by index.
    properties: {
      reads: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      help: { type: SchemaType.STRING },
    },
    required: ['reads', 'help'],
  },
  reframe_small: {
    type: SchemaType.OBJECT,
    properties: { readings: strings(3), selfPrompt: { type: SchemaType.STRING } },
    required: ['readings', 'selfPrompt'],
  },
};

// Context caching: checked 2026-08-19, NOT usable here, do not try again without
// new information. VOICE + REFLECT_SAFETY + a slot instruction is ~890 tokens and
// it is re-sent on every call, so a cache looked like free money. Three separate
// walls:
//   1. @react-native-firebase/ai 26.2.0 has no cache API at all. The only cache
//      surface in the package is the READ-ONLY usageMetadata.cachedContentTokenCount.
//   2. Firebase AI Logic deliberately does not let a client create an explicit
//      cache (a client that could would be a billing hole). Explicit caches are
//      reachable only through server prompt templates, and the cache itself has to
//      be created out of band against the Vertex REST API. That is a backend we do
//      not have, for a prompt we edit weekly.
//   3. Even with the plumbing it would not qualify: an explicit cache on a Gemini
//      Pro model needs a MINIMUM of 4096 tokens of cached content. Our system
//      prompt is ~890.
// Implicit caching is already on by default for gemini-2.5-*, so whatever discount
// this prompt can earn, it is already earning without any code.

// One AI handle for the app, created lazily on first use. Firebase must be
// configured (a GoogleService-Info.plist in the build) or getApp() throws; we
// catch that and stay unconfigured, so a build with no Firebase config degrades
// to authored copy exactly like the old no-key path did.
let ai: ReturnType<typeof getAI> | null = null;
let configured: boolean | null = null;
function getModelHandle() {
  if (configured === false) return null;
  try {
    if (!ai) ai = getAI(getApp(), { backend: new VertexAIBackend(LOCATION) });
    configured = true;
    return ai;
  } catch {
    configured = false;
    return null;
  }
}

// Transport outcome of the last TRACKED call (the beat generations), so the flow
// can tell "Moon isn't responding" (fail: timeout/HTTP/empty) apart from "she is
// offline" (network unreachable) apart from success. Only beat calls track;
// classifyCrisis passes track:false so its concurrent call never masks a beat's
// failure. Best-effort/dev-grade: a single mutable, read right after the awaited
// beat call, which is sequential per beat.
export type AiTransport = 'idle' | 'ok' | 'offline' | 'fail';
let lastTransport: AiTransport = 'idle';
export function lastAiTransport(): AiTransport {
  return lastTransport;
}

/** True for a "can't reach the network" error (offline), as opposed to a server
 *  error or a timeout. React Native rejects fetch with a TypeError whose message
 *  is "Network request failed" when there is no connectivity. */
function isOfflineError(e: unknown): boolean {
  return e instanceof TypeError || /network request failed/i.test(String((e as Error)?.message));
}

async function callGemini(
  system: string,
  user: string,
  timeoutMs: number,
  track = true,
  schema?: SchemaRequest,
  thinking: number = THINKING_BUDGET,
): Promise<string | null> {
  const handle = getModelHandle();
  if (!handle) return null;
  // PII scrub: her words leave the device only here, so redact emails / phones /
  // named people before send and restore the real words in the reply. This is the
  // single choke point that covers every caller (reflection + crisis check).
  const { text: scrubbed, restore } = scrub(user);
  const set = (t: AiTransport) => {
    if (track) lastTransport = t;
  };
  // A fresh model per call: the system prompt varies by slot, and constructing a
  // GenerativeModel is cheap (no network). Low temperature: she needs steadiness,
  // not surprise.
  const build = (useSchema: boolean) =>
    getGenerativeModel(handle, {
      model: MODEL,
      systemInstruction: system,
      // NO safetySettings on purpose, MEASURED 2026-08-19. The worry was that
      // Vertex's default filters were quietly eating the entries that matter most,
      // and a filtered reply is indistinguishable from a timeout on screen (both
      // land on authored copy). So it was measured rather than guessed: 10 real
      // distress entries (grief, physical abuse, coerced sex, passive suicidal
      // ideation, self-harm history, miscarriage, bingeing and purging, a child's
      // cancer scan, coercive control, a past overdose) through reflect_signal and
      // act_help, with default settings and again with every category OFF.
      // 40/40 came back finishReason STOP, zero blockReason, zero empty, and the
      // two configurations were indistinguishable. The default filters are not
      // touching her distress, so there is nothing to buy by loosening them and a
      // real cost to loosening them (this same key would then also stop filtering
      // things we DO want filtered). Re-measure with the throwaway harness before
      // changing model or region; do not loosen on a hunch.
      generationConfig: {
        temperature: 0.6,
        // maxOutputTokens COVERS THINKING TOKENS TOO. This is the trap that made
        // cards arrive blank: the budget was spent reasoning and there was nothing
        // left for the reply. Any change to THINKING_BUDGET has to move this with it.
        maxOutputTokens: thinking + 400,
        thinkingConfig: { thinkingBudget: thinking },
        ...(useSchema && schema
          ? { responseMimeType: 'application/json', responseSchema: schema }
          : {}),
      },
    });

  // One attempt, classifying HOW it failed so the loop below knows whether a
  // retry is worth it. 'offline' means the network is down (never retry); a
  // timeout/abort, a safety block (text() throws with no candidate), or an empty
  // body are all transient here.
  const attempt = async (
    useSchema: boolean,
  ): Promise<{ ok: true; text: string } | { ok: false; offline: boolean }> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await build(useSchema).generateContent(scrubbed, { signal: ctrl.signal });
      const text = res.response.text().trim();
      if (text) return { ok: true, text };
      // No text with a candidate present usually means the reply was filtered or
      // the token budget ran out mid-thought. Log the reason so a block stops
      // looking exactly like a timeout in the Metro log (2026-08-19 audit: the two
      // were indistinguishable, and both just showed as authored copy on screen).
      // Dev log only, deliberately: a block does NOT get its own AiTransport
      // state, because she does not need a different screen for it (both mean the
      // beat renders its authored line) and the audit found the rate to be zero.
      // Promote it to a transport state only if that number ever stops being zero.
      if (__DEV__) {
        const r = res.response;
        console.log(
          `[moon-ai] empty reply · block=${r.promptFeedback?.blockReason ?? '-'} finish=${r.candidates?.[0]?.finishReason ?? '-'}`,
        );
      }
      return { ok: false, offline: false };
    } catch (e) {
      // A timeout (AbortError) is "not responding", not offline.
      // TEMP diagnostic (remove before ship): the real reason a call fails is
      // otherwise discarded here and the flow just falls back to authored copy,
      // which reads as "AI not working" with no clue why. Surface it in dev so we
      // can see e.g. "AI Logic API disabled", "PERMISSION_DENIED", "model not
      // found", or an App Check rejection.
      if (__DEV__) console.log('[moon-ai] call error:', String((e as Error)?.message ?? e));
      return { ok: false, offline: isOfflineError(e) };
    } finally {
      clearTimeout(timer);
    }
  };

  // Up to three attempts. A concurrent burst of beat calls (has_event + crisis +
  // reflect prefetch fire together, feelings a beat later) makes the model throw
  // transient 429s / timeouts. On device feelings and reflect_friend fail often
  // while their neighbours succeed, which reads as "AI stops in between". Each
  // retry waits a short JITTERED pause so it lands outside the burst window; the
  // second retry recovers the tail the first misses. Offline never retries.
  // ponytail: fixed 3-attempt cap; per-slot backoff only if it still falls short.
  const ATTEMPTS = 3;
  for (let i = 0; i < ATTEMPTS; i++) {
    // Last attempt drops the response schema. If Vertex ever rejects one of the
    // schemas above (a model change, an unsupported keyword), that slot would
    // otherwise fail every time and die to authored copy forever. Without the
    // schema the prompt still asks for JSON in prose and moment-ai.ts still
    // parses it defensively, which is exactly the behaviour that shipped before,
    // so the worst case is the old behaviour rather than a dead card.
    const r = await attempt(i < ATTEMPTS - 1);
    if (r.ok) {
      set('ok');
      return restore(r.text); // put her real words back into the reply
    }
    if (r.offline) {
      set('offline');
      return null;
    }
    if (i < ATTEMPTS - 1) {
      await new Promise((res) => setTimeout(res, 350 + Math.floor(Math.random() * 350)));
      continue;
    }
    set('fail');
    return null;
  }
  set('fail');
  return null;
}

const geminiProvider: MomentProvider = {
  name: 'gemini',
  async generate(slot, herText, timeoutMs) {
    const instruction = SLOT_INSTRUCTION[slot];
    if (!instruction) return null;
    // RESPONSE_SCHEMA[slot] is undefined for the plain-text slots, which is the
    // whole switch: a schema means "decode as JSON", no schema means "one line".
    const out = await callGemini(
      `${VOICE}\n\n${instruction}`,
      herText,
      timeoutMs,
      true,
      RESPONSE_SCHEMA[slot],
      SLOT_THINKING[slot] ?? THINKING_BUDGET,
    );
    // TEMP dev diagnostic (remove before ship): prints each beat call + outcome to
    // Metro so we can confirm the model is actually firing on device.
    if (__DEV__) console.log(`[moon-ai] ${slot} · ${lastTransport}${out ? ` · "${out.slice(0, 48)}"` : ' · null'}`);
    return out;
  },
};

/** The provider the Moon flow should use. NO_PROVIDER (authored fallback) unless
 *  the flag is on AND Firebase is configured in this build, so a build with no
 *  Firebase config (or the store build with the flag off) ships no AI. */
export function getMomentProvider(): MomentProvider {
  if (!MOMENT_AI || !getModelHandle()) return NO_PROVIDER;
  return geminiProvider;
}

// --- Crisis gate (model layer) -------------------------------------------
//
// This runs BEHIND the deterministic keyword floor in analyse()/crisis-scan.ts,
// which stays the instant, offline, can't-fail check. This adds recall for the
// subtler cases keywords miss ("i dont see the point in tomorrow"). It can only
// ESCALATE: the caller turns crisis ON when this says so, never off. Typed, so
// the (reworked) crisis page can route to the right resource. Acute-vs-historical
// so a past disclosure is not walled off. Recall-first: when unsure, it blocks.

export type CrisisType =
  | 'suicide' | 'self_harm' | 'violence_to_her' | 'harm_to_care' | 'harm_to_other' | 'child_harmed' | 'overdose' | 'none';

export type CrisisRead = {
  crisisType: CrisisType;
  acuity: 'acute' | 'historical' | 'none';
  isCrisisMode: boolean;
  crisisScore: number;
};

const CRISIS_SYSTEM = [
  "You are the safety check that runs before Niyora's normal flow, on what a woman just wrote. Decide whether this moment needs a real-world crisis resource instead of the app's emotional-support flow. Detection, not comfort. When unsure, treat it as a crisis: missing a real one is far worse than a false alarm.",
  '',
  'Types: suicide (any thought of ending her life or being better off dead or gone, active or passive) · self_harm (hurting her own body) · violence_to_her (someone physically or sexually hurting, forcing, or seriously threatening her; domestic or sexual violence, incl. credible threats and coercive control) · harm_to_care (she fears she will hurt someone in her care, such as her child) · harm_to_other (a credible, specific intent to physically harm a named person she is angry at, backed by a real plan, the means, or immediacy) · child_harmed (a child is being hurt) · overdose (she has taken or is about to take a dangerous amount of a substance) · none.',
  '',
  'Acuity: acute (happening now, just happened, or ongoing danger) · historical (a past event with no current danger, "years ago") · none. Only an ACUTE crisis stops the flow.',
  '',
  'Venting hyperbole about someone else ("i could kill him", "i want to strangle her", "i hate him so much") is NOT a crisis; it is anger, and it stays none. harm_to_other is the RARE, HIGH-BAR exception: it fires ONLY when a reasonable counselor would read a real, imminent plan to hurt a specific person, with a concrete plan, the means, or immediacy present, not mere rage or a figure of speech. When unsure whether it is rage or a real plan, it is rage: leave it none. What makes it suicide or self_harm is that it is aimed at herself. Set isCrisisMode true whenever crisisType is not none AND acuity is acute, and whenever you are unsure.',
  '',
  'Return only JSON: {"crisisType":"...","acuity":"acute|historical|none","isCrisisMode":true|false,"crisisScore":0-100}',
].join('\n');

// The classifier's shape, enforced (2026-08-19). crisisType is an enum here on
// purpose: it is routed on (CrisisSheet picks the resource by type), so a type
// the app does not know about is worse than no read at all. Under the old prose
// contract a drifted string would parse fine and route nowhere.
const CRISIS_SCHEMA: SchemaRequest = {
  type: SchemaType.OBJECT,
  properties: {
    crisisType: {
      type: SchemaType.STRING,
      enum: ['suicide', 'self_harm', 'violence_to_her', 'harm_to_care', 'harm_to_other', 'child_harmed', 'overdose', 'none'],
    },
    acuity: { type: SchemaType.STRING, enum: ['acute', 'historical', 'none'] },
    isCrisisMode: { type: SchemaType.BOOLEAN },
    crisisScore: { type: SchemaType.INTEGER },
  },
  required: ['crisisType', 'acuity', 'isCrisisMode', 'crisisScore'],
};

/** Model crisis read, or null on any failure (the keyword floor still stands).
 *  Escalate-only: the caller may use this to turn crisis ON, never off. */
export async function classifyCrisis(herText: string): Promise<CrisisRead | null> {
  if (!MOMENT_AI || !getModelHandle()) return null;
  const raw = herText.trim();
  if (!raw) return null;
  const out = await callGemini(CRISIS_SYSTEM, raw, 6000, false, CRISIS_SCHEMA);
  if (!out) return null;
  try {
    const j = JSON.parse(out.replace(/^```json\s*|```$/g, '').trim());
    if (typeof j?.isCrisisMode !== 'boolean') return null;
    if (__DEV__) console.log(`[moon-ai] crisis · ${j.crisisType} · ${j.acuity} · block=${j.isCrisisMode}`);
    return j as CrisisRead;
  } catch {
    // Recall-first (audit H-2c): if the reply was unparseable but the model still
    // signalled a block in the raw text, honour that rather than dropping to null.
    // The classifier's own instruction is "when unsure, treat it as a crisis", so a
    // malformed-but-alarming reply should escalate, not silently pass. Acute so the
    // flow actually stops; type unknown -> the suicide-shaped screen (the safe default).
    if (/["']?isCrisisMode["']?\s*:\s*true/i.test(out)) {
      return { crisisType: 'none', acuity: 'acute', isCrisisMode: true, crisisScore: 100 };
    }
    return null;
  }
}
