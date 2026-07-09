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
  L5_SLOTS,
  L5_CONGRATS,
  KIND_WORD,
  buildL5Sentence,
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
  L4_TEACH.body,
  L4_CONGRATS.body,
  L5_INTRO.subtitle,
  ...L5_SLOTS.flatMap((s) => [s.lead, ...s.options]),
  L5_CONGRATS.body,
  KIND_WORD.body,
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

  it('builds the L5 sentence from chosen chips', () => {
    const s = buildL5Sentence({ intensity: 'a lot', trigger: 'I am hungry and snappy', action: 'step outside' });
    expect(s).toBe('When I am a lot worked up and I am hungry and snappy, before I react I will step outside.');
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
