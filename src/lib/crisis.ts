// The safety layer's data and the content-exit detector. Crisis paths never
// route into an activity, reflection, or reframe: they go straight here.
//
// v2.0 resource: a button out to Find A Helpline (ThroughLine), which detects
// the visitor's country itself, plus an offline emergency-number fallback line.
// NOTE: confirm ThroughLine's terms before shipping (the one open scope item).

// Find A Helpline auto-detects country from the visitor, so one URL works
// worldwide without us collecting or sending any location.
export const FIND_A_HELPLINE_URL = 'https://findahelpline.com';

// Shown inline so there is always something even with no connection.
export const EMERGENCY_FALLBACK =
  'If you are in immediate danger, call your local emergency number now (for example 911, 999, or 112).';

// Self-harm-adjacent phrases. Deliberately broad: we would rather route a
// false positive to real support than miss someone. Matched case-insensitively
// against the reflection text. Not a clinical tool, just a safety net.
const CRISIS_PHRASES: readonly string[] = [
  'kill myself',
  'killing myself',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'end my life',
  'end it all',
  'take my life',
  'suicide',
  'suicidal',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'cut myself',
  'no reason to live',
  "don't want to be here",
  'dont want to be here',
  "can't go on",
  'cant go on',
  "don't want to live",
  'dont want to live',
];

// True when the text contains a self-harm-adjacent phrase. Such input routes
// straight to the crisis resource, never to a reframe.
export function looksLikeCrisisText(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return CRISIS_PHRASES.some((p) => t.includes(p));
}
