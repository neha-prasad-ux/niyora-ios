// Client-side PII scrub for the one place her words leave the device: callGemini.
// Those calls go straight from the phone to Google, so email and phone numbers
// get swapped for neutral stand-ins before send and swapped back in the reply.
// Names are scrubbed ONLY when a relation or title makes them a person for sure
// ("my sister Jess", "Dr Patel"), never a bare capitalised word, because
// over-redacting is what breaks the model's grounding: it must keep relations and
// pronouns to reflect her story back. scrub() is fully reversible via restore(),
// which puts her real words back into whatever the model wrote.
//
// ponytail: precise, not exhaustive. Bare standalone names ("Sarah slapped me")
// pass through on purpose. True NER (Presidio/spaCy) needs a backend proxy on
// every call; this ships on-device today and biases to under-redact to protect
// grounding. Upgrade path: a first-name gazetteer for standalone names, or move
// callGemini behind a server running Presidio.

// A relation or title marks the next capitalised word as a person's name.
const CUE = [
  'mom', 'mum', 'mother', 'grandmother', 'dad', 'father', 'grandfather', 'sister',
  'brother', 'son', 'daughter', 'husband', 'wife', 'partner', 'boyfriend',
  'girlfriend', 'fiance', 'fiancé', 'fiancée', 'friend', 'bestie', 'bff', 'boss',
  'manager', 'coworker', 'colleague', 'neighbour', 'neighbor', 'aunt', 'auntie',
  'uncle', 'cousin', 'grandma', 'grandpa', 'granny', 'nana', 'roommate', 'flatmate',
  'ex', 'doctor', 'therapist', 'teacher', 'niece', 'nephew',
  'dr', 'mr', 'mrs', 'ms', 'prof', 'sir', // no "miss": it is far more often the verb ("I miss Boston")
];

// Capitalised words that follow a cue but are never a person's name.
const NOT_A_NAME = new Set([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'Today', 'Tonight', 'Tomorrow', 'Yesterday', 'Home', 'Spring', 'Summer', 'Autumn',
  'Fall', 'Winter', 'Christmas', 'Easter', 'Thanksgiving', 'Halloween', 'God', 'Nature',
  // States/adjectives that can follow "I'm" and get capitalised at a sentence
  // start, never a name, so the self-intro cue below must not scrub them.
  'Fine', 'Okay', 'Ok', 'Sorry', 'Done', 'Good', 'Great', 'Bad', 'Sad', 'Happy',
  'Tired', 'Angry', 'Anxious', 'Upset', 'Exhausted', 'Overwhelmed', 'Nervous',
  'Worried', 'Sick', 'Late', 'Back', 'Here', 'Ready', 'Free', 'Busy', 'Scared',
  'Numb', 'Lonely', 'Stressed', 'Alright', 'Confused', 'Frustrated', 'Hurt',
  'Ashamed', 'Guilty', 'Drained', 'Fed', 'Done', 'Sure', 'Not', 'So', 'Just',
]);

// First names that are also everyday words. Scrubbing them risks clobbering the
// ordinary sense ("my brother Will ... Will he come?"), so we leave them: a common
// English word is the lowest-identifiability leak, and grounding matters more.
const AMBIGUOUS = new Set([
  'Will', 'Mark', 'Rose', 'Hope', 'Faith', 'Grace', 'Joy', 'Dawn', 'Ray', 'Bill',
  'Pat', 'Angel', 'Sunny', 'April', 'May', 'June',
]);

// Neutral stand-ins the model reads as ordinary names; we swap the real name back
// on the way out. Same real name maps to the same stand-in per call so the model's
// he/she coreference still lines up.
const NAME_POOL = ['Robin', 'Alex', 'Sam', 'Jamie', 'Casey', 'Morgan', 'Riley', 'Jordan', 'Taylor', 'Quinn', 'Devon', 'Reese'];

