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

// Raised 2026-08-15 (Neha reported intermittent "Moon stops working" from India):
// Vertex runs in us-central1, so higher round-trip latency makes the old 5s/12s
// budgets time out intermittently. More headroom absorbs the latency; the 3-attempt
// retry still covers genuine failures. ponytail: fixed budgets, revisit with a
// region move or per-region tuning if it still falls short.
const TIMEOUT_MS = 8000;
// Compose slots (reframe readings, act draft, JSON cards) generate several
// sentences of JSON, noticeably slower than a one-line pick. Give them real
// headroom so a slow-but-fine response is not thrown away; a loading state covers
// the wait.
const COMPOSE_TIMEOUT_MS = 16000;

/**
 * Does her entry name a concrete event, or is it only a mood? (M6.) A vague
 * entry gets one follow-up asking for context, so the reframe has something to
 * work with. Deliberately asymmetric: returns false ONLY on a clear "no", and
 * null on anything unparseable/unavailable, so a failure never over-clarifies
 * (the flow keeps the sense of being heard rather than re-asking her).
 */
export async function hasConcreteEvent(provider: MomentProvider, text: string): Promise<boolean | null> {
  const raw = text.trim();
  if (!raw) return null;
  const out = await provider.generate('has_event', raw, TIMEOUT_MS).catch(() => null);
  if (!out) return null;
  const s = out.trim().toLowerCase();
  if (s.startsWith('no')) return false;
  if (s.startsWith('yes')) return true;
  return null;
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

  // Match by containment against the closed set, ordered by WHERE the model put
  // each item in its reply. This is a ranking beat: the model returns the set
  // reordered, and we must honour that order (Scared before Dismissed), while
  // still only ever returning closed-set items, the provider's prose is used to
  // look items up and order them, never to reach the screen. (Iterating `from`
  // instead would silently ignore the model's ranking and always return the
  // set's own order.)
  const hay = reply.toLowerCase();
  const chosen: T[] = from
    .map((item) => ({ item, at: hay.indexOf(label(item).toLowerCase().trim()) }))
    .filter((x) => x.at >= 0 && label(x.item).trim().length > 0)
    .sort((a, b) => a.at - b.at)
    .map((x) => x.item);
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
  const out = await provider.generate(slot, raw, COMPOSE_TIMEOUT_MS).catch(() => null);
  return out ? out.trim() : null;
}

export type ReframeResult = {
  /** Up to three gentler readings she rules true or false. Empty when there is
   *  nothing to loosen (self-worth attack, diffuse mood, harm). */
  readings: string[];
  /** One open question, seeded into her own text box so she can reach a reading
   *  herself. Empty when readings are empty. */
  selfPrompt: string;
};

/**
 * The reframe beat: gentler readings plus a self-generation prompt. The model
 * returns JSON; this parses it defensively and caps readings at three. Returns
 * null (authored `smallReframes`, no self field) if nothing usable comes back,
 * so a bad reply degrades to the deterministic build.
 */
export async function composeReadings(
  provider: MomentProvider,
  userText: string,
): Promise<ReframeResult | null> {
  const out = await compose(provider, 'reframe_small', userText);
  if (!out) return null;
  try {
    // The model often wraps the JSON in ```json fences or adds a stray newline.
    // Slice from the first "{" to the last "}" so any wrapper is dropped, rather
    // than relying on an exact fence pattern (which fails on the smallest drift).
    const body = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
    const j = JSON.parse(body);
    const readings = Array.isArray(j?.readings)
      ? j.readings.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [];
    const selfPrompt = typeof j?.selfPrompt === 'string' ? j.selfPrompt.trim() : '';
    // Empty readings is a DELIBERATE decline (self-worth attack, diffuse mood,
    // grief, harm), nothing to loosen. This is returned as readings: [], NOT
    // null: the caller skips the reframe beat rather than showing generic
    // small-reframes, which trivialise a serious moment. null is reserved for a
    // real failure (no reply / unparseable), which keeps the authored fallback.
    return { readings, selfPrompt };
  } catch {
    return null;
  }
}

