import {
  COUPLES_QUIZ,
  COUPLES_TEXTS,
  CORE_PREP_ITEMS,
  PREP_MESSAGE,
  PREP_QUESTIONS,
  QUIZ_FOOTER,
  QUIZ_RESULT,
  RECONNECT_STEPS,
  buildPrepChecklist,
  buildPrepMessage,
  scoreQuiz,
} from './couples-content';

// App-voice copy: the app speaking. Same rules as game-content (no em dashes,
// exclamation points, or emoji). The shareable COUPLES_TEXTS are intentionally
// casual and exempt, so they are NOT in this set.
const APP_VOICE: string[] = [
  ...COUPLES_QUIZ.map((q) => q.question),
  QUIZ_RESULT.pms.title,
  QUIZ_RESULT.pms.takeaway,
  ...QUIZ_RESULT.pms.points,
  QUIZ_RESULT.real.title,
  QUIZ_RESULT.real.takeaway,
  ...QUIZ_RESULT.real.points,
  QUIZ_FOOTER,
  ...PREP_QUESTIONS.flatMap((q) => [q.question, q.ifYes]),
  ...CORE_PREP_ITEMS.map((c) => c.label),
  PREP_MESSAGE.greeting,
  PREP_MESSAGE.intro,
  PREP_MESSAGE.signoff,
  ...RECONNECT_STEPS.flatMap((s) => [s.label, s.examples]),
];

// Every user-facing string, including the casual texts, for the gender check.
const ALL_COPY: string[] = [...APP_VOICE, ...COUPLES_TEXTS.flatMap((g) => g.items.map((i) => i.text))];

describe('couples-content copy rules', () => {
  it('app voice never uses em dashes, exclamation points, or emoji', () => {
    for (const line of APP_VOICE) {
      expect(line).not.toMatch(/[—!]/);
      expect(line).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });

  it('all copy is gender-neutral: no standalone he/she/him/his/her', () => {
    for (const line of ALL_COPY) {
      expect(line).not.toMatch(/\b(he|she|him|his|her|hers)\b/i);
    }
  });
});

describe('PMS-or-real quiz', () => {
  it('has seven questions with unique ids and a valid lean', () => {
    expect(COUPLES_QUIZ).toHaveLength(7);
    expect(new Set(COUPLES_QUIZ.map((q) => q.id)).size).toBe(COUPLES_QUIZ.length);
    for (const q of COUPLES_QUIZ) expect(['pms', 'real']).toContain(q.yesLeansTo);
  });

  it('all yes leans PMS, all no leans real', () => {
    const allYes = Object.fromEntries(COUPLES_QUIZ.map((q) => [q.id, true]));
    const allNo = Object.fromEntries(COUPLES_QUIZ.map((q) => [q.id, false]));
    expect(scoreQuiz(allYes)).toBe('pms');
    expect(scoreQuiz(allNo)).toBe('real');
  });

  it('defaults to real when the signal is not clearly PMS (never dismisses)', () => {
    // No answers at all: every question counts as a "no", which leans toward the
    // safe default rather than "just hormones".
    expect(scoreQuiz({})).toBe('real');
  });
});

describe('prep questionnaire', () => {
  it('has unique question ids', () => {
    expect(new Set(PREP_QUESTIONS.map((q) => q.id)).size).toBe(PREP_QUESTIONS.length);
  });

  it('empty answers still yield the three core agreements', () => {
    const plan = buildPrepChecklist({});
    expect(plan).toHaveLength(CORE_PREP_ITEMS.length);
  });

  it('all yes yields core items plus one line per question, all ids unique', () => {
    const allYes = Object.fromEntries(PREP_QUESTIONS.map((q) => [q.id, true]));
    const plan = buildPrepChecklist(allYes);
    expect(plan).toHaveLength(CORE_PREP_ITEMS.length + PREP_QUESTIONS.length);
    expect(new Set(plan.map((p) => p.id)).size).toBe(plan.length);
  });

  it('builds a sendable message with greeting, numbered lines, and signoff', () => {
    const msg = buildPrepMessage({});
    expect(msg).toContain(PREP_MESSAGE.greeting);
    expect(msg).toContain(PREP_MESSAGE.signoff);
    expect(msg).toMatch(/^1\. /m);
  });
});

describe('reconnect + texts', () => {
  it('reconnect steps have unique ids', () => {
    expect(new Set(RECONNECT_STEPS.map((s) => s.id)).size).toBe(RECONNECT_STEPS.length);
  });

  it('every shareable text has a globally unique id', () => {
    const ids = COUPLES_TEXTS.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
