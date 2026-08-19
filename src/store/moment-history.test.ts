jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../lib/secure-box', () => ({
  encrypt: (s: string) => Promise.resolve(s),
  decrypt: (s: string) => Promise.resolve(s),
}));

import { badgeFor, badgesFrom, type MomentRecord } from './moment-history';

// Newest-first, like real storage: hurt (x2), anger, shame.
const m = (at: string, feeling: string, constellation: string): MomentRecord => ({
  at,
  date: at.slice(0, 10),
  entry: 'something happened',
  feeling,
  constellation,
});

const history: MomentRecord[] = [
  m('2026-08-04T10:00:00Z', 'Ashamed', 'shame'),
  m('2026-08-03T10:00:00Z', 'Let down', 'hurt'),
  m('2026-08-02T10:00:00Z', 'Angry', 'anger'),
  m('2026-08-01T10:00:00Z', 'Hurt', 'hurt'),
];

describe('badgesFrom', () => {
  it('gives drawings to distinct constellations in the order she cracked them', () => {
    const b = badgesFrom(history, 6);
    expect(b.map((x) => [x.constellation, x.drawing])).toEqual([
      ['hurt', 0],
      ['anger', 1],
      ['shame', 2],
    ]);
  });

  it('counts repeats as stars, not new art, and keeps the feelings inside', () => {
    const hurt = badgesFrom(history, 6).find((x) => x.constellation === 'hurt');
    expect(hurt).toMatchObject({ count: 2, drawing: 0, feelings: ['Hurt', 'Let down'] });
  });

  it('leaves a constellation past the last slot without art', () => {
    const b = badgesFrom(history, 2);
    expect(b.map((x) => x.drawing)).toEqual([0, 1, -1]);
  });

  it('ignores moments with no constellation', () => {
    expect(badgesFrom([m('2026-08-05T10:00:00Z', 'Odd', '')], 6)).toEqual([]);
  });
});

describe('badgeFor', () => {
  it('returns the stored badge when the moment already landed', () => {
    expect(badgeFor(history, 'hurt', 6)).toMatchObject({ count: 2, drawing: 0 });
  });

  it('mints the next slot when the moment has not been saved yet', () => {
    expect(badgeFor(history, 'guilt', 6, 'Guilty')).toEqual({
      constellation: 'guilt',
      drawing: 3,
      count: 1,
      feelings: ['Guilty'],
    });
  });

  it('has no art left once every slot is taken', () => {
    expect(badgeFor(history, 'guilt', 3, 'Guilty').drawing).toBe(-1);
  });
});
