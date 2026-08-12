import { collectReactions, reactionAt, reactionKey, type PointReactions } from './reflect-feedback';

describe('reflect-feedback', () => {
  it('keys by scope + index and reads back the reaction', () => {
    const map: PointReactions = {
      [reactionKey('simpler:0', 0)]: { text: 'They were busy, not cold.', reaction: 'like' },
      [reactionKey('simpler:0', 1)]: { text: "It's about who you are.", reaction: 'reject' },
    };
    expect(reactionAt(map, 'simpler:0', 0)).toBe('like');
    expect(reactionAt(map, 'simpler:0', 1)).toBe('reject');
    expect(reactionAt(map, 'simpler:0', 2)).toBeUndefined();
  });

  it('same index under different scopes does not collide', () => {
    const map: PointReactions = {
      [reactionKey('simpler:0', 0)]: { text: 'a', reaction: 'like' },
      [reactionKey('middle:0', 0)]: { text: 'b', reaction: 'reject' },
      // a fresh generation of the same card keeps the old reaction intact
      [reactionKey('simpler:1', 0)]: { text: 'c', reaction: 'reject' },
    };
    expect(reactionAt(map, 'simpler:0', 0)).toBe('like');
    expect(reactionAt(map, 'middle:0', 0)).toBe('reject');
    expect(reactionAt(map, 'simpler:1', 0)).toBe('reject');
  });

  it('collectReactions returns liked and rejected point TEXTS, dropping neutral', () => {
    const map: PointReactions = {
      [reactionKey('need:0', 0)]: { text: 'rest', reaction: 'like' },
      [reactionKey('need:0', 1)]: { text: 'to be heard', reaction: 'like' },
      [reactionKey('need:0', 2)]: { text: 'to be right', reaction: 'reject' },
    };
    const { liked, rejected } = collectReactions(map);
    expect(liked.sort()).toEqual(['rest', 'to be heard']);
    expect(rejected).toEqual(['to be right']);
  });

  it('a crossed read stays queryable as its text even after the list re-rolls', () => {
    // she rejects read 1 (text preserved in the value), then a fresh read lands
    // at a new index — the rejected text is still collectable.
    const map: PointReactions = {
      [reactionKey('simpler:0', 1)]: { text: 'the harsh read', reaction: 'reject' },
      [reactionKey('simpler:0', 3)]: { text: 'a gentler read', reaction: 'like' },
    };
    expect(collectReactions(map)).toEqual({ liked: ['a gentler read'], rejected: ['the harsh read'] });
  });
});
