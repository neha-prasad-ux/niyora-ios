import { FEELING_SET } from './moment-analyse';
import { optionPlanFor, DEFAULT_PLAN } from './option-plan';
import { isBlank } from '@/components/moment/fill-in-assemble';

test('every feeling word has its own plan, not the fallback', () => {
  for (const f of FEELING_SET) {
    expect(optionPlanFor(f.label)).not.toBe(DEFAULT_PLAN);
  }
});

test('fill composers seed the feeling and expose three blanks', () => {
  for (const f of FEELING_SET) {
    const plan = optionPlanFor(f.label);
    if (plan.composer !== 'fill') continue;
    const blanks = (plan.template ?? []).filter(isBlank);
    expect(blanks.map((b) => b.key)).toEqual(['feeling', 'trigger', 'need']);
    // The feeling seeds the first blank's placeholder so she starts mid-sentence.
    expect(blanks[0].placeholder).toBe(f.label.toLowerCase());
  }
});

test('an unknown feeling falls back to the calming default', () => {
  expect(optionPlanFor('')).toBe(DEFAULT_PLAN);
  expect(optionPlanFor('Nonexistent')).toBe(DEFAULT_PLAN);
});
