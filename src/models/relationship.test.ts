import { RELATIONSHIP_GROUPS } from './relationship';

const BUTTONS = RELATIONSHIP_GROUPS.flatMap((g) => g.buttons);
const COPY: string[] = [
  ...RELATIONSHIP_GROUPS.map((g) => g.intro),
  ...BUTTONS.map((b) => b.label),
];

describe('relationship content', () => {
  it('groups and buttons have unique ids', () => {
    expect(new Set(RELATIONSHIP_GROUPS.map((g) => g.id)).size).toBe(RELATIONSHIP_GROUPS.length);
    expect(new Set(BUTTONS.map((b) => b.id)).size).toBe(BUTTONS.length);
  });

  it('every button routes to a couples screen', () => {
    for (const b of BUTTONS) expect(b.route).toMatch(/^\/couples-/);
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
