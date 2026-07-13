// The Relationship card on the PMS Day checklist: the "us" jobs. A heads-up
// before things get tense, and two topics for if you end up fighting. Each
// button routes to an existing couples screen, which records its own light
// (apply / notice) on completion.
//
// App voice: no em dashes, exclamation points, or emoji; gender-neutral (see
// relationship.test).

export type RelationshipButton = { id: string; label: string; route: string };
export type RelationshipGroup = { id: string; intro: string; buttons: readonly RelationshipButton[] };

export const RELATIONSHIP_GROUPS: readonly RelationshipGroup[] = [
  {
    id: 'heads-up',
    intro: 'Give your partner a heads-up',
    buttons: [{ id: 'heads', label: 'Heads up', route: '/couples-texts' }],
  },
  {
    id: 'fight',
    intro: 'If you do end up fighting',
    buttons: [
      { id: 'quiz', label: 'Is it real or PMS', route: '/couples-quiz' },
      { id: 'closure', label: 'Make up after', route: '/couples-reconnect' },
    ],
  },
];
