import {
  ANCHOR_IDS,
  EMPTY_ANSWERS,
  LEVER_ITEMS,
  compareReads,
  type V3Answers,
} from './v3-content';

function answers(over: Partial<V3Answers>): V3Answers {
  return { ...EMPTY_ANSWERS, ...over };
}

// A severe read: five symptoms including an emotional anchor, max impact.
const severeRead = answers({
  presence: [ANCHOR_IDS[0], 'bloating', 'headache', 'cravings', 'fatigue'],
  impairment: { work: 2 },
  coping: ['vent', 'ruminate'],
  levers: { [LEVER_ITEMS[0].id]: 0 },
});

// A mild read: two symptoms, no anchor, no impact.
const mildRead = answers({
  presence: ['bloating', 'headache'],
  impairment: {},
  coping: ['reframe', 'engage'],
  levers: { [LEVER_ITEMS[0].id]: 2 },
});

describe('compareReads', () => {
  it('reads an easing as level down plus the factors that moved', () => {
    const cmp = compareReads(severeRead, mildRead);
    expect(cmp.before).toBe('severe');
    expect(cmp.after).toBe('mild');
    expect(cmp.headline).toMatch(/easing/i);
    expect(cmp.moved).toContain('Symptoms you notice: 5 → 2');
    expect(cmp.moved).toContain('Day-to-day impact eased');
    expect(cmp.moved.some((l) => l.startsWith('Coping:'))).toBe(true);
    expect(cmp.moved.some((l) => l.startsWith('Habits worth building:'))).toBe(true);
  });

  it('reads a worsening in the other direction', () => {
    const cmp = compareReads(mildRead, severeRead);
    expect(cmp.before).toBe('mild');
    expect(cmp.after).toBe('severe');
    expect(cmp.moved).toContain('Day-to-day impact grew');
  });

  it('identical reads hold steady: same level, nothing moved', () => {
    const cmp = compareReads(severeRead, severeRead);
    expect(cmp.before).toBe(cmp.after);
    expect(cmp.headline).toMatch(/^Still /);
    expect(cmp.moved).toEqual([]);
  });

  it('never compares coping against an unanswered retake', () => {
    const cmp = compareReads(severeRead, answers({ ...mildRead, coping: [] }));
    expect(cmp.moved.some((l) => l.startsWith('Coping:'))).toBe(false);
  });
});
