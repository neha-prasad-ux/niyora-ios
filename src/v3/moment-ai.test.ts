import { hasConcreteEvent, type MomentProvider } from './moment-ai';

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
