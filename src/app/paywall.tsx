// The Premium wall's wiring. All of its looks live in components/paywall-view.
//
// Two paths, one set of markup:
//   · live    — real StoreKit through expo-iap, what ships.
//   · preview — a fixture with realistic prices, for working on the design.
//
// PREVIEW exists because StoreKit needs a native module and a configured store,
// so on a dev build that has neither there is no way to see a price, and the
// design could not be judged at all. It deliberately does NOT mount useIAP:
// calling into a missing native module is what throws the "Cannot find native
// module 'ExpoIap'" rejection, and a red box over the screen is the opposite of
// useful when the screen is the thing being looked at.

import { useCallback, useEffect, useState } from 'react';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useIAP } from 'expo-iap';

import { PAYWALL_PREVIEW } from '@/config/features';
import { PaywallView } from '@/components/paywall-view';
import {
  FREE_MOMENTS_PER_MONTH,
  MONTHLY_SKU,
  PREMIUM_SKUS,
  YEARLY_SKU,
  grantPremium,
  refreshPremium,
} from '@/lib/premium';



/** Realistic stand-ins: the same shape and the same prices as the App Store
 *  Connect products, so what the design is judged against is what she will see. */
const PREVIEW_FIXTURE = {
  yearlyPrice: '$29.99',
  monthlyPrice: '$8.99',
  savingPercent: Math.round((1 - 29.99 / (8.99 * 12)) * 100),
  trialLabel: '7 days',
};

/** Closing the wall. The gate reaches it with router.replace(), so when the app
 *  was opened straight into the Moon flow (a notification, a deep link) the wall
 *  is the ONLY route and there is no back entry: router.back() then does nothing
 *  at all and the close button is dead. Fall back to Home in that case. */
function closeWall() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/now' as Href);
}

export default function Paywall() {
  return PAYWALL_PREVIEW ? <PaywallPreview /> : <PaywallLive />;
}

function PaywallPreview() {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <PaywallView
      freeCount={FREE_MOMENTS_PER_MONTH}
      {...PREVIEW_FIXTURE}
      unavailable={false}
      busy={busy}
      note="Preview: prices are stand-ins and nothing can be bought here."
      onBuy={() => {
        // Show the in-flight state, then let go, so the pressed path is visible
        // without a store behind it.
        Haptics.selectionAsync().catch(() => {});
        setBusy(null);
      }}
      onRestore={() => {}}
      onClose={closeWall}
    />
  );
}

function PaywallLive() {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const done = useCallback(async () => {
    await grantPremium();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    closeWall();
  }, []);

  const { connected, subscriptions, fetchProducts, requestPurchase, finishTransaction, restorePurchases } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      // A subscription is never consumable: finish it, then open the gate.
      await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
      await done();
    },
    onPurchaseError: (e) => {
      setBusy(null);
      // A cancel is her saying no, not a failure to apologise for.
      if (!/cancel/i.test(e?.code ?? '')) setNote('That did not go through. Nothing was charged.');
    },
    onError: () => setNote('The App Store is not reachable right now.'),
  });

  /** Whether the store has answered yet. Without it, a failed or empty product
   *  fetch leaves her staring at a wall that says "checking" forever, with no
   *  price, no explanation and no way to act. */
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: PREMIUM_SKUS, type: 'subs' })
      .catch(() => {})
      .finally(() => setAsked(true));
  }, [connected, fetchProducts]);
  // The store can also never connect at all, and then the fetch above never runs
  // and nothing would ever stop saying "checking". So give up out loud on a timer
  // too. If prices turn up late, `unavailable` goes false again on its own.
  useEffect(() => {
    const t = setTimeout(() => setAsked(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const subFor = (sku: string) => subscriptions.find((s) => s.id === sku) ?? null;
  const yearlyPrice = subFor(YEARLY_SKU)?.displayPrice ?? null;
  const monthlyPrice = subFor(MONTHLY_SKU)?.displayPrice ?? null;

  /** What the year saves against paying by the month, computed from StoreKit's
   *  numeric prices rather than written down. It stays true when a price tier
   *  changes in App Store Connect, and in every currency she might be in. */
  const savingPercent = (() => {
    const y = subFor(YEARLY_SKU)?.price;
    const m = subFor(MONTHLY_SKU)?.price;
    if (y == null || m == null || m <= 0) return null;
    const pct = Math.round((1 - y / (m * 12)) * 100);
    return pct > 0 ? pct : null;
  })();

  /** The trial the yearly product actually carries. Read from the product, never
   *  written down: claiming a trial the store will not honour is the kind of
   *  thing App Review rejects, and rightly. */
  const trialLabel = (() => {
    const s = subFor(YEARLY_SKU);
    if (s == null || !('introductoryPricePaymentModeIOS' in s)) return null;
    if (s.introductoryPricePaymentModeIOS !== 'free-trial') return null;
    const n = Number(s.introductoryPriceNumberOfPeriodsIOS ?? 0);
    const unit = s.introductoryPriceSubscriptionPeriodIOS;
    if (!n || unit == null || unit === 'empty') return null;
    // A 7-day trial is configured in App Store Connect as one WEEK, so the raw
    // period would put "Start 1 week free" on the button. Same length, but days
    // are what a trial is counted in and what the rest of the wall says.
    if (unit === 'week') return `${n * 7} days`;
    return `${n} ${unit}${n === 1 ? '' : 's'}`;
  })();

  const buy = (sku: string) => {
    Haptics.selectionAsync().catch(() => {});
    setNote(null);
    setBusy(sku);
    requestPurchase({ request: { apple: { sku } }, type: 'subs' }).catch(() => setBusy(null));
  };

  const onRestore = async () => {
    Haptics.selectionAsync().catch(() => {});
    setBusy('restore');
    await restorePurchases().catch(() => {});
    const active = await refreshPremium();
    setBusy(null);
    if (active) closeWall();
    else setNote('No Premium subscription found on this Apple Account.');
  };

  return (
    <PaywallView
      freeCount={FREE_MOMENTS_PER_MONTH}
      yearlyPrice={yearlyPrice}
      monthlyPrice={monthlyPrice}
      savingPercent={savingPercent}
      trialLabel={trialLabel}
      unavailable={asked && subscriptions.length === 0}
      busy={busy}
      note={note}
      onBuy={buy}
      onRestore={onRestore}
      onClose={closeWall}
    />
  );
}
