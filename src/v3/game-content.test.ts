import {
  FRIEND_NAME,
  IRRITABILITY_LEVELS,
  L1_CARDS,
  L1_INTRO,
  L1_CONGRATS,
  L2_INTRO,
  L2_SCENES,
  L2_CHEAT,
  L2_CONGRATS,
  L3_INTRO,
  L3_SCENES,
  L3_CHEAT,
  L3_CONGRATS,
  L4_INTRO,
  L4_TEACH,
  L4_CONGRATS,
  L5_INTRO,
  L5_CAPSTONE,
  L5_BREATH_Q,
  L5_REORDER,
  L5_CONGRATS,
} from './game-content';

// Every user-facing string in the chapter, flattened, for copy-rule checks.
const ALL_COPY: string[] = [
  ...IRRITABILITY_LEVELS.flatMap((l) => [l.title, l.intro]),
  ...L1_CARDS.flatMap((c) => [c.statement, c.reveal]),
  L1_INTRO.subtitle,
  L1_CONGRATS.body,
  ...L2_SCENES.flatMap((s) => [s.scene, s.why]),
  L2_INTRO.subtitle,
  ...L2_CHEAT.rows.flatMap((r) => [r.small, r.big]),
  L2_CONGRATS.body,
  ...L3_SCENES.flatMap((s) => [s.prompt, ...s.options.flatMap((o) => [o.label, o.future])]),
  L3_INTRO.lead,
  ...L3_CHEAT.rows.flatMap((r) => [r.small, r.big]),
  L3_CONGRATS.body,
  L4_INTRO.subtitle,
  L4_TEACH.rule,
  ...L4_TEACH.doses.flatMap((d) => [d.size, d.amount]),
  L4_TEACH.cta,
  L4_CONGRATS.body,
  L5_INTRO.subtitle,
  L5_CAPSTONE.scene,
  L5_CAPSTONE.sizeWhy,
  L5_CAPSTONE.prompt,
  ...L5_CAPSTONE.options.flatMap((o) => [o.label, o.future]),
  L5_BREATH_Q.prompt,
  ...L5_BREATH_Q.options.map((o) => o.label),
  L5_BREATH_Q.whyRight,
  L5_REORDER.prompt,
  ...L5_REORDER.steps,
  L5_CONGRATS.body,
];

describe('game-content structure', () => {
  it('has five levels, numbered 1..5, each with a distinct interaction kind', () => {
    expect(IRRITABILITY_LEVELS).toHaveLength(5);
    expect(IRRITABILITY_LEVELS.map((l) => l.n)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(IRRITABILITY_LEVELS.map((l) => l.kind)).size).toBe(5);
  });

  it('L3 flips best-fit with the size: reframe wins small, take-20 wins big', () => {
    // Small scenes: the best solution is a fairer read (reframe), not stepping away.
    for (const s of L3_SCENES.filter((x) => x.intensity === 'little')) {
      const bestLabel = s.options.find((o) => o.tier === 'best')!.label.toLowerCase();
      expect(bestLabel).not.toMatch(/20|space|step|settle/);
    }
    // Big scenes: the best solution is taking 20 / stepping away, not a reframe.
    for (const s of L3_SCENES.filter((x) => x.intensity === 'lot')) {
      const bestLabel = s.options.find((o) => o.tier === 'best')!.label.toLowerCase();
      expect(bestLabel).toMatch(/20|step|space|settle/);
    }
  });

  it('each L3 scene has one best, one lesser, one worst', () => {
    for (const s of L3_SCENES) {
      expect(s.options.filter((o) => o.tier === 'best')).toHaveLength(1);
      expect(s.options.filter((o) => o.tier === 'lesser')).toHaveLength(1);
      expect(s.options.filter((o) => o.tier === 'worst')).toHaveLength(1);
    }
  });

  it('L5 capstone has one best, one lesser, one worst move', () => {
    expect(L5_CAPSTONE.options.filter((o) => o.tier === 'best')).toHaveLength(1);
    expect(L5_CAPSTONE.options.filter((o) => o.tier === 'lesser')).toHaveLength(1);
    expect(L5_CAPSTONE.options.filter((o) => o.tier === 'worst')).toHaveLength(1);
  });

  it('L5 breath question has exactly one correct answer (the long exhale)', () => {
    const correct = L5_BREATH_Q.options.filter((o) => o.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].label).toMatch(/out longer than you breathe in/i);
  });

  it('L5 reorder is a 4-step method with basics first and the big/take-20 move last', () => {
    expect(L5_REORDER.steps).toHaveLength(4);
    expect(L5_REORDER.steps[0]).toMatch(/hungry or tired/i);
    expect(L5_REORDER.steps[L5_REORDER.steps.length - 1]).toMatch(/take 20/i);
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
