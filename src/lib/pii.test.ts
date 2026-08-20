import { scrub } from './pii';

test('email round-trips out of the model reply', () => {
  const { text, restore } = scrub('he emailed me from tom.h@work.co about it');
  expect(text).not.toContain('tom.h@work.co');
  expect(restore(`ignore the note from ${text.match(/\S+@\S+/)![0]}`)).toContain('tom.h@work.co');
});

test('a phone number is scrubbed and restored; a year is left alone', () => {
  const { text, restore } = scrub('he texted 415-555-0132 in 2026');
  expect(text).not.toContain('415-555-0132');
  expect(text).toContain('2026'); // a 4-digit year is not a phone number
  const standin = text.match(/\d{7,}/)![0];
  expect(restore(`call back on ${standin}`)).toContain('415-555-0132');
});

test('a cued name is scrubbed and restored, coreference stays stable', () => {
  const { text, restore } = scrub('my sister Jess ignored me, then Jess left');
  expect(text).not.toContain('Jess');
  const standin = text.match(/my sister (\w+)/)![1];
  expect(text).toBe(`my sister ${standin} ignored me, then ${standin} left`); // same name -> same stand-in
  expect(restore(`${standin} shut you out`)).toBe('Jess shut you out');
});

test('grounding is protected: relations, pronouns, and bare names are kept', () => {
  const { text } = scrub('Sarah slapped me and my husband said nothing');
  expect(text).toContain('Sarah'); // bare standalone name: under-redact on purpose
  expect(text).toContain('my husband'); // relation kept
  expect(text).toContain('me'); // pronoun kept
});

test('a day of week after a cue is not treated as a name', () => {
  const { text } = scrub('my sister Monday plans fell through');
  expect(text).toContain('Monday');
});

test('a name in an appositive (comma/dash after the cue) is still caught', () => {
  expect(scrub('my sister, Jess called').text).not.toContain('Jess');
  expect(scrub('my ex - Tom showed up').text).not.toContain('Tom');
});

test('a date or year range is not scrubbed as a phone number', () => {
  expect(scrub('it happened 2024-01-15').text).toContain('2024-01-15');
  expect(scrub('we fought all 2020-2024').text).toContain('2020-2024');
});

test('"miss" is read as the verb, not a title, so a place is kept', () => {
  expect(scrub('I miss Boston so much').text).toContain('Boston');
});

test('a name that doubles as a common word is left, to protect grounding', () => {
  const { text } = scrub('my brother Will texted. Will he even come?');
  expect(text).toContain('Will he even come'); // ordinary sense not clobbered
});

// Self-introductions (Neha 2026-08-11). "My name is Neha" leaked her name before.
test('a name in a self-introduction is scrubbed', () => {
  expect(scrub('My name is Neha, number is 7293610').text).not.toContain('Neha');
  expect(scrub("I'm Neha and I feel awful").text).not.toContain('Neha');
  expect(scrub('I am Sarah, this hurts').text).not.toContain('Sarah');
});

test('a self-intro cue never scrubs a feeling or state word', () => {
  // "I'm tired / I'm Fine / I am so overwhelmed" must pass through untouched.
  expect(scrub("I'm tired and I'm Fine, just anxious").text).toBe(
    "I'm tired and I'm Fine, just anxious",
  );
  expect(scrub('I am so overwhelmed today').text).toBe('I am so overwhelmed today');
});
