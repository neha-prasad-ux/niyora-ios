jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { buildTherapistExport } from './therapist-export';
import type { MomentRecord } from '@/store/moment-history';

const m = (
  date: string,
  feeling: string,
  entry: string,
  extra: Partial<MomentRecord> = {},
): MomentRecord => ({
  at: `${date}T09:00:00.000Z`,
  date,
  entry,
  feeling,
  constellation: 'Storm',
  ...extra,
});

const STARTS = ['2026-01-01', '2026-01-27', '2026-02-28'];
const MOMENTS: MomentRecord[] = [
  m('2026-01-21', 'Hurt', 'my sister Jess said it again', { subject: 'sister', response: 'I waited a day' }),
  m('2026-01-10', 'Tired', 'long week at work', { subject: 'work' }),
  m('2026-02-20', 'Hurt', 'same thing with my sister Jess', { subject: 'sister' }),
];

const build = (opts = {}) => buildTherapistExport(MOMENTS, STARTS, 28, opts);

describe('buildTherapistExport', () => {
  it('returns null when there is nothing to show', () => {
    expect(buildTherapistExport([], STARTS, 28)).toBeNull();
  });

  it('builds every section from the same moments', () => {
    const doc = build()!;
    expect(doc.provenance.entries).toBe(3);
    expect(doc.provenance.daysLogged).toBe(3);
    expect(doc.topics.map((t) => t.subject)).toContain('sister');
    expect(doc.excerpts).toHaveLength(3);
    expect(doc.tried).toHaveLength(1);
  });

  it('scrubs names out of every text field it emits', () => {
    const doc = build()!;
    for (const e of doc.excerpts) expect(e.text).not.toMatch(/Jess/);
    for (const t of doc.tried) expect(t.text).not.toMatch(/Jess/);
  });

  // A struck moment has to leave the counts too, or the denominators stop
  // describing the document the clinician is actually holding.
  it('applies exclude before anything is counted', () => {
    const doc = build({ exclude: [MOMENTS[0].at] })!;
    expect(doc.provenance.entries).toBe(2);
    expect(doc.provenance.daysLogged).toBe(2);
    expect(doc.excerpts.map((e) => e.at)).not.toContain(MOMENTS[0].at);
    expect(doc.tried).toHaveLength(0);
  });

  it('still builds a document when no period was ever logged', () => {
    const doc = buildTherapistExport(MOMENTS, [], 28);
    expect(doc).not.toBeNull();
    expect(doc!.cycles).toEqual([]);
    expect(doc!.excerpts[0].phase).toBeNull();
  });

  it('keeps only the questions she actually wrote', () => {
    expect(build({ questions: ['  Is this normal?  ', '', '   '] })!.questions).toEqual([
      'Is this normal?',
    ]);
  });
});
