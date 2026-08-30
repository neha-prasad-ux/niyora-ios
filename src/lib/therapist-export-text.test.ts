jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { buildTherapistExport } from './therapist-export';
import { renderTherapistExport } from './therapist-export-text';
import type { MomentRecord } from '@/store/moment-history';

const m = (date: string, feeling: string, entry: string, extra: Partial<MomentRecord> = {}): MomentRecord => ({
  at: `${date}T09:00:00.000Z`,
  date,
  entry,
  feeling,
  constellation: 'Storm',
  ...extra,
});

const STARTS = ['2026-01-01', '2026-01-27', '2026-02-28'];
const MOMENTS = [
  m('2026-01-21', 'Hurt', 'my sister Jess said it again', { subject: 'sister', response: 'I waited a day' }),
  m('2026-02-20', 'Tired', 'work ran long', { subject: 'work' }),
];

const render = (opts = {}) =>
  renderTherapistExport(buildTherapistExport(MOMENTS, STARTS, 28, opts)!);

describe('renderTherapistExport', () => {
  it('puts every count next to its denominator', () => {
    const out = render();
    expect(out).toMatch(/Wrote on 2 of \d+ days/);
    expect(out).toMatch(/wrote \d+ of \d+ days/);
  });

  // Without this the reader takes silence for calm, which is a claim we never
  // observed and cannot make on her behalf.
  it('always states what the record is not', () => {
    const out = render();
    expect(out).toContain('not a day without symptoms');
    expect(out).toContain('not a DRSP chart');
  });

  it('never says "window", and never leaks a scrubbed name', () => {
    const out = render();
    expect(out).not.toMatch(/window/i);
    expect(out).not.toMatch(/Jess/);
    expect(out).toContain('my sister');
  });

  it('carries her questions through in order', () => {
    expect(render({ questions: ['Is this normal?', 'Should I track daily?'] })).toContain(
      '1. Is this normal?\n  2. Should I track daily?',
    );
  });

  it('drops a struck entry from the quotes and the counts together', () => {
    const out = render({ exclude: [MOMENTS[0].at] });
    expect(out).not.toMatch(/my sister/);
    expect(out).toMatch(/Wrote on 1 of/);
  });
});
