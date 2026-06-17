import * as Notifications from 'expo-notifications';

// Phase B4 — the stress nudge.
//
// A local, interactive notification asking the one question that is our ground
// truth: were you actually tense? Three taps — Yes / No / Not now — answer it
// without opening the app. Same on-device-only plumbing as the daily reminder
// and comeback nudge (no push tokens, nothing leaves the phone). When to fire
// is decided upstream by the nudge policy; this module is just content + the
// action category + the fire call.

export const STRESS_NUDGE_ID = 'niyora-stress-nudge';
export const STRESS_NUDGE_CATEGORY = 'niyora-stress-nudge';

/** Action button identifiers — these are the values stored as the answer. */
export const NUDGE_ACTIONS = {
  yes: 'yes',
  no: 'no',
  later: 'later',
} as const;

const NUDGE_TITLE = 'Niyora';
const NUDGE_BODY = 'Feeling tense?';

/**
 * Register the Yes / No / Not now action buttons. Call once at startup (the
 * category must exist before a notification referencing it is shown).
 */
export async function registerStressNudgeCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(STRESS_NUDGE_CATEGORY, [
    { identifier: NUDGE_ACTIONS.yes, buttonTitle: 'Yes' },
    { identifier: NUDGE_ACTIONS.no, buttonTitle: 'No' },
    { identifier: NUDGE_ACTIONS.later, buttonTitle: 'Not now' },
  ]);
}

/**
 * Fire the nudge now. Fixed identifier so a new nudge replaces any still on
 * screen rather than stacking. Caller records the fired event (nudge-history)
 * and should have checked the policy first.
 */
export async function fireStressNudge(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: STRESS_NUDGE_ID,
    content: {
      title: NUDGE_TITLE,
      body: NUDGE_BODY,
      categoryIdentifier: STRESS_NUDGE_CATEGORY,
    },
    trigger: null, // deliver immediately
  });
}

/** Map a notification response's action identifier to a stored answer. */
export function answerFromAction(actionIdentifier: string): 'yes' | 'no' | 'later' | null {
  if (actionIdentifier === NUDGE_ACTIONS.yes) return 'yes';
  if (actionIdentifier === NUDGE_ACTIONS.no) return 'no';
  if (actionIdentifier === NUDGE_ACTIONS.later) return 'later';
  return null; // e.g. the default tap (body), which carries no answer
}
