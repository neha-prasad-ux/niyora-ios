# Niyora — Post-onboarding dashboard + training (v3 plan)

What the app becomes *after* the V3 PMS assessment and result. Pairs with
`niyora-pms-flow-spec.md` (the acute calm flow it preserves) and the V3
onboarding in `src/app/onboarding-v3.tsx`. Obeys `DESIGN.md` and the copy voice
in `niyora-pms-HANDOFF.md`.

Status: **first cut BUILT (2026-07-08).** `src/app/home-v3.tsx` (dashboard, 5
cards + cycle-aware ordering + live wave strip) and `src/app/game-v3.tsx` (the
Irritability chapter, all six interactions + kind word), backed by
`src/store/training-v3.ts` and `src/v3/game-content.ts`. Flow: onboarding-v3 →
result → goal → `/home-v3` → Level card → `/game-v3`. Still stubbed: the read is
not persisted (skill seeds at a default, not the assessment), Today reps + Fact
game are light, only Irritability exists, goal screen is informational. This doc
still fixes the intended architecture, data wiring, tone, and open questions.

---

## The gap this closes

The V3 assessment computes a rich read of the user (severity `Level`, the
lifestyle `levers` to move, a `coping` standing, a cycle window) and then throws
all of it away: `finish()` in `onboarding-v3.tsx` does not persist anything, does
not set `onboarding-complete`, and just `router.back()`s. It is reachable only
from a `__DEV__` preview button. Meanwhile home (`src/app/index.tsx`) is a
generic calm tool that never uses the read.

