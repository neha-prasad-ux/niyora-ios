import * as Notifications from 'expo-notifications';

import { PMS_WINDOW_BEFORE_DAYS, PMS_GRACE_AFTER_DAYS } from '@/lib/pms-window';

// Local daily breath reminder. No push tokens, no server: the notification is
// scheduled on-device and fires from the OS. Aligns with Niyora's promise that
// nothing leaves the iPhone.

// The single notification that breaks silence: the one-day-before PMS nudge
// (equals pmsPrepId(1)). It's the highest-intent "get ready" beat, so it plays
// the default system sound in both the foreground (via the handler below) and
// the background (via content.sound in schedulePmsReminders). Every other
// notification stays silent, no sound field means iOS delivers it soundlessly.
const PMS_ALERT_SOUND_ID = 'niyora-pms-prep-1';

// Foreground behavior: if a notification fires while the app is open, still show
// the banner but keep it quiet (no badge). Only the one-day-before PMS nudge
// plays a sound; everything else is silent in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: notification.request.identifier === PMS_ALERT_SOUND_ID,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = 'niyora-daily-reminder';
export const COMEBACK_NUDGE_ID = 'niyora-comeback-nudge';

// Days of quiet before the comeback nudge fires. It is scheduled when she leaves
// the app and cancelled when she returns (see _layout's background handler), so
// it only ever reaches someone who actually drifted, not "24h after a
// comeback", which never reached a user who left and never came back.
export const COMEBACK_LAPSE_DAYS = 3;

const REMINDER_TITLE = 'Niyora';
const REMINDER_BODY = 'A few breaths can settle the whole day.';
const COMEBACK_NUDGE_BODY = 'When you\'re ready, a breath is here.';

// The PMS sequence. A short prep countdown before the predicted premenstrual
// window, then one line each day through the window (window start through the
// predicted period plus the late-period grace). Every line names the timely
// reason and pulls into the app: prep at the readiness checklist and the partner
// heads-up, in-window at the in-the-moment tools. Urgency through relevance, an
// "Open Niyora" invite, never fear or deficit (DESIGN.md / pms preparedness spec:
// earn peace, not fear a gap).
//
// One line a day is enough: syncPmsReminders pauses the daily breath reminder
// across this span so the two never land together.
const PMS_PREP_DAYS = [3, 2, 1] as const; // days before the window opens
const PMS_PREP_BODIES: Record<(typeof PMS_PREP_DAYS)[number], string> = {
  3: 'PMS in 3 days. Your checklist\'s ready in Niyora. A few ticks now, an easier week.',
  2: 'PMS soon. Open Niyora to give your partner a heads-up before your PMS.',
  1: 'PMS starts tomorrow. Open Niyora and get your kit set.',
};

// One per day across the window. Evergreen and rotated (no "it just started"
// line), so a late, still-unlogged period that reaches the grace days never
// reads as if the window is beginning again. Each invites an open and names a
// tool she can reach for.
const PMS_DURING_BODIES = [
  'Feeling it today? Open Niyora for a 2-minute reset.',
  'PMS is loud right now. Open Niyora for a breath.',
  'Rough moment? Steady yourself in Niyora.',
  'Open Niyora. Size what you\'re feeling, then let it pass.',
  'One tense minute? Niyora has a reset. Open it.',
  'Still in it. Open Niyora for a breath, then the next.',
];

// Window start through predicted period plus grace, inclusive.
const PMS_DURING_DAY_COUNT = PMS_WINDOW_BEFORE_DAYS + PMS_GRACE_AFTER_DAYS + 1;

const pmsPrepId = (daysBefore: number) => `niyora-pms-prep-${daysBefore}`;
const pmsDayId = (dayIndex: number) => `niyora-pms-day-${dayIndex}`;
// Retired two-shot identifiers, cancelled on upgrade so they never linger.
const PMS_LEGACY_IDS = ['niyora-pms-ahead', 'niyora-pms-start'];

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

