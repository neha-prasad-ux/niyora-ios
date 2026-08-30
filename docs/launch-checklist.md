# Niyora launch checklist

Living list of what has to be true before Niyora ships to real users. Grouped by
risk. `[x]` done, `[ ]` pending, `[~]` built but not yet live/verified.

Owner shorthand: **N** = Neha (needs her account/creds/decision), otherwise code.

---

## 1. Privacy: her words leaving the device

The Moon flow sends her (scrubbed) words to Google. This section is the contract
that her identity is protected.

The proxy plan was dropped. The app now calls Google directly through Firebase AI
Logic to Vertex AI (`src/lib/moment-gemini.ts`), attested with Firebase App Check
and Apple App Attest (`src/lib/firebase.ts`). There is no `proxy/` directory and
no `EXPO_PUBLIC_PROXY_URL` anywhere in `src/`. The items below match that build.

- [x] Content scrub before send: email / phone / cued names, reversible (`src/lib/pii.ts`, tested)
- [x] Firebase AI Logic on the **Vertex AI** backend, so the enterprise no-train / no-human-review terms apply, not the consumer free tier (`VertexAIBackend` in `src/lib/moment-gemini.ts`)
- [ ] **N** App Check is **Registered (Unenforced)**. The app attests correctly (`startAppCheck()` in `src/lib/firebase.ts`, App Attest in production), but enforcement is a Firebase console toggle and it is OFF, so the bundled key still reaches Gemini on its own. Verified 30 Aug: `node scripts/check-appcheck.mjs` returns 200 ALLOWED. Enforce at https://console.firebase.google.com/project/niyora-44988/appcheck/apis once the metrics panel shows real verified traffic, then re-run the script and expect BLOCKED
- [x] **Do NOT put an iOS application restriction on the API key.** It was set on 23 Aug and it broke the app, including the App Store build, until it was removed on 30 Aug. `@react-native-firebase/ai` sends its request from a JS `fetch` and never sets `X-Ios-Bundle-Identifier`, which is the header the restriction checks, so Google sees an empty bundle and returns `403 API_KEY_IOS_APP_BLOCKED`. Restriction is server side, so it hits every caller. App Check enforcement is the only usable lock for this SDK. Note that `check-appcheck.mjs` sends no bundle header either, so while such a restriction is on it prints BLOCKED and reads like a green App Check result when App Check is still off
- [x] No Gemini API key in the bundle; the call goes through Firebase, not a pasted key
- [ ] Google sees the device IP on every call, because the request goes straight from the phone. Nothing hides it now that the proxy is gone. Keep it stated honestly in the policy and the review notes
- [ ] **N** Rotate the old Gemini API key that was pasted in chat; delete `EXPO_PUBLIC_GEMINI_API_KEY` from `.env.local`, EAS envs and any build config
- [ ] **N** Privacy policy states plainly: what is sent to Google, that it is not used to train, that entries stay on-device otherwise
- [ ] **N** The published policy names the model. The code runs `gemini-2.5-pro` (`MODEL` in `src/lib/moment-gemini.ts`); `docs/privacy-policy.md` still says `gemini-2.5-flash`. One of the two is wrong and it is the doc

## 2. Safety: crisis handling

This app detects crisis. Getting this wrong is the highest-stakes failure.

- [x] Deterministic keyword floor runs offline, can't fail (`crisis-scan.ts`), model layer only escalates
- [ ] Rework the crisis page (feeds off `crisisType.current`)
- [ ] **N** Real, correct crisis resources for every launch region (hotline numbers, text lines) — not placeholders
- [ ] Test crisis recall on real phrasings (passive ideation, coercion, "no point in tomorrow"); confirm it never turns crisis OFF
- [ ] Confirm crisis check still fires when AI is offline (keyword floor) and when the proxy is down

## 3. Moon AI flow readiness

