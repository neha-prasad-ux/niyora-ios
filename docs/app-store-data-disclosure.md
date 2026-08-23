# Niyora — App Store "App Privacy" data disclosure (2026-08-12, subscription added 2026-08-23)

The exact answers for the App Store Connect **App Privacy** questionnaire, mapped to
Apple's data-type categories. Derived from the real architecture, not aspiration:
`src/store/moment-history.ts` (on-device encrypted memory), `src/lib/moment-gemini.ts`
(the single AI egress), `src/lib/pii.ts` (the scrub), `src/lib/firebase.ts` (App Check),
`src/lib/premium.ts` and `src/app/paywall.tsx` (the subscription), and `docs/launch-prep.md`
gate #1.

## The one thing to understand first

Apple defines **"Collect"** as: *transmitting data off the device in a way that allows
you and/or your third-party partners to access it for a period longer than the time
necessary to service the transmitted request in real time.*

Niyora has exactly **one** event that meets this definition: when the AI flag is on and
Firebase is configured, the text the user writes in a moment is sent to **Google
(Firebase AI Logic → Vertex AI)** to generate a reflection and to run crisis detection
(`callGemini` in `src/lib/moment-gemini.ts`, the single choke point for both the reflect
beats and `classifyCrisis`). That is the only user content that leaves the device to a
developer/partner server.

Everything else — every emotional entry, feeling, drafted response, thread/subject, and
the whole moment history — is stored **on-device only**, AES-encrypted with an iOS
Keychain key (`src/store/moment-history.ts` + `secure-box`). On-device storage is **not
"collection"** under Apple's definition (it never leaves the device to us). iOS sandbox
encryption at rest is not a transmission.

There is **no account, no sign-in, no email collection, no analytics SDK, no advertising,
no third-party tracking, no IDFA**. Firebase Auth + Firestore were added then reverted
(launch-prep note, 2026-08-11); only AI Logic + App Check remain. Because there is no
identity, **nothing collected can be "Linked to you," and nothing is used for "Tracking."**

The app now sells an auto-renewing subscription, **Niyora Premium**
(`com.niyora.premium.monthly`, `com.niyora.premium.yearly`). It is StoreKit only, through
the `expo-iap` library, with no payment SDK, no server of ours, and no receipt validation
anywhere off the device. The purchase happens between the user and her Apple Account;
we never see a card, a name, or an Apple Account identifier. The only trace inside the app
is a boolean cached in AsyncStorage under `niyora:premium` (`src/lib/premium.ts`), which
never leaves the phone. This adds one **Yes** to the questionnaire, **Purchases**, and it
is a conservative Yes. See category 11 and flag 7.

Before send, `scrub()` swaps emails, 10–15 digit phone numbers, and cue-marked names for
reversible stand-ins. It is precise, not exhaustive: bare standalone names ("Sarah slapped
me") and short numbers pass through on purpose. **The emotional content itself is fully
sent** — the scrub reduces identifiers, it does not de-identify the writing. Answer the
questionnaire as if the raw emotional text reaches Google, because in substance it does.

Vertex backend = Google Cloud enterprise terms: the text is **not used for model training
and not human-reviewed by default**. So the purpose is **App Functionality** only — never
tracking, ads, or training.

---

## Category-by-category answers

### 1. Contact Info
- **Collected? No.**
- The app has no accounts and never asks for name, email, phone, or address. Emails and
  phone numbers a user happens to type into an entry are scrubbed by `pii.ts` before the
  AI send and are otherwise stored on-device only. Nothing here is transmitted to us as
  contact info.

### 2. Health & Fitness  — ⚠️ NUANCED, DOUBLE-CHECK (see flags)
- **Collected? Yes (recommended, conservative).** Subtype: **Health**.
  - **Linked to identity? No** (there is no identity).
  - **Used for tracking? No.**
  - **Purpose: App Functionality.**
  - Justification: Niyora is a mental-health app; the emotional text sent to Vertex AI to
    generate a reflection and run crisis detection reveals the user's mental/emotional
    state, which is user-provided health data. The same off-device transmission that makes
    "User Content" collected also carries health-revealing content, so it is disclosed here
    too. **No HealthKit, no structured fitness/vitals, no medical records are read** — this
    is free-text the user chose to write, not sensor or clinical data.

### 3. Financial Info
- **Collected? No.**
- The app sells an auto-renewing subscription, but it never touches financial data. Payment
  is handled entirely by Apple through StoreKit: no card number, billing address, bank
  detail, or credit score reaches the app, and there is no payment processor, no server of
  ours, and no receipt sent anywhere. Apple's *Financial Info* covers payment instruments
  and financial account data, none of which the app collects. The fact **that** she bought
  something is disclosed under *Purchases* (category 11), which is where Apple puts it.

### 4. Location
- **Collected? No.**
- The app calls no CoreLocation / location API and derives no coarse or precise location.
  (Google/Vertex necessarily sees the device **IP address** on each AI request — the proxy
  that would have hidden it was dropped, launch-prep gate #1. Apple's *Location* type is
  about location the app itself collects; a partner receiving an IP to service a real-time
  request is not app-collected Location. Noted under Identifiers/flags, not here.)

### 5. Sensitive Info
- **Collected? No.** — ⚠️ see flags.
- Apple's *Sensitive Info* is a specific enumerated list (racial/ethnic data, sexual
  orientation, pregnancy or childbirth information, disability, religious or philosophical
  beliefs, trade-union membership, political opinion, genetic or biometric data). Niyora
  does not solicit or structure any of these as a data category. The free-form emotional
  text is disclosed as **User Content**; Apple does not require enumerating every sensitive
  thing a user *might* type into a free-text box as separate Sensitive Info collection.
  (General mental-health state is not on Apple's Sensitive Info list — it is handled under
  Health & Fitness above.)

