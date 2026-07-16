import {
  FRIEND_NAME,
  IRRITABILITY_LEVELS,
  L3_SCENES,
  L5_REORDER,
  CHAPTERS,
  WORK_CHAPTERS,
  chaptersForTrack,
  getChapter,
  trainSummary,
  workSummary,
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
    ...(ch.L3_SCENES ?? []).flatMap((s) => [s.prompt, ...s.options.flatMap((o) => [o.label, o.future])]),
    ...(ch.L3_INTRO ? [ch.L3_INTRO.lead] : []),
    ...(ch.L3_CHEAT ? ch.L3_CHEAT.rows.flatMap((r) => [r.small, r.big]) : []),
    ...(ch.L3_CONGRATS ? [ch.L3_CONGRATS.body] : []),
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
    ch.L5_DECK.stepLabel,
    ...Object.values(ch.L5_DECK.gates).flatMap((g) => [g.lead, g.move]),
    ...ch.L5_DECK.cards.flatMap((c) => [c.scene, c.reveal, c.nudge]),
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

  it('L5 routing deck has valid cards covering every gate', () => {
    const routes = ['basics', 'small', 'big'] as const;
    expect(ch.L5_DECK.cards.length).toBeGreaterThanOrEqual(3);
    for (const c of ch.L5_DECK.cards) {
      expect(routes).toContain(c.route);
      expect(c.scene.length).toBeGreaterThan(0);
      expect(c.reveal.length).toBeGreaterThan(0);
      expect(c.nudge.length).toBeGreaterThan(0);
    }
    // Every gate is reachable, so no gate is dead on the deck she plays.
    for (const r of routes) {
      expect(ch.L5_DECK.cards.some((c) => c.route === r)).toBe(true);
    }
    // Card ids are unique within the deck.
    const ids = ch.L5_DECK.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
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

// The workplace shelf: same 5-level template, swapped power move. Its own copy is
// checked against the same voice rules, including the compassion/script bodies.
function workExtras(ch: Chapter): string[] {
  const out: string[] = [];
  if (ch.L4_COMPASSION) {
    out.push(
      ch.L4_COMPASSION.teach.title,
      ...ch.L4_COMPASSION.teach.beats,
      ...ch.L4_COMPASSION.practice.flatMap((p) => [p.line, p.cue]),
      ch.L4_COMPASSION.kindPrompt,
      ...ch.L4_COMPASSION.kindLines,
    );
  }
  if (ch.L4_SCRIPT) {
    out.push(
      ch.L4_SCRIPT.teach.title,
      ...ch.L4_SCRIPT.teach.rows.flatMap((r) => [r.part, r.hint]),
      ch.L4_SCRIPT.scenario,
      ...ch.L4_SCRIPT.lines.flatMap((l) => [l.part, l.text]),
      ch.L4_SCRIPT.sayIt,
    );
  }
  return out;
}

const WORK_COPY: string[] = WORK_CHAPTERS.flatMap((c) => [...chapterCopy(c), ...workExtras(c)]);

describe('workplace track', () => {
  it('ships three workplace chapters with unique ids, resolvable by getChapter', () => {
    expect(WORK_CHAPTERS.map((c) => c.id)).toEqual(['work-anxiety', 'confidence', 'assertiveness']);
    for (const c of WORK_CHAPTERS) {
      expect(getChapter(c.id)).toBe(c);
      expect(c.track).toBe('workplace');
    }
  });

  it('chaptersForTrack routes workplace vs growth (default)', () => {
    expect(chaptersForTrack('workplace')).toBe(WORK_CHAPTERS);
    expect(chaptersForTrack(undefined)).toBe(CHAPTERS);
    expect(chaptersForTrack('growth')).toBe(CHAPTERS);
  });

  it('every level id is globally unique across growth and workplace', () => {
    const ids = [...CHAPTERS, ...WORK_CHAPTERS].flatMap((c) => c.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each workplace chapter numbers levels 1..n with distinct kinds', () => {
    for (const c of WORK_CHAPTERS) {
      // Speaking up drops its redundant L3, so length varies; numbering stays contiguous.
      expect(c.levels.map((l) => l.n)).toEqual(c.levels.map((_l, idx) => idx + 1));
      expect(new Set(c.levels.map((l) => l.kind)).size).toBe(c.levels.length);
    }
    expect(getChapter('work-anxiety').levels).toHaveLength(5);
    expect(getChapter('confidence').levels).toHaveLength(5);
    expect(getChapter('assertiveness').levels).toHaveLength(4);
  });

  it('the level-4 power move matches its payload', () => {
    const byId = (id: string) => WORK_CHAPTERS.find((c) => c.id === id)!;
    expect(byId('work-anxiety').levels[3].kind).toBe('breathe');
    const conf = byId('confidence');
    expect(conf.levels[3].kind).toBe('compassion');
    expect(conf.L4_COMPASSION?.kindLines.length).toBeGreaterThanOrEqual(2);
    const assert = byId('assertiveness');
    expect(assert.levels.some((l) => l.kind === 'script')).toBe(true);
    expect(assert.L4_SCRIPT?.lines.length).toBe(4);
  });

  it('each L3 scene and the L5 capstone have one best/lesser/worst', () => {
    for (const c of WORK_CHAPTERS) {
      for (const s of [...(c.L3_SCENES ?? []), { options: c.L5_CAPSTONE.options }]) {
        expect(s.options.filter((o) => o.tier === 'best')).toHaveLength(1);
        expect(s.options.filter((o) => o.tier === 'lesser')).toHaveLength(1);
        expect(s.options.filter((o) => o.tier === 'worst')).toHaveLength(1);
      }
    }
  });

  it('workplace copy holds the voice rules (Neha, no em dash / bang / emoji)', () => {
    for (const line of WORK_COPY) {
      expect(line).not.toMatch(/Maya/);
      expect(line).not.toMatch(/[—!]/);
      expect(line).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it('workSummary walks the workplace shelf, not the growth one', () => {
    const s = workSummary({ completed: [] });
    expect(s.statusWord).toBe('Start');
    expect(s.next?.chapterId).toBe('work-anxiety');
    const all = WORK_CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    expect(workSummary({ completed: all }).statusWord).toBe('Complete');
    // Growth progress never leaks into the workplace summary.
    const growthAll = CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    expect(workSummary({ completed: growthAll }).statusWord).toBe('Start');
  });
});

describe('trainSummary', () => {
  it('starts the first chapter when nothing is done', () => {
    const s = trainSummary({ completed: [] });
    expect(s.statusWord).toBe('Start');
    expect(s.next).toEqual({ chapterId: CHAPTERS[0].id, levelId: CHAPTERS[0].levels[0].id, n: 1 });
  });

  it('continues an in-progress chapter at its first incomplete level', () => {
    const done = CHAPTERS[0].levels.slice(0, 2).map((l) => l.id);
    const s = trainSummary({ completed: done });
    expect(s.statusWord).toBe('Continue');
    expect(s.next?.levelId).toBe(CHAPTERS[0].levels[2].id);
    expect(s.detail).toContain('Level 3');
  });

  it('prefers the in-progress chapter over untouched ones', () => {
    const done = CHAPTERS[1].levels.slice(0, 1).map((l) => l.id);
    const s = trainSummary({ completed: done });
    expect(s.next?.chapterId).toBe(CHAPTERS[1].id);
  });

  it('reports complete with no next when every level is done', () => {
    const all = CHAPTERS.flatMap((c) => c.levels.map((l) => l.id));
    const s = trainSummary({ completed: all });
    expect(s.statusWord).toBe('Complete');
    expect(s.next).toBeNull();
  });
});
