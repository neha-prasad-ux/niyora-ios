# Crisis & DV safety audit — Niyora iOS

Date: 2026-08-12 · Scope: end-to-end crisis and domestic-violence handling for the US App Store build.
Method: traced the deterministic keyword floor, the Vertex/Gemini AI classifier, every free-text entry
point, and all three crisis/DV surfaces. Read-only audit, no app code changed.

## What is sound (verified)

- **US resource numbers are all correct and current.**
  - `tel:988` · "Call or text 988 · Suicide & Crisis Lifeline" — correct (`crisis-scan.ts:141,152`).
  - `sms:741741` · "Text HOME to 741741 · Crisis Text Line" — correct (`crisis-scan.ts:142,152`).
  - DV: text START to `88788` (`sms:88788`) — correct; voice line `1-800-799-7233` correct (in a
    comment, not surfaced) (`crisis-scan.ts:99,107,104`).
  - `findahelpline.com` — correct international directory (`crisis-scan.ts:143,152`).
- **Escalate-only holds.** Every AI result only ever calls `setCrisis(true)` (moment.tsx:1041, 1530,
  2793, 2836); the only `setCrisis(false)` is the manual "let me rephrase" button (moment.tsx:3638).
  The model cannot suppress the keyword floor. Confirmed sound.
- **Keyword floor runs on raw text before any model/storage** in `analyse()` (`moment-analyse.ts:54`)
  and before the AI beat calls. Good ordering.
- **Acute-vs-historical is handled** where it can be: `classifyCrisis` stops the flow only on
  `acuity === 'acute'` (moment.tsx:1039); the keyword floor is acuity-blind and deliberately
  over-triggers, which is the correct asymmetry for self-harm language.
- **AI layer is actually enabled in the store build**: `eas.json` production sets
  `EXPO_PUBLIC_MOMENT_AI=1`, and `GoogleService-Info.plist` is a real config (not a stub), so the
  recall layer is live in production (subject to App Check — see High-2).
- Abuse scan is subject-gated and idiom-safe; tests cover the asymmetry well
  (`crisis-scan.test.ts`).

---

## CRITICAL

### C-1 · Keyword floor misses common self-harm phrasings; offline = no net at all
`src/lib/crisis-scan.ts:22-51` (`CRISIS_PHRASES`)

**Risk.** The list covers "kill myself / suicide / want to die / hurt myself" etc., but omits several
of the most common concrete self-harm disclosures: **"hang myself", "overdose"/"od", "take all my
pills", "jump off"/"jump in front of", "shoot myself", "slit my wrists", "don't want to wake up",
"want it to be over", "kill me".** The AI classifier (`classifyCrisis`) is meant to catch these, but
it needs the network and a successful Vertex call. Niyora is explicitly designed to work **offline**
(the whole Moon flow degrades to authored copy with no connectivity). Offline, or on any AI failure
(see High-2), the keyword floor is the *only* net — and it lets these phrasings straight through to
the normal emotional-support flow. That is a real miss of active self-harm intent, which the brief
names as the worst possible failure.

**Fix.** Add the missing self-harm phrases to `CRISIS_PHRASES` (they are unambiguous and self-directed,
so over-trigger risk is negligible): `hang myself`, `hanging myself`, `overdose`, `over dose`, `od on`,
`take all my pills`, `all these pills`, `jump off`, `jump in front`, `shoot myself`, `slit my wrists`,
`slit my wrist`, `dont want to wake up`, `don't want to wake up`, `want it to be over`, `kill me`.
Keep the existing word-boundary matching. Add each to `crisis-scan.test.ts` "must trigger". This is a
data-only change to the guaranteed offline layer.

---

## HIGH

### H-1 · Acute DV / violence / overdose escalation shows the WRONG resources
`src/app/moment.tsx:3614-3640` (`Crisis()`), `crisisType` captured at 1040, 1529, 2792, 2835 but never read; TODO at `moment.tsx:278`

**Risk.** `classifyCrisis` distinguishes `violence_to_her`, `child_harmed`, `overdose`, etc., and the
caller stores it in `crisisType.current`. But the `Crisis()` screen renders the **static suicide-
oriented `CRISIS_COPY`** (988 / Crisis Text Line / findahelpline) regardless of type — `crisisType.current`
is never read (the comment at :278 says "page rework reads crisisType.current"; that rework was never
done). So when the AI escalates an **acute domestic-violence disclosure**, the flow stops and the woman
is shown a suicide hotline, not the DV hotline. The DV number (`88788` / `1-800-799-7233`) lives only in
`DV_RESOURCE`, which surfaces on the *respond* step — a step an acute crisis never reaches because the
crisis screen halts the flow. Net: an acute DV escalation gets suicide resources and no DV line.

**Fix.** Make `Crisis()` type-aware. When `crisisType.current` is `violence_to_her` / `child_harmed`,
prepend a DV block (text START to 88788, voice 1-800-799-7233, findahelpline, and 911-first framing)
above/instead of the suicide lines. Minimal version: branch the `lines` array on `crisisType.current`.
The DV numbers already exist in `crisis-scan.ts` — reuse them, don't re-declare.

### H-2 · AI recall layer fails OPEN on every failure, with zero production telemetry
`src/lib/moment-gemini.ts:419-431` (`classifyCrisis`), 425-430 (parse catch → null)

