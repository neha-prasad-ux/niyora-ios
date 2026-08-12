# Niyora — US App Store listing + reviewer prep

Draft for the US App Store (App Store Connect app `6764561688`, bundle `com.niyora.app`, version 3.0.0). Written to match the app's copy tone: normal capitalization, no em dashes, warm and specific, no wellness padding. Every user-facing string below carries its Apple character limit next to it.

HARD RULE followed throughout: no medical claims. Niyora is not therapy, does not treat, diagnose, or cure anything, and says so plainly. It is a reflection tool.

---

## 1. Store metadata (character-limited fields)

### App name (limit 30)
```
Niyora
```
6 / 30. Brand only. Clean and defensible.

Optional search-weighted alternative if you want a descriptor in the name field:
```
Niyora: Sit With the Moment
```
27 / 30. Use one or the other, not both. The plain "Niyora" is the safer brand choice; the longer form buys a little keyword surface.

### Subtitle (limit 30)
```
Reflect through hard moments
```
28 / 30.

Alternatives, all within 30:
- `A calm place for hard moments` (29 / 30)
- `Write it out, feel steadier` (27 / 30)

### Promotional text (limit 170)
Editable any time without a new build. Good spot for the honest one-liner.
```
When a moment knocks you sideways, write it here. Niyora reflects your own words back, helps you steady, and lets you decide what to do next. Private, on your device.
```
166 / 170.

### Keywords (limit 100, comma-separated, no spaces between terms to save characters)
```
reflection,journal,emotions,mood,feelings,calm,vent,breathe,self care,mindful,women,anxiety,stress
```
98 / 100.

Notes on keyword choices:
- No "therapy", "therapist", "counseling", "depression", "PTSD", or "treatment". Those read as medical/health claims and invite both rejection and mismatched expectations.
- "anxiety" and "stress" are common, allowed emotional-state terms and are not claims to treat a condition. Keep them out of the description as verbs (do not say "reduces anxiety").
- The app name and subtitle are already indexed by Apple, so do not repeat "reflect" or "Niyora" here.

---

## 2. Full description (limit 4000)

Below is 1,738 / 4000 characters. Warm, honest, benefit-led, no medical claims, includes the not-a-therapist line and the crisis line.

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

Free to use.
```

Character-count note: this is well under the 4000 limit, leaving room if you want to add a short "What's new" style paragraph or a founder line later. Do not add feature claims that imply outcomes ("feel less anxious", "heal", "recover"). Keep every benefit phrased as what the app lets *her* do, not what it does *to* her.

---

## 3. Category recommendation

Primary: **Health & Fitness.**
Secondary: **Lifestyle.**

Why Health & Fitness over Medical:
- **Medical** is for apps that manage a condition, provide clinical/diagnostic information, or act as a medical device. Niyora deliberately does none of that, and picking Medical would set an expectation (and a review bar) the app should not meet.
- Health & Fitness is where mindfulness, journaling, mood, and reflection apps live (Calm, Headspace, Reflectly, Daylio, Finch all sit here). It matches user expectation and search behavior.
- The trade-off: Health & Fitness apps get extra reviewer scrutiny on claims and data. That is fine here because the listing makes no medical claims and the privacy story is strong. Section 6 covers the specific triggers.

Lifestyle as secondary widens discovery to the journaling/self-improvement audience without implying a clinical purpose.

---

## 4. Age rating

Apple's rating flows come in two shapes right now depending on when your App Store Connect account was migrated: the classic content questionnaire (None / Infrequent-Mild / Frequent-Intense per category) and the newer age-band system (4+, 9+, 13+, 16+, 18+). Answers for both are below and they land in the same place.

**Recommended result: 12+ (classic) / 13+ (new bands).**

Why not lower: the app deliberately handles self-harm and domestic-violence disclosures. Even though it only ever surfaces protective resources and never depicts or instructs, rating it 4+/9+ while the app knowingly touches those themes is the kind of mismatch reviewers reject and that gets escalated later. 12+ is honest about the subject matter.

Why not higher: 17+/18+ implies mature/graphic content the app does not contain, and it shrinks the audience and can trigger extra parental-gate friction for no benefit. The app has no violence, sexual content, profanity as content, gambling, or drug references. Pushing to 17+ would be over-rating.

### Classic questionnaire answers (produces 12+)
- Cartoon or Fantasy Violence: **None**
- Realistic Violence: **None**
- Prolonged Graphic or Sadistic Realistic Violence: **None**
- Sexual Content or Nudity: **None**
- Profanity or Crude Humor: **None** (the user may type anything, but the app's own content has none; user-generated text is covered in Notes for Review, not here)
- Alcohol, Tobacco, or Drug Use or References: **None**
- Mature/Suggestive Themes: **Infrequent/Mild** ← this is the single answer that carries the rating to 12+. It reflects the crisis and DV subject matter.
- Simulated Gambling: **None**
- Horror/Fear Themes: **None**
- Medical/Treatment Information: **None** ← important. Answering anything else here signals a medical claim the app does not make. The crisis resources are support referrals, not medical/treatment information.
- Unrestricted Web Access: **No** ← the app opens two curated external links (findahelpline.com and the telephone/SMS handoffs). That is not an embedded, unrestricted web browser, so this is No. If you ever add an in-app web view, revisit this.
- Gambling and Contests: **No**

### New age-band questionnaire answers (produces 13+)
- Violence (all types): **None**
- Sexual content, nudity: **None**
- Profanity, crude humor: **None**
- Alcohol, tobacco, drugs: **None**
- Gambling: **None**
- Horror/fear: **None**
- Medical or wellness information: **None** (reflection tool, no medical/treatment info)
- References to self-harm or suicide: **Yes, and the app provides supportive resources / does not encourage it.** Apple's newer flow asks specifically about self-harm references. Answer truthfully that they appear and that the app's handling is protective (surfaces hotlines, blocks that text from reaching the AI). This is what moves the band to 13+, and answering it honestly is what keeps you out of a rejection later.
- Mature themes: **Mild/Infrequent** (domestic-violence support referral)
- Unrestricted internet access: **No**

If the new flow offers a "does not encourage, provides resources" qualifier for the self-harm question, select it. It keeps the band at 13+ rather than escalating to 16+/18+.

---

## 5. Notes for App Review (App Store Connect "App Review Information" > Notes)

Paste this into the Notes field. No demo account is needed (the app has no login).

```
Thank you for reviewing Niyora.

