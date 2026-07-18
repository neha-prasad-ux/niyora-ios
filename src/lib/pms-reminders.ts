import { getPmsPrefs } from '@/store/pms-prefs';
import { getReminder } from '@/store/reminder-prefs';
import { pmsSequenceWindowStartDate, isInPmsNotificationSpan } from '@/lib/pms-window';
import {
  schedulePmsReminders,
  cancelPmsReminders,
  scheduleDailyReminder,
  pauseDailyReminder,
} from '@/lib/notifications';

// Reconcile the on-device PMS sequence with current prefs. Safe to call on every
// launch and after any pref change: it cancels and reschedules the sequence for
// the current-or-next window from scratch, so it rolls forward each cycle on its
// own without any server or stored schedule. The daily run self-cancels for the
// cycle the moment she logs her next period.
//
// The sequence reuses the daily breath reminder's time (defaulting to 20:00 even
// when that reminder is disabled) so we never ask her to pick a time twice. While
// today sits inside the PMS notification span, the breath reminder is paused so
// the two never land at the same minute; it resumes the moment the span passes.
// Reconciling here means the pause/resume needs no background wakeup.
export async function syncPmsReminders(): Promise<void> {
  const pms = await getPmsPrefs();
  const reminder = await getReminder();
  const now = new Date();

  let inPmsSpan = false;
  if (pms.pmsMode && pms.lastPeriodStart) {
    const windowStart = pmsSequenceWindowStartDate(pms.lastPeriodStart, pms.cycleLength, now);
    if (windowStart) {
      await schedulePmsReminders(windowStart, reminder.hour, reminder.minute);
      inPmsSpan = isInPmsNotificationSpan(pms.lastPeriodStart, pms.cycleLength, now);
    } else {
      await cancelPmsReminders();
    }
  } else {
    await cancelPmsReminders();
  }

  if (reminder.enabled) {
    if (inPmsSpan) {
      await pauseDailyReminder();
    } else {
      await scheduleDailyReminder(reminder.hour, reminder.minute);
    }
  }
}
