import { getPmsPrefs } from '@/store/pms-prefs';
import { getReminder } from '@/store/reminder-prefs';
import { nextPmsWindowStartDate } from '@/lib/pms-window';
import { schedulePmsReminders, cancelPmsReminders } from '@/lib/notifications';

// Reconcile the on-device PMS heads-up reminders with current prefs. Safe to
// call on every launch and after any pref change: it cancels and reschedules the
// next upcoming pair from scratch, so the window rolls forward each cycle on its
// own without any server or stored schedule.
//
// The reminders reuse the daily breath reminder's time (defaulting to 20:00 even
// when that reminder is disabled) so we never ask her to pick a time twice.
export async function syncPmsReminders(): Promise<void> {
  const pms = await getPmsPrefs();
  if (!pms.pmsMode || !pms.lastPeriodStart) {
    await cancelPmsReminders();
    return;
  }
  const windowStart = nextPmsWindowStartDate(pms.lastPeriodStart, pms.cycleLength, new Date());
  if (!windowStart) {
    await cancelPmsReminders();
    return;
  }
  const reminder = await getReminder();
  await schedulePmsReminders(windowStart, reminder.hour, reminder.minute);
}
