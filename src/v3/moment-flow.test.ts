// The graph must be incapable of stranding her.
//
// The previous attempt at this flow declared 18 steps, left one unreachable and
// four more reachable only with the model on, and nothing caught it because
// nothing ever walked the graph. These tests walk it.

import {
  advance,
  ENTRY,
  MOMENT_FLOW,
  MODEL_NODES,
  node,
  type NodeId,
} from './moment-flow';

const ALL: NodeId[] = MOMENT_FLOW.map((n) => n.id);

describe('the graph is whole', () => {
  it('has no duplicate ids', () => {
    expect(new Set(ALL).size).toBe(ALL.length);
  });

  it('every edge lands on a node that exists', () => {
    for (const n of MOMENT_FLOW) {
      if (n.next) expect(() => node(n.next!)).not.toThrow();
      for (const b of n.branches ?? []) expect(() => node(b.next)).not.toThrow();
    }
  });

  it('every non-terminal beat leads somewhere', () => {
    for (const n of MOMENT_FLOW) {
      if (n.terminal) continue;
      const hasEdge = n.next != null || (n.branches?.length ?? 0) > 0;
      expect({ id: n.id, hasEdge }).toEqual({ id: n.id, hasEdge: true });
    }
  });

  it('every beat is reachable from the entry, or is an entry-only safety beat', () => {
    const seen = new Set<NodeId>();
    const walk = (id: NodeId) => {
      if (seen.has(id)) return;
      seen.add(id);
      const n = node(id);
      if (n.next) walk(n.next);
      for (const b of n.branches ?? []) walk(b.next);
    };
    walk(ENTRY);
    // safe_check is entered by the crisis scan rather than by an edge, so it is
    // a legitimate second root; crisis_handoff hangs off it.
    walk('safe_check');

    const unreachable = ALL.filter((id) => !seen.has(id));
    expect(unreachable).toEqual([]);
  });

  it('every path terminates: no beat can loop forever without an exit', () => {
    // Every cycle in this graph (breathe again, show me others, still not
    // calmer) must have at least one branch that leaves it.
    const exits = (id: NodeId, stack: NodeId[]): boolean => {
      const n = node(id);
      if (n.terminal) return true;
      if (stack.includes(id)) return false; // this path loops
      const nexts = n.branches ? n.branches.map((b) => b.next) : n.next ? [n.next] : [];
      return nexts.some((x) => exits(x, [...stack, id]));
    };
    for (const id of ALL) {
      expect({ id, reachesAnEnding: exits(id, []) }).toEqual({ id, reachesAnEnding: true });
    }
  });
});

describe('who owns the words', () => {
  it('no beat composes: every model beat is echo or pick', () => {
    for (const n of MODEL_NODES) {
      expect({ id: n.id, owner: n.owner }).toEqual({
        id: n.id,
        owner: expect.stringMatching(/^(echo|pick|transform)$/),
      });
    }
  });

  it('only model beats carry a corpus slot', () => {
    for (const n of MOMENT_FLOW) {
      if (n.slot == null) continue;
      expect(['echo', 'pick', 'transform']).toContain(n.owner);
    }
    for (const n of MOMENT_FLOW) {
      if (['authored', 'safety', 'ui', 'reward', 'branch', 'she'].includes(n.owner)) {
        expect({ id: n.id, slot: n.slot }).toEqual({ id: n.id, slot: undefined });
      }
    }
  });

  it('safety beats are never explained', () => {
    // An explanation on a safety beat reads as persuasion, and we do not
    // persuade her about her own safety.
    for (const n of MOMENT_FLOW) {
      if (n.owner !== 'safety') continue;
      expect({ id: n.id, why: n.why }).toEqual({ id: n.id, why: undefined });
    }
  });

  it('drops the two beats that were never in the spec', () => {
    // `pattern` and `change` came from the earlier idea, not the map. `pattern`
    // wrote self-critical sentences and attributed them to her.
    expect(ALL).not.toContain('pattern');
    expect(ALL).not.toContain('change');
  });
});

describe('the beats the evidence turns on', () => {
  it('has no upfront 0-10 rating, and never re-quizzes her at the end', () => {
    // The upfront `intensity_in` rating was cut 2026-08-09 (felt arbitrary and
    // boring); the closing `intensity_out` rating went 2026-08-01. Neither the
    // opening nor the close pulls her into rating her feelings.
    expect(ALL).not.toContain('intensity_in');
    expect(ALL).not.toContain('intensity_out');
    // The flow ends on a warm sendoff, then the reward.
    expect(ALL).toContain('sendoff');
  });

  it('opens on the 3-beat intro, and the feeling guess is the first substantive beat', () => {
    expect(ENTRY).toBe('intro');
    // The echo beat (acknowledge) was removed 2026-08-13: the feeling guess opens
    // the flow. intro and clarify both walk straight to it, no beat in between.
    expect(ALL).not.toContain('acknowledge');
    expect(node('clarify').next).toBe('feelings');
    const order: NodeId[] = [];
    let cur: NodeId | null = ENTRY;
    while (cur && order.length < 12) {
      order.push(cur);
      cur = advance(cur);
    }
    expect(order).toContain('feelings');
    expect(order.indexOf('feelings')).toBeGreaterThan(order.indexOf('intro'));
  });

  // The body check (slept / moved / eaten) was removed 2026-07-27. If it comes
  // back, the food leg is the one to look at hardest: it is unevidenced, the
  // app's own audit flags an unscreened food prompt as a risk with binge eating
  // elevated through the luteal phase, and the drafted "make sure you are not
  // low on blood sugar" is a physiology claim the voice rules ban outright.
  it('has no body check', () => {
    expect(ALL.filter((id) => id.startsWith('body_'))).toEqual([]);
  });

  it('sends everyone through reflect, first thing after naming', () => {
    // The reflect-card system (2026-08-09) replaced the late reframe. Every main
    // path lands here, and it converges on make_safe (regulate) whichever card
    // she accepts, walks past, or has validated.
    const r = node('reflect');
    expect(r.branches).toBeUndefined();
    expect(r.next).toBe('make_safe');
    expect(r.note ?? '').toMatch(/everyone/i);
    // It is reachable by walking the straight-line graph from the entry.
    const order: NodeId[] = [];
    let cur: NodeId | null = ENTRY;
    while (cur && order.length < 12) {
      order.push(cur);
      cur = advance(cur);
    }
    expect(order).toContain('reflect');
  });

  it('gives "none of these feel possible" a full ending, not a dead end', () => {
    const opts = node('options');
    const none = opts.branches?.find((b) => b.when === 'none_possible');
    expect(none).toBeDefined();
    // and it walks all the way to the close like every other path
    let cur: NodeId | null = none!.next;
    const seen: NodeId[] = [];
    while (cur && seen.length < 20) {
      seen.push(cur);
      if (node(cur).terminal) break;
      cur = advance(cur);
    }
    expect(seen).toContain('close');
  });

  it('the crisis handoff ends the flow', () => {
    expect(node('crisis_handoff').terminal).toBe(true);
    expect(advance('crisis_handoff')).toBeNull();
  });
});
