# Niyora PMS v1 — Alfred handoff scope

Repo: **neha-prasad-ux/niyora-ios** (the Expo app, `ios-v1/`). Alfred picks up issues labeled `agent:implement`, skips `needs:human-scope` / `do-not-pickup`.

## Source specs (must be committed into the repo first — see Task 0)
- `niyora-pms-flow-spec.md` — screen-by-screen flow (2 gates, swipe-deck result, closure).
- `niyora-pms-activities.md` — 14 new activities, 4 card types, data model.
- `niyora-pms-understand-content.md` — Understand cards (general + pms contexts), verified, with source links.
- HTML design prototypes (visual reference only, not to be ported verbatim): `niyora-pms-cards-animated.html`, `niyora-pms-scenes.html`.

## Global constraints (apply to EVERY task)
- Read `ios-v1/AGENTS.md` first. CI must be green: `npm ci && npx tsc --noEmit && npm run lint && npm test`. Zero lint errors, clean tsc, passing tests.
- Branch + PR for every change; never commit to main. Maintainer merges.
- Obey `ios-v1/DESIGN.md`: calm in 60 seconds, one primary action per screen, motion is an inhale not a bounce, dark mode only.
- Copy voice: neutrally warm, casual, affirmative (avoid "not…not…" chains), **no em dashes**, no instructional tips, never "it's fine/it's normal". Sentence case for human copy, lowercase for tiny labels, UPPERCASE only for BEGIN.
- Privacy: nothing leaves the device. No new data collection, no network.

## Tasks (ordered; labels in brackets)

### Task 0 — Land the spec docs in-repo  [agent:implement]
Copy the four spec `.md` files above into `ios-v1/docs/pms/`. Docs only, no code. Unblocks every other task's references.
Acceptance: files present under `docs/pms/`; CI green.

### Task 1 — Relabel feelings to the 5 PMS feelings + multi-select  [agent:implement]
In `src/models/recommend.ts`, replace `FEELINGS` with: irritable, anxious, low, foggy, overwhelmed. Re-point each feeling's `short` (mindfulness id) / `long` (breathing id) / `oneMin` per the table in `docs/pms/niyora-pms-flow-spec.md` (irritable→be-kind/cooling, anxious→five-senses/wind-down, low→hold-yourself/belly, foggy→five-senses/alternate-nostril, overwhelmed→soft-gaze/ocean).
**Multi-select:** the feeling step allows selecting MORE THAN ONE (cap 3). Rules: one tap still works and can proceed (multi is optional, not required); the FIRST selected feeling is "primary" and drives the orb color + the need pre-fill; extra selections refine ranking only. (The "what you need" step in Task 4 is likewise multi-select with the same primary rule.) Because multi-select needs a "done"/proceed affordance, `RecommendSheet` changes beyond a relabel.
Files: `src/models/recommend.ts` (+ `recommend.test.ts`), `src/components/RecommendSheet.tsx`.
Acceptance: 5 PMS feelings shown; single-tap-and-proceed works; up to 3 selectable; primary drives orb/prefill; recommend() handles a feeling set; tests; CI green.

### Task 2 — New Activity data model + 14 activities  [agent:implement]
Add `src/models/activities.ts`: the `Activity` type (cardType nudge/write/read/action, modality, fits[PmsFeeling], timeSeconds, fast, mode, benefit, why, plus type-specific fields) and the 14 activities exactly per `docs/pms/niyora-pms-activities.md`. Provide a selector `activitiesForFeeling(feeling)`. No UI yet.
Acceptance: compiles; data matches spec; selector unit-tested; CI green.

### Task 3 — Understand content data  [agent:implement]
Add `src/models/understand.ts`: the Understand cards from `docs/pms/niyora-pms-understand-content.md`, each tagged `context: 'general' | 'pms'` + feeling + the source link. Both context sets verbatim (do not reword — copy is fact-checked). Add a test asserting no `—` characters exist in any card body.
Acceptance: both contexts present; em-dash guard test passes; CI green.

### Task 4 — "What you need" step + ranked recommend  [agent:implement]  (depends on 1, 2)
Add the `need` axis (settle / cool off / lift / rest / let it out) with feeling→need defaults (anxious→settle, irritable→cool off, low→lift, foggy→lift, overwhelmed→settle). Add a second, pre-filled step to `RecommendSheet` after the feeling step; this step is ALSO multi-select (cap 3, primary-first, pre-filled from the primary feeling). Change `recommend(feelings[], needs[], minutes)` to return a HERO + an ordered list drawn from `[...techniques, ...activities]` normalized to one card shape, ranked by **union** of the selected feelings/needs (items matching more selections rank higher). Keep total question gates at two (feeling, need); time handled downstream.
Acceptance: feel→need flow works, multi-select with pre-fill, union ranking; returns hero+list; tests; CI green.

### Task 5 — Home + notifications copy to PMS  [agent:implement]
(a) `src/app/index.tsx`: returning-user card copy → "Feeling off today?" / "made for how you are right now". (b) Repoint the daily reminder copy (`src/lib/notifications.ts`) to the PMS voice and add an optional user-set "rough week" heads-up using existing reminder-prefs. Gentle, never nags, opt-in.
Acceptance: copy updated, opt-in only, CI green.

