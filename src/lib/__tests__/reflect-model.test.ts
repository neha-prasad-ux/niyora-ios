import { composeGemmaPrompt, parseGemmaTurn } from '@/lib/reflect-model-parse';

// The JSON contract is GONE (2026-07-27). The corpus contains zero JSON
// targets — every assistant target is bare lowercase prose, at most two
// sentences — so asking for `{"prose": …, "chips": […]}` was off-distribution.
// Measured on device: the model answered in prose, the JSON parse returned
// null, and `confirm` and `examine` fell back to their scripted lines every
// single time, which read as "the AI rarely fires" rather than as an error.
// Chips are now always the authored sets. These tests lock the new contract.

describe('composeGemmaPrompt', () => {
  it('never asks for JSON, whatever the caller wants', () => {
    for (const wantChips of [true, false]) {
      const out = composeGemmaPrompt('INSTR', 'PROMPT', wantChips);
      expect(out).toContain('INSTR');
      expect(out).toContain('PROMPT');
      expect(out).toContain('only the sentence');
      expect(out).not.toContain('JSON');
      expect(out).not.toContain('chips');
    }
  });

  it('composes the same prompt regardless of wantChips', () => {
    expect(composeGemmaPrompt('I', 'P', true)).toBe(composeGemmaPrompt('I', 'P', false));
  });
});

describe('parseGemmaTurn', () => {
  it('returns trimmed prose', () => {
    expect(parseGemmaTurn('  This is a moment, not the whole story.  ')).toEqual({
      prose: 'This is a moment, not the whole story.',
    });
  });

  it('strips wrapping quotes and Gemma 3 turn tokens', () => {
    const raw = '<start_of_turn>model "It can wait until morning." <end_of_turn>';
    expect(parseGemmaTurn(raw)).toEqual({ prose: 'It can wait until morning.' });
  });

  // The shipped model is Gemma 4, whose embedded chat template uses <|turn> /
  // <turn|> and never <start_of_turn>. Verified by reading the template out of
  // niyora-gemma4-e2b-v4-wide-deduped-int4.litertlm itself.
  it('strips Gemma 4 turn tokens', () => {
    expect(parseGemmaTurn('<|turn>model that lands. <turn|>')).toEqual({
      prose: 'that lands.',
    });
  });

  it('strips channel and tool scaffolding', () => {
    expect(parseGemmaTurn('<|channel>that lands.')).toEqual({ prose: 'that lands.' });
  });

  it('returns null for empty output', () => {
    expect(parseGemmaTurn('   ')).toBeNull();
  });

  it('never returns chips, so the caller always uses the authored set', () => {
    expect(parseGemmaTurn('overwhelmed, angry, guilty', true)?.chips).toBeUndefined();
  });

  // An offer beat MUST be able to introduce words she did not write — naming a
  // feeling, proposing a gentler frame. Prose was never gated on grounding and
  // still is not; the risk that gate existed for lived entirely in chips, which
  // are now authored, so it is zero by construction.
  it('never gates prose, which is the moon speaking', () => {
    const her = 'he forgot to pick up my prescription again after i reminded him twice';
    expect(parseGemmaTurn('overwhelmed, angry, guilty', true, her)?.prose).toBe(
      'overwhelmed, angry, guilty',
    );
  });

  // Real capture from the device, 2026-07-27, cpu/1024, 1135ms.
  it('passes through a real on-device generation unchanged', () => {
    expect(parseGemmaTurn("he ignored you all evening, that's enough today.")).toEqual({
      prose: "he ignored you all evening, that's enough today.",
    });
  });
});
