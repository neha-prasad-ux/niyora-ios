import AsyncStorage from '@react-native-async-storage/async-storage';

import { decrypt, encrypt } from '@/lib/secure-box';
import { withStoreLock } from '@/store/storage-lock';
import type { ReflectCardId } from '@/v3/reflect-cards';
import type { PointReactions, Reaction } from '@/v3/reflect-feedback';

// What lands for HER, remembered across sessions (Neha 2026-08-19).
//
// reflect-feedback.ts holds her hearts and crosses for the CURRENT flow only:
// useState in moment.tsx, gone the moment she closes it. feedbackClause steers
// this session, then the knowledge dies. This store is the durable half: the
// same reactions, kept on device, folded into one small clause the next
// session's prompts can read. A chat window can never learn what a plain outside
// reason does for her and what "what your feeling is pointing to" does not.
// This can.
//
// Two hard rules shape everything below:
//   1. NEVER fabricate. Three reactions ever means we say only what three
//      reactions support, hedged accordingly. No lean is claimed off one tap.
//   2. Never a dossier. The clause is a lean about the SHAPE of reads plus a
//      couple of her own hearts verbatim. No counts, no dates, no subject list,
//      and the model is told not to mention it back to her. A summary that reads
//      like surveillance is a product failure even when it is accurate.
//
// Privacy: on device only, and the read TEXT is encrypted at rest through
// secure-box (Keychain AES key), the same treatment moment-history gives her
// entry. A read quotes her situation back at her, so it is her inner life, not
// telemetry. Nothing here is ever uploaded. Only the derived clause leaves the
// device, inside the existing PII-scrubbed callGemini path.
//
// ponytail: plain list + a cap + a linear scan, exactly like moment-history. No
// index, no rollup counters. Upgrade when the cap stops being the bound (it is
// 300 records, so the scan is bounded by definition).

export type ReflectReaction = {
  /** ISO timestamp of the moment this reaction was saved with. */
  at: string;
  /** The lens the read came from: a ReflectCardId, or 'chat'/'rule-demand'. */
  card: string;
  /** The read itself. Encrypted at rest, plaintext to callers. */
  text: string;
  reaction: Reaction;
  /** The feeling she had named in that moment, e.g. "Hurt". */
  feeling: string;
  /** The thread key (person/topic) when she named one, from moment-subject. */
  subject?: string;
};

const STORAGE_KEY = 'niyora:reflect-memory';
// Same judgment as moment-history's 300: enough history that a lean is real,
// small enough that a full read is trivial. Reactions accrue faster than moments
// (a handful per flow), so 300 is roughly her last 50 to 80 moments. That is the
// right window anyway: what landed a year ago is not who she is now.
const CAP = 300;

/** A short phrase naming the KIND of read a lens produces, for the prompt. Card
 *  ids ("whose_weight") mean nothing to the model, the shape of the read does.
 *  Typed as a full Record on purpose: adding a reflect card breaks the build here
 *  until someone decides how that lens should be described. */
const LENS: Record<ReflectCardId | 'chat' | 'rule-demand', string> = {
  friend: 'what she would say to a friend in the same spot',
  simpler: 'a plainer outside reason for what happened',
  also_true: 'other endings that are also possible',
  fact_or_fear: 'separating what is fact from what her mind is prepping for',
  middle: 'the middle ground between two extremes',
  whose_weight: 'what is hers to act on and what is not',
  know_or_guess: 'separating what she knows from what she is guessing',
  need: 'what she needs underneath it',
  rule: 'the rigid rule or "should" under the upset',
  'rule-demand': 'the rigid rule or "should" under the upset',
  shame: 'a thing she did, not a verdict on who she is',
  signal: 'what the feeling is pointing to',
  load: 'laying out everything that is on her',
  pattern: 'a repeat across what she has brought here before',
  chat: 'a short reflective reply in conversation',
};

/** The card id out of a reaction key. reactionKey builds `${scope}#${index}` and
 *  every scope is `${cardId}:${generation}`, so the card is the head of both. */
function cardOfKey(key: string): string {
  return key.split('#')[0].split(':')[0];
}

export function parseReflectReactions(raw: string | null): ReflectReaction[] {
  if (!raw) return [];
  try {
    const p: unknown = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter(
      (r): r is ReflectReaction =>
        r != null &&
        typeof r.at === 'string' &&
        typeof r.card === 'string' &&
        typeof r.text === 'string' &&
        r.text.length > 0 &&
        (r.reaction === 'like' || r.reaction === 'reject') &&
        typeof r.feeling === 'string',
    );
  } catch {
    return [];
  }
}