### Task 6 — Result swipe-deck UI  [agent:implement]  (FOUNDER APPROVED)
Calm two-way swipe deck (left=next, right=bring back, tap a dot to jump, first card=recommendation), solid cards, slow eased motion (drift ~0.8s, gentle ~7° tilt, card glides under finger). Build to match the approved prototype `docs/pms/niyora-pms-cards-animated.html` (mechanics + motion). Can be built now with placeholder card visuals; the scenes (Task 7) layer in on the card backgrounds, so this does not wait on Task 7.
Acceptance: two-way swipe + dot-jump + first-card-is-hero; solid cards; calm motion; consumes the ranked list from Task 4; CI green.

### Task 7a — Living activity scenes, non-pose  [agent:implement]  (FOUNDER APPROVED, depends on 6)
Per-activity full-card scenes (native, Skia/Reanimated) for all activities that do NOT show a human figure: cold water (soft droplets), make-something-warm (cozy mug + curling tea smoke), slow walk (sunset: low sun, dusk gradient, drifting clouds), journaling (ink lines writing + clearing), photograph-the-sky (drifting clouds + soft sun + frame corners), breathe (orb + emanating rings), understand (soft violet glow). Match the approved prototype `docs/pms/niyora-pms-scenes.html`. Motion is calm/breath-paced, respects reduce-motion.
Acceptance: each non-pose scene renders full-bleed behind the card text with a legibility scrim; calm motion; CI green.

### Task 7b — Pose scenes (human figures)  [needs:human-scope]
Scenes that show a body pose: legs up the wall, child's pose, a few stretches. BLOCKED: founder will supply the pose images/illustrations (the prototype's line figure was rejected). Do not pick up until the images are provided and this is re-labeled.

### Task 8 — Post-activity: felt delta + "recommend to a fellow human?"  [agent:implement]  (depends on 4)
Extend the existing post-session flow (`PostSessionMood`): (a) show the felt delta plainly ("you came in heavy, you're a little lighter"); (b) ask, warmly, **"Would you recommend this to a fellow human?"** as a one-tap yes / not-for-me. **Strictly on-device** — store locally only and feed it into the local recommend ranking so activities she recommends surface higher for HER next time. NOTHING leaves the phone (preserves the privacy promise). End on closure ("you did that"), then ONE optional "want one more?" — never an auto-pushed next card.
Acceptance: delta shown; recommend prompt one-tap + opt-in + on-device only (no network); ranking consumes it; gentle copy; CI green.

### Task 11 — Anonymous opt-in rating contribution  [needs:human-scope — V2, NOT v1]
Founder idea: let users optionally share a 1-5 rating (+ maybe a short review) to a shared pool so Niyora can recommend better to everyone ("Want to share your opinion to help others feel calm?"). **DO NOT build in v1.** This crosses the "nothing leaves your iPhone" promise and requires a backend the app intentionally does not have, plus health-data/GDPR handling and review moderation. Must be designed deliberately as a v2 feature: explicit opt-in (off by default), fully anonymous (no identity, no cycle/personal data), aggregate-only, free-text handled carefully or omitted. Blocked pending founder + privacy design.

### Task 9 — Write the activity content  [needs:human-scope]
The 14 activities reference content that is NOT written yet: the tender story + light read (Read & shift), the journaling prompt + park-it prompt (Express), the repair bridge-text template (Repair), and any nudge/"why" copy beyond what's already in the spec. Must be drafted in the neutrally-warm voice and founder-reviewed (same bar as the Understand cards — no em dashes, affirmative, fact-respecting). Not autonomous: founder/assistant drafts, then a follow-up wires it into the data. BLOCKED until drafted + approved.

### Task 10 — Activity experience components  [mixed]  (depends on 2, 9)
The screen reached after tapping begin on a non-session card. Each calm, on-brand, NOT the particle session:
- Nudge (walk, cold water, warm, yoga, small win, retreat) → suggestion + "why" + soft done/confirm. [agent:implement]
- Write (journaling, park-it) → a calm on-device text surface. [agent:implement]
- Read (story, light read, Understand cards) → a quiet reading layout. [agent:implement]
- Action (repair) → editable prefilled message to copy/send. [agent:implement]
- Capture (photograph the sky) → camera capture, stays on device, never required. [needs:human-scope — privacy + permission UX needs design]

## Ready now vs blocked
- Ready (`agent:implement`): Tasks 0,1,2,3,4,5,6,7a,8 + the agent-ready parts of 10 (nudge/write/read/action screens) — model, content, flow, copy, the approved swipe deck, the non-pose scenes, post-activity loop, basic activity screens.
- Blocked (`needs:human-scope`): Task 7b (pose scenes — founder supplying images), Task 9 (content writing), Capture in Task 10, Task 11 (v2 shared-pool ratings) — pending founder images/content/design.

Doesn't block the in-flight launch; PMS is the next chapter.
