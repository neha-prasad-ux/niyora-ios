// Per-point reactions in the reflect flow (2026-08-12). A read can be marked
// "like" (resonates) or "reject" (not this); absent = neutral, the default.
//
// Reactions are keyed by (a stable scope + the read's index), NOT the read text:
// reads can repeat or append, so text is not a safe key. The read's text is kept
// in the VALUE so feedback can still be collected as text after the list
// re-rolls. `scope` is a caller-owned stable id (e.g. `${cardId}:${generation}`
// for a reflect card, `chat:${turnIndex}` for a chat lens reply); a generation
// that changes when a card's reads are fully replaced keeps a fresh read from
// inheriting the old read's reaction at the same index.
//
// A human consumes collectReactions() later to steer the AI; NOTHING here is
// wired into a prompt yet.

export type Reaction = 'like' | 'reject';
export type PointReactions = Record<string, { text: string; reaction: Reaction }>;

export function reactionKey(scope: string, index: number): string {
  return `${scope}#${index}`;
}

export function reactionAt(
  map: PointReactions,
  scope: string,
  index: number,
): Reaction | undefined {
  return map[reactionKey(scope, index)]?.reaction;
}

/** The collected feedback for a human to consume: the point texts she liked and
 *  the ones she rejected. Neutral points are absent from the map entirely. */
export function collectReactions(map: PointReactions): { liked: string[]; rejected: string[] } {
  const liked: string[] = [];
  const rejected: string[] = [];
  for (const v of Object.values(map)) {
    (v.reaction === 'like' ? liked : rejected).push(v.text);
  }
  return { liked, rejected };
}
