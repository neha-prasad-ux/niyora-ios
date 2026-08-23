// The wiring around the model call: which slots get a response schema, and what
// happens when the schema is the thing that fails. The prompts and the parsing
// are tested elsewhere (v3/moment-ai.test.ts); this only guards the config we
// hand Vertex, because getting it wrong is silent on screen (a card just shows
// authored copy) and impossible to spot in a diff.

// Firebase is a native module, so the app + ai packages are stubbed. The stubs
// are only rich enough to capture what generationConfig we asked for.
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));

const mockGenerateContent = jest.fn();
const mockGetModel = jest.fn(() => ({ generateContent: mockGenerateContent }));
jest.mock('@react-native-firebase/ai', () => ({
  getAI: () => ({}),
  getGenerativeModel: (...args: unknown[]) =>
    (mockGetModel as unknown as (...a: unknown[]) => unknown)(...args),
  VertexAIBackend: class {},
  SchemaType: {
    STRING: 'string',
    NUMBER: 'number',
    INTEGER: 'integer',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object',
  },
}));

// The provider is gated off by default (store build ships no AI), so turn the
// flag on or getMomentProvider() hands back NO_PROVIDER and nothing is exercised.
jest.mock('@/config/features', () => ({ MOMENT_AI: true }));

import { classifyCrisis, getMomentProvider } from './moment-gemini';

const replied = (text: string) => ({ response: { text: () => text } });
/** The generationConfig of the Nth getGenerativeModel() call (0-based). */
const configOf = (n: number) =>
  (mockGetModel.mock.calls[n] as unknown as [unknown, { generationConfig: Record<string, unknown> }])[1]
    .generationConfig;

beforeEach(() => {
  mockGenerateContent.mockReset();
  mockGetModel.mockClear();
});

test('a JSON slot asks Vertex to enforce the shape', async () => {
  mockGenerateContent.mockResolvedValue(replied('{"options":["a"]}'));
  await getMomentProvider().generate('reflect_signal', 'he walked out', 1000);

  const cfg = configOf(0);
  expect(cfg.responseMimeType).toBe('application/json');
  expect(cfg.responseSchema).toMatchObject({
    type: 'object',
    properties: { options: { type: 'array', items: { type: 'string' }, maxItems: 3 } },
    required: ['options'],
  });
});

test('the special JSON slots get their own shape, not the guess shape', async () => {
  mockGenerateContent.mockResolvedValue(replied('{}'));
  await getMomentProvider().generate('reflect_rule', 'x', 1000);
  await getMomentProvider().generate('reflect_factsort', 'x', 1000);
  await getMomentProvider().generate('reframe_small', 'x', 1000);

  expect((configOf(0).responseSchema as { required: string[] }).required).toEqual([
    'event',
    'rule',
    'consequence',
    'tests',
  ]);
  expect((configOf(1).responseSchema as { required: string[] }).required).toEqual(['claims']);
  expect((configOf(2).responseSchema as { required: string[] }).required).toEqual([
    'readings',
    'selfPrompt',
  ]);
});

test('a plain-text slot gets NO schema, so the line does not come back JSON-quoted', async () => {
  mockGenerateContent.mockResolvedValue(replied('one plain line'));
  for (const slot of ['act_help', 'revise', 'reflect_friend', 'reflect_pattern', 'reflect_chat', 'has_event']) {
    mockGetModel.mockClear();
    await getMomentProvider().generate(slot, 'x', 1000);
    expect(configOf(0).responseSchema).toBeUndefined();
    expect(configOf(0).responseMimeType).toBeUndefined();
  }
});

test('an unknown slot never reaches the model', async () => {
  expect(await getMomentProvider().generate('not_a_slot', 'x', 1000)).toBeNull();
  expect(mockGenerateContent).not.toHaveBeenCalled();
});