What the app is: Niyora is a private, on-device reflection tool. A user writes about a difficult moment in her own words. The in-app AI ("Moon") reflects her own words back to her, helps her take a slow breath, and helps her think through what she wants to do next. It is a supportive journaling and self-reflection experience.

What it is not: Niyora is not a medical app, not therapy, and not a substitute for professional care. It makes no diagnostic or treatment claims. This is stated in the app's onboarding ("Not a doctor, not a therapist or a friend") and in the App Store description.

No account required: There is no sign-up, no login, and no demo credentials needed. Launch and use it directly.

Crisis and safety handling: Every entry is scanned on-device for self-directed crisis language BEFORE it is stored or sent anywhere. If that language is detected, the app does not send the text to the AI. Instead it shows a static, human-written screen pointing to real help: call or text 988 (US Suicide & Crisis Lifeline), text HOME to 741741 (Crisis Text Line), findahelpline.com (by-country directory), and a reminder to call local emergency services if in immediate danger. A separate, on-device check for disclosures of physical abuse surfaces the US National Domestic Violence Hotline (text START to 88788) quietly and never labels the user. None of these safety resources are AI-generated; they are fixed and human-reviewed.

Privacy and data: The user's entries, emotions, and history are stored only on the device, encrypted with AES using a key held in the iOS Keychain. There are no analytics or tracking SDKs and no ads. The only data that ever leaves the device is the user's reflection text, which is sent to Google's Vertex AI (Firebase AI Logic) so the AI can reflect it back. That backend runs under Google's enterprise terms: the content is not used to train models and is not reviewed by humans. The text is scrubbed of obvious personal details before it is sent. Requests are attested with Apple App Attest (App Check) so only the genuine app can reach the endpoint.

The AI's role is constrained by design: it can only echo the user's own words back, reorder a fixed authored list, or mechanically rewrite what she wrote. It cannot invent facts or generate free-form advice about her situation.

User-generated text: Entries are the user's own private writing, stored only on her device and never shared, published, or shown to other users. There is no social or public surface.

Privacy policy: [INSERT PRIVACY POLICY URL]

