import { assemble, type TemplatePart } from './fill-in-assemble';

const PARTS: TemplatePart[] = [
  'I feel ',
  { key: 'feeling', placeholder: 'a feeling' },
  ' when ',
  { key: 'trigger', placeholder: 'something happens' },
  ', and I need ',
  { key: 'need', placeholder: 'a thing' },
  '.',
];

test('assembles filled blanks into a whole sentence', () => {
  expect(assemble(PARTS, { feeling: 'dismissed', trigger: 'plans change', need: 'a heads-up' })).toBe(
    'I feel dismissed when plans change, and I need a heads-up.',
  );
});

test('empty blanks fall back to placeholder, never leave a gap', () => {
  expect(assemble(PARTS, { feeling: 'hurt' })).toBe('I feel hurt when something happens, and I need a thing.');
});

test('whitespace-only value counts as empty', () => {
  expect(assemble(PARTS, { feeling: '   ' })).toBe('I feel a feeling when something happens, and I need a thing.');
});