test('the last attempt drops the schema, so a schema Vertex rejects degrades to the old prose-JSON path', async () => {
  // Two failures (what a rejected schema looks like from here), then the
  // schema-free attempt succeeds and its text is returned as before.
  mockGenerateContent
    .mockRejectedValueOnce(new Error('400 invalid responseSchema'))
    .mockRejectedValueOnce(new Error('400 invalid responseSchema'))
    .mockResolvedValueOnce(replied('```json\n{"options":["a"]}\n```'));

  const out = await getMomentProvider().generate('reflect_signal', 'he walked out', 1000);
  expect(out).toContain('"options"');
  expect(configOf(0).responseSchema).toBeDefined();
  expect(configOf(1).responseSchema).toBeDefined();
  expect(configOf(2).responseSchema).toBeUndefined();
});

describe('classifyCrisis', () => {
  test('sends the typed crisis schema and reads the reply', async () => {
    mockGenerateContent.mockResolvedValue(
      replied('{"crisisType":"suicide","acuity":"acute","isCrisisMode":true,"crisisScore":85}'),
    );
    const r = await classifyCrisis('i keep thinking it would be easier if i did not wake up');

    expect(r).toEqual({
      crisisType: 'suicide',
      acuity: 'acute',
      isCrisisMode: true,
      crisisScore: 85,
    });
    const schema = configOf(0).responseSchema as { properties: { crisisType: { enum: string[] } } };
    // The enum is the point: crisisType is routed on, so a type the app does not
    // know about must not be decodable in the first place.
    expect(schema.properties.crisisType.enum).toContain('violence_to_her');
    expect(schema.properties.crisisType.enum).not.toContain('anxiety');
  });

  test('still escalates on an unparseable but alarming reply (the schema is not the only floor)', async () => {
    mockGenerateContent.mockResolvedValue(replied('sorry, I cannot. "isCrisisMode": true'));
    expect((await classifyCrisis('x'))?.isCrisisMode).toBe(true);
  });

  test('returns null when the model gives nothing usable, so the keyword floor stands alone', async () => {
    mockGenerateContent.mockResolvedValue(replied('no idea'));
    expect(await classifyCrisis('x')).toBeNull();
    expect(await classifyCrisis('   ')).toBeNull();
  });
});

// Per-slot thinking budgets (2026-08-21). The floor is the point: at budget 0 a
// pro model returns an empty body, so every call would silently produce nothing
// and the whole flow would fall back to authored copy with no error raised.
describe('thinking budget', () => {
  const budget = (n: number) =>
    (configOf(n).thinkingConfig as { thinkingBudget: number }).thinkingBudget;

  it('never sends 0 for any slot, which would return an empty body on pro', async () => {
    mockGenerateContent.mockResolvedValue(replied('yes'));
    const slots = ['has_event', 'feelings', 'reflect_signal', 'act_help', 'reflect_expand'];
    for (const slot of slots) await getMomentProvider().generate(slot, 'x', 5000);
    for (let i = 0; i < slots.length; i++) expect(budget(i)).toBeGreaterThanOrEqual(128);
  });

  it('gives the yes/no and ranking slots the small budget', async () => {
    mockGenerateContent.mockResolvedValue(replied('yes'));
    await getMomentProvider().generate('has_event', 'x', 5000);
    await getMomentProvider().generate('feelings', 'x', 5000);
    expect(budget(0)).toBe(128);
    expect(budget(1)).toBe(128);
  });

  it('leaves the writing slots on the full budget', async () => {
    mockGenerateContent.mockResolvedValue(replied('{"options":["a"]}'));
    await getMomentProvider().generate('reflect_signal', 'x', 5000);
    await getMomentProvider().generate('act_help', 'x', 5000);
    expect(budget(0)).toBe(512);
    expect(budget(1)).toBe(512);
  });

  it('always leaves room for a reply on top of the thinking', async () => {
    mockGenerateContent.mockResolvedValue(replied('{"options":["a"]}'));
    await getMomentProvider().generate('reflect_signal', 'x', 5000);
    const cfg = configOf(0);
    expect(cfg.maxOutputTokens as number).toBeGreaterThan(budget(0));
  });
});
