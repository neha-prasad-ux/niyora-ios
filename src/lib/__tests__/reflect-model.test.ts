import { composeGemmaPrompt, parseGemmaTurn } from '@/lib/reflect-model-parse';

describe('composeGemmaPrompt', () => {
  it('asks for JSON when chips are wanted', () => {
    const out = composeGemmaPrompt('INSTR', 'PROMPT', true);
    expect(out).toContain('INSTR');
    expect(out).toContain('PROMPT');
    expect(out).toContain('JSON');
    expect(out).toContain('chips');
  });

  it('asks for a bare sentence when chips are not wanted', () => {
    const out = composeGemmaPrompt('INSTR', 'PROMPT', false);
    expect(out).toContain('only the sentence');
    expect(out).not.toContain('JSON');
  });
});

describe('parseGemmaTurn — prose only', () => {
  it('returns trimmed prose', () => {
    expect(parseGemmaTurn('  This is a moment, not the whole story.  ', false)).toEqual({
      prose: 'This is a moment, not the whole story.',
    });
  });

  it('strips wrapping quotes and turn tokens', () => {
    const raw = '<start_of_turn>model "It can wait until morning." <end_of_turn>';
    expect(parseGemmaTurn(raw, false)).toEqual({ prose: 'It can wait until morning.' });
  });

  it('returns null for empty output', () => {
    expect(parseGemmaTurn('   ', false)).toBeNull();
  });
});

describe('parseGemmaTurn — chips (JSON)', () => {
  it('parses a clean JSON object', () => {
    const raw = '{"prose": "Do any of these feel true?", "chips": ["I am too much", "I will be left"]}';
    expect(parseGemmaTurn(raw, true)).toEqual({
      prose: 'Do any of these feel true?',
      chips: ['I am too much', 'I will be left'],
    });
  });

  it('parses JSON wrapped in a code fence', () => {
    const raw = '```json\n{"prose": "How big is this, really?", "chips": ["Huge", "Smaller than it feels"]}\n```';
    expect(parseGemmaTurn(raw, true)).toEqual({
      prose: 'How big is this, really?',
      chips: ['Huge', 'Smaller than it feels'],
    });
  });

  it('parses JSON buried after preamble text', () => {
    const raw = 'Sure, here you go: {"prose": "One small step is enough.", "chips": ["Yes", "No"]}';
    expect(parseGemmaTurn(raw, true)).toEqual({
      prose: 'One small step is enough.',
      chips: ['Yes', 'No'],
    });
  });

  it('clamps to three chips and drops non-strings', () => {
    const raw = '{"prose": "p", "chips": ["a", "b", "c", "d", 5, null]}';
    expect(parseGemmaTurn(raw, true)).toEqual({ prose: 'p', chips: ['a', 'b', 'c'] });
  });

  it('returns prose without chips when chips are missing', () => {
    expect(parseGemmaTurn('{"prose": "just this"}', true)).toEqual({ prose: 'just this' });
  });

  it('returns null on malformed JSON', () => {
    expect(parseGemmaTurn('{"prose": "oops", "chips": [', true)).toBeNull();
  });

  it('returns null when prose is empty', () => {
    expect(parseGemmaTurn('{"prose": "", "chips": ["a"]}', true)).toBeNull();
  });
});
