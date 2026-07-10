import {
  FRIEND_NAME,
  IRRITABILITY_LEVELS,
  L3_SCENES,
  L5_REORDER,
  CHAPTERS,
  getChapter,
  type Chapter,
} from './game-content';

// Every user-facing string in one chapter, flattened, for copy-rule checks.
function chapterCopy(ch: Chapter): string[] {
  return [
    ...ch.levels.flatMap((l) => [l.title, l.intro]),
    ...ch.L1_CARDS.flatMap((c) => [c.statement, c.reveal]),
    ch.L1_INTRO.subtitle,
    ch.L1_CONGRATS.body,
    ...ch.L2_SCENES.flatMap((s) => [s.scene, s.why]),
    ch.L2_INTRO.subtitle,
    ...ch.L2_CHEAT.rows.flatMap((r) => [r.small, r.big]),
    ch.L2_CONGRATS.body,
    ...ch.L3_SCENES.flatMap((s) => [s.prompt, ...s.options.flatMap((o) => [o.label, o.future])]),
    ch.L3_INTRO.lead,
    ...ch.L3_CHEAT.rows.flatMap((r) => [r.small, r.big]),
    ch.L3_CONGRATS.body,
    ch.L4_INTRO.subtitle,
    ch.L4_TEACH.rule,
    ...ch.L4_TEACH.doses.flatMap((d) => [d.size, d.amount]),
    ch.L4_TEACH.cta,
    ch.L4_CONGRATS.body,
    ch.L5_INTRO.subtitle,
    ch.L5_CAPSTONE.scene,
    ch.L5_CAPSTONE.sizeWhy,
    ch.L5_CAPSTONE.prompt,
    ...ch.L5_CAPSTONE.options.flatMap((o) => [o.label, o.future]),
    ch.L5_BREATH_Q.prompt,
    ...ch.L5_BREATH_Q.options.map((o) => o.label),
    ch.L5_BREATH_Q.whyRight,
    ch.L5_REORDER.prompt,
    ...ch.L5_REORDER.steps,
    ch.L5_CONGRATS.body,
  ];
}

const ALL_COPY: string[] = CHAPTERS.flatMap(chapterCopy);

describe('game-content chapters', () => {
  it('ships three chapters with unique ids, resolvable by getChapter', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(['irritability', 'anxiety', 'mood-swings']);
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    for (const c of CHAPTERS) expect(getChapter(c.id)).toBe(c);
  });

  it('getChapter falls back to Irritability for missing or unknown ids', () => {
    expect(getChapter(undefined).id).toBe('irritability');
    expect(getChapter('nope').id).toBe('irritability');
  });

  it('every chapter level id is globally unique (namespaced per chapter)', () => {
    const ids = CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// Structural invariants every chapter must hold, so the shared runner works.
describe.each(CHAPTERS.map((c) => [c.id, c] as const))('game-content structure: %s', (_id, ch) => {
  it('has five levels, numbered 1..5, each with a distinct interaction kind', () => {
    expect(ch.levels).toHaveLength(5);
    expect(ch.levels.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(ch.levels.map((l) => l.kind)).size).toBe(5);
  });

  it('each L3 scene has one best, one lesser, one worst', () => {
    for (const s of ch.L3_SCENES) {
      expect(s.options.filter((o) => o.tier === 'best')).toHaveLength(1);
      expect(s.options.filter((o) => o.tier === 'lesser')).toHaveLength(1);
      expect(s.options.filter((o) => o.tier === 'worst')).toHaveLength(1);
    }
  });

  it('L3 best-fit flips with the size: the small-scene best is not a step-away move', () => {
    // Small scenes: the best move is a name/reframe, never stepping away for 20.
    for (const s of ch.L3_SCENES.filter((x) => x.intensity === 'little')) {
      const bestLabel = s.options.find((o) => o.tier === 'best')!.label.toLowerCase();
      expect(bestLabel).not.toMatch(/20|space|step away|settle/);
    }
    // Big scenes: the best move steps away / breathes, not an in-the-moment reframe.
    for (const s of ch.L3_SCENES.filter((x) => x.intensity === 'lot')) {
      const bestLabel = s.options.find((o) => o.tier === 'best')!.label.toLowerCase();
      expect(bestLabel).toMatch(/20|step|away|breathe|settle|delay|wait/);
    }
  });

  it('L5 capstone has one best, one lesser, one worst move', () => {
    expect(ch.L5_CAPSTONE.options.filter((o) => o.tier === 'best')).toHaveLength(1);
    expect(ch.L5_CAPSTONE.options.filter((o) => o.tier === 'lesser')).toHaveLength(1);
    expect(ch.L5_CAPSTONE.options.filter((o) => o.tier === 'worst')).toHaveLength(1);
  });

  it('L5 breath question has exactly one correct answer (the long exhale)', () => {
    const correct = ch.L5_BREATH_Q.options.filter((o) => o.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].label).toMatch(/out longer than you breathe in/i);
  });

  it('L5 reorder is a 4-step method, basics first', () => {
    expect(ch.L5_REORDER.steps).toHaveLength(4);
    expect(ch.L5_REORDER.steps[0]).toMatch(/hungry or tired/i);
  });
});

// The Irritability chapter keeps its original, more specific assertions.
describe('game-content structure: irritability specifics', () => {
  it('L3 big scenes lean on take-20', () => {
    for (const s of L3_SCENES.filter((x) => x.intensity === 'lot')) {
      const bestLabel = s.options.find((o) => o.tier === 'best')!.label.toLowerCase();
      expect(bestLabel).toMatch(/20|step|space|settle/);
    }
  });

  it('L5 reorder ends on the big/take-20 move', () => {
    expect(L5_REORDER.steps[L5_REORDER.steps.length - 1]).toMatch(/take 20/i);
    expect(IRRITABILITY_LEVELS).toHaveLength(5);
  });
});

describe('game-content voice + copy rules', () => {
  it('uses the friend Neha, never the placeholder Maya', () => {
    expect(FRIEND_NAME).toBe('Neha');
    for (const line of ALL_COPY) expect(line).not.toMatch(/Maya/);
  });

  it('never uses em dashes, exclamation points, or emoji', () => {
    for (const line of ALL_COPY) {
      expect(line).not.toMatch(/[—!]/);
      // No emoji (basic pictographic ranges).
      expect(line).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});
