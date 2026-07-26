/**
 * The template floor: a reflection built from her own words, by construction.
 *
 * WHY THIS EXISTS
 * ---------------
 * The fine-tuned model reaches roughly 54% on `ground.no_invention`, meaning
 * about half of its replies contain a detail she never said. Measured examples:
 *
 *   she wrote "left on read for a day lol"
 *   model     "so you sent him a text on saturday and it's been a day of nothing"
 *
 * There was no text, no Saturday, no "him". For a tool whose promise is saying
 * her own words back, that is the worst failure available, and it is the one
 * she is least able to catch: it reads plausibly and it is about her own life.
 *
 * Fine-tuning shifts probabilities. It cannot impose "only use words she said".
 * So this does not try. It CARVES a clause out of her text and flips the person,
 * which cannot invent because it never generates.
 *
 * This is the same principle the spec already applies to the if-then
 * (`moment-flow.yaml` change 00c): seed the trigger from her own sentence so
 * the facts are correct BY CONSTRUCTION, and let the model offer options,
 * never facts.
 *
 * WHERE TO USE IT
 * ---------------
 *   1. As the fallback when the model is unavailable, times out, or its output
 *      fails the grounding check. The flow already requires every AI line to
 *      have a scripted fallback; for reflect beats this is that fallback.
 *   2. As the FACTS half of a DRAFT node, with the model supplying only warmth
 *      around a spine it did not author.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not warm. It is correct. A model reply that passes the check is better
 * writing; this is what you ship when it does not. Measured on the corpus, the
 * mechanical version scores 100% on grounding and reads noticeably flatter, so
 * prefer the model and fall back to this.
 */

/** Words that may appear in a reflection without being "hers". */
const CONNECTIVE = new Set([
  'so', 'and', 'then', 'now', 'that', 'this', 'it', 'is', 'was', 'been',
  'you', 'your', "you're", "you've", 'he', 'she', 'they', 'him', 'her',
  'them', 'his', 'their', 'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at',
  'for', 'with', 'about', 'not', "didn't", "hasn't", "isn't", "wasn't",
]);

/** First person to second person. Order matters: longest first. */
const FLIPS: Array<[RegExp, string]> = [
  [/\bi'm\b/gi, "you're"],
  [/\bi've\b/gi, "you've"],
  [/\bi'd\b/gi, "you'd"],
  [/\bi'll\b/gi, "you'll"],
  [/\bmyself\b/gi, 'yourself'],
  [/\bmine\b/gi, 'yours'],
  [/\bmy\b/gi, 'your'],
  [/\bme\b/gi, 'you'],
  [/\bi\b/gi, 'you'],
];

/**
 * Verbs that need agreement after "I" becomes "you".
 * "i was" -> "you were", not "you was".
 */
const AGREEMENT: Array<[RegExp, string]> = [
  [/\byou was\b/gi, 'you were'],
  [/\byou am\b/gi, "you're"],
  [/\byou is\b/gi, "you're"],
  [/\byou has\b/gi, 'you have'],
  [/\byou wasn't\b/gi, "you weren't"],
];

/** Her own self-attack must never be repeated back to her. Voice bible. */
const NO_ECHO =
  /\b(stupid|pathetic|insane|crazy|psycho|idiot|worthless|dramatic|"?overreacting"?)\b/i;

/** Her read of someone else's intent. Flow rule 07: never echo it. */
const ATTRIBUTION =
  /\b(pulling away|losing interest|doesn'?t care|hates? (me|you)|done with (me|you)|never cared|thinks (i'?m|you'?re))\b/i;

export interface GroundedReflection {
  /** The reflection, or null when her text offers nothing safe to carve. */
  text: string | null;
  /** Why it declined, for logging. Never shown to her. */
  reason?: 'too-short' | 'no-clause' | 'self-attack' | 'attribution';
}

/**
 * Split into clauses on punctuation and the connectives people actually type.
 * Deliberately conservative: a wrong split produces a sentence fragment, and a
 * fragment in the moon's mouth reads worse than a shorter true reflection.
 */
function clauses(text: string): string[] {
  return text
    .split(/[.!?;\n]+|,\s+(?=and\b|but\b|then\b|so\b)|\s+(?:and then|but then)\s+/i)
    .map((c) => c.trim())
    .filter((c) => c.split(/\s+/).length >= 3);
}

function flipPerson(clause: string): string {
  let out = clause;
  for (const [re, to] of FLIPS) out = out.replace(re, to);
  for (const [re, to] of AGREEMENT) out = out.replace(re, to);
  return out;
}

/**
 * Build a reflection from her own words.
 *
 * Returns null rather than guessing. A declined reflection costs one beat; an
 * invented one costs her trust in everything the app has said.
 */
export function groundedReflection(herText: string): GroundedReflection {
  const raw = (herText || '').trim();
  if (raw.split(/\s+/).length < 4) return { text: null, reason: 'too-short' };

  const candidates = clauses(raw);
  if (candidates.length === 0) return { text: null, reason: 'no-clause' };

  // Prefer the first clause that describes something, not how she judges it.
  for (const c of candidates) {
    if (NO_ECHO.test(c)) continue;
    if (ATTRIBUTION.test(c)) continue;

    const flipped = flipPerson(c)
      .replace(/\s+/g, ' ')
      .replace(/^[,\s]+/, '')
      .trim()
      .toLowerCase();

    if (flipped.split(/\s+/).length < 3) continue;

    return { text: `so, ${flipped}.` };
  }

  // Everything she wrote was self-attack or an attribution about someone else.
  // Both are things the flow forbids repeating, so there is nothing to reflect.
  const blocked = candidates.some((c) => NO_ECHO.test(c));
  return { text: null, reason: blocked ? 'self-attack' : 'attribution' };
}

/**
 * Does a model reply stay inside what she said?
 *
 * Mirrors `ground.no_invention` from the training graders so the runtime check
 * and the training metric cannot drift apart. Use it to decide whether to ship
 * the model's reply or fall back to `groundedReflection`.
 */
export function isGrounded(herText: string, reply: string, budget = 2): boolean {
  const words = (s: string) => (s.toLowerCase().match(/[a-z']+/g) ?? []);
  const hers = new Set(words(herText));
  const prefixes = new Set(
    [...hers].filter((w) => w.length >= 4).map((w) => w.slice(0, 4)),
  );

  const novel = words(reply).filter(
    (w) =>
      w.length >= 4 &&
      !CONNECTIVE.has(w) &&
      !hers.has(w) &&
      !prefixes.has(w.slice(0, 4)),
  );
  return novel.length <= budget;
}