Please reach us at [INSERT SUPPORT EMAIL] with any questions.
```

Fill in the two bracketed placeholders before submitting. The privacy policy URL is also a hard requirement of the App Privacy section, not just these notes.

---

## 6. Rejection-trigger checklist for mental-health apps

The triggers below are the ones Apple most often bounces mental-health/wellness apps on. Each is paired with how this listing and app clears it. Verify every row before submitting.

- [ ] **Medical claims (Guideline 1.4.1 / 2.3 accurate metadata).** Risk: any wording that implies the app treats, diagnoses, cures, or reduces a condition. Cleared: the description, subtitle, keywords, and promo text make zero medical claims. Benefits are framed as what the user does (reflect, steady, respond), never as clinical outcomes. Keywords exclude "therapy", "depression", "treatment". **Action: re-read every string above and any future "What's new" text for outcome verbs before each release.**

- [ ] **"Not a doctor / not a therapist" disclaimer present and honest.** Risk: apps in this space that imply professional care without saying they are not it. Cleared: onboarding states "Not a doctor, not a therapist or a friend"; the description and review notes both carry the full "not a therapist, not medical advice, not a substitute for professional care" line.

- [ ] **Crisis handling (Guideline 1.4.1 and general safety expectations).** Risk: a mental-health app that could receive self-harm content and mishandle it. Cleared: on-device keyword scan runs before any storage or AI call; crisis text is never sent to the model; a static screen surfaces 988, Crisis Text Line, findahelpline.com, and an emergency-services reminder. DV disclosures surface the National DV Hotline. All resources are human-written and human-reviewed, never AI-generated. **Action: confirm the resource numbers are current and reachable at submission time (988, 741741, 88788, findahelpline.com).**

- [ ] **Privacy: App Privacy "nutrition label" matches reality (Guideline 5.1.1).** Risk: data-disclosure answers that contradict the app's behavior. Cleared story: entries/emotions/history are on-device only and AES-encrypted with a Keychain key; no analytics or ad SDKs; the only egress is PII-scrubbed reflection text to Google Vertex AI under enterprise no-train/no-human-review terms. **Action: fill the App Privacy questionnaire to match this exactly. Do not mark "Data not collected" if the AI text egress counts as collection under Apple's definition; disclose the "User Content" sent to the AI service and mark it not linked to identity and not used for tracking. Confirm with the Firebase/Vertex data terms before finalizing.**

- [ ] **Privacy policy URL present (Guideline 5.1.1(i)).** Risk: missing or dead privacy-policy link is an automatic bounce. Cleared: N/A until provided. **Action: publish the privacy policy and add its URL to both App Privacy and the Review Notes.**

- [ ] **In-app purchase rules (Guideline 3.1.1).** Risk: charging outside IAP, or a subscription without required disclosures. Cleared: the app is **free with no in-app purchases, no subscriptions, and no paywall** in the shipped build. Nothing to disclose. **Action: keep it free for 1.0; if you add paid tiers later, they must use StoreKit IAP and add the subscription disclosures.**

- [ ] **User-generated content safeguards (Guideline 1.2).** Risk: UGC apps need moderation/reporting when content is shared between users. Cleared: entries are strictly private to the author's device and never shared, published, or shown to anyone else. There is no social surface, so the 1.2 UGC obligations do not apply. Stated in the Review Notes.

- [ ] **Data collection consent / tracking (Guideline 5.1.2, ATT).** Risk: tracking without App Tracking Transparency prompt. Cleared: no tracking, no IDFA use, no cross-app data. No ATT prompt required because nothing is tracked. Confirm no third-party SDK pulls this in.

- [ ] **Accurate metadata and no placeholder content (Guideline 2.3).** Risk: screenshots or text that oversell or misrepresent. Cleared once screenshots show the real Reflect / Steady / Respond flow and the crisis screen is not staged to look like a feature. **Action: ensure screenshots match the shipped UI and carry no medical-claim captions.**

- [ ] **Minimum functionality / completeness (Guideline 2.1).** Risk: the app is days-old and bugs are still surfacing (per launch-prep). A crash on review is a bounce. **Action: run the internal testing round to stability before submitting, and confirm the Firebase AI Logic + App Check build actually reaches the AI on a clean device with no debug token.**

---

## Pre-submit punch list (cross-refs to docs/launch-prep.md)

1. Fill the two placeholders in the Review Notes: privacy policy URL and support email.
2. Publish the privacy policy and complete the App Privacy questionnaire to match Section 6.
3. Confirm the shipped build uses Firebase AI Logic + App Check (no API key in the bundle) and that the old key is rotated. This is gate #1 in launch-prep and it blocks a clean submission.
4. Verify crisis and DV resources end to end on-device (launch-prep gate #3).
5. Set the age rating per Section 4.
6. Screenshots reflect the real flow, no medical-claim captions.
```
```
