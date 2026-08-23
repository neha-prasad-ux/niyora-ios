# Niyora — App Store submission pack

Paste-ready reference for filling out App Store Connect mechanically. Consolidates and pressure-tests `docs/app-store-listing.md` and `docs/app-store-data-disclosure.md` against the current Apple App Store Review Guidelines. House style: normal sentence capitalization, no em dashes, no medical claims.

- App Store Connect app ID: `6764561688`
- Bundle ID: `com.niyora.app`
- Version: `3.0.0`
- Build to submit: **33** (task instruction — launch-prep.md references build 28; confirm 33 is the uploaded, AI-Logic + App Check build before selecting it)
- Firebase project: `niyora-44988` (AI Logic + App Check only, no Auth/Firestore)

Every placeholder is written as `[LIKE_THIS]`. Nothing is committed.

> **Updated 2026-08-23: the app now sells a subscription.** This pack was written for the
> first 3.0.0 submission, which shipped free. Niyora Premium (`src/lib/premium.ts`,
> `src/app/paywall.tsx`) adds an auto-renewing subscription, so Section 2 (description),
> Section 3 (Purchases), Section 5 (pricing and the new IAP steps) and Section 6 (risk 8)
> have all changed. Two header fields above are now stale: 3.0.0 build 33 is the version
> already on the App Store, so the subscription ships as `[NEXT_VERSION]` with a new build.
> Update both before using this pack again.

---

## Section 1 — App Information

These live under the app-level "App Information" tab (not versioned).

### Name (limit 30)
```
Niyora
```
6 / 30. Brand only. Search-weighted alternative if you want a descriptor: `Niyora: Sit With the Moment` (27 / 30). Use one, not both. Plain brand is the safer choice.

### Subtitle (limit 30)
```
Reflect through hard moments
```
28 / 30.

### Category
- Primary: **Health & Fitness**
- Secondary: **Lifestyle**

Not Medical, on purpose. Medical sets a diagnostic/treatment review bar the app deliberately does not meet, and would imply a claim the app does not make. Mindfulness, journaling, mood and reflection apps live in Health & Fitness.

### Age rating — recommended result: 12+ (classic questionnaire) / 13+ (new age bands)

Rated deliberately at 12+/13+ because the app knowingly handles self-harm and domestic-violence disclosures (it only ever surfaces protective resources, never depicts or instructs). Rating it 4+/9+ while touching those themes is the kind of mismatch reviewers escalate. 17+/18+ would over-rate content the app does not contain.

**Classic questionnaire — exact per-question answers (produces 12+):**

| Question | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Mature/Suggestive Themes | **Infrequent/Mild** (carries the 12+ rating; reflects crisis + DV subject matter) |
| Simulated Gambling | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | **None** (reflection tool; crisis resources are support referrals, not medical/treatment info) |
| Unrestricted Web Access | **No** (opens two curated links, findahelpline.com plus tel/SMS handoffs; no in-app browser) |
| Gambling and Contests | No |

**New age-band questionnaire — exact per-question answers (produces 13+):**

| Question | Answer |
|---|---|
| Violence (all types) | None |
| Sexual content, nudity | None |
| Profanity, crude humor | None |
| Alcohol, tobacco, drugs | None |
| Gambling | None |
| Horror/fear | None |
| Medical or wellness information | None |
| References to self-harm or suicide | **Yes — app provides supportive resources / does not encourage it.** If a "does not encourage, provides resources" qualifier is offered, select it (keeps the band at 13+ rather than escalating). This is the honest answer and what keeps you out of a later rejection. |
| Mature themes | Mild/Infrequent (domestic-violence support referral) |
| Unrestricted internet access | No |

---

## Section 2 — Version metadata

Versioned fields under the `3.0.0` version.

### Promotional text (limit 170, editable without a new build)
```
When a moment knocks you sideways, write it here. Niyora reflects your own words back, helps you steady, and lets you decide what to do next. Private, on your device.
```
166 / 170.

