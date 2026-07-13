import {
  EMOTION_CHIPS,
  EMOTION_BREATHS,
  EMOTION_HEADER,
  EMOTION_SUBHEAD,
  EMOTION_RULE,
} from './emotion-regulation';
import { getTechnique } from './techniques';

const COPY: string[] = [
  EMOTION_HEADER,
  EMOTION_SUBHEAD,
  EMOTION_RULE,
  ...EMOTION_CHIPS.flatMap((c) => [c.label, c.reframe]),
  ...EMOTION_BREATHS.map((b) => b.label),
];

describe('emotion-regulation content', () => {
  it('has chips with unique ids, each carrying a reframe', () => {
    expect(EMOTION_CHIPS.length).toBeGreaterThanOrEqual(4);
    expect(new Set(EMOTION_CHIPS.map((c) => c.id)).size).toBe(EMOTION_CHIPS.length);
    for (const c of EMOTION_CHIPS) expect(c.reframe.trim().length).toBeGreaterThan(0);
  });

  it('every breath maps to a real technique', () => {
    for (const b of EMOTION_BREATHS) expect(getTechnique(b.technique)).toBeTruthy();
  });

  it('app voice never uses em dashes, exclamation points, or emoji', () => {
    for (const line of COPY) {
      expect(line).not.toMatch(/[—!]/);
      expect(line).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it('all copy is gender-neutral: no standalone he/she/him/his/her', () => {
    for (const line of COPY) {
      expect(line).not.toMatch(/\b(he|she|him|his|her|hers)\b/i);
    }
  });
});
