import { hasConcreteEvent, ruleBreakdown, type MomentProvider } from './moment-ai';

const providerReturning = (reply: string | null): MomentProvider => ({
  name: 'stub',
  async generate() {
    return reply;
  },
});

test('a clear "yes" means there is an event', async () => {
  expect(await hasConcreteEvent(providerReturning('yes'), 'he cancelled on me')).toBe(true);
  expect(await hasConcreteEvent(providerReturning('Yes.'), 'he cancelled on me')).toBe(true);
});

test('a clear "no" means only a mood, ask for context', async () => {
  expect(await hasConcreteEvent(providerReturning('no'), 'I feel awful')).toBe(false);
});

test('anything unparseable or missing returns null, so it never over-clarifies', async () => {
  expect(await hasConcreteEvent(providerReturning('maybe'), 'x')).toBeNull();
  expect(await hasConcreteEvent(providerReturning(null), 'x')).toBeNull();
  expect(await hasConcreteEvent(providerReturning('yes'), '   ')).toBeNull();
});

describe('ruleBreakdown', () => {
  const full = JSON.stringify({
    event: 'You were not invited to the dinner.',
    rule: 'A real friend always includes me.',
    consequence: 'Hurt, and then I am stupid for caring.',
    tests: ['A real friend might not include you every time.', 'It is okay to feel left out.'],
  });

  test('parses the chain and tests from clean JSON', async () => {
    const r = await ruleBreakdown(providerReturning(full), 'she wrote: "..."');
    expect(r?.rule).toBe('A real friend always includes me.');
    expect(r?.tests).toHaveLength(2);
    expect(r?.event).toContain('dinner');
  });

  test('survives ```json fences and stray wrapper text', async () => {
    const r = await ruleBreakdown(providerReturning('```json\n' + full + '\n```'), 'x');
    expect(r?.rule).toBe('A real friend always includes me.');
  });

  test('declines (null) when there is no rule or no tests', async () => {
    expect(await ruleBreakdown(providerReturning(JSON.stringify({ rule: '', tests: [] })), 'x')).toBeNull();
    expect(
      await ruleBreakdown(providerReturning(JSON.stringify({ rule: 'a rule', tests: [] })), 'x'),
    ).toBeNull();
    expect(await ruleBreakdown(providerReturning('not json'), 'x')).toBeNull();
    expect(await ruleBreakdown(providerReturning(null), 'x')).toBeNull();
  });
});
