// The AI port: two verbs, and the rules that hold whichever model is behind it.
//
// The provider is meant to be replaced. Gemma is what runs on the phone today;
// a different model, a different runtime, or a server could be behind this
// tomorrow. What must NOT be replaceable is the set of things the app promises
// her, so those live here, above the provider, and every provider inherits them:
//
//   echo   may return only her own words, rearranged. Vetted three ways before
//          it can reach the screen.
//   pick   may only return items from the closed set it was handed. Anything
//          not in that set is discarded, so a provider cannot introduce an
//          option however confidently it writes one.
//
// There is deliberately no `compose`. A provider that could write a new
// sentence about her situation would be able to invent a fact about her life,
// and that is the failure she is least able to catch, because it reads
// plausibly and it is about her.
//
// Every verb may return null, and null is never an error state: it means the
// beat renders its authored line. The flow is complete with no provider at all.

import { echoBlocked, groundedReflection, isGrounded } from '@/lib/ground-floor';

/** What a provider must implement. Nothing here is Gemma-specific. */
export type MomentProvider = {
  /** Free-text generation for one beat. Returns null on any failure. */
  generate(slot: string, herText: string, timeoutMs: number): Promise<string | null>;
  /** Optional: warm the model so the first beat does not pay cold start. */
  prewarm?(): Promise<void>;
  /** Optional: hand memory back when she leaves. */
  release?(): Promise<void>;
  readonly name: string;
};

/** A provider that is simply not there. The flow runs entirely on authored copy. */
export const NO_PROVIDER: MomentProvider = {
  name: 'none',
  async generate() {
    return null;
  },
};

const TIMEOUT_MS = 5000;

export type EchoResult = {
  text: string | null;
  /** How the line was produced. For the dev overlay and for knowing whether the
   *  provider is actually earning its place. */
  via: 'model' | 'carved' | 'authored';
};

/**
 * Say her sentence back to her.
 *
 * Three floors, in order, because "only her own words" is a promise no model's
 * weights can be made to keep:
 *
 *   1. the provider's line, but only if it invents nothing (`isGrounded`) AND
 *      says nothing back that she must never hear from us (`echoBlocked`)
 *   2. the mechanical carve of her own sentence, which cannot invent because it
 *      never generates
 *   3. null, meaning the beat renders its authored line
 *
 * `echoBlocked` runs on the provider's OUTPUT as well as her input, and that is
 * the subtle one: a reply repeating her self-attack is perfectly grounded, since
 * every word came from her. Grounding stops invention. It does not stop
 * agreement, and agreeing with "i am too much" is the worst thing the app can
 * say.
 */
export async function echo(
  provider: MomentProvider,
  slot: string,
  herText: string,
): Promise<EchoResult> {
  const raw = herText.trim();
  if (!raw) return { text: null, via: 'authored' };

  const prose = await provider.generate(slot, raw, TIMEOUT_MS).catch(() => null);
  if (prose && isGrounded(raw, prose) && !echoBlocked(prose)) {
    return { text: prose.trim(), via: 'model' };
  }

  const carved = groundedReflection(raw).text;
  if (carved) return { text: carved, via: 'carved' };

  return { text: null, via: 'authored' };
}

export type PickResult<T> = {
  /** The chosen items, always a subset of `from`, in the provider's order. */
  items: T[];
  via: 'model' | 'authored';
};

/**
 * Rank a closed set. The provider never writes an option, it only orders ones
 * we wrote.
 *
 * This is what makes a safety suppression enforceable. Removing an item from
 * `from` before calling this is an `array.filter`, and a filtered item cannot
 * come back however the provider answers. A suppression that depends on the
 * model choosing correctly is not a suppression, it is a hope.
 *
 * Anything the provider returns that is not in the set is dropped, and if that
 * leaves fewer than `count`, the authored order fills the rest. So the worst a
 * bad provider can do is give her the authored ordering.
 */
export async function pick<T extends { toString(): string }>(
  provider: MomentProvider,
  slot: string,
  herText: string,
  from: readonly T[],
  count: number,
  label: (item: T) => string = (i) => String(i),
): Promise<PickResult<T>> {
  const authored = () => ({ items: from.slice(0, count), via: 'authored' as const });
  if (from.length === 0) return { items: [], via: 'authored' };

  const raw = herText.trim();
  if (!raw) return authored();

  const menu = from.map((i) => label(i)).join('\n');
  const reply = await provider
    .generate(slot, `${raw}\n\noptions:\n${menu}`, TIMEOUT_MS)
    .catch(() => null);
  if (!reply) return authored();

  // Match by containment against the closed set. The provider's prose is only
  // ever used to look items UP; not one character of it reaches the screen.
  const hay = reply.toLowerCase();
  const chosen: T[] = [];
  for (const item of from) {
    const l = label(item).toLowerCase().trim();
    if (l && hay.includes(l) && !chosen.includes(item)) chosen.push(item);
    if (chosen.length === count) break;
  }
  if (chosen.length === 0) return authored();

  // Top up from the authored order so the menu is never short.
  for (const item of from) {
    if (chosen.length >= count) break;
    if (!chosen.includes(item)) chosen.push(item);
  }
  return { items: chosen.slice(0, count), via: 'model' };
}

/**
 * compose is the one verb that writes new sentences: the reframe readings and
 * the act draft. It is allowed ONLY where the output is a draft she reads,
 * judges and edits, never a claim presented as fact. `reframe_small` offers
 * readings she rules true or false; `act_help`/`revise` draft a message she
 * sends by her own tap. There is no grounding floor here on purpose, because
 * these beats are supposed to introduce words she did not write.
 *
 * The caller owns the user turn (her words plus feeling/act/note context). This
 * only forwards it and hands back trimmed text, or null so the beat renders its
 * authored line.
 */
export async function compose(
  provider: MomentProvider,
  slot: string,
  userText: string,
): Promise<string | null> {
  const raw = userText.trim();
  if (!raw) return null;
  const out = await provider.generate(slot, raw, TIMEOUT_MS).catch(() => null);
  return out ? out.trim() : null;
}

/**
 * The reframe beat, as a list. The model returns one reading per line; this
 * strips any bullet/number and caps at three, so the angle cards are never
 * flooded. Returns null (authored `smallReframes`) if nothing usable comes back.
 */
export async function composeReadings(
  provider: MomentProvider,
  userText: string,
): Promise<string[] | null> {
  const out = await compose(provider, 'reframe_small', userText);
  if (!out) return null;
  const lines = out
    .split('\n')
    .map((s) => s.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  return lines.length ? lines : null;
}

/** Draft a way to carry out the chosen act. Null → the authored "when" copy. */
export async function draftAct(
  provider: MomentProvider,
  herText: string,
  feeling: string,
  actLabel: string,
): Promise<string | null> {
  const user = [`she wrote: "${herText.trim()}"`, feeling && `she feels: ${feeling}`, `her move: ${actLabel}`]
    .filter(Boolean)
    .join('\n');
  return compose(provider, 'act_help', user);
}

/** Iterate any AI draft on her note ("softer", "shorter"). Null → keep current. */
export async function revise(
  provider: MomentProvider,
  currentText: string,
  herNote: string,
): Promise<string | null> {
  const user = `current: "${currentText.trim()}"\nher note: "${herNote.trim()}"`;
  return compose(provider, 'revise', user);
}
