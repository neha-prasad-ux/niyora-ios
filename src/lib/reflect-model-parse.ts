// Pure prompt-shaping and output-parsing for the Gemma provider. No native
// imports live here so it is unit-testable in isolation (and so tests never
// pull the native modules into jest's haste map). reflect-model.ts wires these
// into the provider.
//
// Apple Foundation Models does guided output natively; Gemma does not, so for
// Gemma we compose an explicit format directive and then tolerantly parse its
// free text back into { prose, chips }. Small models fence their JSON, add
// preamble, or echo turn tokens — the parser is built to survive all three.

/**
 * Fold the instructions and the per-step prompt into one string for Gemma.
 *
 * We NEVER ask for JSON any more. The corpus contains zero JSON targets --
 * every assistant target is bare lowercase prose, at most two sentences
 * (gemma4-runpod assemble.py). Demanding `{"prose": …, "chips": […]}` was
 * off-distribution, so the model answered in prose, the JSON parse returned
 * null, and the beat silently fell back to its scripted line. Measured on
 * device 2026-07-27: that made `confirm` and `examine` incapable of ever
 * showing model output, which read as "the AI rarely fires" rather than as an
 * error.
 *
 * Chips therefore stay scripted (decision, 2026-07-27). The model contributes
 * the prose, which is what it was trained to write; the chip sets remain the
 * authored ones, which also means a chip can never contain invented words.
 * `wantChips` is kept in the signature because callers still use it to decide
 * whether to render a chip row.
 */
export function composeGemmaPrompt(
  instructions: string,
  prompt: string,
  _wantChips: boolean,
): string {
  const format =
    'Reply with only the sentence or two, nothing else. No quotes, no preamble.';
  return `${instructions}\n\n${prompt}\n\n${format}`;
}

// Strip a leading Gemma turn token, code fences, and any trailing end-of-turn
// marker the runtime may echo.
//
// BOTH marker families, because the two Gemma generations do not agree and we
// have shipped against each. Gemma 3 wraps turns in <start_of_turn> /
// <end_of_turn>; Gemma 4 uses <|turn> / <turn|> plus a set of tool and channel
// tokens. Verified by reading the jinja chat template embedded in
// niyora-gemma4-e2b-v4-wide-deduped-int4.litertlm itself (2026-07-27), which
// contains <|turn>, <turn|>, <|channel>, <|tool_call>, <|tool_response> and no
// <start_of_turn> at all. Handling only the Gemma 3 pair meant every echoed
// Gemma 4 marker survived into the prose shown to her.
function stripWrapping(raw: string): string {
  let t = raw.trim();
  // Gemma 3.
  t = t.replace(/^<start_of_turn>\s*model\s*/i, '');
  t = t.replace(/<end_of_turn>\s*$/i, '').trim();
  // Gemma 4: a leading turn/role opener, and any trailing turn close.
  t = t.replace(/^<\|turn>\s*(?:model|assistant)?\s*/i, '');
  t = t.replace(/<turn\|>\s*$/i, '').trim();
  // Channel/tool scaffolding the model can emit around the answer.
  t = t.replace(/<\|(?:channel|tool_call|tool_response|tool|think|e)\|?>/gi, '').trim();
  t = t.replace(/<(?:tool_call|tool_response)\|>/gi, '').trim();
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

/**
 * Parse Gemma's raw output into { prose }, or null when there is nothing
 * usable — null routes to the scripted line.
 *
 * The model is ALWAYS asked for bare prose now, so there is one parse path.
 * `wantChips` and `sourceText` are retained in the signature for callers but no
 * longer change the result: chips are scripted (see composeGemmaPrompt).
 *
 * WHY CHIPS ARE NOT MODEL-GENERATED, kept because the reasoning outlives this
 * implementation. A tapped chip is rendered with append('me', chip) — it
 * appears as a bubble from HER, and is then interpolated into the next prompt
 * as `she said: "<chip>"`. An ungrounded chip therefore shows a woman a
 * sentence she never wrote, attributed to her, and tells the model she said it.
 * Prose carries no such risk: it is the moon speaking in its own voice, and an
 * offer beat is SUPPOSED to introduce words she did not write — naming a
 * feeling, proposing a gentler frame. That asymmetry is why prose was never
 * gated on grounding and chips always were; with chips scripted, the risk is
 * zero by construction.
 */
export function parseGemmaTurn(
  raw: string,
  _wantChips?: boolean,
  _sourceText?: string,
): { prose: string; chips?: string[] } | null {
  const prose = cleanProse(stripWrapping(raw));
  return prose ? { prose } : null;
}
