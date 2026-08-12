// The Gemini provider for the Moon flow. `moment.tsx` talks only to the
// MomentProvider port (v3/moment-ai); this file is one implementation of it,
// plus the per-slot system prompts from docs/moon-gemini-prompts.md.
//
// Cloud, not on-device: this replaces the Gemma seam (src/lib/reflect-model).
// The product guardrails do NOT live here. echo() and pick() in moment-ai wrap
// whatever this returns, so an absent or failed model degrades to authored copy
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
import { getAI, getGenerativeModel, VertexAIBackend } from '@react-native-firebase/ai';
import { MOMENT_AI } from '@/config/features';
import { NO_PROVIDER, type MomentProvider } from '@/v3/moment-ai';
import { scrub } from './pii';

const LOCATION = 'us-central1';
// Verified against this project's Vertex backend (firebasevertexai) with the exact
// generationConfig below: 'gemini-3.6-flash' 404s (not a real Vertex model),
// 'gemini-2.5-flash' returns 200. If you bump this, re-verify the model exists in
// LOCATION or every call silently falls back to authored copy.
const MODEL = 'gemini-2.5-flash';

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

// The shared voice, prepended to every slot as the system turn. This is the
// Voice block from the 2026-08-02 rework: persona + the universal tone bans that
// hold for every beat, so a rule (e.g. no dashes) is fixed in one place.
const VOICE = [
  'You are the quiet voice inside Niyora, an app a woman opens in a hard moment. You speak like a calm, warm woman in her 30s, a close friend, in dead-simple words anyone can read. You are not a therapist and never sound like one.',
  '',
  'This voice holds for everything you write:',
  '- No exclamation points, no emojis, and no dashes of any kind. Use a full stop or a comma instead. Sentence case, plain words.',
  '- No jargon or therapist-speak. Do not say "boundaries", "nervous system", "holding space", "catastrophizing", "spiralling". No mantras or clichés.',
  '- Never tell her it is fine, normal, will pass, or not a big deal. No "at least", no looking on the bright side.',
  '- Use only what she wrote. Never invent a fact, a person, or a detail about her or anyone else.',
  '- Warm and quiet, never chirpy or performative. You are here to help her feel met and make her own call, never to impress and never to win.',
].join('\n');

// Shared tail for the reflect-card slots (see v3/reflect-cards.ts). The safety
// rules from that file's header, in one place so every card inherits them. Kept
// OUT of VOICE on purpose: "adds a possibility" is wrong for acknowledge/feelings,
// so it must not leak into the non-reflect slots.
const REFLECT_SAFETY =
  'Every line ADDS a possibility beside her feeling, it never takes it away and ' +
  'never tells her how she feels. No "just", no "you are overreacting", nothing ' +
  'that shrinks or dismisses what she wrote. If her feeling is tied to her cycle, ' +
  'do not blame it on that.';