### Description (limit 4000)
```
Some moments hit hard. An argument that won't leave your head. A message you're not sure how to answer. A feeling you can't quite name yet.

Niyora is a quiet place to sit with a moment like that.

You write down what happened, in your own words. Moon, the AI inside Niyora, reflects your words back to you so you can see them clearly. It never puts words in your mouth and never pretends to know your life. It works with what you actually wrote.

From there, Niyora helps you do three things, at your pace:

Reflect. See the moment laid out plainly, name what you're feeling, and understand what your body is doing in the middle of it.

Steady. A slow breath, a small grounding step, a minute that is only yours before you decide anything.

Respond. When you're ready, think through what you want to do next, in a way that's yours to choose. No script, no pressure.

Made with women in mind, for the moments that don't fit neatly into a mood tracker.

Private by design:
- No account. Nothing to sign up for.
- Your entries and feelings stay on your device, encrypted with a key held in your iPhone's secure storage.
- No ads, no analytics trackers, no selling your data.
- When Niyora needs the AI to reflect your words, only the text is sent, over Google's enterprise service that does not train on it or read it by hand. It is scrubbed of obvious personal details first.

Niyora is a reflection tool. It is not a therapist, not medical advice, and not a substitute for professional care. If you are in crisis or thinking about harming yourself, please reach out to a real person: in the US, call or text 988 for the Suicide and Crisis Lifeline, any time. If you are in immediate danger, call your local emergency number.

Free to download. Everything in Niyora is free, including breathing, cycle care and your whole history. Five moments with Moon a month are free too. Past that, Niyora Premium keeps them open.

Niyora Premium
- Monthly: $8.99 per month.
- Yearly: $29.99 per year, with the first 7 days free.

Payment is charged to your Apple Account at confirmation of purchase. The subscription renews automatically unless it is turned off at least 24 hours before the end of the current period, and your Apple Account is charged for renewal within 24 hours of the end of the period. You can manage or cancel it in your Apple Account settings.

Terms of Use: https://niyora.com/terms
Privacy Policy: https://niyora.com/privacy
```
2,436 / 4000. Do not add outcome verbs ("feel less anxious", "heal", "recover") in any future edit.

The subscription block is not optional decoration. For auto-renewing subscriptions Apple expects the description (or the metadata around it) to carry the subscription name, the length and price of each period, and functional links to a Terms of Use and a Privacy Policy. The prices above are the US tier and are written down here in metadata only. Inside the app, `src/components/paywall-view.tsx` renders prices straight from StoreKit, so a tier change in App Store Connect updates the app on its own but **not** this description. If you change a price, change it here too.

### Keywords (limit 100, comma-separated, no spaces)
```
reflection,journal,emotions,mood,feelings,calm,vent,breathe,self care,mindful,women,anxiety,stress
```
98 / 100. Deliberately excludes therapy, therapist, counseling, depression, PTSD, treatment (medical-claim triggers). Does not repeat "Niyora" or "reflect" (already indexed from name/subtitle).

### Support URL
```
[SUPPORT_URL]
```
Required field. A reachable page with a contact method. Can be a simple page or a mailto-backed contact page.

### Marketing URL (optional)
```
[MARKETING_URL]
```
Optional. niyora.com if you want it, otherwise leave blank.

### What's New (limit 4000)
For a first public submission there is no prior public version, so this can describe the app plainly rather than a changelog. Suggested:
```
This is the first public release of Niyora. Write about a hard moment in your own words, see it reflected back, take a slow breath, and decide what you want to do next. Everything stays on your device. Free to use.
```
288 / 4000. If ASC treats 3.0.0 as an update over an earlier internal/TestFlight-only history, keep this as-is (TestFlight builds do not create public "What's New" history). Stale for the subscription release: 3.0.0 is already public, so `[NEXT_VERSION]` needs a real changelog, and it has to say the subscription exists. Suggested:
```
Niyora Premium. Five moments with Moon are free every month, and they reset on the first. Past that, Premium keeps them open: $8.99 a month, or $29.99 a year with the first 7 days free. Everything else in the app stays free.
```
221 / 4000.

