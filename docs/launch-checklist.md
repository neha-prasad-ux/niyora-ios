# Niyora launch checklist

Living list of what has to be true before Niyora ships to real users. Grouped by
risk. `[x]` done, `[ ]` pending, `[~]` built but not yet live/verified.

Owner shorthand: **N** = Neha (needs her account/creds/decision), otherwise code.

---

## 1. Privacy: her words leaving the device

The Moon flow sends her (scrubbed) words to Google. This section is the contract
that her identity is protected. See `proxy/README.md`.

- [x] Content scrub before send: email / phone / cued names, reversible (`src/lib/pii.ts`, tested)
- [x] App talks only to our proxy, never Google directly (`src/lib/moment-gemini.ts`)
- [x] Proxy forwards no identity (no device id, account, IP, or client headers) (`proxy/server.js`)
- [x] Deploy script ready, one command (`proxy/deploy.sh`)
- [ ] **N** Deploy proxy to Cloud Run (`brew install gcloud` → `gcloud init && gcloud auth application-default login` → `PROJECT=<id> ./deploy.sh`)
- [ ] **N** Verify the live Vertex call works; fix `thinkingConfig` field for gemini-3.6 if Vertex rejects it (error body shows the right name)
- [ ] **N** Confirm the proxy runs on **Vertex AI** (enterprise no-train / no-human-review terms), funded by the Google-for-Startups credits, NOT the consumer free tier
- [ ] **N** Rotate the old Gemini API key that was pasted in chat; delete `EXPO_PUBLIC_GEMINI_API_KEY` from `.env.local` and any build config
- [ ] **N** Set `EXPO_PUBLIC_PROXY_URL` + `EXPO_PUBLIC_PROXY_SECRET` in the production build env
- [ ] **N** Swap the proxy's shared-secret gate for **Firebase App Check** (a bundle secret is extractable)
- [ ] **N** Privacy policy states plainly: what is sent to Google, that it is not used to train, that entries stay on-device otherwise

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

- [ ] **N** App Privacy "nutrition labels": declare sensitive/emotional data + that it is sent to a third-party AI processor
- [ ] **N** Age rating set (emotional-health content)
- [ ] **N** In-app account + data deletion path, if there are accounts (App Store requires it)
- [ ] **N** Export-compliance / encryption question answered
- [ ] **N** Screenshots, description, keywords, support URL
- [ ] **N** Any health-data (HRV) disclosures, if that ships in v1

## 5. Build & release hygiene

- [ ] No dev flags, no diagnostic logs, no secrets in the production bundle
- [ ] `npx tsc --noEmit` clean and `npx jest` green on the release commit
- [ ] Production build via EAS / TestFlight smoke-tested on a real device (not just simulator)
- [ ] Commit the ~11 uncommitted files in the tree (or confirm they're excluded intentionally)

---

_Add items as they surface. When one becomes live-verified, move `[~]`/`[ ]` → `[x]` with a date._
