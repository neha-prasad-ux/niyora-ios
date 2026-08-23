// Crisis routing for the Rough moment session. A plain keyword scan, run on
// EVERY user input BEFORE that input reaches any model call or storage -- the
// triggering message never touches the LLM. The same scan runs in
// scripted-only mode.
//
// Tolerance is asymmetric by design: over-triggering is acceptable,
// under-triggering is not. The list targets self-directed harm; venting
// hyperbole about others ("I could kill him") is expected in this domain and
// must NOT trigger -- routing a partner-vent to a crisis screen would teach
// her the feature can't be trusted with the very thing it's for.
//
// Phrases adapted from publicly documented crisis-line indicator language
// (988 Lifeline / Crisis Text Line published materials). Human-curated;
// review before any TestFlight release.

import { Linking } from 'react-native';

const CRISIS_PHRASES = [
  'kill myself',
  'killing myself',
  'suicide',
  'suicidal',
  'end my life',
  'ending my life',
  'take my own life',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'better off without me',
  'no reason to live',
  'nothing to live for',
  'don’t want to be alive',
  'dont want to be alive',
  'do not want to be alive',
  'don’t want to be here anymore',
  'dont want to be here anymore',
  'hurt myself',
  'hurting myself',
  'harm myself',
  'self harm',
  'self-harm',
  'cut myself',
  'cutting myself',
  'end it all',
  'kms',
  // Added 2026-08-12 (crisis audit C-1): concrete self-harm methods the floor
  // missed. Offline / on any AI failure this list is the ONLY net, so these must
  // be here, not left to the model. All self-directed, so over-trigger risk is
  // low. Deliberately NOT adding the audit's "kill me" / "want it to be over":
  // those collide with everyday venting ("this traffic will kill me", "want this
  // day to be over"), and firing the crisis screen on hyperbole is the one thing
  // this file's design forbids (see the venting note above).
  'hang myself',
  'hanging myself',
  'overdose',
  'over dose',
  'od on',
  'take all my pills',
  'all these pills',
  'jump off',
  'jump in front',
  'shoot myself',
  'slit my wrists',
  'slit my wrist',
  'slitting my wrists',
  'slitting my wrist',
  'dont want to wake up',
  'don’t want to wake up',
  'do not want to wake up',
] as const;

// --- physical-abuse disclosure -------------------------------------------
//
// SEPARATE from the crisis (self-harm) scan and it does NOT stop the flow. When
// it fires it does two things (Neha 2026-08-01, "both, tuned to minimise
// disclosure"): (1) removes every option aimed AT the person from the respond
// menu, you never coach someone to confront a person who hits them, and "own
// my part" self-blame is the abuser's own tool, and (2) surfaces a quiet,
// NON-DIAGNOSTIC resource. Nothing here ever says "you are being abused": that
// would be a disclosure on a device someone else may be reading, which in abuse
// is common. The universal DV line (shown to everyone on "say it to them")
// still covers what detection misses.
//
// Tolerance leans toward catching clear PHYSICAL violence. The ambiguous "he
// hurt me" (usually emotional) is deliberately NOT here, and "hit me" is subject-
// gated so "it hit me" / "that hit me" do not fire. [SAFETY] Human-curated;
// review before any TestFlight release.
const ABUSE_PATTERNS: readonly RegExp[] = [
  // a person + a violent verb + me. Subject-gated, so "it hit me" / "that hit
  // me" / "the news hit me" (no person subject) never fire.
  /\b(he|she|they|husband|wife|partner|boyfriend|girlfriend|bf|gf|ex|dad|mum|mom|father|mother|stepdad)\s+(?:\w+\s+){0,3}(hit|hits|hitting|slapped|punched|kicked|choked|strangled|shoved|beats|beat|beaten)\s+me\b/,
  // unambiguous physical violence, bare (low idiom collision)
  /\b(punched|slapped|kicked|choked|strangled|beaten|pinned)\s+me\b/,
  /\bbeat me up\b/,
  /\bput (his|her|their) hands on me\b/,
  /\b(raised (a|his|her) hand (to|at) me|laid a hand on me|lays a hand on me)\b/,
  /\b(he|she) (is|was) (violent|abusive)\b/,
  /\bhes (violent|abusive)\b/,
  // unambiguous; NOT "hits me"/"beats me" bare, those collide with idioms ("it
  // beats me") and are already caught, in a person context, by the first pattern.
  /\b(abuses me|abused me|domestic violence|domestic abuse|being abused)\b/,
];

