jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
// The cipher is exercised in secure-box's own right; here it stands in as
// identity so a stored record is readable in an assertion.
jest.mock('@/lib/secure-box', () => ({
  encrypt: (s: string) => Promise.resolve(`enc(${s})`),
  decrypt: (s: string) =>
    Promise.resolve(s.startsWith('enc(') ? s.slice(4, -1) : s),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { reactionKey, type PointReactions } from '@/v3/reflect-feedback';

import {
  EMPTY_REFLECT_MEMORY,
  getReflectReactions,
  loadReflectMemoryClause,
  parseReflectReactions,
  reflectMemoryClause,
  rememberReactions,
  summariseReflectMemory,
  type ReflectReaction,
} from './reflect-memory';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue(undefined);
});

/** The list handed to setItem on the most recent write, decrypted. */
function written(): ReflectReaction[] {
  const raw = setItem.mock.calls[setItem.mock.calls.length - 1][1] as string;
  return (JSON.parse(raw) as ReflectReaction[]).map((r) => ({
    ...r,
    text: r.text.slice(4, -1),
  }));
}

const r = (
  card: string,
  text: string,
  reaction: 'like' | 'reject',
  at = '2026-08-18T10:00:00Z',
): ReflectReaction => ({ at, card, text, reaction, feeling: 'Hurt' });

/** n reactions on one lens, texts unique so the example dedup does not eat them. */
const many = (card: string, reaction: 'like' | 'reject', n: number): ReflectReaction[] =>
  Array.from({ length: n }, (_, i) => r(card, `${card} read ${i}`, reaction));

describe('parseReflectReactions', () => {
  it('degrades junk storage to no memory', () => {
    expect(parseReflectReactions(null)).toEqual([]);
    expect(parseReflectReactions('not json')).toEqual([]);
    expect(parseReflectReactions('{"card":"simpler"}')).toEqual([]); // not an array
  });

  it('drops malformed records and keeps well-formed ones', () => {
    const out = parseReflectReactions(
      JSON.stringify([
        r('simpler', 'They were busy, not cold.', 'like'),
        { ...r('simpler', '', 'like'), text: '' }, // empty read: nothing to learn
        { ...r('simpler', 'x', 'like'), reaction: 'shrug' }, // not a reaction
        null,
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('They were busy, not cold.');
  });
});

describe('rememberReactions', () => {
  const map: PointReactions = {
    [reactionKey('simpler:0', 0)]: { text: 'They were busy, not cold.', reaction: 'like' },
    [reactionKey('simpler:0', 1)]: { text: 'This is about your worth.', reaction: 'reject' },
    [reactionKey('rule-demand:2', 0)]: { text: 'You must never disappoint them.', reaction: 'like' },
  };

  it('derives the card from the reaction key and stores the read encrypted', async () => {
    await rememberReactions(map, { feeling: 'Hurt', subject: 'mom' });
    expect(written().map((x) => [x.card, x.reaction])).toEqual([
      ['simpler', 'like'],
      ['simpler', 'reject'],
      ['rule-demand', 'like'],
    ]);
    expect(written()[0]).toMatchObject({ feeling: 'Hurt', subject: 'mom' });
    // Every read goes through the cipher on the way to AsyncStorage, none slips
    // out in the clear.
    const raw = JSON.parse(setItem.mock.calls[0][1] as string) as ReflectReaction[];
    expect(raw.every((x) => x.text.startsWith('enc('))).toBe(true);
  });

  it('writes nothing when she reacted to nothing', async () => {
    await rememberReactions({}, { feeling: 'Hurt' });
    expect(setItem).not.toHaveBeenCalled();
  });

  it('lets a repeat opinion on the same read replace the old one, so a double save cannot inflate a lean', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([
        { ...r('simpler', 'They were busy, not cold.', 'reject'), text: 'enc(They were busy, not cold.)' },
      ]),
    );
    await rememberReactions(
      { [reactionKey('simpler:0', 0)]: { text: 'They were busy, not cold.', reaction: 'like' } },
      { feeling: 'Hurt' },
    );
    expect(written()).toHaveLength(1);
    expect(written()[0].reaction).toBe('like');
  });

  it('caps the list and keeps the newest', async () => {
    getItem.mockResolvedValue(
      JSON.stringify(
        Array.from({ length: 300 }, (_, i) => ({
          ...r('simpler', `old ${i}`, 'like', '2026-01-01T00:00:00Z'),
          text: `enc(old ${i})`,
        })),
      ),
    );
    await rememberReactions(
      { [reactionKey('need:0', 0)]: { text: 'rest', reaction: 'like' } },
      { feeling: 'Hurt' },
    );
    const out = written();
    expect(out).toHaveLength(300);
    expect(out[0].text).toBe('rest');
    expect(out.some((x) => x.text === 'old 299')).toBe(false); // oldest fell off
  });

  it('never throws when storage is broken', async () => {
    setItem.mockRejectedValue(new Error('disk full'));
    await expect(
      rememberReactions(map, { feeling: 'Hurt' }),
    ).resolves.toBeUndefined();
  });
});

describe('getReflectReactions', () => {
  it('returns the stored reads in plaintext', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([{ ...r('simpler', 'x', 'like'), text: 'enc(They were busy, not cold.)' }]),
    );
    expect((await getReflectReactions())[0].text).toBe('They were busy, not cold.');
  });

  it('degrades a broken read to no memory', async () => {
    getItem.mockRejectedValue(new Error('nope'));
    expect(await getReflectReactions()).toEqual([]);
  });
});

