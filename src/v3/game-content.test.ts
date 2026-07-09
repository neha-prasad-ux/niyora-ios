import {
  FRIEND_NAME,
  IRRITABILITY_LEVELS,
  L1_CARDS,
  L2_SCENES,
  L3_SCENES,
  L4_ZONES,
  L6_SLOTS,
  buildL6Sentence,
} from './game-content';

// Every user-facing string in the chapter, flattened, for copy-rule checks.
const ALL_COPY: string[] = [
  ...IRRITABILITY_LEVELS.flatMap((l) => [l.title, l.intro]),
  ...L1_CARDS.flatMap((c) => [c.statement, c.reveal]),
  ...L2_SCENES.flatMap((s) => [s.scene, s.why]),
  ...L3_SCENES.flatMap((s) => [s.prompt, ...s.options.flatMap((o) => [o.label, o.future])]),
  ...L4_ZONES.flatMap((z) => [z.label, z.future]),
  ...L6_SLOTS.flatMap((s) => [s.lead, ...s.options]),
];

describe('game-content structure', () => {
  it('has six levels, numbered 1..6, each with a distinct interaction kind', () => {
    expect(IRRITABILITY_LEVELS).toHaveLength(6);
    expect(IRRITABILITY_LEVELS.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(IRRITABILITY_LEVELS.map((l) => l.kind)).size).toBe(6);
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

  it('L4 best-fit is the middle (say it, just not mid-flood), both ends cost her', () => {
    expect(L4_ZONES.filter((z) => z.best)).toHaveLength(1);
    expect(L4_ZONES.find((z) => z.best)!.id).toBe('take20');
  });

  it('builds the L6 sentence from chosen chips', () => {
    const s = buildL6Sentence({ intensity: 'a lot', trigger: 'I am hungry and snappy', action: 'step outside' });
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