// One instruction per slot. The caller hands over the user turn (her words, and
// for pick slots the option menu); this maps the slot to the right system.
const SLOT_INSTRUCTION: Record<string, string> = {
  acknowledge:
    'This is the first thing she hears back. Reflect the part of her own story that carries the ' +
    'weight, so she feels received. Find the ONE heaviest thing: the effort she spent, the thing ' +
    'she gave up, the "again" that shows it keeps happening, or the thing done to her. Hold that up ' +
    'in one short line. COMPRESS: your line must be clearly SHORTER than what she wrote, never a ' +
    'restatement of her whole sentence. If she wrote a long or run-on entry, cut it to its heart, ' +
    'the single heaviest clause. Fix any spelling or grammar so it reads clean. A statement, not a ' +
    'question. Keep who did what to whom exact, keep her own charged words, do not soften them. ' +
    'Name no emotion, add no reassurance, reframe, or advice. If she attacked herself, reflect the ' +
    'situation she is in, never the self-judgment. If she guessed why someone acted, reflect what ' +
    'happened, not her guess. Reply with only the line, nothing else.',
  clarify:
    'She wrote very little. Reflect the little she gave in a few of her own words, then ask one ' +
    'warm, open question about what happened, never presupposing a fact ("what happened that made ' +
    'today feel this way", not "did someone upset you"). Max 2 sentences. Reply with only that.',
  has_event:
    'Does her message name a concrete thing that happened, an event, something someone did or ' +
    'said, a situation? Answer only "yes" or "no". Say "no" ONLY when it is purely a feeling or ' +
    'mood with no event at all ("I feel awful", "today was bad"). If there is any concrete thing, ' +
    'even small, say "yes".',
  feelings:
    'Order the feelings in the options list by how well they fit what she wrote, best first. If ' +
    'she names a feeling outright, that one goes first; if her word is not in the list, map it to ' +
    'the nearest one in the list. Tell close ones apart: guilty = she did wrong, ashamed = ' +
    'something wrong with her; hurt = wounded by someone close, angry = wronged; left out = shut ' +
    'out of a group, lonely = alone, rejected = pushed away, ignored = not acknowledged, ' +
    'unappreciated = effort unseen; betrayed = trust broken, blindsided = did not see it coming. ' +
    'Judge from her words only, never her cycle. Return only the reordered list.',
  reframe_small:
    'Offer up to 3 gentler, plausible ways she could read the same situation, so she has another ' +
    'angle, plus one open question that helps her reach her own. Each reading is a "maybe" about ' +
    'her own thinking, never a claim about what happened or what anyone felt or meant: stay ' +
    'tentative ("it could be", "maybe", "one way to read it"), state no fact. Never mind-read ' +
    'anyone, never minimise or reassure, never explain her feeling away as her cycle, never turn ' +
    'it on her, take no side. Each reading one sentence, max 18 words, genuinely different. ' +
    'selfPrompt is one open question pointing at the exact thing she is reading darkly, never ' +
    'presupposing an answer ("is there another reason he was quiet?", not "was he just tired?"), ' +
    'max 14 words. Return an empty readings array AND an empty selfPrompt if she is attacking her ' +
    'own worth, if it is a diffuse mood with nothing specific to loosen, or if she describes being ' +
    'harmed. Return only JSON: {"readings": ["...", "..."], "selfPrompt": "..."}',
  options:
    'Choose and order the actions from the options list that best fit her situation, best first. ' +
    'Do not inflate the confront-the-person actions; if she is hot or overwhelmed, a steadying ' +
    'action can be the best fit. Take no side on who is right. Return only your ordering of the ' +
    'options.',
  act_help:
    'She chose a way to respond. Write a draft that carries out THAT move, a starting point she ' +
    'edits. If the move is aimed at the other person, write the message she could send, first ' +
    'person. If it is to tell one person, get someone whose job it is, or reach out for comfort, ' +
    'write a short message to that person, not the one she is upset with. If it is to find out, ' +
    'get it ready, work out what she wants, take something off her plate, let it be, look after ' +
    'herself, or take space, write one concrete small step for herself, not a message. Carry out ' +
    'her move, not a softer or opposite one: hold a line states the line and does not apologise it ' +
    'away; own my part owns it once and offers to make it right, no grovel. For any message use ' +
    'soft "I" language: what happened as plain fact (never "you always"), how she felt, one ' +
    'specific doable ask; never accuse, label, or threaten. Ground it only in what she wrote, ' +
    'invent no facts or people. Short: a message is 1 to 3 sentences, a step is one sentence. ' +
    'Reply with only the draft.',
  revise:
    'She wants to change the draft. Rewrite it to follow her note, keeping her voice and ' +
    'everything true to what she wrote. If her note asks to be more direct, make it clearer and ' +
    'plainer, never harsher or more accusing. Same rules: plain, no blame, no advice, max 2 lines. ' +
    'Reply with only the revised draft.',
  // --- Reflect cards (v3/reflect-cards.ts). Draft slots return one line; guess
  // slots return a JSON options array. Empty result => authored fallback. ---
  reflect_friend:
    'She wrote this about herself. Write the warm, honest thing she would tell a friend who said the exact same ' +
    'thing. Kind and true, self-compassion, not fake cheer, never "do not worry". One short line, no quotes. ' +
    'Reply with only the line. ' + REFLECT_SAFETY,
  reflect_simpler:
    'Offer 2 or 3 short, plainer outside reasons the situation could have, ones that are not about her being at ' +
    'fault (for example he has been buried at work). Each is a maybe she can weigh, never a claim about what ' +
    'happened. Concrete, not vague, one short line each. If nothing specific fits, return an empty array. Return ' +
    'only JSON: {"options": ["...", "..."]}. ' + REFLECT_SAFETY,
  reflect_also_true:
    'She is bracing for the worst. Offer 2 or 3 short, more likely ways this could go instead, each one honest. ' +
    'Each is also possible, set beside her fear, not a claim that she is wrong to fear it. Concrete, not vague, ' +
    'one short line each. If nothing specific fits, return an empty array. Return only JSON: {"options": ["...", ' +
    '"..."]}. ' + REFLECT_SAFETY,
  reflect_pattern:
    'You are given her thought now and a short list of themes from her past entries. If the same theme clearly ' +
    'comes back, name it in one gentle line (for example this keeps coming back to the deadline). Only if it is a ' +
    'real recurrence. If nothing genuinely repeats, reply with only the word none. One short line, no quotes. ' +
    REFLECT_SAFETY,
  reflect_need:
    'Under the situation she described, what might she actually NEED right now? Offer 2 or 3 short, plain guesses ' +
    '(for example to feel heard, a bit of rest, some space, to know it was not her fault). Each a maybe grounded in ' +
    'what she wrote, never a claim or an instruction, one short line. Name a need, do not tell her to do anything. ' +
    'If nothing specific fits, return an empty array. Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_helping:
    'She is gripping a thought or worry. Not whether it is true, but whether holding it so tightly right now is ' +
    'doing anything FOR her. Offer 2 or 3 short, honest reads of what carrying it is costing her and what might ' +
    'ease if she let it sit a little lighter, grounded in what she wrote. Each a gentle maybe, never an instruction ' +
    'to "let it go" or "stop thinking about it", one short line. If nothing fits, return an empty array. Return only ' +
    'JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_wise:
    'Assume she already holds part of the answer under the noise. Offer 2 or 3 short reads of what the calm, steady ' +
    'part of her most likely already knows about this, grounded in what she wrote. Each a gentle maybe pointing in ' +
    'her own direction, never telling her what to do, one short line. If nothing fits, return an empty array. Return ' +
    'only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_rule:
    'Under her upset there may be a rigid rule or a "should" (I should have, they should have, it should be this ' +
    'way). Name 2 or 3 of those rules gently, and where they might come from, so she can SEE the rule instead of ' +
    'only feeling it. Each a maybe, never telling her the rule is right or wrong, one short line. If nothing fits, ' +
    'return an empty array. Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_handle:
    'She is bracing for a worst case. Do NOT argue the fear away or say it will not happen. Instead take the worst ' +
    'as if it came true, and offer 2 or 3 short, honest reads of how she could get through it or what would still ' +
    'be true and steady for her, grounded in her own strengths and what she wrote. Each a maybe, never a promise ' +
    'that it will be fine, one short line. If nothing fits, return an empty array. Return only JSON: {"options": ' +
    '["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_shame:
    'She may be turning one thing that happened into a verdict on who she is as a person. Offer 2 or 3 short reads ' +
    'that separate the THING (a thing done or said, which can be faced or repaired) from a whole-person judgment ' +
    '(who she is). Each grounded in what she wrote, a gentle maybe, never agreeing that she is bad, one short line. ' +
    'If nothing fits, return an empty array. Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_signal:
    'Read what her feeling might be POINTING TO, do not reframe it. A feeling usually flags something that matters ' +
    '(anger a line crossed, dread something coming she cares about, hurt something she values). Offer 2 or 3 short ' +
    'reads of what this feeling could be telling her, grounded in what she wrote. Each a maybe, never a diagnosis ' +
    'and never an instruction, one short line. If nothing fits, return an empty array. Return only JSON: {"options": ' +
    '["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_future:
    'Speak from the view of the version of her who has ALREADY come through this. Offer 2 or 3 short reads of what ' +
    'that self might want her to know or hold onto now. This must NEVER say the feeling will pass, that it will not ' +
    'matter, that it is small, or "at least" anything — it takes the moment fully seriously and speaks from having ' +
    'lived through it, not from minimizing it. Each grounded in what she wrote, a gentle maybe, one short line. If ' +
    'nothing fits, return an empty array. Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_middle:
    'She is thinking in all-or-nothing terms (for example "I always ruin everything"). The truth usually sits in ' +
    'the middle. Offer 2 or 3 short middle-ground readings that land BETWEEN the all-good and the all-bad, grounded ' +
    'in what she wrote. Concrete, each a maybe, one short line. If nothing specific fits, return an empty array. ' +
    'Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_agency:
    'Given what she wrote, help her see how much of this she can actually work on. Offer 2 or 3 short, concrete ' +
    'lines: at least one thing that IS in her power to act on, and at least one part that is not hers to move. ' +
    'Never blame her, never assign her the whole load. Each a maybe, one short line. If nothing specific fits, ' +
    'return an empty array. Return only JSON: {"options": ["...", "..."]}. ' +
    REFLECT_SAFETY,
  reflect_factsort:
    'Split what she wrote into its separate claims: 2 to 4 short lines, in her own plain words, cleaned of spelling ' +
    'and grammar slips but keeping her meaning and her charged words. Mark each line fact:true ONLY when it is a ' +
    'plain observable event, just what happened or was plainly done, with no motive or meaning attached. Mark ' +
    'fact:false for anything that is her interpretation, an assumption, a guess at WHY someone acted or what they ' +
    'really meant, a claim about what WOULD have happened, or a judgment. Reporting a motive someone stated is still ' +
    'fact:false, because whether it is true is not observable. When unsure, use fact:false. Never merge a fact and a ' +
    'feeling into one line. Judge from her words only, never her cycle. Return only JSON: ' +
    '{"claims":[{"text":"...","fact":true},{"text":"...","fact":false}]}. ' +
    REFLECT_SAFETY,
  reflect_chat:
    'You are reflecting WITH her about the thought she brought, in a short back-and-forth. She has just said the ' +
    'latest line. FIRST decide if what she wrote is actually about her feelings, a person, or her situation. If it ' +
    'is NOT — a factual or trivia question (maths, general knowledge, definitions), a request to do a task, or ' +
    'anything off-topic — do NOT reflect on it and do NOT wrap it in feeling language. Warmly say that is not really ' +
    'what you are here for, and bring her back to what is on her mind (you may give one plain short answer to ' +
    'something trivial first, but never turn it into an emotional reading). OTHERWISE, when she is bringing ' +
    'something real: reply with ONE short turn, max 2 sentences. ALWAYS offer a concrete new way to see it, a gentle ' +
    'maybe about her thinking or the situation, so she leaves the turn with a fresh angle. Never reply with only a ' +
    'question, and never just mirror her words back: each time she asks again, give a genuinely DIFFERENT angle, not ' +
    'the same one reworded. You may add one short question after the perspective, never instead of it. Keep her in ' +
    'charge, stay tentative (a maybe, not a verdict). NEVER give advice, instructions, a plan, a diagnosis, or any ' +
    'medical or money guidance, and never tell her what to do. If the turn number you are given is 3 or higher, ' +
    'still give the fresh angle, then gently invite her to sit with what she has seen. Reply with only your line. ' +
    REFLECT_SAFETY,
  reflect_factsort_advise:
    'She has sorted her claims into facts and reads. For EACH read (her interpretation), in the same order given, ' +
    'offer one gentler, more tentative way to hold it, a maybe about her own thinking, never a claim about what ' +
    'happened, max 16 words. For the facts together, give ONE short warm line that helps her act on or sit with what ' +
    'is actually true, max 20 words; if there are no facts, return an empty help string. Return only JSON: ' +
    '{"reads":["...","..."],"help":"..."}. ' +
    REFLECT_SAFETY,
};

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
  // not surprise. thinkingBudget 0 keeps a gemini-3 model from spending its token
  // budget (and seconds) on reasoning before a one-line reply.
  const model = getGenerativeModel(handle, {
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 256,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // One attempt, classifying HOW it failed so the loop below knows whether a
  // retry is worth it. 'offline' means the network is down (never retry); a
  // timeout/abort, a safety block (text() throws with no candidate), or an empty
  // body are all transient here.
  const attempt = async (): Promise<
    { ok: true; text: string } | { ok: false; offline: boolean }
  > => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await model.generateContent(scrubbed, { signal: ctrl.signal });
      const text = res.response.text().trim();
      if (text) return { ok: true, text };
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
  // transient 429s / timeouts — on device feelings and reflect_friend fail often
  // while their neighbours succeed, which reads as "AI stops in between". Each
  // retry waits a short JITTERED pause so it lands outside the burst window; the
  // second retry recovers the tail the first misses. Offline never retries.
  // ponytail: fixed 3-attempt cap; per-slot backoff only if it still falls short.
  const ATTEMPTS = 3;
  for (let i = 0; i < ATTEMPTS; i++) {
    const r = await attempt();
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
    const out = await callGemini(`${VOICE}\n\n${instruction}`, herText, timeoutMs);
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
  | 'suicide' | 'self_harm' | 'violence_to_her' | 'harm_to_care' | 'child_harmed' | 'overdose' | 'none';

export type CrisisRead = {
  crisisType: CrisisType;
  acuity: 'acute' | 'historical' | 'none';
  isCrisisMode: boolean;
  crisisScore: number;
};

const CRISIS_SYSTEM = [
  "You are the safety check that runs before Niyora's normal flow, on what a woman just wrote. Decide whether this moment needs a real-world crisis resource instead of the app's emotional-support flow. Detection, not comfort. When unsure, treat it as a crisis: missing a real one is far worse than a false alarm.",
  '',
  'Types: suicide (any thought of ending her life or being better off dead or gone, active or passive) · self_harm (hurting her own body) · violence_to_her (someone physically or sexually hurting, forcing, or seriously threatening her; domestic or sexual violence, incl. credible threats and coercive control) · harm_to_care (she fears she will hurt someone in her care, such as her child) · child_harmed (a child is being hurt) · overdose (she has taken or is about to take a dangerous amount of a substance) · none.',
  '',
  'Acuity: acute (happening now, just happened, or ongoing danger) · historical (a past event with no current danger, "years ago") · none. Only an ACUTE crisis stops the flow.',
  '',
  'Venting hyperbole about someone else ("i could kill him") is NOT a crisis. What makes it suicide or self_harm is that it is aimed at herself. Set isCrisisMode true whenever crisisType is not none AND acuity is acute, and whenever you are unsure.',
  '',
  'Return only JSON: {"crisisType":"...","acuity":"acute|historical|none","isCrisisMode":true|false,"crisisScore":0-100}',
].join('\n');

/** Model crisis read, or null on any failure (the keyword floor still stands).
 *  Escalate-only: the caller may use this to turn crisis ON, never off. */
export async function classifyCrisis(herText: string): Promise<CrisisRead | null> {
  if (!MOMENT_AI || !getModelHandle()) return null;
  const raw = herText.trim();
  if (!raw) return null;
  const out = await callGemini(CRISIS_SYSTEM, raw, 4000, false);
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