/** True when the input discloses physical violence by another person. Does NOT
 *  stop the flow: it de-fangs the respond menu and surfaces a quiet resource.
 *  Apostrophes are stripped so "he's violent" reads as "hes violent". */
export function scanForAbuse(text: string): boolean {
  const t = normalize(text).replace(/[’']/g, '');
  return ABUSE_PATTERNS.some((re) => re.test(t));
}

/**
 * [SAFETY] The quiet DV resource, surfaced on the respond step when the abuse
 * scan fires. Worded GENERALLY ("if someone is hurting you"), never as a finding
 * about her. US default; localise before release. Kept beside the scan so the
 * copy and the number can never drift.
 */
export const DV_RESOURCE = {
  intro: 'Support lines for this are free, confidential, and used to exactly this.', // [SAFETY]
  label: 'Text a support line', // [SAFETY] Neha 2026-08-02: text, not a call
  detail: 'Text START to 88788 · National DV Hotline · US, 24/7', // [SAFETY] US line, now labelled (audit M-2)
  // [SAFETY] Non-US fallback (audit M-2). The 88788 short-code is US-only and
  // does nothing on another carrier, so a by-country directory sits beside it,
  // mirroring the findahelpline line in CRISIS_COPY.
  intlLabel: 'Find a line for your country',
  intlDetail: 'findahelpline.com · free, by country',
} as const;

// US National Domestic Violence Hotline. DEFAULTS TO TEXT, not a call (Neha
// 2026-08-02): a call log is a trace an abuser can find on a shared phone, and a
// text to 88788 is the lower-risk contact. Voice line is 1-800-799-7233 if ever
// needed. [SAFETY] US-only; the intl directory below covers everyone else.
export const DV_URL = 'sms:88788&body=START';
// [SAFETY] International fallback (audit M-2): the by-country directory, for a
// user the US short-code cannot reach. Same directory as the crisis screen.
export const DV_INTL_URL = 'https://findahelpline.com';

/** Open the DV support line. Silent on failure, a dead link must not raise a
 *  dialog in front of her. */
export function openDvLine(): void {
  Linking.openURL(DV_URL).catch(() => {});
}

/** Open the international by-country directory (audit M-2). Silent on failure. */
export function openDvIntlLine(): void {
  Linking.openURL(DV_INTL_URL).catch(() => {});
}

/** Lowercase, unify apostrophes, collapse punctuation to spaces. */
function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/['‘`]/g, '’')
    .replace(/[^\p{L}\p{N}’-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

/** True when the input contains self-directed crisis language. */
export function scanForCrisis(text: string): boolean {
  const t = normalize(text);
  return CRISIS_PHRASES.some((p) => {
    const needle = ` ${normalize(p).trim()} `;
    return t.includes(needle);
  });
}

// Static, human-written. Never generated, never routed through the model.
// Quiet tone per DESIGN.md; no exclamation points.
export const CRISIS_COPY = {
  title: 'You deserve a human right now',
  body: 'What you wrote sounds bigger than an app should hold alone. Talking to a person helps, even at this hour.',
  lines: [
    { label: 'Call or text 988', detail: 'Suicide & Crisis Lifeline · US, 24/7' },
    { label: 'Text HOME to 741741', detail: 'Crisis Text Line · US, 24/7' },
    { label: 'findahelpline.com', detail: 'Free support lines, by country' },
  ],
  emergency: 'If you are in immediate danger, call your local emergency number.',
  back: 'No am good, let me rephrase', // [NEHA] 2026-08-02
} as const;

// The three lines' actions, matched to CRISIS_COPY.lines BY ORDER: the 988
// lifeline, the Crisis Text Line, and the by-country directory. Kept next to
// the copy so a line and its number can never drift apart, a resource row
// that dials the wrong place is worse than no row.
// Crisis Text Line only engages when the first message is the keyword HOME; the
// body= prefill fills it so a distressed user does not have to (audit M-4). If an
// iOS build ignores body= the composer still opens to the right number, so this
// only ever helps.
export const CRISIS_URLS = ['tel:988', 'sms:741741&body=HOME', 'https://findahelpline.com'] as const;

/** Open a crisis line by its index in CRISIS_COPY.lines. Silent on failure:
 *  a dead link must not put an error dialog in front of her. */
export function openCrisisLine(index: number): void {
  const url = CRISIS_URLS[index];
  if (url) Linking.openURL(url).catch(() => {});
}

// [SAFETY] Shown INSTEAD of CRISIS_COPY when the AI escalates an acute
// violence/child-harm disclosure (crisisType violence_to_her / child_harmed).
// The 988 suicide screen is the wrong response to "he is hurting me", she needs
// the DV line and a safety framing (audit H-1). Framed around safety, not a
// finding about her. Text-first for the DV line: a call log is a trace an abuser
// can find on a shared phone (same reasoning as DV_URL). Numbers verified US and
// kept here beside the copy so they can never drift.
export const DV_CRISIS_COPY = {
  title: 'Your safety comes first right now',
  body: 'What you wrote sounds frightening, and no app should hold it alone. People trained for exactly this can help, free and confidential.',
  lines: [
    { label: 'Text START to 88788', detail: 'National DV Hotline · US, 24/7' },
    { label: 'Call 1-800-422-4453', detail: 'Childhelp abuse hotline · US, 24/7' },
    { label: 'findahelpline.com', detail: 'Free support lines, by country' },
  ],
  emergency: 'If you or a child is in immediate danger, call 911 or your local emergency number.',
  back: 'No am good, let me rephrase',
} as const;

export const DV_CRISIS_URLS = ['sms:88788&body=START', 'tel:1-800-422-4453', 'https://findahelpline.com'] as const;

/** Open a DV/safety line by its index in DV_CRISIS_COPY.lines. Silent on failure. */
export function openDvCrisisLine(index: number): void {
  const url = DV_CRISIS_URLS[index];
  if (url) Linking.openURL(url).catch(() => {});
}

// [SAFETY] Shown when the AI escalates a NARROW, HIGH-BAR credible intent to harm
// another named person (crisisType harm_to_other): a real plan, the means, or
// immediacy, NEVER venting like "I could kill him". The job is to de-escalate and
// put space between her and the act, never to coach the confrontation. 988 counsels
// thoughts of harming others, not only self-harm. Numbers kept beside the copy so a
// line can never dial the wrong place. (Neha 2026-08-13.)
export const HARM_OTHER_CRISIS_COPY = {
  title: "Let's slow this right down",
  body: "It sounds like you're close to doing something you can't take back. The feeling is real and it's huge, but acting on it now would cost you everything you care about. The strongest thing you can do is put space between you and this, right now. Step away, and talk to a real person before you do anything.",
  lines: [
    { label: 'Call or text 988', detail: 'Crisis Lifeline · for this too, not only self-harm · US, 24/7' },
    { label: 'findahelpline.com', detail: 'Free support lines, by country' },
  ],
  emergency: 'If someone is in immediate danger, call 911 or your local emergency number.',
  back: 'No am good, let me rephrase',
} as const;

export const HARM_OTHER_CRISIS_URLS = ['tel:988', 'https://findahelpline.com'] as const;

/** Open a harm-to-other line by its index in HARM_OTHER_CRISIS_COPY.lines. Silent on failure. */
export function openHarmOtherCrisisLine(index: number): void {
  const url = HARM_OTHER_CRISIS_URLS[index];
  if (url) Linking.openURL(url).catch(() => {});
}