### In-app purchases: Niyora Premium

One subscription group, two products, both auto-renewing. These are entered under Monetization → Subscriptions in App Store Connect, not under version metadata.

| Field | Monthly | Yearly |
|---|---|---|
| Product ID | `com.niyora.premium.monthly` | `com.niyora.premium.yearly` |
| Reference name (internal) | Niyora Premium Monthly | Niyora Premium Yearly |
| Subscription group | Niyora Premium | Niyora Premium (same group) |
| Duration | 1 month | 1 year |
| Price (US) | $8.99 | $29.99 |
| Introductory offer | none | **7 days free trial**, new subscribers |
| Display name (shown to the user) | Niyora Premium | Niyora Premium |

Both product IDs are hardcoded in `src/lib/premium.ts` (`MONTHLY_SKU`, `YEARLY_SKU`) and fetched together as `PREMIUM_SKUS`. They must match character for character or the wall fetches nothing and shows "Premium is unavailable".

**Subscription localization.** Display name limit 30, description limit 45. `Niyora Premium` is 14 / 30. Description:
```
Keep talking to Moon past your five free moments.
```
49 characters, so trim to `Keep talking to Moon past your free moments.` (44) if ASC rejects it.

**What the app does not write down.** The price, the saving percentage and the trial length on the wall are all read from StoreKit at runtime (`src/app/paywall.tsx`), never hardcoded in the UI. That is deliberate: it means the wall cannot claim a trial Apple will not honour. The consequence for submission is that **if the yearly product has no approved introductory offer, the "Start 7 days free" label silently disappears** and the button reads "Start Premium". Nothing breaks, but the offer you think you are shipping is not there.

**Review screenshot.** Each subscription needs a review screenshot in ASC. Use a real capture of the paywall (`src/app/paywall.tsx`), taken on a build where prices load.

---

## Section 3 — App Privacy ("nutrition label")

Grounded in `app-store-data-disclosure.md`, which is grounded in the real code (`moment-history.ts`, `moment-gemini.ts`, `pii.ts`, `firebase.ts`). Apple's definition of "Collect" = data transmitted off-device where you or a partner can access it beyond servicing the real-time request. Niyora has exactly one such egress: the moment text sent to Google (Firebase AI Logic → Vertex AI) for reflection and crisis classification. Everything else is on-device only (AES-encrypted, Keychain key) and is not "collection."

There is no account, so nothing can be "Linked to you" and nothing is used for "Tracking."

**Precondition (must verify before trusting this table):** the submitted build must ship with AI on (`EXPO_PUBLIC_MOMENT_AI=1`) and Firebase configured. eas.json production sets this and GoogleService-Info.plist is real (per crisis-audit), so AI is live. If for any reason the submitted build ships AI off, the Health & Fitness, User Content and Identifiers "Yes" answers become "No" and the app is fully on-device for those. The questionnaire must describe the build you actually submit. **Purchases is the exception:** the subscription is in the build unconditionally, so it stays Yes in every configuration.

### Per data type — exact ASC answers

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info | No | — | — | — |
| Health & Fitness (subtype: Health) | **Yes** ⚠️ | No | No | App Functionality |
| Financial Info | No | — | — | — |
| Location | No | — | — | — |
| Sensitive Info | No ⚠️ | — | — | — |
| Contacts | No | — | — | — |
| User Content (subtype: Other User Content) | **Yes** | No | No | App Functionality |
| Browsing History | No | — | — | — |
| Search History | No | — | — | — |
| Identifiers (subtype: Device ID) | **Yes** ⚠️ | No | No | App Functionality |
| Purchases (subtype: Purchase History) | **Yes** ⚠️ | No | No | App Functionality |
| Usage Data | No | — | — | — |
| Diagnostics | No | — | — | — |
| Other Data | No | — | — | — |