const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
// A run of digits with optional +, spaces, dashes, dots, parens between them. The
// digit-count guard (in the callback) keeps only real phone lengths, so ISO dates
// (2024-01-15), year ranges, and zip+4 fall through untouched.
const PHONE = /\+?\d(?:[\d\s().-]{5,17})\d/g;
// An optional possessive ("my"), a cue word, an optional appositive separator
// (space, dot for "Dr.", comma/dash for "my sister, Jess"), then a capitalised
// name. Case-insensitive so the cue can start a sentence; the name's
// capitalisation is re-checked below.
const NAME_CUE = new RegExp(
  `\\b(?:(?:my|our|your|his|her|their)\\s+)?(?:${CUE.join('|')})[.,:;\\s–—-]*\\s([A-Za-z][a-z]+)`,
  'gi',
);
// Self-introductions (Neha 2026-08-11): "my name is Neha", "name's Neha",
// "I'm Neha", "I am Neha". A capital is still required and the state words in
// NOT_A_NAME are skipped, so "I'm tired" / "I'm Fine" never scrub.
const NAME_IS = /\b(?:my |our |the )?names?(?:\s+is|\s+are|'?s)\s+([A-Za-z][a-z]+)/gi;
const IM_NAME = /\bi(?:'?m|\s+am)\s+([A-Za-z][a-z]+)/gi;

export type Scrubbed = { text: string; restore: (out: string) => string };

/** Replace email, phone, and cued names with reversible stand-ins. restore(out)
 *  turns the model's reply back into her real words. */
export function scrub(input: string): Scrubbed {
  const back = new Map<string, string>(); // stand-in -> original, undone on the reply
  const nameMap = new Map<string, string>(); // real name -> stand-in, stable within a call
  const pool = NAME_POOL.filter((p) => !new RegExp(`\\b${p}\\b`).test(input)); // don't reuse a word she wrote
  let phoneN = 0;
  let emailN = 0;

  const placeName = (real: string): string => {
    let ph = nameMap.get(real);
    if (!ph) {
      ph = pool.shift() ?? `Person${nameMap.size + 1}`;
      nameMap.set(real, ph);
      back.set(ph, real);
    }
    return ph;
  };

  // Shared guard: a match's trailing capitalised word becomes a stand-in only if
  // it's a real name, a genuine capital, not ALL-CAPS, not a day/month/state word.
  const swapTrailingName = (m: string, name: string): string => {
    if (
      name[0] !== name[0].toUpperCase() ||
      name === name.toUpperCase() ||
      NOT_A_NAME.has(name) ||
      AMBIGUOUS.has(name)
    )
      return m;
    return m.slice(0, m.length - name.length) + placeName(name);
  };

  let text = input.replace(NAME_CUE, swapTrailingName);
  // Then her own name from a self-introduction ("my name is Neha", "I'm Neha").
  text = text.replace(NAME_IS, swapTrailingName);
  text = text.replace(IM_NAME, swapTrailingName);

  // A cue proved these are people, so scrub their later bare mentions too
  // ("my sister Jess ... then Jess left"): stops the leak and keeps coreference.
  for (const [real, ph] of nameMap) {
    text = text.replace(new RegExp(`\\b${real}\\b`, 'g'), ph);
  }

  text = text.replace(EMAIL, (m) => {
    const ph = `person${++emailN}@example.com`;
    back.set(ph, m);
    return ph;
  });

  text = text.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return m; // a date, year range, or count, not a phone
    const ph = `55501${String(++phoneN).padStart(2, '0')}`;
    back.set(ph, m);
    return ph;
  });

  const restore = (out: string): string => {
    let r = out;
    for (const [ph, real] of back) {
      r = r.replace(new RegExp(`\\b${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), real);
    }
    return r;
  };
  return { text, restore };
}

/** One-way scrub for the therapist export. Not scrub(): that one swaps real
 *  names for other *realistic* names (Robin, Alex, Sam) so Gemini keeps its
 *  coreference, and swaps them back on the reply. In a document a clinician
 *  reads, a plausible fake name is worse than no name, they would take "Sam" for
 *  a real person. So here the name is dropped and the relation kept, which is
 *  also the only part that carries clinical meaning: "my sister Jess" -> "my
 *  sister". Later bare mentions of a name a cue already proved become "they",
 *  because a leaked name matters more than a bumpy sentence, and she edits the
 *  document before it leaves the phone anyway.
 *
 *  Her OWN name is left alone: this is her document about herself, handed over
 *  by her, so the self-introduction cues scrub() uses are skipped here.
 *
 *  ponytail: inherits scrub()'s deliberate under-redaction (a bare standalone
 *  name with no cue still passes). Her review pass is the backstop. Upgrade path
 *  is the same first-name gazetteer noted at the top of this file. */
export function scrubForExport(input: string): string {
  const dropped = new Set<string>();

  const dropTrailingName = (m: string, name: string): string => {
    if (
      name[0] !== name[0].toUpperCase() ||
      name === name.toUpperCase() ||
      NOT_A_NAME.has(name) ||
      AMBIGUOUS.has(name)
    )
      return m;
    dropped.add(name);
    return m.slice(0, m.length - name.length).replace(/[.,:;\s–—-]+$/, '');
  };

  let text = input.replace(NAME_CUE, dropTrailingName);
  for (const name of dropped) {
    text = text.replace(new RegExp(`\\b${name}\\b`, 'g'), 'they');
  }

  text = text.replace(EMAIL, '[email]');
  text = text.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length < 10 || digits.length > 15 ? m : '[phone]'; // else it is a date or a count
  });

  return text;
}
