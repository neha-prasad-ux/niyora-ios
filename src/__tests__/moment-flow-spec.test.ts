// `ai-briefs/moment-flow.yaml` is the single source of truth for the
// in-the-moment flow. Every brief, every stream, and every agent reads it.
//
// On 2026-07-25 it silently stopped being valid YAML: a `memory:` block was
// inserted into the middle of the `act2:` node sequence, which orphaned every
// node from `act2_intro` down. Nothing caught it, because nothing ever loaded
// the file as data -- it was only ever read by eye, and by eye it looks fine.
// A spec that cannot be parsed cannot be checked against, which is how the
// same correction ends up applied in one file and stale in four others.
//
// So these tests are deliberately about STRUCTURE, not content. They do not
// police copy, evidence, or voice; those are human calls and live in
// voice-bible.md. They only assert that the spec is machine-readable and
// internally connected, which is the part a human reviewer cannot see.

import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const yaml = require('js-yaml');

const SPEC_PATH = join(__dirname, '..', '..', 'ai-briefs', 'moment-flow.yaml');

type Node = { id?: string; next?: unknown; branches?: unknown };

const loadSpec = () => yaml.load(readFileSync(SPEC_PATH, 'utf8')) as Record<string, unknown>;

// Node ids live in the top-level keys whose value is a sequence (`entry`,
// `naming`, `body`, `lanes`, `act2`, `timing`, `close_phase`). `meta` and
// `memory` are mappings and carry no nodes.
const collectNodes = (spec: Record<string, unknown>): Node[] =>
  Object.values(spec)
    .filter((v): v is Node[] => Array.isArray(v))
    .flat()
    .filter((n): n is Node => !!n && typeof n === 'object');

// `next:` targets appear at the top level of a node and also nested inside
// `branches:` entries, so walk the whole subtree rather than the surface.
const collectNextTargets = (value: unknown, found: string[] = []): string[] => {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    value.forEach((v) => collectNextTargets(v, found));
    return found;
  }
  for (const [key, val] of Object.entries(value)) {
    if (key === 'next' && typeof val === 'string') found.push(val);
    else collectNextTargets(val, found);
  }
  return found;
};

// `close` is the terminal state, not a node, so it is always a legal target.
const TERMINAL = new Set(['close']);

// Nodes that exist in the spec but that nothing routes to.
//
// This list is EMPTY, and the goal is to keep it that way. It exists as a
// pressure valve, not a parking space: an unreachable node is the most
// expensive kind of wrong, because it is written, reviewed and agreed, and she
// still never sees it. Nothing in a read-through reveals one.
//
// Two lived here on 2026-07-25 and are now wired (`intensity_in` off
// `intensity_split`, `body_tired` off `body_reward`). Both were decisions
// written into the prose that never reached the graph.
//
// THIS LIST MUST ONLY EVER SHRINK.
const KNOWN_UNREACHABLE = new Set<string>([]);

describe('moment-flow.yaml', () => {
  it('is valid YAML', () => {
    // If this fails, read the error: js-yaml reports the exact line. The most
    // likely cause is a new top-level key typed at column 0 in the middle of a
    // node sequence, which is exactly what broke it before.
    expect(() => loadSpec()).not.toThrow();
  });

  it('has the expected top-level sections', () => {
    const spec = loadSpec();
    // Guards against a section being swallowed into its neighbour, which is
    // what a stray indent does and what an eye-read will not catch.
    expect(Object.keys(spec).sort()).toEqual(
      ['act2', 'body', 'close_phase', 'entry', 'lanes', 'memory', 'meta', 'naming', 'timing'].sort(),
    );
  });

  it('gives every node an id, and never reuses one', () => {
    const nodes = collectNodes(loadSpec());
    expect(nodes.length).toBeGreaterThan(0);

    const missing = nodes.filter((n) => typeof n.id !== 'string' || n.id.length === 0);
    expect(missing).toEqual([]);

    const ids = nodes.map((n) => n.id as string);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    // A duplicate id means two beats answer to the same name, so a `next:`
    // pointing at it is ambiguous and the flow silently forks.
    expect(duplicates).toEqual([]);
  });

  it('routes every next: target to a node that exists', () => {
    const spec = loadSpec();
    const ids = new Set(collectNodes(spec).map((n) => n.id as string));
    const dangling = [...new Set(collectNextTargets(spec))].filter(
      (t) => !ids.has(t) && !TERMINAL.has(t),
    );
    // A dangling target is a beat she can reach and then fall out of. It reads
    // as complete in the doc because the name looks plausible.
    expect(dangling).toEqual([]);
  });

  it('leaves no NEW node unreachable', () => {
    const spec = loadSpec();
    const nodes = collectNodes(spec);
    const targets = new Set(collectNextTargets(spec));
    // The flow starts at the first node of `entry`; nothing routes INTO it.
    const start = (spec.entry as Node[])[0].id;

    const unreachable = nodes
      .map((n) => n.id as string)
      .filter((id) => !targets.has(id) && id !== start)
      .filter((id) => !KNOWN_UNREACHABLE.has(id));

    // An unreachable node is the most expensive kind of wrong: it is written,
    // reviewed, and agreed, and she never sees it. Nothing in a read-through
    // reveals it, because the prose describes a beat the graph does not connect.
    expect(unreachable).toEqual([]);
  });

  it('keeps the known-unreachable list honest', () => {
    const spec = loadSpec();
    const targets = new Set(collectNextTargets(spec));
    // If a listed node has since been wired up, take it OFF the list rather
    // than leaving a stale exemption that would hide a future regression.
    const nowReachable = [...KNOWN_UNREACHABLE].filter((id) => targets.has(id));
    expect(nowReachable).toEqual([]);
  });
});
