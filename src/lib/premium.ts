// Niyora Premium: the one paid thing in the app.
//
// WHAT IS PAID: the Moon flow, past FREE_MOMENTS_PER_MONTH in a calendar month.
// That is the only surface with a real marginal cost (a Gemini call per beat),
// so it is the only surface that meters. Breathe, periods care, PMS, Train,
// stories and her whole My Soul history stay free forever · gating the history
// would gate the reason she comes back at all.
//
// StoreKit only, through expo-iap. No third party sees a purchase, no server, no
// receipt leaves the phone, so the "No Data Collected" privacy label stays true.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasActiveSubscriptions, initConnection } from 'expo-iap';

import { FORCE_PAYWALL } from '@/config/features';
import { countMomentsInMonth } from '@/store/moment-history';

export const MONTHLY_SKU = 'com.niyora.premium.monthly';
export const YEARLY_SKU = 'com.niyora.premium.yearly';
export const PREMIUM_SKUS = [MONTHLY_SKU, YEARLY_SKU];

/** Free Moon flows per calendar month. Enough to have felt it work through one
 *  bad week, not enough to live in it for free. */
export const FREE_MOMENTS_PER_MONTH = 5;

const CACHE_KEY = 'niyora:premium';

/** A comped entitlement, granted by code instead of by StoreKit. Separate key on
 *  purpose: refreshPremium() overwrites CACHE_KEY with the store's answer on every
 *  launch, so a comp written there would be wiped within seconds. */
const COMP_KEY = 'niyora:premium-comp';

/** The code that comps Premium. Ships inside the binary, so treat it as public the
 *  moment it leaves your hands: anyone who runs `strings` on the .app finds it, and
 *  anyone she forwards it to has it forever. Change it in a build to revoke.
 *  ponytail: no server, no expiry, no per-person codes. Add those only if it leaks. */
const COMP_CODE = 'moonlight';

/** The last answer StoreKit gave. The gate reads this so it is instant and works
 *  offline; refreshPremium() keeps it true. */
export async function cachedPremium(): Promise<boolean> {
  if ((await AsyncStorage.getItem(COMP_KEY)) === '1') return true;
  return (await AsyncStorage.getItem(CACHE_KEY)) === '1';
}

/** Redeem a comp code. True if it matched and Premium is now open. */
export async function redeemComp(code: string): Promise<boolean> {
  if (code.trim().toLowerCase() !== COMP_CODE) return false;
  await AsyncStorage.setItem(COMP_KEY, '1');
  return true;
}

let connected = false;

/** Ask StoreKit whether a Premium subscription is live, and remember the answer.
 *  On ANY store error the cached answer stands: a woman mid-spiral on a plane
 *  does not get locked out of a flow she paid for because the App Store was
 *  unreachable. */
export async function refreshPremium(): Promise<boolean> {
  try {
    if (!connected) connected = Boolean(await initConnection());
    const active = await hasActiveSubscriptions(PREMIUM_SKUS);
    await AsyncStorage.setItem(CACHE_KEY, active ? '1' : '0');
    return active;
  } catch {
    return cachedPremium();
  }
}

/** Called straight after a successful purchase, so the gate opens without
 *  waiting for the next store round-trip. */
export async function grantPremium(): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, '1');
}

/** The month the free moments are counted in. UTC, matching how moment-history
 *  stamps `date`. */
function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function momentsLeft(): Promise<number> {
  const used = await countMomentsInMonth(thisMonth());
  return Math.max(0, FREE_MOMENTS_PER_MONTH - used);
}

/** May she open the Moon flow right now? Plus, or free moments left this month. */
export async function canOpenMoment(): Promise<boolean> {
  if (FORCE_PAYWALL) return false; // design preview, see config/features
  if (await cachedPremium()) return true;
  return (await momentsLeft()) > 0;
}
