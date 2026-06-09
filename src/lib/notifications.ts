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

const REMINDER_TITLE = 'Niyora';
const REMINDER_BODY = 'A few breaths can settle the whole day.';

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
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
