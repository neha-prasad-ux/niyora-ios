// Resolves which Understand framing to show: the PMS reframe or the everyday
// one. General is the safe default for everyone; we only switch to PMS when the
// user turned Smart PMS mode on AND today falls in her predicted window. So a
// PMS-mode user still sees general framing most of the month, PMS only when it
// fits.

import type { UnderstandContext } from '@/models/understand';
import { getPmsPrefs } from '@/store/pms-prefs';
import { isInPmsWindow } from '@/lib/pms-window';

export async function resolveUnderstandContext(now: Date = new Date()): Promise<UnderstandContext> {
  const prefs = await getPmsPrefs();
  if (!prefs.pmsMode) return 'general';
  return isInPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now) ? 'pms' : 'general';
}