/** Every remembered reaction, newest-first, text decrypted. [] on any failure. */
export async function getReflectReactions(): Promise<ReflectReaction[]> {
  try {
    const parsed = parseReflectReactions(await AsyncStorage.getItem(STORAGE_KEY));
    return await Promise.all(parsed.map(async (r) => ({ ...r, text: await decrypt(r.text) })));
  } catch {
    return [];
  }
}

/**
 * Persist this session's hearts and crosses. Call it once when the moment is
 * done (beside persistMoment), handing over the same PointReactions map the flow
 * already holds. The card is derived from the map's own keys, so there is no
 * extra wiring per tap.
 *
 * Same (card, text) seen again replaces the older record: her latest opinion on
 * a read wins, and calling this twice in one session cannot inflate a lean.
 * Fire-and-forget, swallows its own failures. Nothing here is worth an error
 * path in her flow.
 */
export async function rememberReactions(
  map: PointReactions,
  ctx: { feeling: string; subject?: string; at?: string },
): Promise<void> {
  const entries = Object.entries(map ?? {});
  if (entries.length === 0) return;
  const at = ctx.at ?? new Date().toISOString();
  const fresh: ReflectReaction[] = [];
  for (const [key, v] of entries) {
    const text = v?.text?.trim();
    if (!text || (v.reaction !== 'like' && v.reaction !== 'reject')) continue;
    fresh.push({
      at,
      card: cardOfKey(key),
      text,
      reaction: v.reaction,
      feeling: ctx.feeling ?? '',
      ...(ctx.subject ? { subject: ctx.subject } : {}),
    });
  }
  if (fresh.length === 0) return;
  try {
    await withStoreLock(STORAGE_KEY, async () => {
      const existing = await getReflectReactions(); // plaintext (decrypted on read)
      const seen = new Set(fresh.map((r) => `${r.card} ${r.text}`));
      const merged = [...fresh, ...existing.filter((r) => !seen.has(`${r.card} ${r.text}`))].slice(
        0,
        CAP,
      );
      // Re-encrypt the whole list on write: `existing` came back plaintext, so
      // this both protects the new records and upgrades any legacy ones.
      const stored = await Promise.all(
        merged.map(async (r) => ({ ...r, text: await encrypt(r.text) })),
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    });
  } catch {
    // Losing a reaction is invisible to her. Failing her flow is not.
  }
}

// --- The derived picture -----------------------------------------------------

/** A lens she leans toward or away from, with the evidence behind it. */
export type LensLean = { lens: string; n: number };

export type ReflectMemory = {
  /** Reactions the picture is drawn from. 0 = a new user, say nothing. */
  total: number;
  /** Lens shapes she keeps, strongest evidence first. */
  keeps: LensLean[];
  /** Lens shapes she turns down, strongest evidence first. */
  turnDowns: LensLean[];
  /** Her own hearts, verbatim, newest-first. The most honest signal we have. */
  liked: string[];
  /** A read she crossed, verbatim. One is enough to mark the edge. */
  rejected: string[];
  /** 'short' = the reads she keeps are markedly shorter than the ones she does
   *  not, 'long' = the reverse. null until there is enough of both to tell. */
  shape: 'short' | 'long' | null;
};

export const EMPTY_REFLECT_MEMORY: ReflectMemory = {
  total: 0,
  keeps: [],
  turnDowns: [],
  liked: [],
  rejected: [],
  shape: null,
};

// A lens needs this many reactions before we claim anything about it, and this
// share of them pointing one way. Three taps, two of which agree, is the floor at
// which "she leans" is a fair sentence. Below it we say nothing at all.
const MIN_LENS = 3;
const LEAN = 2 / 3;
// Two of each keeps the clause a couple of lines. This rides on EVERY reflect
// call, so a third lens costs tokens on every generation for a weaker signal.
const MAX_LENSES = 2;
const MAX_LIKED = 2;
const MAX_REJECTED = 1;
// Length shape needs real mass on both sides before it is anything but noise.
const MIN_SHAPE = 5;
const SHAPE_GAP = 1.25;
/** Reads are 1 to 2 sentences by design, anything past this is quoted trimmed. */
const QUOTE_MAX = 160;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/** Newest-first, deduped by text, capped, trimmed to a quotable length. */
function examples(rs: readonly ReflectReaction[], want: Reaction, max: number): string[] {
  const out: string[] = [];
  for (const r of rs) {
    if (r.reaction !== want) continue;
    const t = r.text.length > QUOTE_MAX ? r.text.slice(0, QUOTE_MAX).trimEnd() + '...' : r.text;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length === max) break;
  }
  return out;
}

/**
 * The durable picture, derived on read. Everything here is gated on evidence:
 * with two reactions ever she gets two quotes and no claims, which is exactly
 * what two reactions support.
 *
 * ponytail: not filtered by subject, even though `subject` is stored. What lands
 * for her is a property of her, not of the thread, and moment.tsx already sends
 * the thread's own history via threadPreamble/pastThemes. Add a subject filter
 * only if a per-thread lean turns out to differ from her overall one.
 */
