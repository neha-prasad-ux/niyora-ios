import * as Notifications from 'expo-notifications';

// Local daily breath reminder. No push tokens, no server: the notification is
// scheduled on-device and fires from the OS. Aligns with Niyora's promise that
// nothing leaves the iPhone.

// Foreground behavior: if the app is open when the reminder fires, still show
// the banner but keep it quiet (no sound, no badge).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = 'niyora-daily-reminder';
export const COMEBACK_NUDGE_ID = 'niyora-comeback-nudge';
const PMS_AHEAD_ID = 'niyora-pms-ahead';
const PMS_START_ID = 'niyora-pms-start';

const REMINDER_TITLE = 'Niyora';
const REMINDER_BODY = 'A few breaths can settle the whole day.';
const COMEBACK_NUDGE_BODY = 'When you\'re ready, a breath is here.';
const PMS_AHEAD_BODY = 'PMS in a day';
const PMS_START_BODY = 'the PMS days are here';

// Ask the OS for permission. Returns true only if the user has granted it.
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return requested.granted;
}

// True when the user has previously denied and the OS will not show a prompt
// again. In that case the only path back is the iOS Settings app.
export async function isPermissionBlocked(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return !current.granted && !current.canAskAgain;
}

// Replace any existing reminder with one daily repeat at the given local time.
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  // Consent revoked: also cancel any pending comeback nudge.
  await Notifications.cancelScheduledNotificationAsync(COMEBACK_NUDGE_ID).catch(() => {});
}

// Schedule a one-shot comeback nudge to fire 24 hours from now. Using the
// fixed identifier means re-calling this replaces any previously scheduled
// nudge, so focus events never stack up duplicates.
export async function scheduleCombackNudge(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: COMEBACK_NUDGE_ID,
    content: { title: REMINDER_TITLE, body: COMEBACK_NUDGE_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 24 * 60 * 60,
      repeats: false,
    },
  });
}

export async function cancelCombackNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(COMEBACK_NUDGE_ID).catch(() => {});
}

// Schedule the two one-shot heads-up reminders for the next predicted PMS
// window: one the day before it begins ("PMS in a day") and one on day one
// ("the PMS days are here"), both at the given local time. Fixed identifiers
// mean re-calling this replaces any pending pair, so it can be reconciled on
// every launch as the window rolls forward. Each is skipped if its moment has
// already passed (e.g. she enabled the feature mid-window).
export async function schedulePmsReminders(
  windowStart: Date,
  hour: number,
  minute: number,
): Promise<void> {
  await cancelPmsReminders();

  const dayBefore = new Date(windowStart);
  dayBefore.setDate(dayBefore.getDate() - 1);
  dayBefore.setHours(hour, minute, 0, 0);

  const dayOf = new Date(windowStart);
  dayOf.setHours(hour, minute, 0, 0);

  const now = Date.now();
  if (dayBefore.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: PMS_AHEAD_ID,
      content: { title: REMINDER_TITLE, body: PMS_AHEAD_BODY },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBefore },
    });
  }
  if (dayOf.getTime() > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: PMS_START_ID,
      content: { title: REMINDER_TITLE, body: PMS_START_BODY },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayOf },
    });
  }
}

export async function cancelPmsReminders(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(PMS_AHEAD_ID).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(PMS_START_ID).catch(() => {});
}
