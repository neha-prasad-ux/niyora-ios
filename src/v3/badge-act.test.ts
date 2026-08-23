import { BADGE_ACT, badgeCount } from './moment-copy';
import { FEELING_SET } from './moment-analyse';

describe('badge acts (2026-08-21)', () => {
  const constellations = [...new Set(FEELING_SET.map((f) => f.constellation).filter(Boolean))];

  it('covers every constellation a feeling can light', () => {
    const missing = constellations.filter((c) => !BADGE_ACT[c]);
    expect(missing).toEqual([]);
  });

  it('names an act, never just the emotion back at her', () => {
    for (const c of constellations) {
      // The old bug: title "Shame", subtitle "Ashamed". A title identical to its
      // own constellation is that bug returning.
      expect(BADGE_ACT[c].toLowerCase()).not.toBe(c.toLowerCase());
    }
  });

  /**
   * The one that matters. Grief is carried, never defeated. A badge telling a
   * woman she beat her grief would be the worst copy in the app, and this is the
   * kind of line that gets "improved" into existence a year from now.
   */
  it('never uses conquest language on grief, sadness or numbness', () => {
    const conquest = /\b(beat|beaten|overcame|overcome|conquered|defeated|won|crushed|smashed|fixed|cured)\b/i;
    for (const c of ['grief', 'sadness', 'numbness']) {
      expect(BADGE_ACT[c]).not.toMatch(conquest);
    }
  });

  it('uses no conquest language anywhere, in fact', () => {
    const conquest = /\b(beat|overcame|conquered|defeated|crushed|cured)\b/i;
    for (const c of constellations) expect(BADGE_ACT[c]).not.toMatch(conquest);
  });

  it('never uses a dash, she reads these', () => {
    for (const c of constellations) expect(BADGE_ACT[c]).not.toMatch(/[-–—]/);
  });

  it('counts read naturally, including the first one', () => {
    expect(badgeCount(1)).toBe('Once');
    expect(badgeCount(0)).toBe('Once');
    expect(badgeCount(3)).toBe('3 times');
  });
});
