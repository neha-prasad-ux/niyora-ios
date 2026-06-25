// The Smart PMS mode prediction. Pure, on-device, no calendar storage beyond
// the single onboarding answer (last period start + typical cycle length).
//
// The biology that makes this work with one data point: the luteal phase is the
// fixed part of the cycle (~12-14 days), so PMS reliably lands in the days just
// before the next period. We therefore predict the *next* period and count
// backward. Cycle-length variation lives in the follicular phase, so a late
// period means everything shifts later on the calendar, not that PMS lasts
// longer. Because we get no feedback (we never see the real period arrive), the
// window is intentionally generous and rolls forward on its own each cycle.

export const PMS_WINDOW_BEFORE_DAYS = 7; // premenstrual stretch before the predicted period
export const PMS_GRACE_AFTER_DAYS = 2; // absorbs a slightly late period we cannot observe

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole-day count anchored to UTC midnight of a calendar Y/M/D. We only ever
// compare day-to-day, so anchoring this way keeps the math free of timezone and
// DST drift while still treating "today" as the user's local calendar day.
function dayNumberLocal(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

function parseDayNumber(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY);
}

function clampLength(cycleLength: number): number {
  const n = Math.round(cycleLength);
  if (Number.isNaN(n) || n < 20) return 28;
  if (n > 40) return 40;
  return n;
}

// Days between today and the nearest predicted period start. Negative = before
// the period (premenstrual), positive = after it has (predicted to have)
// started. null when the date is unparseable.
export function pmsOffsetDays(
  lastPeriodStart: string,
  cycleLength: number,
  today: Date,
): number | null {
  const start = parseDayNumber(lastPeriodStart);
  if (start == null) return null;
  const len = clampLength(cycleLength);
  const t = dayNumberLocal(today);
  const cyclesElapsed = Math.round((t - start) / len);
  const nearestStart = start + cyclesElapsed * len;
  return t - nearestStart;
}

// Days until the next predicted PMS window begins. 0 or negative means it has
// already started (use isInPmsWindow to know if today is inside it). null when
// the date is unparseable. Used for the My Soul status line ("about N days away").
export function daysUntilPmsWindow(
  lastPeriodStart: string | null,
  cycleLength: number,
  today: Date,
): number | null {
  if (!lastPeriodStart) return null;
  const start = parseDayNumber(lastPeriodStart);
  if (start == null) return null;
  const len = clampLength(cycleLength);
  const t = dayNumberLocal(today);
  const cyclesToNext = Math.floor((t - start) / len) + 1;
  const nextStart = start + cyclesToNext * len;
  const windowStart = nextStart - PMS_WINDOW_BEFORE_DAYS;
  return windowStart - t;
}

// The next predicted PMS window-start date on or after `today` (the day the
// premenstrual stretch begins). Always returns a future-or-today calendar day,
// rolling forward a cycle when today is already inside or past a window, so it
// can drive the heads-up reminders. Returned as a local Date at midnight of that
// calendar day. null when there is no usable last-period date.
export function nextPmsWindowStartDate(
  lastPeriodStart: string | null,
  cycleLength: number,
  today: Date,
): Date | null {
  if (!lastPeriodStart) return null;
  const start = parseDayNumber(lastPeriodStart);
  if (start == null) return null;
  const len = clampLength(cycleLength);
  const t = dayNumberLocal(today);
  // Smallest cycle whose window start is on or after today.
  let k = Math.ceil((t - start + PMS_WINDOW_BEFORE_DAYS) / len);
  let windowStartDay = start + k * len - PMS_WINDOW_BEFORE_DAYS;
  while (windowStartDay < t) {
    k += 1;
    windowStartDay = start + k * len - PMS_WINDOW_BEFORE_DAYS;
  }
  // windowStartDay is a UTC-midnight day number; rebuild it as local midnight of
  // the same calendar day so the reminder fires on the user's local clock.
  const utc = new Date(windowStartDay * MS_PER_DAY);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

// True when today falls in the predicted premenstrual window: from
// PMS_WINDOW_BEFORE_DAYS before the next period through PMS_GRACE_AFTER_DAYS
// after the predicted start (the grace catches a period that runs late).
export function isInPmsWindow(
  lastPeriodStart: string | null,
  cycleLength: number,
  today: Date,
): boolean {
  if (!lastPeriodStart) return false;
  const offset = pmsOffsetDays(lastPeriodStart, cycleLength, today);
  if (offset == null) return false;
  return offset >= -PMS_WINDOW_BEFORE_DAYS && offset <= PMS_GRACE_AFTER_DAYS;
}
