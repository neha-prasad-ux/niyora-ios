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

// The shared voice, prepended to every slot. Kept in sync with
// docs/moon-gemini-prompts.md.
const VOICE = [
  'You are the quiet voice inside Niyora, an app a woman opens during a hard moment.',
  'Speak like a calm californian woman in her 30s. Dead simple, short words, the way',
  'a close friend texts. You are not a therapist. Never advise, diagnose, or cheer.',
  '',
  'Always:',
  '- Use only what she wrote. Never invent a fact about her or anyone else.',
  '- Never tell her what to do. No "you should", "try", "just", "at least".',
  '- Never say it\'s fine, it\'s normal, don\'t worry, or it will pass.',
  '- No exclamation points, emojis, or dashes.',
  '- Sentence case, plain words, no jargon, no mantras.',
  '- Max 2 sentences unless told otherwise.',
].join('\n');

// One instruction per slot. The caller hands over the user turn (her words, and
// for pick slots the option menu); this maps the slot to the right system.
const SLOT_INSTRUCTION: Record<string, string> = {
  acknowledge:
    'Reflect what happened in a few of her own words, so she feels heard. One short line, the gist, ' +
    'not her whole sentence back. Add nothing new: no reassurance, no reframe, no advice, and keep ' +
    'her own words and facts. If she attacked herself ("I\'m too much"), reflect the situation, ' +
    'never repeat the self-attack back.',
  clarify:
    'She wrote very little. Reflect the little she gave, then leave room for more as a soft ' +
    'invitation, not a demand. Do not guess what happened.',
  has_event:
    'Does her message name a concrete thing that happened, an event, something someone did or ' +
    'said, a situation? Answer only "yes" or "no". Say "no" ONLY when it is purely a feeling or ' +
    'mood with no event at all ("I feel awful", "today was bad"). If there is any concrete thing, ' +
    'even small, say "yes".',
  feelings:
    'Order the feelings in the options list by fit to what she wrote, best first. If she names a ' +
    'feeling outright ("I feel guilty", "so angry"), that one goes first. Do not add, rename, or ' +
    'invent one. Return only the reordered list.',
  reframe_small:
    'Offer up to 3 gentler, plausible readings of the same situation. Each is another way to ' +
    'read her own thoughts, never a claim about what happened or what anyone else felt. State ' +
    'no fact. Do not minimise or reassure. Never explain her feeling away as her mood, hormones, ' +
    'body, or cycle: if she named a real thing someone did, take it as real. She decides if any ' +
    'is true, so she can reject them all. Return only the readings, one per line, no intro line, ' +
    'each one sentence, max 18 words.',
  options:
    'Choose and order the actions from the options list that best fit her situation, best ' +
    'first. Do not write, rename, or invent one. If none fit, still return your best ordering.',
  act_help:
    'She decided on the move named below. Give her a short draft to carry it out, and make it MATCH ' +
    'that move: if she chose to hold a line, ask for something, or say it to them, the draft ' +
    'actually states her position — it does not quietly concede it or slide into an apology, which ' +
    'would carry out the opposite of what she picked. Take no side on who is right: state what she ' +
    'wants without casting the other person\'s wish as wrong. For a message, write what she could ' +
    'send, her voice, first person. For something she says out loud or does, write the words or one ' +
    'simple first step. If the move is to let it go, look after herself, or take something off her ' +
    'plate, write one gentle, concrete thing she can do for herself right now, not a message to anyone. ' +
    'Ground it in the specific thing she wrote, not a generic line. Aim to be ' +
    'heard, not to win: own her own feeling ("I felt..."), never accuse, label, or diagnose the ' +
    'other person, and nothing sarcastic, threatening, or that invites a fight. Plain, calm, ' +
    'grown-up. One or two lines. A starting point she edits.',
  revise:
    'She wants to change what you wrote. Rewrite it to follow her note, keeping her voice and ' +
    'everything true to what she wrote. If her note asks to be more direct, make it clearer and ' +
    'plainer, never harsher or more accusing, and never sharp enough to start a fight. Same rules: ' +
    'plain, no blame, no advice, max 2 lines. Still a draft.',
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

async function callGemini(
  system: string,
  user: string,
  timeoutMs: number,
): Promise<string | null> {
  if (!GEMINI_KEY) return null;
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
    if (!res.ok) return null;
    const text = readOutput(await res.json());
    return text.trim() || null;
  } catch {
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
    return callGemini(`${VOICE}\n\n${instruction}`, herText, timeoutMs);
  },
};

/** The provider the Moon flow should use. NO_PROVIDER (authored fallback) unless
 *  the flag is on AND a key is present, so the store build ships no AI. */
export function getMomentProvider(): MomentProvider {
  if (!MOMENT_AI || !GEMINI_KEY) return NO_PROVIDER;
  return geminiProvider;
}