/** Draft a way to carry out the chosen act. Null → the authored "when" copy. */
export async function draftAct(
  provider: MomentProvider,
  herText: string,
  feeling: string,
  actLabel: string,
  cycleNote?: string,
): Promise<string | null> {
  const user = [
    `she wrote: "${herText.trim()}"`,
    feeling && `she feels: ${feeling}`,
    `her move: ${actLabel}`,
    cycleNote,
  ]
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

// Draft slots return one editable line; every other reflect slot is a guess and
// returns a JSON options array. Kept as a set so the verb stays one function.
const REFLECT_DRAFT_SLOTS = new Set(['reflect_friend', 'reflect_pattern']);

/**
 * The reflect cards (v3/reflect-cards.ts). One verb for both card modes:
 *   draft -> { line }    the model's line, or undefined when it declines
 *                        (reflect_pattern replies "none" on no real recurrence)
 *   guess -> { options } up to 3 tappable options, or [] when it declines
 *
 * Uses the same compose plumbing and 12s budget as the reframe. Declines
 * gracefully on timeout / parse-fail (empty result, never throws), so an absent
 * or off provider (NO_PROVIDER) lands on the card's authored copy.
 */
export async function reflectCard(
  provider: MomentProvider,
  slot: string,
  user: string,
): Promise<{ line?: string; options?: string[] }> {
  const draft = REFLECT_DRAFT_SLOTS.has(slot);
  const out = await compose(provider, slot, user);
  if (!out) return draft ? {} : { options: [] };

  if (draft) {
    const line = out.replace(/^["']|["']$/g, '').trim();
    // reflect_pattern declines by replying "none" when nothing genuinely recurs.
    if (!line || /^none\b/i.test(line)) return {};
    return { line };
  }

  // guess: parse the JSON options array the same defensive way composeReadings
  // does (slice first "{" to last "}" so any fence/stray text is dropped).
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const options = Array.isArray(j?.options)
      ? j.options.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [];
    return { options };
  } catch {
    return { options: [] };
  }
}

/**
 * Fact-sort split (reflect_factsort): break her thought into 2-4 claims, each
 * marked fact (observable) or read (her interpretation). Same compose plumbing
 * and budget. Declines to an empty list on timeout / parse-fail / AI-off, so the
 * caller can fall back to the plain question echo.
 */
export async function factSort(
  provider: MomentProvider,
  user: string,
): Promise<{ text: string; fact: boolean }[]> {
  const out = await compose(provider, 'reflect_factsort', user);
  if (!out) return [];
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    if (!Array.isArray(j?.claims)) return [];
    return j.claims
      .map((c: { text?: unknown; fact?: unknown }) => ({
        text: String(c?.text ?? '').trim(),
        fact: c?.fact === true,
      }))
      .filter((c: { text: string }) => c.text.length > 0)
      .slice(0, 4);
  } catch {
    return [];
  }
}

/**
 * The rule breakdown (reflect_rule, a special card like fact-sort). Walks her
 * moment out as a chain she can SEE, event, the hidden rule/should, where it
 * lands, then tests the rule. `tests` are normal reactable reads; the chain is
 * the diagnostic setup. Returns null (decline) if no real rule surfaces or the
 * reply is unusable, so the card falls back to the honest retry like any other.
 */
export type RuleBreakdown = { event: string; rule: string; consequence: string; tests: string[] };
export async function ruleBreakdown(
  provider: MomentProvider,
  user: string,
): Promise<RuleBreakdown | null> {
  const out = await compose(provider, 'reflect_rule', user);
  if (!out) return null;
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const tests = Array.isArray(j?.tests)
      ? j.tests.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 3)
      : [];
    const rule = str(j?.rule);
    // The rule and at least one test are the minimum to render the card; without
    // them there is nothing to see or react to, so decline to the fallback.
    if (!rule || tests.length === 0) return null;
    return { event: str(j?.event), rule, consequence: str(j?.consequence), tests };
  } catch {
    return null;
  }
}

/**
 * The scale card (reflect_scale, 2026-08-20). Builds the ruler, she does the
 * measuring: her own absolute, the word she used, and what the two ends of the
 * scale actually look like in her situation. Returns null when she stated no real
 * absolute (empty claim) or the reply is unusable, so the card declines rather
 * than inventing an extreme to measure against.
 */
export type ScaleSetup = { claim: string; word: string; zero: string; hundred: string };
export async function scaleSetup(
  provider: MomentProvider,
  user: string,
): Promise<ScaleSetup | null> {
  const out = await compose(provider, 'reflect_scale', user);
  if (!out) return null;
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const claim = str(j?.claim);
    const zero = str(j?.zero);
    const hundred = str(j?.hundred);
    // Without both ends there is no scale to place anything on.
    if (!claim || !zero || !hundred) return null;
    return { claim, word: str(j?.word), zero, hundred };
  } catch {
    return null;
  }
}

/**
 * The responsibility card (reflect_responsibility, 2026-08-20). The other hands on
 * the outcome, and her own part named honestly. She allocates to the others and
 * whatever is left is hers, which is the whole mechanism: a share she arrived at
 * rather than one she was handed. Returns null when she is not holding herself
 * responsible for anything, or fewer than two other factors surfaced (with one
 * factor the allocation is not a weighing, it is a see-saw).
 */
// `factors` is deliberately absent (2026-08-20): SHE supplies the hands now. The
// slot no longer generates them either. See the header of
// components/moment/responsibility-card.tsx for the measured reason.
export type ResponsibilitySetup = { outcome: string; hers: string };
export async function responsibilitySetup(
  provider: MomentProvider,
  user: string,
): Promise<ResponsibilitySetup | null> {
  const out = await compose(provider, 'reflect_responsibility', user);
  if (!out) return null;
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const outcome = str(j?.outcome);
    if (!outcome) return null;
    return { outcome, hers: str(j?.hers) };
  } catch {
    return null;
  }
}

/**
 * Reflective chat (reflect_chat): one short reflecting turn in the bounded
 * back-and-forth on the fact-sort result. Empty on decline / AI-off. The caller
 * crisis-guards her message before ever calling this; the slot itself is barred
 * from advice, diagnosis, and medical/money guidance.
 */
export async function reflectChat(provider: MomentProvider, user: string): Promise<string> {
  const out = await compose(provider, 'reflect_chat', user);
  if (!out) return '';
  return out.replace(/^["']|["']$/g, '').trim();
}

/**
 * Fact-sort advice (reflect_factsort_advise): after she sorts, a gentler line per
 * read (in order) and one help line for the facts. Empty on decline.
 */
export async function factSortAdvise(
  provider: MomentProvider,
  user: string,
): Promise<{ reads: string[]; help: string }> {
  const out = await compose(provider, 'reflect_factsort_advise', user);
  if (!out) return { reads: [], help: '' };
  try {
    const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
    const reads = Array.isArray(j?.reads)
      ? j.reads.map((s: unknown) => String(s).trim()).filter(Boolean)
      : [];
    const help = typeof j?.help === 'string' ? j.help.trim() : '';
    return { reads, help };
  } catch {
    return { reads: [], help: '' };
  }
}
