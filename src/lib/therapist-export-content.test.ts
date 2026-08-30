// moment-history reaches AsyncStorage at import time for its async readers. This
// module only uses its pure helpers, so the native module is stubbed away rather
// than exercised.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import { buildExcerpts, buildTopics, buildTried } from './therapist-export-content';
import type { MomentRecord } from '@/store/moment-history';

// Two logged starts 28 apart, so every date below has a measured phase.
const STARTS = ['2026-01-01', '2026-01-29'];

const m = (over: Partial<MomentRecord> & Pick<MomentRecord, 'at' | 'date'>): MomentRecord => ({
  entry: 'something happened',
  feeling: 'Hurt',
  constellation: 'Ache',
  ...over,
});

describe('buildExcerpts', () => {
  it('scrubs the cued name out of every excerpt', () => {
    const [e] = buildExcerpts(
      [m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', entry: 'my sister Jess said I was too much' })],
      STARTS,
      28,
    );
    expect(e.text).toBe('my sister said I was too much');
    expect(e.text).not.toMatch(/Jess/);
  });

  it('flags a crisis entry and still returns it', () => {
    const rows = buildExcerpts(
      [
        m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', entry: 'some days I want to die' }),
        m({ at: '2026-01-09T09:00:00Z', date: '2026-01-09', entry: 'a normal rough day' }),
      ],
      STARTS,
      28,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ at: '2026-01-10T09:00:00Z', crisis: true });
    expect(rows[1].crisis).toBe(false);
  });

  // Scrubbing rewrites text, so scanning the scrubbed copy would let a rewrite
  // clear the flag. The scan has to see the raw entry.
  it('scans the raw entry, so scrubbing cannot mask a flag', () => {
    const [e] = buildExcerpts(
      [
        m({
          at: '2026-01-10T09:00:00Z',
          date: '2026-01-10',
          entry: 'my sister Jess called and I want to die',
        }),
      ],
      STARTS,
      28,
    );
    expect(e.crisis).toBe(true);
    expect(e.text).not.toMatch(/Jess/);
  });

  it('returns candidates newest-first with the measured cycle position', () => {
    const rows = buildExcerpts(
      [
        m({ at: '2026-01-05T09:00:00Z', date: '2026-01-05' }),
        m({ at: '2026-01-20T09:00:00Z', date: '2026-01-20' }),
      ],
      STARTS,
      28,
    );
    expect(rows.map((r) => r.date)).toEqual(['2026-01-20', '2026-01-05']);
    expect(rows[1]).toMatchObject({ cycleDay: 5, phase: 'build', source: 'logged' });
  });

  it('leaves phase, cycle day and source null when there is no period history', () => {
    const [e] = buildExcerpts([m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10' })], [], 28);
    expect(e).toMatchObject({ cycleDay: null, phase: null, source: null });
  });
});

describe('buildTopics', () => {
  it('keeps her subjects verbatim and counts them across phases', () => {
    const rows = buildTopics(
      [
        m({ at: '2026-01-25T09:00:00Z', date: '2026-01-25', subject: 'mom' }), // day 25, pms
        m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', subject: 'mom' }), // day 10, build
        m({ at: '2026-01-02T09:00:00Z', date: '2026-01-02', subject: 'mom' }), // day 2, period
        m({ at: '2026-01-11T09:00:00Z', date: '2026-01-11', subject: 'work deadline' }),
      ],
      STARTS,
      28,
    );
    expect(rows.map((r) => r.subject)).toEqual(['mom', 'work deadline']);
    expect(rows[0]).toMatchObject({
      count: 3,
      byPhase: { build: 1, pms: 1, period: 1 },
      lastSeen: '2026-01-25',
    });
  });

  // Her grouping, not ours. "mom" must never be filed under "Family".
  it('never merges or re-labels two of her subjects', () => {
    const rows = buildTopics(
      [
        m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', subject: 'mom' }),
        m({ at: '2026-01-11T09:00:00Z', date: '2026-01-11', subject: 'my mother' }),
      ],
      STARTS,
      28,
    );
    expect(rows.map((r) => r.subject).sort()).toEqual(['mom', 'my mother']);
  });

  it('skips moments with no subject', () => {
    const rows = buildTopics(
      [
        m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10' }),
        m({ at: '2026-01-11T09:00:00Z', date: '2026-01-11', subject: 'mom' }),
      ],
      STARTS,
      28,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(1);
  });

  it('counts a subject with no cycle position but files it under no phase', () => {
    const [row] = buildTopics(
      [m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', subject: 'mom' })],
      [],
      28,
    );
    expect(row).toMatchObject({ count: 1, byPhase: { build: 0, pms: 0, period: 0 } });
  });
});

describe('buildTried', () => {
  it('scrubs the response and carries the phase', () => {
    const rows = buildTried(
      [
        m({
          at: '2026-01-25T09:00:00Z',
          date: '2026-01-25',
          subject: 'mom',
          response: 'I told my sister Jess I needed a night off',
        }),
      ],
      STARTS,
      28,
    );
    expect(rows[0]).toMatchObject({
      date: '2026-01-25',
      subject: 'mom',
      phase: 'pms',
      text: 'I told my sister I needed a night off',
    });
    expect(rows[0].text).not.toMatch(/Jess/);
  });

  it('skips moments with no response or an empty one', () => {
    const rows = buildTried(
      [
        m({ at: '2026-01-12T09:00:00Z', date: '2026-01-12' }),
        m({ at: '2026-01-11T09:00:00Z', date: '2026-01-11', response: '   ' }),
        m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', response: 'I went for a walk' }),
      ],
      STARTS,
      28,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe('I went for a walk');
  });

  it('leaves phase null when there is no period history', () => {
    const [row] = buildTried(
      [m({ at: '2026-01-10T09:00:00Z', date: '2026-01-10', response: 'I went for a walk' })],
      [],
      28,
    );
    expect(row.phase).toBeNull();
  });
});