**Risk.** `CRISIS_SYSTEM` says "when unsure, treat it as a crisis," but the *code* never blocks on its
own failures. A malformed-JSON reply (`JSON.parse` throws → `catch` returns `null`, :429-430), a
timeout/safety-block/empty body (`callGemini` → `'fail'` → `null`), and offline (→ `null`) all return
`null`, which the caller treats as "no crisis." So the layer you are relying on for recall is
fail-open, not fail-safe. Worse, the only visibility into whether it ever fires is `__DEV__`-gated
`console.log`s (moment-gemini.ts:428, callGemini diagnostics) that are stripped from the store build —
if App Check attestation, the Vertex API enablement, or the model id silently breaks in production, the
whole recall layer is off and nobody would know; the flow just degrades to authored copy + keyword-only
crisis (which has C-1's gaps).

**Fix.** (a) Do not rely on the AI layer as a *guarantee* — fix C-1 so the deterministic floor stands on
its own. (b) Add a minimal production signal (a counter/analytics event on `classifyCrisis` returning
non-null vs. throwing) so you can confirm the recall layer is actually alive in the shipped build. (c)
Optional: on a *parse* failure where the raw text contained a hedge like `"isCrisisMode":true`, treat it
as a block rather than null (recall-first as the comment claims).

### H-3 · Secondary text surfaces have keyword-only coverage, no AI recall, no DV handling
`src/app/rough-moment.tsx:370` and `src/components/activity/WriteView.tsx:59`

**Risk.** Two live free-text surfaces run only `scanForCrisis` (keyword floor): the Steady-yourself
Reflect session (`rough-moment.tsx`, reachable via `steady-yourself.tsx:131`) and the journaling
activity (`WriteView.tsx`, reachable via `activity.tsx:96`). Neither runs `classifyCrisis` (AI recall)
nor `scanForAbuse` (DV). A self-harm disclosure that the keyword list misses (C-1) is uncaught on these
surfaces even when online. `rough-moment` additionally sends her text to a model when `REFLECT_AI` is on.

**Fix.** Route these fields through the same guard the Moon flow uses. Simplest: extract the moment.tsx
send-guard (keyword floor + `classifyCrisis` escalate + `scanForAbuse`) into one helper and call it from
all three surfaces, so coverage can't drift per screen. At minimum, fixing C-1's keyword list closes the
worst gap for these too.

---

## MEDIUM

### M-1 · Echo-correction re-entry skips the AI + abuse guard
`src/app/moment.tsx:2207-2211`

The "say it again" field (after she marks the echo wrong) runs only `analyse()` (keyword floor); it does
not call `classifyCrisis` or `scanForAbuse`, unlike every other entry point in the file (send:1037,
sendChat:1526, submitMoreContext:2789, refineDraft:2832). Inconsistent recall on a live free-text field.
**Fix:** add the same `classifyCrisis(...).then(...)` + `scanForAbuse` block used by the other entries.

### M-2 · Non-US users get no safe fallback on the DV path
`src/lib/crisis-scan.ts:96-107` (`DV_RESOURCE`, `DV_URL`)

Requirement #3 (non-US → safe fallback) is met on the *crisis* screen (findahelpline.com is present and
labelled "by country"), but **not** on the DV path. `DV_RESOURCE` is US-only ("National DV Hotline",
`sms:88788`), is not even labelled "US", and offers no international pointer. A non-US user with abuse
detected gets a US text short-code that does nothing on her carrier, and no alternative. The code comment
already flags "US default; localise before release" — not done. **Fix:** add a findahelpline.com
(or website) line to `DV_RESOURCE` and label the US line as US, mirroring `CRISIS_COPY`.

### M-3 · Duplicated crisis URLs drift risk
`src/app/(tabs)/you.tsx:118-124`

`you.tsx` re-declares its own `CRISIS_URLS` + `openCrisisLine` instead of importing from
`crisis-scan.ts`. Numbers currently match, but if the canonical list is ever corrected (e.g. adding a
DV line), this copy silently stays stale and dials the wrong place. **Fix:** import `openCrisisLine`
from `@/lib/crisis-scan`; delete the local copy.

### M-4 · Text lines don't prefill the required keyword
`src/lib/crisis-scan.ts:152` (`sms:741741`), `:107` (`sms:88788`)

Crisis Text Line needs "HOME" and the DV line needs "START" as the first message. Both URLs open an
empty composer; the labels instruct her, but a distressed user may send anything, and an empty/other
first message may not engage the service. iOS supports body prefill. **Fix:** use `sms:741741&body=HOME`
and `sms:88788&body=START`. Low effort, meaningfully higher connect rate.

---

## Go / No-Go

**NO-GO for shipping to strangers until C-1 and H-1 are fixed.**

- **C-1** is a live path to missing active self-harm intent (offline or on any AI failure) because of
  concrete keyword gaps. It is a data-only fix and must land before release.
- **H-1** means an acute domestic-violence disclosure is shown suicide resources with no DV number — a
  mishandled crisis in an app whose DV handling is a headline feature.

Both are small, contained changes. **H-2 and H-3** should land in the same pass (they are what make the
keyword floor the real guarantee it needs to be, and close the secondary surfaces). The Medium items are
polish/robustness and can follow, except **M-2** which should ship before any non-US availability.

Once C-1, H-1, H-2, H-3 are addressed and the crisis unit tests are extended to cover the new phrases and
the type-aware DV screen, this is safe to ship to the US store. The architecture (deterministic floor +
escalate-only AI recall, raw-text-first ordering, correct current US numbers) is fundamentally sound; the
gaps are in coverage breadth and in wiring the DV type through to the screen, not in the design.
