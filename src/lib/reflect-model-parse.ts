// Pure prompt-shaping and output-parsing for the Gemma provider. No native
// imports live here so it is unit-testable in isolation (and so tests never
// pull the native modules into jest's haste map). reflect-model.ts wires these
// into the provider.
//
// Apple Foundation Models does guided output natively; Gemma does not, so for
// Gemma we compose an explicit format directive and then tolerantly parse its
// free text back into { prose, chips }. Small models fence their JSON, add
// preamble, or echo turn tokens — the parser is built to survive all three.

import { isGrounded } from '@/lib/ground-floor';

/**
 * Fold the CBT instructions, the per-step prompt, and an output-format
 * directive into one string for Gemma. When chips are wanted we ask for strict
 * JSON; otherwise we ask for the bare sentence.
 */
export function composeGemmaPrompt(
  instructions: string,
  prompt: string,
  wantChips: boolean,
): string {
  const format = wantChips
    ? 'Reply with ONLY a JSON object and nothing else, no code fence:\n' +
      '{"prose": "<one or two short sentences>", "chips": ["<reply>", "<reply>"]}\n' +
      'Two or three chips, each under 10 words, in her own words.'
    : 'Reply with only the sentence or two, nothing else. No quotes, no preamble.';
  return `${instructions}\n\n${prompt}\n\n${format}`;
}

// Strip a leading Gemma turn token, code fences, and any trailing end-of-turn
// marker the runtime may echo.
function stripWrapping(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^<start_of_turn>\s*model\s*/i, '');
  t = t.replace(/<end_of_turn>\s*$/i, '').trim();
  // ```json … ``` or ``` … ```
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();
  return t;
}

function cleanProse(s: string): string {
  let t = stripWrapping(s).replace(/\s+/g, ' ').trim();
  // Drop a single pair of wrapping quotes.
  if (t.length >= 2 && /^["'].*["']$/.test(t)) t = t.slice(1, -1).trim();
  return t;
}

// Pull the first balanced-looking JSON object out of a noisy string.
function extractJsonObject(s: string): any | null {
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  try {
    return JSON.parse(s.slice(first, last + 1));
  } catch {
    return null;
  }
}

/**
 * Parse Gemma's raw output into { prose, chips? }, or null when it can't be
 * trusted (unparseable JSON, empty prose) — null routes to the scripted line.
 */
export function parseGemmaTurn(
  raw: string,
  wantChips: boolean,
  sourceText?: string,
): { prose: string; chips?: string[] } | null {
  const body = stripWrapping(raw);
  if (!wantChips) {
    const prose = cleanProse(body);
    return prose ? { prose } : null;
  }
  const obj = extractJsonObject(body);
  if (!obj || typeof obj !== 'object') return null;
  const prose = typeof obj.prose === 'string' ? cleanProse(obj.prose) : '';
  if (!prose) return null;
  // CHIPS ARE GATED ON GROUNDING; PROSE IS NOT. The distinction is not
  // stylistic, it follows from what each one becomes on screen.
  //
  // A tapped chip is rendered with append('me', chip) — it appears as a bubble
  // from HER. It is then interpolated into the next prompt as
  // `she said: "<chip>"`. So an ungrounded chip means the app shows a woman a
  // sentence she never wrote, attributed to her, and then tells the model she
  // said it. That is the exact failure the fine-tuning work exists to prevent,
  // and no amount of model accuracy fixes it, because nothing was checking.
  //
  // Prose is the moon speaking in her own voice. An offer beat is SUPPOSED to
  // introduce words the user did not write — naming a feeling, proposing a
  // gentler frame. Gating prose on grounding would break those beats, and
  // measurably does: the model that scores best on grounding answers "name
  // three feelings" with a reflection. (gemma4-runpod/docs/THE-METRIC-CHOSE-WRONG.md)
  const candidates = Array.isArray(obj.chips)
    ? obj.chips
        .filter((c: unknown): c is string => typeof c === 'string')
        .map((c: string) => cleanProse(c))
        .filter(Boolean)
    : [];
  const chips = (sourceText
    ? candidates.filter((c: string) => isGrounded(sourceText, c))
    : candidates
  ).slice(0, 3);

  // Dropping every chip is a valid outcome, not a bug: the caller falls back to
  // scripted chips, which is always better than putting invented words in her
  // mouth. Returning { prose } alone keeps the model's line and loses only the
  // taps.
  return chips.length ? { prose, chips } : { prose };
}
