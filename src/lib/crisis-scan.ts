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
] as const;

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
  back: 'Back to what you were writing',
} as const;
