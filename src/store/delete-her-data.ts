import AsyncStorage from '@react-native-async-storage/async-storage';

// Deleting what she has written (2026-08-19).
//
// The privacy policy already makes this promise, twice: "You can delete your
// history from within the app" and "You can delete your moment history in the app
// at any time" (docs/privacy-policy.md). Until now nothing in the app could do it.
// This is the mechanism behind that sentence, so the policy stops being a claim we
// cannot honour.
//
// TWO GROUPS, and the split is the whole design decision here.
//
// CONTENT is everything she put into the app, or that the app inferred about her:
// what she wrote, how she felt, her cycle, her body, what she worked through. It
// goes. That is what "delete my history" means to a person, and it is what the
// policy sentence is about.
//
// SETTINGS is how the app is set up for her: whether she has onboarded, her
// reminder, her music choice, hints she has dismissed, and her AI consent. It
// STAYS. Deleting her diary should not dump her back into onboarding as if she
// were a stranger, and it must never silently re-ask (or worse, re-grant) a
// consent she already answered. The policy's other sentence covers the full wipe:
// "You can remove all data by deleting the app."
//
// If a new store lands, it belongs in one of these two lists. A key in neither is
// a key that survives a delete she asked for, which is the failure that matters,
// so `KNOWN_KEYS` in the test exists to make an unlisted key fail the build rather
// than quietly persist.

/** Everything she wrote, felt, or that was inferred about her. Deleted. */
export const CONTENT_KEYS = [
  'niyora:moment-history', // her entries, feelings, responses
  'niyora:reflect-memory', // which reads land for her
  'niyora:moment-resume', // a mid-flow checkpoint, holds her raw text
  'niyora:moment-plan',
  'niyora:reflect-log',
  'niyora:checkins',
  'niyora:moods',
  'niyora:moon-state',
  'niyora:last-mac-soul',
  'niyora:light-ledger',
  'niyora:streak-freezes',
  'niyora:today-action',
  'niyora:training-v3',
  'niyora:sessions',
  'niyora:nudge-history',
  'niyora:pending-crossing',
  // Cycle and body. Health data, so if anything this half matters more than the rest.
  'niyora:period-history',
  'niyora:periods-care',
  'niyora:cycle-impact',
  'niyora:cycle-impact-muted',
  'niyora:remission-log',
  'niyora:hr-baseline',
  'niyora:pms',
  'niyora:pms-prep',
  'niyora:pms-readiness',
  'niyora:pms-reads',
] as const;

/** How the app is set up for her. Survives, on purpose. See the header. */
export const SETTINGS_KEYS = [
  'niyora:onboarding-complete',
  'niyora:onboarding-v3',
  'niyora:moon-consent', // her AI answer. Never silently reset, never silently re-granted.
  'niyora:reminder',
  'niyora:music',
  'niyora:voice-guidance',
  'niyora:home-breath-cue',
  'niyora:moment-intro-seen',
  'niyora:paint-hint-seen',
  'niyora:mac-promo-dismissed',
  // Her Premium entitlement, cached from StoreKit. Deleting her diary must never
  // drop a subscription she is paying for. It is not something she wrote, and
  // Apple is the source of truth anyway (refreshPremium re-reads it every launch).
  'niyora:premium',
  'niyora:premium-comp', // a comped entitlement. Same reasoning: not something she wrote.
  // Whether the trial has been offered. Settings, not content: deleting her
  // diary must not make the wall reappear as if she were new.
  'niyora:premium-offered',
] as const;

// The AES key in the Keychain ('niyora.momentKey') is deliberately NOT deleted.
// Removing it while secure-box has the key cached for this session would leave any
// moment she writes before the next launch encrypted under a key that is no longer
// stored, so it would be unreadable forever after a restart: a delete button that
// quietly corrupts her next entry. The key on its own is worthless once the
// ciphertext above is gone, and uninstalling removes it along with everything else,
// which is what the policy promises for the full wipe.
// ponytail: leave the key. Rotate it here only if secure-box grows a way to drop
// its cached key in the same breath.

export type DeleteResult = {
  /** Keys actually removed. */
  deleted: string[];
  /** Keys that failed to remove, so the caller can tell her the truth. */
  failed: string[];
};

/**
 * Delete everything she has written. Settings survive (see the header).
 *
 * Best-effort per key rather than all-or-nothing: a single failing key must not
 * abandon the other twenty-five, because a partial delete that reports itself
 * honestly is far better than a delete that gives up silently after two. The
 * caller gets both lists and should only tell her it is done when `failed` is
 * empty.
 */
export async function deleteHerContent(): Promise<DeleteResult> {
  const deleted: string[] = [];
  const failed: string[] = [];
  await Promise.all(
    CONTENT_KEYS.map(async (key) => {
      try {
        await AsyncStorage.removeItem(key);
        deleted.push(key);
      } catch {
        failed.push(key);
      }
    }),
  );
  return { deleted, failed };
}