### 6. Contacts
- **Collected? No.**
- No access to the device address book.

### 7. User Content  — PRIMARY DISCLOSURE
- **Collected? Yes.** Subtype: **Other User Content**.
  - **Linked to identity? No** (there is no identity).
  - **Used for tracking? No.**
  - **Purpose: App Functionality.**
  - Justification: the moment text the user writes (and, where present, the drafted
    response) is transmitted to Google Vertex AI to generate the reflection and to run
    crisis detection. This is data transmitted to a third party to service the app's core
    function; it is not retained for training, not human-reviewed, and not tied to any
    identity. On-device history is not part of this disclosure (never leaves the device).

### 8. Browsing History
- **Collected? No.** The app has no web browsing.

### 9. Search History
- **Collected? No.** The app has no search feature.

### 10. Identifiers  — ⚠️ NUANCED, DOUBLE-CHECK (see flags)
- **Collected? Likely Yes (conservative).** Subtype: **Device ID**.
  - **Linked to identity? No.**
  - **Used for tracking? No.**
  - **Purpose: App Functionality.**
  - Justification: Firebase AI Logic + App Check rely on a Firebase installations
    identifier and an App Check (Apple App Attest) attestation token sent to Google to
    prove the request comes from the genuine, unmodified app (`src/lib/firebase.ts`). These
    exist for anti-abuse/attestation, never for advertising or cross-app tracking, and no
    IDFA is requested. If the developer confirms Firebase transmits an installations ID,
    disclose Device ID as above. **No User ID** (no accounts).

### 11. Purchases  (⚠️ CONSERVATIVE YES, see flags)
- **Collected? Yes (recommended, conservative).** Subtype: **Purchase History**.
  - **Linked to identity? No.** The app has no accounts, no sign-in, and no user ID, so
    there is nothing for a purchase to be linked to. `src/lib/premium.ts` stores one
    boolean, `niyora:premium`, in the app's own AsyncStorage and reads the live answer back
    from StoreKit with `hasActiveSubscriptions`. Nothing is ever sent to us, and nothing
    ties a purchase to a person on our side.
  - **Used for tracking? No.** No advertising, no data broker, no cross-app or cross-site
    matching, no IDFA. Nothing about the purchase is combined with any other data.
  - **Purpose: App Functionality.** The entitlement exists only to open the Moon flow past
    the free monthly allowance (`canOpenMoment`). It drives no analytics, no messaging, and
    no personalization.
  - Justification: the app sells `com.niyora.premium.monthly` and
    `com.niyora.premium.yearly` through StoreKit via `expo-iap`. Apple, as the store,
    necessarily has the purchase; we do not, and no third party does. Answering **Yes** here
    is the safe reading and carries no penalty when it is not linked and not used for
    tracking. See flag 7 for why **No** is arguable but not recommended.

### 12. Usage Data
- **Collected? No.**
- No analytics SDK, no product-interaction telemetry, no advertising data. launch-prep
  confirms "No analytics, so lean on testers." `expo-iap` is a StoreKit wrapper and sends
  no telemetry of its own. (Verify no analytics rides in via a dependency — see flags.)

### 13. Diagnostics
- **Collected? No.**
- No Crashlytics, Sentry, or other crash/performance SDK is wired (launch-prep lists only
  AI Logic + App Check on the Firebase side). Crash data Apple auto-collects via
  TestFlight/Xcode is Apple's, not a developer disclosure. (Verify no crash SDK — flags.)

### 14. Other Data
- **Collected? No.**

---

## Flags — verify before you submit (wrong answers get apps pulled)