This plan makes the read the spine of an ongoing PMS companion: a scrollable
dashboard that turns the diagnosis ("fix sleep / food / movement + learn to
manage stress") into a daily, cyclical, gamified practice.

Decision (locked): **V3 stays optional / coexists** with the current
`/onboarding`. The dashboard must degrade gracefully when there is no read.

---

## Governing principles (tone is load-bearing here)

This is a sensitive domain. The following are not style notes, they are the
guardrails that decide whether the product feels like an ally or a scold.

1. **Her reaction is valid. PMS turns up the volume.** The skill is never "don't
   feel it", it is "give yourself a beat so you choose your response instead of it
   choosing you." There is no wrong *feeling*, only strategies with better or
   worse *outcomes for her*. Every "correction" is about a strategy's consequence,
   never about her worth.
2. **Self-compassion is the foundation, not a level.** Opening with "fix your
   sleep, food, movement, and master your emotions" is a mountain of
   self-improvement that triggers shame, and shame kills follow-through
   (Neff; self-compassion supports health-behaviour change). Self-love threads
   through every surface and is a recurring daily beat, not a track you finish.
3. **No shame engine.** Checklist items are invitations that reset daily with no
   penalty for skips. Done is a quiet fill, never a scolding empty box. No streak
   guilt (per DESIGN.md).
4. **Protect "calm in 60 seconds."** The acute path stays instant. A stressed
   user must never face a lesson or a hub of tiles before relief (see ordering).
5. Privacy unchanged: nothing leaves the device, no new network, no accounts.

---

## Handoff + persistence (result → dashboard)

On the result screen's primary action, persist the read, then land on home. Small
surface:

- Write cycle answers to `src/store/pms-prefs.ts` (`pmsMode: true`,
  `lastPeriodStart`, `cycleLength`).
- Write a new **read blob** (new store, e.g. `src/store/pms-read.ts`):
  `{ level, levers, copingStanding, goal, completedAt }`.
- Set a new **read-complete** flag (separate from `onboarding-complete`, which
  stays owned by the old flow per the coexist decision).
- The user picks a **first goal** during/after the result (e.g. "tackle my
  emotions better with my partner"). Stored on the read blob; seeds the training
  track theme.

The read is otherwise **invisible on the acute home**: it silently tunes the
Calm-now pick and is reviewable/editable in My Soul. No "your level is severe"
banner looming over the home screen.

---

## The dashboard (scrollable home)

Five stacked cards. Ordering is **priced by the moment**: in her window or under
measured distress, **Calm now floats to the top**; otherwise training leads.

1. **The Soul** — always breathing, "match your breath." Ambient anchor, no CTA.
   Orb stays calm-blue always (DESIGN.md unchanged; the window is never signalled
   by orb hue).
2. **Today (PMS checklist)** — the daily hub. Cycle strip + next-window date,
   today's scenario rep, lifestyle lever(s), a self-compassion beat.
3. **Level (training)** — the journey view: current chapter, next unlock,
   progress. Its job is *progress/journey*; the checklist's scenario item is
   *"did today's rep."* Keep the two coordinated so they never feel redundant.
4. **Calm now → Begin** — the acute path, today's flow untouched
   (`niyora-pms-flow-spec.md`).
5. **Fact game** — 3-option card from the research docs.

No-read fallback: cards 2/3/5 collapse to a soft "get your read (2 min)" entry;
home behaves like today's generic calm screen.

---

## Training system

### Curriculum architecture

Three change-types, deliberately **not** on one difficulty ladder:

- **Foundation — self-compassion.** Framing under every level + a recurring daily
  beat. Not a track.
- **Regulate** (progresses) — the 5-move ladder: **Notice → Pause → Reframe →
  Respond → Repair.** This is the scenario game.
- **Restore** (repetition, not levels) — the lifestyle levers (sleep / food /
  movement) as small *experiments* tied to `SOURCES` (calcium/B6/meals, movement,
  sleep), never chores.

Delivered as **themed chapters** that interleave one Regulate lesson + one Restore
experiment + a self-compassion beat, so a week feels balanced, not preachy.

**Personalized entry from the read:** severe + disengaging coper → start Regulate
at Notice/Pause with heavy self-compassion; flagged food lever → Restore opens
with the meals experiment; goal = partner → scenarios themed to that relationship.

### Anatomy of a level (6 beats)

Each beat maps to a learning function and an existing content asset:

1. **Hook** — one fact in plain language (fact-card content bank).
2. **Scenario** — her real situation, per feeling + goal (e.g. "partner
   low-balled your effort, you're in your window").
3. **Notice** — body check: hungry? tense? shallow breath? (ties to `levers`,
   builds interoception).
4. **Choose** — pick a move; see each choice's *consequence*, never "wrong"
   (options drawn from `COPING_ITEMS` engagement vs disengagement).
5. **Rehearse** — actually drop into a real breathing session. **This is the hinge**
   that converts a quiz into a felt rehearsal (content: the 14 `ACTIVITIES`).
6. **Mission** — an if-then plan in her words ("when X in my window, I'll Y"),
   timed to `pms-window`.

Beats 1–4 are cognitive/fast; beat 5 is embodied; beat 6 exports to real life.

**Unlock (locked decision):** completing the *lesson in-app* unlocks the next
level (fast, high completion). The real-world **mission is a bonus** that earns
extra soul progress/rings — keeps momentum without faking mastery.

### Pick formats (beat 4)

Use format to match what each teaches; do not standardize on one:

- **Pick 1 of 2 — the everyday workhorse.** Discrimination (engagement vs
  disengagement), maps directly onto `COPING_ITEMS` tags. After she picks, **show
  the two futures**, never "wrong" ("push it down → the volume waits, it doesn't
  drop").
- **Reorder the steps — sparingly.** Teaches the regulate-before-respond sequence.
  Use once to teach the canonical order, then retire.
- **Build your own if-then — the mission.** Highest transfer; belongs at beat 6.
- (Optional later) **Branching outcome** for richer consequence teaching; higher
  content cost.

---

## PMS checklist ("Today")

**Adaptive cadence (locked):** light most days (1 scenario + a lever +
self-compassion); grows a "prep for your window" set as the window nears; softens
during the window itself.

Contents:
- **Cycle strip + next-window date.** The countdown belongs *here* (a prep frame),
  not on the acute home — "window opens in N days" reads as preparation, not dread.
  Source: `daysUntilPmsWindow` / `isInPmsWindow` in `src/lib/pms-window.ts`.
- **Today's scenario** — one training rep; pointer into the current level.
- **Lifestyle lever(s)** — personalized to her flagged levers (self-report tap).
- **Self-compassion beat** — "one kind word to yourself", every day (foundation).

Guardrail: skips carry no penalty; the list resets daily; quiet fills, no red.

---

## Fact game

3-option "what's correct", content from `SOURCES` (`src/v3/v3-content.ts`) and the
onboarding fact screens (hormone drop, levers, trainable brain). Make the two
distractors **plausible myths** ("PMS is just in your head", "you should be able
to push through it"), so choosing correct is a small act of self-validation, not
trivia.

---

## Code / data wiring

Reuses (no new engines):
- `src/models/recommend.ts` + `activities.ts` — already PMS-tagged (5
  `PmsFeeling`s, 6 `Need`s). The read *biases* what Calm-now surfaces; it does not
  select content.
- `src/v3/v3-content.ts` — `COPING_ITEMS` (answer options), `LEVER_ITEMS`,
  `SOURCES` (facts), `deriveLevel/deriveLevers/deriveCopingStanding`.
- `src/lib/pms-window.ts` — cycle strip, next-window, mission timing, home ordering.
- Tier system (`src/models/tiers.ts`) — soul progress / ring rewards for levels + missions.

New:
- `src/store/pms-read.ts` — the read blob + read-complete flag.
- `src/store/training.ts` — chapter/level progress, per-day checklist state.
- Result-screen handoff writes pms-prefs + pms-read, then routes to home.
- Home (`index.tsx`) becomes the scrollable dashboard with the 5 cards + ordering.

---

## Open questions (still to decide)

- **Goal picker:** where exactly does she choose her first goal — on the result
  screen, or a beat right after? What is the initial goal set beyond "partner"?
- **Scenario authoring:** how many scenarios per feeling/goal at launch, and who
  writes them (needs the same citation rigor as the rest of the app).
- **"Distress" signal for ordering:** what flips home to calm-first besides
  `isInPmsWindow` — the stress experiment (`STRESS_EXPERIMENT`)? a check-in?
- **Level ↔ checklist coordination:** exact division of labor so the two training
  surfaces never feel duplicative.
- **My Soul:** how the read is displayed/edited there (level, levers, cycle, goal).

---

## Suggested phasing

1. Persist the read + wire result → home (nothing user-visible changes yet).
2. Dashboard shell: the 5 cards + cycle-aware ordering, Calm-now unchanged.
3. PMS checklist (adaptive), reading levers + pms-window.
4. Fact game (cheapest self-contained win, content already exists).
5. Training: one Regulate track end-to-end (6-beat level), then Restore
   experiments, then self-compassion beats, then chapter interleaving.