// Silence just the daily breath reminder, leaving the comeback nudge untouched.
// Used to pause it while the PMS sequence is carrying the daily cadence, so she
// never gets two Niyora notifications at the same time. syncPmsReminders resumes
// it once today is outside the PMS span.
export async function pauseDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

// Schedule a one-shot comeback nudge to fire COMEBACK_LAPSE_DAYS from now.
// Called when she leaves the app, so it lands only if she stays away that long;
// returning cancels it (see _layout). The fixed identifier means re-scheduling
// on every background just pushes the single nudge forward, never a stack.
export async function scheduleCombackNudge(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: COMEBACK_NUDGE_ID,
    content: { title: REMINDER_TITLE, body: COMEBACK_NUDGE_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: COMEBACK_LAPSE_DAYS * 24 * 60 * 60,
      repeats: false,
    },
  });
}

// Where a tapped notification should land, so the tap arrives on the feature its
// copy promised instead of wherever the app last was. The PMS prep beats point
// at the readiness checklist (kit + partner heads-up live around it); the
// in-window beats point at the in-the-moment steady flow. null means no deep
// link (the comeback/stress nudges route themselves in _layout).
export function notificationRoute(id: string): '/pms-readiness' | '/moment' | null {
  if (id.startsWith('niyora-pms-prep-')) return '/pms-readiness';
  if (id.startsWith('niyora-pms-day-')) return '/moment';
  return null;
}

export async function cancelCombackNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(COMEBACK_NUDGE_ID).catch(() => {});
}

// C10: a one-off reminder for a response she chose to do later. A unique id per
// time lets several coexist; a past time is rejected. Returns false when
// permission is denied or the time is invalid, so the caller can fall back to a
// plain "saved to Today" with no reminder.
export const ACTION_REMINDER_PREFIX = 'niyora-action-';
export async function scheduleActionReminder(body: string, date: Date): Promise<boolean> {
  if (!(date.getTime() > Date.now())) return false;
  const ok = await ensureNotificationPermission();
  if (!ok) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: `${ACTION_REMINDER_PREFIX}${date.getTime()}`,
    content: { title: REMINDER_TITLE, body, sound: 'default' as const },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
  return true;
}

// Schedule the whole PMS sequence for one window: a prep countdown (3, 2, 1 days
// before it opens) and one gentle line each day through the window at the given
// local time. Fixed identifiers mean re-calling this replaces any pending
// sequence, so it reconciles on every launch as the window rolls forward, and it
// self-cancels for the current cycle the moment she logs her next period (that
// re-points the prediction a cycle out). Each notification is skipped if its
// moment has already passed, so opening the app mid-window keeps the remaining
// days without resurrecting ones that already fired.
export async function schedulePmsReminders(
  windowStart: Date,
  hour: number,
  minute: number,
): Promise<void> {
  await cancelPmsReminders();
  const now = Date.now();

  const at = (dayDelta: number): Date => {
    const when = new Date(windowStart);
    when.setDate(when.getDate() + dayDelta);
    when.setHours(hour, minute, 0, 0);
    return when;
  };

  for (const daysBefore of PMS_PREP_DAYS) {
    const when = at(-daysBefore);
    if (when.getTime() <= now) continue;
    const identifier = pmsPrepId(daysBefore);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: REMINDER_TITLE,
        body: PMS_PREP_BODIES[daysBefore],
        // Only the one-day-before nudge breaks silence (default system sound);
        // omitting the field on the others delivers them soundlessly.
        ...(identifier === PMS_ALERT_SOUND_ID ? { sound: 'default' as const } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  }

  for (let i = 0; i < PMS_DURING_DAY_COUNT; i += 1) {
    const when = at(i);
    if (when.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: pmsDayId(i),
      content: {
        title: REMINDER_TITLE,
        body: PMS_DURING_BODIES[i % PMS_DURING_BODIES.length],
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
  }
}

export async function cancelPmsReminders(): Promise<void> {
  const ids = [
    ...PMS_PREP_DAYS.map(pmsPrepId),
    ...Array.from({ length: PMS_DURING_DAY_COUNT }, (_, i) => pmsDayId(i)),
    ...PMS_LEGACY_IDS,
  ];
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}