describe('summariseReflectMemory', () => {
  it('claims no lean for a brand new user', () => {
    expect(summariseReflectMemory([])).toEqual(EMPTY_REFLECT_MEMORY);
  });

  it('says only what a couple of reactions support: quotes, no lean', () => {
    const mem = summariseReflectMemory([
      r('simpler', 'They were busy, not cold.', 'like'),
      r('signal', 'This is about your worth.', 'reject'),
    ]);
    expect(mem.keeps).toEqual([]);
    expect(mem.turnDowns).toEqual([]);
    expect(mem.liked).toEqual(['They were busy, not cold.']);
    expect(mem.rejected).toEqual(['This is about your worth.']);
  });

  it('claims a lens lean once three reactions on it agree two to one', () => {
    const mem = summariseReflectMemory([
      ...many('simpler', 'like', 2),
      r('simpler', 'simpler miss', 'reject'),
      ...many('signal', 'reject', 3),
    ]);
    expect(mem.keeps).toEqual([{ lens: 'a plainer outside reason for what happened', n: 3 }]);
    expect(mem.turnDowns).toEqual([{ lens: 'what the feeling is pointing to', n: 3 }]);
  });

  it('stays silent on a lens that is genuinely split', () => {
    const mem = summariseReflectMemory([
      ...many('middle', 'like', 2),
      ...many('middle', 'reject', 2),
    ]);
    expect(mem.keeps).toEqual([]);
    expect(mem.turnDowns).toEqual([]);
  });

  it('counts the two rule scopes as one lens', () => {
    const mem = summariseReflectMemory([
      ...many('rule', 'like', 2),
      ...many('rule-demand', 'like', 1),
    ]);
    expect(mem.keeps).toEqual([{ lens: 'the rigid rule or "should" under the upset', n: 3 }]);
  });

  it('ignores a card it has no lens phrase for, rather than inventing one', () => {
    const mem = summariseReflectMemory(many('some_new_card', 'like', 5));
    expect(mem.keeps).toEqual([]);
    expect(mem.liked).toHaveLength(2); // her own words still count
  });

  it('keeps only the strongest lenses, strongest first', () => {
    const mem = summariseReflectMemory([
      ...many('simpler', 'like', 9),
      ...many('need', 'like', 3),
      ...many('friend', 'like', 5),
    ]);
    expect(mem.keeps.map((k) => k.n)).toEqual([9, 5]);
  });

  it('reads a length shape only with mass on both sides', () => {
    const short = Array.from({ length: 5 }, (_, i) => r('simpler', `short ${i}`, 'like'));
    const long = Array.from({ length: 5 }, (_, i) =>
      r('signal', `a much longer read that keeps going and going and going ${i}`, 'reject'),
    );
    expect(summariseReflectMemory([...short, ...long]).shape).toBe('short');
    expect(summariseReflectMemory([...short, ...long.slice(0, 4)]).shape).toBeNull();
    // Reverse it: the fuller reads are the ones she keeps.
    const flipped = [...short, ...long].map((x) => ({
      ...x,
      reaction: x.reaction === 'like' ? ('reject' as const) : ('like' as const),
    }));
    expect(summariseReflectMemory(flipped).shape).toBe('long');
  });

  it('quotes newest-first, deduped, and trims a runaway read', () => {
    const mem = summariseReflectMemory([
      r('simpler', 'newest', 'like', '2026-08-18T10:00:00Z'),
      r('need', 'newest', 'like', '2026-08-17T10:00:00Z'), // same words: not quoted twice
      r('friend', 'x'.repeat(300), 'like', '2026-08-16T10:00:00Z'),
    ]);
    expect(mem.liked).toEqual(['newest', 'x'.repeat(160) + '...']);
  });
});