**How to answer the flow for the four "Yes" types:** for each, ASC asks (1) collected yes/no, (2) which purposes, (3) linked to user's identity, (4) used to track. Answer: purposes = **App Functionality** only; linked = **No**; tracking = **No**.

- **User Content — the primary disclosure.** The moment text (and any drafted response) is transmitted to Google Vertex AI to generate the reflection and run crisis detection. Not retained for training, not human-reviewed, not tied to identity.
- **Health & Fitness — recommended Yes, conservative.** The emotional text sent to Vertex reveals mental/emotional state = user-provided health data. No HealthKit, no sensors, no clinical records read. Over-disclosing Health for App Functionality (not linked, no tracking) carries no penalty; under-disclosing is what gets apps pulled.
- **Identifiers / Device ID — likely Yes.** Firebase AI Logic + App Check send a Firebase installations ID and an App Attest attestation token to prove the request is the genuine app. Anti-abuse only, never advertising, no IDFA. No User ID (no accounts).
- **Purchases, Yes and conservative.** The app sells an auto-renewing subscription through StoreKit only, via `expo-iap`. No payment SDK, no server of ours, no receipt validation off the device. The only trace in the app is a boolean under `niyora:premium` in AsyncStorage, which never leaves the phone, and there is no account to link it to. Apple has the purchase because Apple is the store; we do not, and no third party does. *Financial Info* stays **No**: no card, no billing address, no bank detail ever reaches the app.

### Flags where the disclosure doc and real behavior need a human decision (do NOT guess)

1. **Health & Fitness Yes vs No.** Yes is the conservative, non-penalized call and is recommended. No is defensible (rely on User Content alone) but riskier. Decide deliberately; if undecided, keep Yes.
2. **Identifiers / Device ID Yes vs No.** Confirm whether `@react-native-firebase` actually transmits a Firebase installations ID (FID) and/or a persistent App Check token for AI Logic. If yes (most likely), disclose Device ID as above. Only mark No if you confirm the attestation is ephemeral and no installations ID is sent. Err toward disclosing.
3. **"Collected" hinges on Google's retention.** The Yes answers assume Vertex may retain text beyond the real-time request (e.g. abuse logging). Do not downgrade to "Data Not Collected" unless you have configured and verified zero-retention / abuse-logging-off on Vertex and will defend it.
4. **Analytics / Diagnostics = No** depends on no telemetry SDK riding in via a dependency. Grep the dependency tree for Firebase Analytics, Crashlytics, Sentry, Amplitude, PostHog before certifying No.
5. **PII scrub is not de-identification.** Do not represent the AI send as anonymized anywhere. The scrub removes some direct identifiers but sends the full emotional narrative. Bare standalone names ("Sarah slapped me") and short numbers pass through by design.
6. **Sensitive Info = No, with one probe to expect.** Menstrual-cycle / PMS context that can appear in an entry is treated as Health, not Apple's enumerated "pregnancy or childbirth information," so No holds. Expect App Review may probe this for a women's-health-adjacent app.
7. **Purchases Yes vs No.** Yes is recommended. The case for No is that under Apple's own definition of "Collect" nothing about the purchase is transmitted off the device to us or a partner: StoreKit is Apple's, the entitlement boolean stays on the phone, and there is no receipt validation server. Answer Yes anyway. It costs nothing when it is not linked and not tracking, and a label claiming no purchase data on an app with a visible paywall reads as under-disclosure. Do not let this bleed into Financial Info, which is genuinely No.

### Behavior-vs-doc disagreements found (flagged, not resolved)