1. **Health & Fitness (the #1 call).** Recommended **Yes/Health** as the conservative,
   non-penalized answer, because the emotional content is health-revealing. It is
   *defensible* to answer **No** and rely solely on the *User Content* disclosure, arguing
   the text is free-form user content and no HealthKit/structured health data is collected.
   Under-disclosure is what gets apps pulled; over-disclosing Health for App Functionality
   (not linked, no tracking) carries no penalty. If undecided, keep **Yes**. Decide
   deliberately and keep the reasoning.

2. **Identifiers / Device ID.** Confirm whether `@react-native-firebase` transmits a
   Firebase installations ID (FID) and/or a persistent App Check token to Google for AI
   Logic. If yes (most likely), disclose **Device ID → App Functionality, not linked, no
   tracking**. If you can confirm the App Attest assertion is ephemeral and no installations
   ID is sent, **No** becomes defensible. Err toward disclosing.

3. **Sensitive Info.** Answer is **No**, but confirm you are comfortable that the cycle /
   PMS context which can appear in an entry (the reflect prompts reference the user's cycle)
   is treated as Health, not as Apple "pregnancy or childbirth information." Menstrual-cycle
   context is health data, not the enumerated pregnancy/childbirth item, so **No** here holds
   — but this is the second thing App Review may probe for a women's-health-adjacent app.

4. **"Collected" hinges on Google's retention.** The Health/User Content **Yes** answers
   assume the text may be retained beyond the real-time request (e.g. Vertex abuse-logging).
   That assumption is the safe one and matches conservatism. Do **not** downgrade to "Data
   Not Collected" on the theory that Vertex processes transiently unless you have configured
   and verified zero-retention / abuse-logging-off on the Vertex backend and are willing to
   defend it. Keep **Yes**.

5. **Analytics / Diagnostics = No** depends on no telemetry SDK slipping in via a
   dependency. Do a quick check of the dependency tree for any analytics/crash reporter
   (Firebase Analytics, Crashlytics, Sentry, Amplitude, PostHog) before certifying No.

6. **PII scrub is not de-identification.** Do not represent the AI send as anonymized. The
   scrub removes some direct identifiers but sends the full emotional narrative. The
   disclosures above already treat the raw text as sent — keep them that way.

7. **Purchases Yes vs No.** **Yes** is the recommendation and the safe answer. The argument
   for **No** is real and worth knowing, because a reviewer may ask: under Apple's own
   definition of "Collect", nothing about the purchase is transmitted off the device to us
   or to a partner. StoreKit is Apple's, the entitlement boolean never leaves the phone,
   there is no receipt validation server, and no third party is in the path. Some
   StoreKit-only apps answer **No** on exactly that basis. Answer **Yes** anyway: it costs
   nothing when the answer is not linked and not tracking, whereas a label that says "no
   purchase data" on an app with a visible paywall is the kind of mismatch that reads as
   under-disclosure. Do not answer Yes to *Financial Info*; that one is genuinely No.

8. **Purchases does not depend on the AI flag.** Unlike every other Yes in this document,
   the subscription is in the build unconditionally. Even a build shipped with AI off still
   sells Premium, so *Purchases* stays **Yes** in every configuration. Only the
   User Content, Health and Identifiers answers move with `EXPO_PUBLIC_MOMENT_AI`.

## Summary table

| Apple category      | Collected | Linked | Tracking | Purpose          |
|---------------------|-----------|--------|----------|------------------|
| Contact Info        | No        | –      | –        | –                |
| Health & Fitness ⚠️ | Yes*      | No     | No       | App Functionality|
| Financial Info      | No        | –      | –        | –                |
| Location            | No        | –      | –        | –                |
| Sensitive Info      | No        | –      | –        | –                |
| Contacts            | No        | –      | –        | –                |
| User Content        | Yes       | No     | No       | App Functionality|
| Browsing History    | No        | –      | –        | –                |
| Search History      | No        | –      | –        | –                |
| Identifiers ⚠️      | Yes*      | No     | No       | App Functionality|
| Purchases ⚠️        | Yes*      | No     | No       | App Functionality|
| Usage Data          | No        | –      | –        | –                |
| Diagnostics         | No        | –      | –        | –                |
| Other Data          | No        | –      | –        | –                |

*Conservative recommendation pending the flagged verification above.

Note: if the store build ships with `EXPO_PUBLIC_MOMENT_AI` off or Firebase unconfigured,
there is **no AI egress at all** and the Health & Fitness, User Content and Identifiers
"Yes" answers become **No** (the app is fully on-device for those). The questionnaire must
describe the build you actually submit, so if AI is on in the shipped build, disclose as
above. **Purchases is the exception and stays Yes either way**, because the subscription is
in the build unconditionally.