export function summariseReflectMemory(rs: readonly ReflectReaction[]): ReflectMemory {
  if (rs.length === 0) return EMPTY_REFLECT_MEMORY;
  // Tally by lens PHRASE, not card id, so the two rule scopes count as one lens.
  const by = new Map<string, { likes: number; rejects: number }>();
  for (const r of rs) {
    const lens = LENS[r.card as keyof typeof LENS];
    if (!lens) continue; // an unknown or renamed card proves nothing: drop it
    const t = by.get(lens) ?? { likes: 0, rejects: 0 };
    if (r.reaction === 'like') t.likes++;
    else t.rejects++;
    by.set(lens, t);
  }
  const keeps: LensLean[] = [];
  const turnDowns: LensLean[] = [];
  for (const [lens, t] of by) {
    const n = t.likes + t.rejects;
    if (n < MIN_LENS) continue;
    if (t.likes / n >= LEAN) keeps.push({ lens, n });
    else if (t.rejects / n >= LEAN) turnDowns.push({ lens, n });
  }
  const strongest = (a: LensLean, b: LensLean) => b.n - a.n;
  keeps.sort(strongest);
  turnDowns.sort(strongest);

  const likedLen = rs.filter((r) => r.reaction === 'like').map((r) => r.text.length);
  const rejectedLen = rs.filter((r) => r.reaction === 'reject').map((r) => r.text.length);
  let shape: ReflectMemory['shape'] = null;
  if (likedLen.length >= MIN_SHAPE && rejectedLen.length >= MIN_SHAPE) {
    const ml = median(likedLen);
    const mr = median(rejectedLen);
    if (ml * SHAPE_GAP <= mr) shape = 'short';
    else if (mr * SHAPE_GAP <= ml) shape = 'long';
  }

  return {
    total: rs.length,
    keeps: keeps.slice(0, MAX_LENSES),
    turnDowns: turnDowns.slice(0, MAX_LENSES),
    liked: examples(rs, 'like', MAX_LIKED),
    rejected: examples(rs, 'reject', MAX_REJECTED),
    shape,
  };
}

/** How hard we are allowed to say it, from the evidence behind that one claim. */
function hedge(n: number): string {
  return n >= 8 ? 'consistently' : 'usually';
}

/**
 * The prompt clause, same contract as feedbackClause: '' when there is nothing
 * honest to say, so a new user sends no clause at all and the flow is complete
 * with no memory. This sits alongside feedbackClause, which covers THIS session.
 * This one is explicitly framed as earlier moments so the model does not read the
 * two as one list.
 */
export function reflectMemoryClause(mem: ReflectMemory): string {
  const parts: string[] = [];
  const lensList = (xs: LensLean[]) => xs.map((x) => x.lens).join('; ');
  const quote = (xs: string[]) => xs.map((s) => `"${s}"`).join(', ');
  // Her reads end in their own punctuation, so a quote list that already closed a
  // sentence does not get a second full stop bolted on. The model copies the
  // punctuation it is fed.
  const stop = (s: string) => (/[.!?]"$/.test(s) ? s : s + '.');
  if (mem.keeps.length) {
    const h = hedge(Math.min(...mem.keeps.map((k) => k.n)));
    parts.push(`Reads like this ${h} land for her: ${lensList(mem.keeps)}.`);
  }
  if (mem.turnDowns.length) {
    const h = hedge(Math.min(...mem.turnDowns.map((k) => k.n)));
    parts.push(`Reads like this ${h} do not: ${lensList(mem.turnDowns)}.`);
  }
  if (mem.liked.length) parts.push(stop(`She kept ${quote(mem.liked)}`));
  if (mem.rejected.length) parts.push(stop(`She turned down ${quote(mem.rejected)}`));
  if (mem.shape === 'short') parts.push('Short, plain reads land better with her than long ones.');
  if (mem.shape === 'long') parts.push('She keeps the fuller reads, the very short ones slide off.');
  if (parts.length === 0) return '';
  parts.push(
    'This is a lean from earlier moments, not a rule. Never mention it to her, never say you remember anything, and still bring a genuinely new angle.',
  );
  return '\nFrom her earlier moments, not this one: ' + parts.join(' ');
}

/** Load, summarise, and build the clause in one call: what moment.tsx awaits once
 *  at send() and folds into the prompts. '' on anything going wrong. */
export async function loadReflectMemoryClause(): Promise<string> {
  try {
    return reflectMemoryClause(summariseReflectMemory(await getReflectReactions()));
  } catch {
    return '';
  }
}
