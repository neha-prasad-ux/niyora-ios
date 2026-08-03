// The Gemini provider for the Moon flow. `moment.tsx` talks only to the
// MomentProvider port (v3/moment-ai); this file is one implementation of it,
// plus the per-slot system prompts from docs/moon-gemini-prompts.md.
//
// Cloud, not on-device: this replaces the Gemma seam (src/lib/reflect-model).
// The product guardrails do NOT live here. echo() and pick() in moment-ai wrap
// whatever this returns, so a bad or absent key degrades to authored copy and
// the flow still completes. Everything here can return null, and null is never
// an error.
//
// Safe by default: with no key or the flag off, getMomentProvider() returns
// NO_PROVIDER and the flow is byte-identical to the deterministic build. Set
// EXPO_PUBLIC_MOMENT_AI=1 and EXPO_PUBLIC_GEMINI_API_KEY=... to light it up.

import { MOMENT_AI } from '@/config/features';
import { NO_PROVIDER, type MomentProvider } from '@/v3/moment-ai';

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? 'gemini-3.6-flash';
// The Interactions API. generateContent is deprecated for new keys (404s with a
// migrate-to-interactions notice), so this is the only path that answers.
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

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
};

// The generated text lives in the `model_output` step, whose `content` array
// holds the text blocks. gemini-3 also emits a `thought` step we ignore. (The
// SDK's `output_text` convenience does this join for us; on raw fetch we do it.)
function readOutput(json: unknown): string {
  const steps = (json as { steps?: unknown })?.steps;
  if (!Array.isArray(steps)) return '';
  let out = '';
  for (const step of steps) {
    if ((step as { type?: string })?.type !== 'model_output') continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if ((block as { type?: string })?.type === 'text') out += (block as { text?: string }).text ?? '';
    }
  }
  return out;
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
): Promise<string | null> {
  if (!GEMINI_KEY) return null;
  const set = (t: AiTransport) => {
    if (track) lastTransport = t;
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL,
        system_instruction: system,
        input: user,
        // thinking_level 'minimal' keeps a gemini-3 model from spending its whole
        // token budget (and seconds of latency) on reasoning before a one-line
        // reply. Low temperature: she needs steadiness, not surprise.
        generation_config: { temperature: 0.6, max_output_tokens: 256, thinking_level: 'minimal' },
      }),
    });
    if (!res.ok) {
      set('fail');
      return null;
    }
    const text = readOutput(await res.json());
    if (text.trim()) {
      set('ok');
      return text.trim();
    }
    set('fail');
    return null;
  } catch (e) {
    // A timeout (AbortError) is "not responding", not offline.
    set(isOfflineError(e) ? 'offline' : 'fail');
    return null;
  } finally {
    clearTimeout(timer);
  }
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
 *  the flag is on AND a key is present, so the store build ships no AI. */
export function getMomentProvider(): MomentProvider {
  if (!MOMENT_AI || !GEMINI_KEY) return NO_PROVIDER;
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
  if (!MOMENT_AI || !GEMINI_KEY) return null;
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
    return null;
  }
}