describe('reflectMemoryClause', () => {
  it('sends nothing at all for a new user', () => {
    expect(reflectMemoryClause(EMPTY_REFLECT_MEMORY)).toBe('');
  });

  it('says only what the evidence supports, and hedges to match it', () => {
    const three = reflectMemoryClause(summariseReflectMemory(many('simpler', 'like', 3)));
    expect(three).toContain('usually land for her');
    expect(three).not.toContain('consistently');

    const eight = reflectMemoryClause(summariseReflectMemory(many('simpler', 'like', 8)));
    expect(eight).toContain('consistently land for her');
  });

  it('quotes her hearts and tells the model never to mention the memory', () => {
    const clause = reflectMemoryClause(
      summariseReflectMemory([
        r('simpler', 'They were busy, not cold.', 'like'),
        r('signal', 'This is about your worth.', 'reject'),
      ]),
    );
    // Her read already ends the sentence, so no second full stop is bolted on.
    expect(clause).toContain('She kept "They were busy, not cold." She turned down');
    expect(clause).toContain('She turned down "This is about your worth." This is a lean');
    expect(clause).toContain('Never mention it to her');
    expect(clause.startsWith('\nFrom her earlier moments, not this one: ')).toBe(true);
  });

  it('closes the sentence when her read did not', () => {
    const clause = reflectMemoryClause(
      summariseReflectMemory([r('need', 'rest', 'like')]),
    );
    expect(clause).toContain('She kept "rest". This is a lean');
  });

  it('stays short enough to ride on every call', () => {
    const clause = reflectMemoryClause(
      summariseReflectMemory([
        ...many('simpler', 'like', 9),
        ...many('whose_weight', 'like', 8),
        ...many('signal', 'reject', 8),
        ...many('shame', 'reject', 8),
        ...many('need', 'like', 8),
      ]),
    );
    expect(clause.length).toBeLessThan(700); // roughly 150 tokens, worst case
  });

  it('never uses a dash of any kind, the model copies punctuation it is fed', () => {
    const clause = reflectMemoryClause(
      summariseReflectMemory([...many('simpler', 'like', 3), ...many('signal', 'reject', 3)]),
    );
    expect(clause).not.toMatch(/[-–—]/);
  });
});

describe('loadReflectMemoryClause', () => {
  it('is the whole pipeline in one call', async () => {
    getItem.mockResolvedValue(
      JSON.stringify(
        many('simpler', 'like', 3).map((x) => ({ ...x, text: `enc(${x.text})` })),
      ),
    );
    expect(await loadReflectMemoryClause()).toContain('a plainer outside reason');
  });

  it('degrades to no clause when storage is broken', async () => {
    getItem.mockRejectedValue(new Error('nope'));
    expect(await loadReflectMemoryClause()).toBe('');
  });
});
