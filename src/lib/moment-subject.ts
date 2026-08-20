// The thread key for a moment: the person or topic she names (Neha 2026-08-11).
//
// V1 threading is "match only when obvious" — we key a moment by the FIRST clear
// person/topic word in her entry, and a later entry naming the same key continues
// that thread. When she names no clear subject ("she keeps doing this"), we return
// null and the moment starts fresh rather than risk pulling the wrong thread's
// context in (bleeding the mom conversation into a work one is worse than nothing).
//
// ponytail: a lexical map, deliberately shallow. If mis-keying shows up in testing,
// the upgrade is the AI naming the subject — but this needs no call and no history.

// Canonical subject <- the words that map to it. Order matters: more specific
// entries (mother-in-law) sit above the general one (mom) so they win.
const SUBJECTS: [RegExp, string][] = [
  [/\b(mother|father|sister|brother)[-\s]in[-\s]law\b/, 'in-law'],
  [/\b(mom|mum|mummy|mommy|mama|mother)\b/, 'mom'],
  [/\b(dad|daddy|papa|father)\b/, 'dad'],
  [/\b(bro|brother)\b/, 'brother'],
  [/\b(sis|sister)\b/, 'sister'],
  [/\b(husband|hubby)\b/, 'husband'],
  [/\bwife\b/, 'wife'],
  [/\b(boyfriend|bf)\b/, 'boyfriend'],
  [/\b(girlfriend|gf)\b/, 'girlfriend'],
  [/\bpartner\b/, 'partner'],
  [/\b(boss|manager|supervisor)\b/, 'boss'],
  [/\b(work|job|office|colleague|coworker|co-worker|career)\b/, 'work'],
  [/\b(friend|bestie|bff|mate|buddy)\b/, 'friend'],
  [/\b(son|daughter|kid|kids|child)\b/, 'kids'],
  [/\b(ex|ex-)\b/, 'ex'],
];

/** The canonical subject she's talking about, or null when she named none clearly. */
export function subjectOf(text: string): string | null {
  const t = (text || '').toLowerCase();
  for (const [rx, key] of SUBJECTS) if (rx.test(t)) return key;
  return null;
}

// An explicit "I'm continuing something" signal. On its own it says she means to
// pick up a past thread but NOT which one — so it only resolves a thread when the
// subject is named OR exactly one recent thread exists (see pickSubject).
const CONTINUATION =
  /\b(before|again|last time|earlier|the other day|like i (said|mentioned|told you)|as i (said|mentioned)|remember (when|how|i)|still (going on|happening)|update on)\b/i;

export function hasContinuationCue(text: string): boolean {
  return CONTINUATION.test(text || '');
}

/**
 * Which stored thread this entry continues, or null to start fresh (Neha 2026-08-11,
 * "match only when obvious"). `recentSubjects` is the distinct subject keys of her
 * recent moments, newest first.
 *   - She names a subject that has a stored thread  -> that subject.
 *   - She signals continuation ("before") but names none -> the single recent
 *     thread if there's exactly one; otherwise null (can't guess between several).
 *   - Otherwise null.
 */
export function pickSubject(text: string, recentSubjects: readonly string[]): string | null {
  const named = subjectOf(text);
  if (named) return recentSubjects.includes(named) ? named : null;
  if (hasContinuationCue(text) && recentSubjects.length === 1) return recentSubjects[0];
  return null;
}
