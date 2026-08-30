jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { buildTherapistExport } from './therapist-export';
import { renderTherapistExportHtml } from './therapist-export-html';
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

const html = (opts = {}) =>
  renderTherapistExportHtml(buildTherapistExport(MOMENTS, STARTS, 28, opts)!);

/** What a reader actually sees: markup stripped, whitespace collapsed. */
const readable = (out: string) =>
  out
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('renderTherapistExportHtml', () => {
  it('keeps every count next to its denominator', () => {
    const out = readable(html());
    expect(out).toMatch(/Wrote on 2 of \d+ days/);
    expect(out).toMatch(/\d+ of \d+ days/);
  });

  // Without this the reader takes silence for calm, a claim we never observed.
  it('always states what the record is not', () => {
    const out = html();
    expect(out).toContain('not a day without symptoms');
    expect(out).toContain('not a DRSP chart');
  });

  it('never says "window", and never leaks a scrubbed name', () => {
    const out = html();
    // The copy rule bans forecast jargon in what she reads, not in a stylesheet.
    expect(readable(out)).not.toMatch(/window/i);
    expect(out).not.toMatch(/Jess/);
    expect(out).toContain('my sister');
  });

  it('marks a phase we estimated as estimated', () => {
    expect(html()).toMatch(/tag (logged|predicted)/);
  });

  // Her words land in a markup document, so anything that looks like a tag has
  // to stop being one before it gets there.
  it('escapes her words rather than rendering them as markup', () => {
    const nasty = [m('2026-01-21', 'Hurt', 'he said <b>"you always do this"</b> & left')];
    const out = renderTherapistExportHtml(buildTherapistExport(nasty, STARTS, 28)!);
    expect(out).toContain('&lt;b&gt;');
    expect(out).toContain('&amp;');
    expect(out).not.toContain('<b>"you always');
  });

  it('drops a struck entry from the quotes and the counts together', () => {
    const out = html({ exclude: [MOMENTS[0].at] });
    expect(out).not.toMatch(/my sister/);
    expect(readable(out)).toMatch(/1 of \d+ days/);
  });

  it('is a complete standalone document', () => {
    const out = html();
    expect(out.startsWith('<!doctype html>')).toBe(true);
    expect(out).toContain('</html>');
    expect(out).not.toMatch(/https?:\/\//); // nothing to fetch, prints offline
  });
});

// A printable document must not inherit the viewer's theme. Without both of
// these a dark-mode WebView rendered dark ink on a dark ground and the record
// was invisible, including potentially in the PDF itself.
describe('print surface', () => {
  it('pins a light surface rather than inheriting one', () => {
    const out = html();
    expect(out).toContain('color-scheme: light');
    expect(out).toMatch(/html, body \{ background: #ffffff; \}/);
  });
});