- **IP address to Google on every AI request.** The disclosure doc correctly notes Google/Vertex sees the device IP (the proxy that would have hidden it was dropped, launch-prep gate #1). Apple's Location type is about location the app itself collects, so this does not go under Location. It is not a contradiction, but it is a real fact to keep straight if a reviewer asks how data leaves the device: text + IP reach Google. No action beyond honesty in the review notes.
- No other disagreement between the disclosure doc and observed behavior. The doc is conservative and matches the code paths described in crisis-audit and launch-prep.

---

## Section 4 — App Review Information

### Sign-in
No demo account needed. There is no login, sign-up, or credentials. Toggle "Sign-in required" **off**. Launch and use directly.

### Contact
- First / last name, phone, email: **[REVIEW_CONTACT_NAME]**, **[REVIEW_CONTACT_PHONE]**, **[REVIEW_CONTACT_EMAIL]**

### Notes for Review (paste into the Notes field)
```
Thank you for reviewing Niyora.

What the app is: Niyora is a private, on-device reflection tool. A user writes about a difficult moment in her own words. The in-app AI ("Moon") reflects her own words back to her, helps her take a slow breath, and helps her think through what she wants to do next. It is a supportive journaling and self-reflection experience.

What it is not: Niyora is not a medical app, not therapy, and not a substitute for professional care. It makes no diagnostic or treatment claims. This is stated in the app's onboarding ("Not a doctor, not a therapist or a friend") and in the App Store description.

No account required: There is no sign-up, no login, and no demo credentials needed. Launch and use it directly.

Crisis and safety handling: Every entry is scanned on-device for self-directed crisis language before it is stored or sent anywhere. If that language is detected, the app does not send the text to the AI. Instead it shows a static, human-written screen pointing to real help: call or text 988 (US Suicide and Crisis Lifeline), text HOME to 741741 (Crisis Text Line), findahelpline.com (by-country directory), and a reminder to call local emergency services if in immediate danger. A separate, on-device check for disclosures of physical abuse surfaces the US National Domestic Violence Hotline (text START to 88788). None of these safety resources are AI-generated; they are fixed and human-reviewed.

Privacy and data: The user's entries, emotions, and history are stored only on the device, encrypted with AES using a key held in the iOS Keychain. There are no analytics or tracking SDKs and no ads. The only data that leaves the device is the user's reflection text, which is sent to Google's Vertex AI (Firebase AI Logic) so the AI can reflect it back. That backend runs under Google's enterprise terms: the content is not used to train models and is not reviewed by humans. The text is scrubbed of obvious personal details before it is sent. Requests are attested with Apple App Attest (App Check) so only the genuine app can reach the endpoint.

The AI's role is constrained by design: it can only echo the user's own words back, reorder a fixed authored list, or mechanically rewrite what she wrote. It cannot invent facts or generate free-form advice about her situation.

User-generated text: Entries are the user's own private writing, stored only on her device and never shared, published, or shown to other users. There is no social or public surface.

Subscription: The app is free to download and almost all of it is free to use. One flow, the "Moon" reflection flow, is free five times per calendar month and then asks for Niyora Premium, an auto-renewing subscription sold through StoreKit (monthly $8.99, yearly $29.99 with a 7-day free trial). Nothing is unlocked outside of in-app purchase, there is no external payment path, and there is no account. Breathing, cycle care, the written stories and the user's whole saved history stay free with no limit.

How to reach the paywall for review: the five free moments are counted from the moments saved on the device, so completing five reflections in the same calendar month brings up the subscription screen on the sixth. [If a faster route is provided for review, describe it here.]

Privacy policy: [PRIVACY_POLICY_URL]
Terms of use: https://niyora.com/terms

Please reach us at [REVIEW_CONTACT_EMAIL] with any questions.
```

---

## Section 5 — Required before submit (only Neha can do these)

Each is a concrete action in Neha's ASC account or infra. None can be done from code. The subscription items below are the checklist; the click-by-click version lives in `docs/premium-app-store-connect.md`.

- [ ] **Privacy policy URL.** Publish the policy page (a separate agent is creating it) and paste its URL into App Store Connect → App Privacy → Privacy Policy URL, and into the Notes for Review above. Placeholder: `[PRIVACY_POLICY_URL]`. Missing/dead link = automatic bounce (5.1.1).
- [ ] **Support URL / email.** Set the Support URL (`[SUPPORT_URL]`) and the review-contact email (`[REVIEW_CONTACT_EMAIL]`). Support URL must resolve.
- [ ] **Screenshots — 6.9" set (Neha is doing these).** Upload the required 6.9" iPhone screenshots showing the real Reflect / Steady / Respond flow. No medical-claim captions. Do not stage the crisis screen to look like a marketed feature. 6.9" is currently the required baseline size; ASC will scale for smaller devices, but confirm the set is complete at submission.
- [ ] **Build selection.** In the `3.0.0` version, select **build 33**. Confirm it is the Firebase AI Logic + App Check build (no Gemini API key in the bundle) and that it reaches the AI on a clean device with App Check enforcement ON.
- [ ] **Export compliance.** Answer the encryption question. The app uses only standard HTTPS/TLS and iOS-provided AES via Keychain (no proprietary/non-standard crypto), which qualifies for the standard exemption. Set `ITSAppUsesNonExemptEncryption` accordingly (typically answer "uses standard encryption → exempt"). Confirm this matches the Info.plist value in build 33.
- [ ] **Pricing.** App price stays **Free** (free to download). The money is in-app.
- [ ] **Paid Applications Agreement.** Under Business → Agreements, the Paid Applications Agreement must be active and the bank and tax details complete. Until it is, subscriptions cannot be sold and cannot even go "Ready to Submit". This is the slowest item on the page, so start it first.
- [ ] **Create both subscriptions.** `com.niyora.premium.monthly` ($8.99 / month) and `com.niyora.premium.yearly` ($29.99 / year) in one subscription group named Niyora Premium. Product IDs must match `src/lib/premium.ts` exactly.
- [ ] **7-day free trial on the yearly product only.** Add it as an introductory offer for new subscribers. The wall reads the trial off the product at runtime, so if the offer is missing or not approved, the "Start 7 days free" label just disappears with no error.
- [ ] **Both products "Ready to Submit", and attached to the version.** A product left in "Missing Metadata" or "Waiting for Review" returns nothing from StoreKit, and the wall shows "Premium is unavailable" with a dead buy button. Attach the subscriptions to the build so they are reviewed together with it.
- [ ] **Subscription review screenshot + localization.** Each product needs a review screenshot (use the real paywall) and a display name and description.
- [ ] **Terms of use live.** `https://niyora.com/terms` must resolve and must actually describe the subscription (name, price, period, auto-renewal, how to cancel). The paywall links to it (`src/components/paywall-view.tsx`) and Apple checks it. A dead or subscription-free terms page is a 3.1.2 bounce.
- [ ] **Privacy policy mentions the purchase.** `https://niyora.com/privacy` must be live and consistent with the label, including the new *Purchases* answer.
- [ ] **Sandbox test on a real device.** Buy monthly, buy yearly, restore on a second device, cancel, and confirm the trial shows. Confirm the gate opens straight after purchase and survives a relaunch.
- [ ] **Territories / availability.** The app's crisis + DV resources are US-only (988, 741741, 88788) with findahelpline.com as the by-country fallback on the suicide path. The DV path has no non-US fallback yet (crisis-audit M-2). Recommendation: **release US-only for 1.0**, or explicitly accept the non-US DV gap. Set availability territories to match that decision.
- [ ] **Age rating.** Enter the answers from Section 1 to land on 12+ / 13+.
- [ ] **App Privacy questionnaire.** Enter Section 3 exactly, after making the flagged Yes/No decisions (Health, Identifiers).
- [ ] **Rotate the old Gemini key.** Delete `EXPO_PUBLIC_GEMINI_API_KEY` from EAS envs and rotate the key that shipped in builds ≤28 (extractable). Infra hygiene, not an ASC field, but do it before public launch (launch-prep gate #1).

---

## Section 6 — Rejection-risk review (against current guidelines)

Each risk lists the relevant guideline, whether the app clears it, and any open action. Cross-checked against the live Apple App Store Review Guidelines (August 2026).

**1. Medical claims / greater scrutiny — Guideline 1.4.1.** 1.4.1 subjects apps that could be used for diagnosing or treating, or that make health-measurement accuracy claims, to greater scrutiny, and requires a "check with a doctor" reminder for medical apps. **Clears:** the app makes no diagnostic, treatment, or measurement claims; no sensors read vitals; description, subtitle, keywords, promo all avoid outcome verbs; Medical/Treatment Information age answer is None; category is Health & Fitness, not Medical. The "not a therapist, not medical advice, not a substitute for professional care, see 988" line is present in-app and in the description, which satisfies the spirit of the doctor-reminder expectation. **Open action:** re-read every string (including any future What's New) for outcome verbs before each release.

**2. Metadata accuracy — Guideline 2.3.1 / 2.3.8 / 2.3.12.** Functionality must be clear and honest; screenshots must be 4+ appropriate; What's New must describe real changes. **Clears** once screenshots show the shipped flow with no medical-claim captions and no staged crisis screen. **Open action:** confirm screenshots match the real UI; keep What's New free of feature claims that imply outcomes.

**3. Privacy policy present and complete — Guideline 5.1.1(i).** Requires a privacy-policy link in ASC and in-app that identifies data collected, third parties receiving it, and retention/deletion + how to revoke consent. **Does not clear yet** (policy not published). **Open action:** the published policy must name the one egress (reflection text to Google Vertex AI), state on-device encrypted storage, name no analytics/ads, and describe deletion (deleting the app / clearing on-device data, since there is no server-side account to delete). Link it in ASC and confirm it is reachable in-app.

**4. App Privacy label matches reality — Guideline 5.1.1 / 5.1.2.** The nutrition label must not contradict behavior. **Clears** if Section 3 is entered as written (User Content Yes, Health Yes, Identifiers Yes, all App Functionality / not linked / no tracking). **Open action:** make the two flagged Yes/No decisions and verify no analytics SDK is present.

**5. Third-party AI data sharing and consent — Guideline 5.1.2(i) (current wording).** The guideline now explicitly says you must "clearly disclose where personal data will be shared with third parties, including with third-party AI, and obtain explicit permission before doing so." Niyora sends the user's reflection text to Google (third-party AI). **Partially clears:** the sharing is disclosed in the description and review notes, and will be in the privacy policy. **Open action (real risk):** confirm the app obtains the user's consent to send text to the AI before the first send, or discloses it prominently at the point of use (not buried). If the current build only mentions this in onboarding copy, verify that is an explicit, user-visible disclosure. This is the single most current-guideline-specific item; do not skip it.

**6. Tracking / ATT — Guideline 5.1.2(i), App Tracking Transparency.** ATT prompt required only if tracking. **Clears:** no tracking, no IDFA, no cross-app data, so no ATT prompt is required. **Open action:** confirm no third-party SDK pulls in IDFA or tracking; keep the label's "Used for tracking" all No.

**7. Crisis / self-harm handling.** The guidelines have no dedicated crisis section, but 1.4.1 scrutiny and general safety expectations apply to a mental-health app that can receive self-harm content. **Clears:** on-device keyword scan runs before any storage or AI call; crisis text is never sent to the model; a static human-written screen surfaces 988, Crisis Text Line, findahelpline.com, and an emergency reminder; DV disclosures surface the National DV Hotline; all resources are human-reviewed, escalate-only, and current (verified in crisis-audit, both NO-GO blockers fixed). **Open action:** confirm the resource numbers are reachable at submission (988, 741741, 88788, findahelpline.com); if launching beyond the US, close the non-US DV fallback gap (crisis-audit M-2) first.

**8. In-app purchase and subscription rules, Guidelines 3.1.1 and 3.1.2.** 3.1.1 requires that anything unlocking features inside the app uses in-app purchase and nothing else. 3.1.2 adds, for auto-renewing subscriptions, that the app must clearly disclose the subscription name, length, price per period and what the subscription provides before purchase, must offer a restore path, and must carry functional Terms of Use and Privacy Policy links. **Clears on the code side:** the wall is StoreKit only through `expo-iap` (`src/app/paywall.tsx`), with no external payment link, no promo code prompt and no other way to unlock. `src/components/paywall-view.tsx` shows both plans with their StoreKit prices and periods, states "Payment is charged to your Apple Account. The subscription renews on its own unless you turn it off at least 24 hours before the period ends. Manage it in your Apple Account settings.", carries a "Restore purchase" action wired to `restorePurchases()` plus a re-read of the entitlement, and links Terms and Privacy on the wall itself. **Open actions:** (a) both products "Ready to Submit" so the wall shows real prices, a reviewer who sees "Premium is unavailable" files a 2.1 or a 3.1.2 rejection; (b) the description must carry the subscription name, price, period and both links, which Section 2 now does; (c) `https://niyora.com/terms` must be live and must describe the subscription; (d) confirm nothing outside StoreKit grants the entitlement in the shipped build.

**8b. Paywall preview flags must be off, Guideline 2.1.** `PAYWALL_PREVIEW` and `FORCE_PAYWALL` in `src/config/features.ts` exist for design work. With `PAYWALL_PREVIEW` on, the wall renders fixture prices and the buy button is wired to nothing, so nobody can subscribe and the screen still looks entirely normal. With `FORCE_PAYWALL` on, every Moon flow goes straight to the wall and the free allowance is unreachable. **Clears:** both are `false`, and `src/config/features.test.ts` fails while either is true. **Open action:** run `npx jest` on the release commit rather than trusting a read of the file.

**9. User-generated content safeguards — Guideline 1.2.** UGC apps need filtering, reporting, blocking, and published contact info when content is shared between users. **Clears:** entries are strictly private to the author's device, never shared, published, or shown to anyone; no social surface, so 1.2's obligations do not apply. Stated in the review notes.

**10. Minimum functionality / completeness — Guideline 2.1.** A crash or a dead AI path on review is a bounce; the reflect + memory features are recent (launch-prep). **Open action:** run the internal testing round to stability; confirm the Firebase AI Logic + App Check build actually reaches the AI on a clean device with App Check enforcement ON and no debug token.

### Summary of what is still open before submit
- Publish + link the privacy policy (risk 3).
- Enter the App Privacy label; make the Health and Identifiers Yes/No calls, and enter Purchases as Yes (risk 4).
- Subscriptions created, priced, trialled on yearly, and "Ready to Submit"; Paid Applications Agreement active (risk 8).
- `niyora.com/terms` live and describing the subscription; description carries the subscription block (risk 8).
- `npx jest` green on the release commit, which is what proves both paywall preview flags are off (risk 8b).
- Set the real version and build for the subscription release; 3.0.0 / build 33 is already public.
- Verify explicit user-facing consent/disclosure for sending text to third-party AI (risk 5) — most current-guideline-specific item.
- Confirm no analytics/tracking SDK in the dependency tree (risks 4, 6).
- Screenshots match shipped UI, no medical captions (risk 2).
- Decide territories; if non-US, close the DV fallback gap (risk 7).
- Verify build 33 reaches the AI with App Check ON, and rotate the old key (risk 10 + infra).

### Sources
- https://developer.apple.com/app-store/review/guidelines/
- https://developer.apple.com/app-store/app-privacy-details/
- https://developer.apple.com/app-store/user-privacy-and-data-use/
- https://blog.dashsdk.com/app-store-requirements-for-health-apps/
- https://www.c4tbh.org/apple-app-store-toughens-guidelines-for-health-apps/
- https://ptkd.com/journal/guideline-5-1-1-i-data-collection-and-storage-fix
