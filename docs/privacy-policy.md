# Niyora Privacy Policy

Last updated: 12 August 2026

Niyora is a reflection app for hard emotional moments. This policy explains, in plain terms, what data the app handles, what stays on your phone, what leaves it, and why. It describes the app as it is actually built, not as a wish list.

If anything here is unclear, contact us at neha@luminik.io.

## The short version

- Niyora has no accounts. There is no sign-up, no login, and we never ask for your name or email.
- The things you write, the feelings you name, and your history of moments are stored only on your device, encrypted. They are never uploaded to any server we run. We cannot see them.
- To write a reflection back to you, and to check whether a moment needs crisis resources, the app sends the text you wrote to Google to be processed by an AI model. That is the only thing that leaves your phone.
- We do not sell your data. We do not use it for advertising. Your text is not used to train Google's AI models and is not read by a human as a matter of routine.
- Niyora is not a medical, therapy, or crisis service.

## What data exists, and where it lives

Everything you create in Niyora stays on your device:

- The text you write in a moment.
- The feeling you name (for example "hurt" or "anxious") and its grouping.
- Any response or message you draft.
- Your history of past moments, which the app uses to show you your own patterns over time.

This history is kept in the app's private, iOS-sandboxed storage, and the sensitive parts (the text you wrote and any response you drafted) are additionally encrypted with AES-256. The encryption key is generated on your device and held in the iOS Keychain, set so it does not sync to iCloud or to device backups. That key never leaves your phone, and neither does the encrypted content. There is no copy on a server we control, because there is no such server and no account to tie it to.

The stored history is capped at the most recent 300 moments; older ones fall off automatically.

## What leaves your device, to whom, and why

One thing, and only one thing, leaves your device: the text you write, sent for AI processing.

To turn what you wrote into a reflection, the app sends that text to Google. It travels through Firebase AI Logic to Google Cloud's Vertex AI service and is processed by the model `gemini-2.5-pro`. The generated reply comes back to your phone. This is what makes the reflections possible: an AI cannot respond to your words without receiving your words.

The same path is used for crisis detection. When you write a moment, the text is also sent to the AI to judge whether the moment calls for real-world crisis resources rather than the app's normal flow. This is a safety check; it can only add crisis resources, never remove them.

Because this is a direct call from your phone to Google, Google also receives your device's network (IP) address as part of the request, as with any internet connection.

We use Google Cloud's Vertex AI under its enterprise terms. Under those terms, the text you send is not used to train or improve Google's AI models, and it is not reviewed by a human by default. Google processes it to generate the response and according to its own Google Cloud data handling commitments. We do not receive a copy, and we do not store it on our side.

To make sure only the genuine Niyora app can use this AI connection, the app uses Firebase App Check with Apple's App Attest. This attests that the request comes from the real, unmodified app on a real device. It is an anti-abuse measure; it does not identify you.

## The partial redaction, honestly

Before your text is sent to Google, the app runs an automatic scrub that replaces certain personal details with neutral stand-ins, and swaps your real words back into the reply when it returns. The scrub removes:

- Email addresses.
- Phone numbers.
- Names when a relationship or title makes it clear a person is meant (for example "my sister Sarah" or "Dr Patel"), and your own name when you introduce it ("my name is ...", "I'm ...").

Be aware of what this does not do. The scrub is deliberately careful, not exhaustive. A bare name with no cue around it (for example "Sarah slapped me") is not caught and will be sent. Short numbers and other identifying details may pass through. Most importantly, the emotional content of what you write, the situation, the feelings, the story, is sent as written, because that is exactly what the AI needs in order to respond. If you would not want a specific detail to leave your device, do not write it.

## What we do not do

- We do not sell or rent your data to anyone.
- We do not use your data for advertising, and there is no advertising in the app.
- There are no third-party analytics or tracking SDKs in the app. We do not track your behaviour across apps or websites.
- We do not build a profile of you, and there is no account to attach one to.
- Your text is not used to train our or Google's AI models.

## Retention and deletion

Because your moments live on your device, you control them. You can delete your history from within the app, and deleting the app removes the stored data and the encryption key from your device. We hold nothing to delete on our end, because we never received it.

The text sent for AI processing is handled by Google to generate the response under the Vertex AI enterprise terms described above; we do not retain it.

## Children

Niyora is intended for adults. It is not designed for or directed at children, and it is not a substitute for the care a young person in distress needs. You must be at least 16 years old to use Niyora. We do not knowingly collect data from children, and because the app has no accounts, we do not collect identifying information from anyone.

## Niyora is not a medical or therapy service

Niyora is a self-reflection tool. It is not a medical device, not therapy, not counselling, and not a crisis service. It does not diagnose, treat, or provide professional mental-health advice, and the AI reflections are not the words of a clinician. If you are struggling, please reach out to a qualified professional. If you are in crisis or think you may be in danger, contact your local emergency services or a crisis line right away. The app may surface crisis resources, but it cannot replace real help and should never be relied on as your only source of support in an emergency.

## Your controls

- Use of the AI reflections requires an internet connection; without one, the app falls back to its own written responses and nothing leaves your device.
- You can delete your moment history in the app at any time.
- You can remove all data by deleting the app.
- You decide what you write. The most reliable privacy control is choosing what to put into a moment.

## Changes to this policy

If we change how the app handles data, we will update this policy and change the date at the top. Because there are no accounts, we cannot notify you directly; please check back here.

## Contact

Questions about privacy: neha@luminik.io

---

## Note for the team (not part of the published policy)

The App Store requires a publicly reachable privacy-policy URL at submission, entered in App Store Connect and linked from the app. This document needs to live at a stable public URL before you submit.

Recommended path: publish it at `https://niyora.com/privacy` on the existing site (a static `/privacy` page rendered from this Markdown is enough, no app work needed), and reuse that same URL for the App Store Connect "Privacy Policy URL" field and the App Store data-disclosure answers. Keep the answers consistent with this text: no data linked to identity (no accounts), no tracking, and disclose the one outbound flow (user-written text sent to Google for AI processing and safety classification).

Two things to keep honest as the code changes:
- The model constant in `src/lib/moment-gemini.ts` is `gemini-2.5-pro`. If it is bumped, update the name here.
- The PII scrub in `src/lib/pii.ts` is partial by design. If it is ever moved server-side or upgraded to full NER, revise the "partial redaction" section.

This is a plain-language, accurate description of the current build, not vetted legal boilerplate. For a US-primary mental-health app with global users, a review by a privacy lawyer is advisable before launch, particularly on minimum-age wording (COPPA and, for EU/UK users, GDPR/UK-GDPR age-of-consent thresholds) and on the App Store data-disclosure answers.
