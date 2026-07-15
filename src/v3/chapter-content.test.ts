// The chapter serial must stay well-formed for the reader engine and hold
// DESIGN.md voice: no em dashes, no exclamation points anywhere in copy, exactly
// one correct answer per reflect question, exactly one wrong kit item.

import {
  CHAPTERS,
  FIRST_CHAPTER_ID,
  chapterById,
  correctKitCount,
  type Chapter,
} from './chapter-content';

// Every string a user can read in a chapter, flattened for the voice guards.
function allCopy(c: Chapter): string[] {
  return [
    c.title,
    c.intro,
    ...c.beats.flatMap((b) => [b.text, b.scene.alt]),
    ...c.reflect.flatMap((q) => [q.prompt, q.takeaway, ...q.options.map((o) => o.label)]),
    ...c.kit.flatMap((k) => [k.label, k.redirect ?? '']),
  ];
}

describe('chapter serial', () => {
  it('has at least Story 1 and a stable first id', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(1);
    expect(FIRST_CHAPTER_ID).toBe('story-1');
    expect(chapterById(undefined).id).toBe('story-1');
    expect(chapterById('nope').id).toBe('story-1');
  });

  it('gives Story 1 five beats, each with a scene', () => {
    const story1 = chapterById('story-1');
    expect(story1.beats).toHaveLength(5);
    for (const b of story1.beats) {
      expect(b.text.length).toBeGreaterThan(0);
      expect(b.scene.image.length).toBeGreaterThan(0);
      expect(b.scene.alt.length).toBeGreaterThan(0);
    }
  });

  it('names PMS only in the reflect step, never in the story beats', () => {
    const story1 = chapterById('story-1');
    // The reflect step is the single place the PMS lens surfaces.
    expect(story1.reflect.some((q) => /PMS/.test(q.prompt))).toBe(true);
    // The story prose stays a life story. Beat 5 is the one exception the spec
    // locks in (it appears inside Neha's own text message), so the guard is that
    // no MORE than that one beat mentions it.
    const beatsNamingPms = story1.beats.filter((b) => /PMS/.test(b.text));
    expect(beatsNamingPms.length).toBeLessThanOrEqual(1);
  });
});

describe.each(CHAPTERS.map((c) => [c.id, c] as const))('chapter %s', (_id, chapter) => {
  it('gives every reflect question exactly one correct answer', () => {
    expect(chapter.reflect.length).toBeGreaterThanOrEqual(1);
    for (const q of chapter.reflect) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      expect(q.takeaway.length).toBeGreaterThan(0);
    }
  });

  it('has a kit with exactly one wrong item and a redirect on it', () => {
    const wrong = chapter.kit.filter((k) => !k.correct);
    expect(wrong).toHaveLength(1);
    expect(wrong[0].redirect && wrong[0].redirect.length > 0).toBe(true);
    // Correct kit count is what the payoff rings reflect, and there is at least
    // one, so a finished chapter always lands something.
    expect(correctKitCount(chapter)).toBeGreaterThanOrEqual(1);
  });

  it('exposes at least one live door into Steady-yourself', () => {
    expect(chapter.kit.some((k) => k.live === 'steady')).toBe(true);
  });

  it('has unique kit ids', () => {
    const ids = chapter.kit.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('holds DESIGN.md voice: no em dashes, no exclamation points', () => {
    for (const line of allCopy(chapter)) {
      expect(line).not.toMatch(/—/);
      expect(line).not.toMatch(/!/);
    }
  });
});