- [x] Removed the beat diagnostic that logged her words to Metro
- [ ] Decide the crisis `__DEV__` log stays or goes (logs only classifications, never her free text)
- [ ] `revise` beat — the shorter / softer / more-direct draft iteration (last generative beat)
- [ ] Mid-flow AI-error gap: v1 only errors at the entry beat; later-beat failures still floor
- [ ] Polish the authored / offline fallback path (what she sees when AI is absent)
- [ ] Confirm the store build with the flag/URL absent is byte-identical to the deterministic build (ships no AI by default)

## 4. App Store submission

- [ ] **N** App Privacy "nutrition labels": declare sensitive/emotional data + that it is sent to a third-party AI processor, **and now Purchases** (see `docs/app-store-data-disclosure.md`)
- [ ] **N** Age rating set (emotional-health content)
- [x] In-app deletion path for what she wrote (`deleteHerContent`, wired in the You tab). No accounts, so there is no account to delete
- [ ] **N** Export-compliance / encryption question answered
- [ ] **N** Screenshots, description, keywords, support URL. The description must now carry the subscription name, price, period and both links
- [ ] **N** Any health-data (HRV) disclosures, if that ships in v1

## 5. Money: the Niyora Premium subscription

The Moon flow (`src/app/moment.tsx`) is free five times a calendar month, counted
from her saved moment history. On the sixth she gets the wall. Everything else in
the app stays free. Two auto-renewing products, StoreKit only through `expo-iap`,
no server and no receipt validation off the device (`src/lib/premium.ts`). The
step-by-step App Store Connect setup is `docs/premium-app-store-connect.md`.

- [x] Entitlement cached under `niyora:premium` and listed in `SETTINGS_KEYS`, so deleting her content never drops a subscription she is paying for (`src/store/delete-her-data.ts`)
- [x] Store errors fall back to the cached answer, so a woman offline is not locked out of a flow she paid for (`refreshPremium`)
- [ ] **Both paywall preview flags off.** `PAYWALL_PREVIEW` and `FORCE_PAYWALL` in `src/config/features.ts` must both be `false`. With the first on, the buy button is wired to nothing and nobody can subscribe, while the wall still looks completely normal. `src/config/features.test.ts` fails while either is true, so prove it with `npx jest`, not by reading the file
- [ ] **N** Paid Applications Agreement active, bank and tax details complete. Until that is done the products cannot be sold at all. Slowest item here, start it first
- [ ] **N** Both products created in one subscription group: `com.niyora.premium.monthly` ($8.99/mo) and `com.niyora.premium.yearly` ($29.99/yr). Product IDs must match `src/lib/premium.ts` character for character
- [ ] **N** 7-day free trial as an introductory offer on the **yearly product only**. The wall reads the trial off the product, so a missing or unapproved offer silently drops the "Start 7 days free" label with no error
- [ ] **N** Both products **"Ready to Submit"** and attached to the build. Anything less returns no products from StoreKit, and the wall shows "Premium is unavailable" with a dead button. This is the failure that looks like nothing is wrong
- [ ] **N** `niyora.com/terms` and `niyora.com/privacy` both live, and both actually mention the subscription: name, price, period, auto-renewal, how to cancel. The wall links to both (`src/components/paywall-view.tsx`) and Apple checks them
- [ ] **N** Sandbox test on a real device: buy monthly, buy yearly, restore on a second device, cancel, confirm the trial label appears. Confirm the gate opens straight after purchase and survives a relaunch
- [ ] **N** Subscription review screenshot and localization entered for each product
- [ ] Confirm nothing outside StoreKit grants the entitlement in the shipped build

## 6. Build & release hygiene

- [ ] No dev flags, no diagnostic logs, no secrets in the production bundle
- [ ] `npx tsc --noEmit` clean and `npx jest` green on the release commit. Jest is what proves the paywall preview flags are off and that every storage key is classified for deletion
- [ ] Production build via EAS / TestFlight smoke-tested on a real device (not just simulator)
- [ ] Commit the ~11 uncommitted files in the tree (or confirm they're excluded intentionally)

---

_Add items as they surface. When one becomes live-verified, move `[~]`/`[ ]` → `[x]` with a date._
