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
  it('takes the baseline rating BEFORE the echo', () => {
    // acknowledge is one of the things being measured, so a baseline after it
    // is already post-treatment and the delta understates the flow.
    const order: NodeId[] = [];
    let cur: NodeId | null = ENTRY;
    while (cur && order.length < 12) {
      order.push(cur);
      cur = advance(cur);
    }
    expect(order.indexOf('intensity_in')).toBeGreaterThan(-1);
    expect(order.indexOf('intensity_in')).toBeLessThan(order.indexOf('acknowledge'));
  });

  it('measures intensity twice, so there is a delta to read', () => {
    expect(ALL).toContain('intensity_in');
    expect(ALL).toContain('intensity_out');
  });

  // Food was cut by map change 00b and restored 2026-07-27 at Neha's call. The
  // reasons for the cut did not go away, so what is guarded changed rather than
  // disappearing: it may be OFFERED, it may never be JUSTIFIED.
  it('offers food without explaining it', () => {
    const eat = node('body_eat');
    // Every other choice point in the flow carries a line saying what it is
    // for. This one must not: the beat is unevidenced, and the standing rule is
    // that an unevidenced beat may ship but may never carry a science line,
    // because anyone asked to justify one invents a rationale in good faith.
    expect(eat.why).toBeUndefined();
    expect(eat.owner).toBe('authored');
  });

  it('keeps the reason for the original cut written down', () => {
    // So a future reader meets the argument rather than an unexplained offer.
    expect(node('body_eat').note ?? '').toMatch(/physiology claim|do not add it back/i);
    expect(node('body_check').note ?? '').toMatch(/unevidenced|00b/i);
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
      cur = advance(cur, cur === 'we_good' ? 'yes' : cur === 'today_action' ? 'no_after' : undefined);
    }
    expect(seen).toContain('close');
  });

  it('the crisis handoff ends the flow', () => {
    expect(node('crisis_handoff').terminal).toBe(true);
    expect(advance('crisis_handoff')).toBeNull();
  });
});
