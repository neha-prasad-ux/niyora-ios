import { summarise } from '@/lib/therapist-export-summary';
import type { Excerpt } from '@/lib/therapist-export-types';

const e = (phase: Excerpt['phase'], feeling: string): Excerpt => ({
  at: `${phase}-${feeling}-${Math.random()}`,
  date: '2026-08-30',
  cycleDay: null,
  phase,
  source: null,
  feeling,
  text: 'x',
  crisis: false,
});

test('counts feelings inside the phase she wrote in most', () => {
  expect(
    summarise([e('pms', 'Scared'), e('pms', 'Scared'), e('pms', 'Anger'), e('build', 'Calm')]),
  ).toBe('3 on PMS days · Scared (2), Anger (1)');
});

test('no phase data falls back to feelings alone', () => {
  expect(summarise([e(null, 'Scared'), e(null, 'Anger')])).toBe('Scared (1), Anger (1)');
});

test('nothing included says nothing', () => {
  expect(summarise([])).toBe('');
});
