# Full audit of the Niyora V3 update — design, information architecture, code quality

You are auditing **Niyora**, an iOS PMS/cycle-wellness app (Expo SDK 56, React Native, TypeScript, expo-router). Act as four reviewers in one: a world-class product designer (ex-Flo/Headspace caliber), a senior consumer-app copywriter, a growth/retention product lead (Duolingo/Flo caliber), and a staff mobile engineer. The benchmark is **revenue-generating wellness apps: Flo, Me+, Breathe**. The goal of this audit is to find everything standing between the current build and "million-dollar company" polish — mature copy, cohesive visual language, refined motion and haptics, smooth screen changes, and a well-thought-through information architecture.

**This is a report-only task. Do not modify any code.** The output is a prioritized findings report I will hand off for fixing.

## Read these first (design intent — audit against it, don't reinvent it)

- `docs/pms/niyora-pms-visuals.md` — the PMS visual language (palette, wave motif, motion) was deliberately **locked on 2026-07-08**. Deviations from it in code are findings; proposing a new visual direction is not.
- `docs/pms/niyora-pms-dashboard-v3-plan.md`, `docs/pms/niyora-pms-game-design.md`, `docs/pms/niyora-emotion-bank.md`, `docs/pms/niyora-pms-flow-spec.md`, `docs/pms/niyora-pms-HANDOFF.md`, and the rest of `docs/pms/` — the specs the V3 surfaces were built from. Spec-vs-implementation gaps are findings.

## Scope — the V3 surfaces (all in this repo, branch `feat/pms-couples-section`)

1. **V3 onboarding** — `src/app/onboarding-v3.tsx`, progress persistence in `src/store/onboarding-v3-progress.ts`, facts in `src/lib/onboarding-facts.ts`, content in `src/v3/v3-content.ts`. Includes the resume card, evidence leaderboard, plan page, and the new multi-add past periods flow (`src/components/period-calendar.tsx`, `period-sheet.tsx`).
2. **V3 home / dashboard** — `src/app/home-v3.tsx`, `src/components/luteal-card.tsx`, `chapter-card.tsx`, `checklist.tsx`, the quiz card, `src/app/pms-readiness.tsx`, `src/store/pms-readiness.ts`.
3. **Emotion-training game** (Irritability, Anxiety, Mood swings chapters; 5 levels; gold clean-run ring) — `src/app/game-v3.tsx`, `train.tsx`, `result.tsx`, `my-soul.tsx`; content and mechanics in `src/v3/` (`game-content.ts`, `brain-path.ts`, `v3-points.ts`, `v3-graphics.tsx`, `v3-theme.ts`); progress in `src/store/training-v3.ts`.
4. **Couples section, "Us vs. the PMS"** — `src/app/couples.tsx`, `couples-prep.tsx`, `couples-quiz.tsx`, `couples-reconnect.tsx`, `couples-texts.tsx`, `src/components/couples-finale.tsx`. Four activities reworked into a game UI, plus a message flow and finale.
5. **Theme layer** — `src/theme/` (colors, fonts, spacing, typography) and `src/v3/v3-theme.ts`, and how consistently every V3 screen actually uses them.

## Track 1 — Design quality, experience, motion, haptics

For every screen in scope, evaluate with `file:line` evidence:

- **Copy**: tone consistency and maturity (warm, confident, never gimmicky or clinical-cold); sentence-case discipline; button/error/empty-state microcopy; any dev-ish or placeholder copy; framing of medical/scientific claims (numbers must read as credible, sourced, non-alarmist). For the couples screens specifically: partner-facing copy must avoid blame or "crazy hormonal woman" stereotyping — audit for sensitivity. Propose concrete rewrites, not just critiques.
- **Visual consistency**: hardcoded colors/sizes vs theme tokens; one-off font sizes or weights; border-radius and shadow drift between screens; spacing scale violations; whether V3 screens and the couples game UI read as one product.
- **Motion design**: screen-to-screen transitions (animated vs abrupt), reanimated spring/timing config consistency (is there a shared motion vocabulary, e.g. `src/lib/motions.ts`, or ad-hoc configs everywhere?), celebration moments (clean-run ring, finale), progress animations, staggering, easing quality.
- **Haptics**: map every `expo-haptics` call; find missing moments (selection, correct/wrong answer, level complete, streak, finale) and inconsistent vocabulary (e.g. success = `notificationAsync(Success)` on one screen, `impactAsync(Heavy)` on another).
- **States**: loading, empty, error, interrupted/resume, repeat-play, quit-mid-flow — for onboarding, game, and couples.
- **Accessibility**: touch targets ≥44pt, `accessibilityLabel`/`Role` coverage, contrast risks in the palette, reduced-motion handling.

## Track 2 — Information architecture maturity

- Map the actual navigation graph from `src/app/_layout.tsx` and `index.tsx`: entry decisions, route naming, depth. Does the structure read as deliberate or accreted?
- V1/V3 coexistence: `onboarding.tsx` vs `onboarding-v3.tsx`, home vs `home-v3.tsx`, `game-v3.tsx` — is there a coherent migration story, dead routes, or duplicated concepts (`activity.tsx` vs the couples activities)?
- Dashboard hierarchy: what does `home-v3.tsx` communicate in the first two seconds? Is the card order intentional (cycle state → today's action → training → couples), and does it scale as features are added?
- Naming coherence across routes, stores, and content modules (e.g. "train" vs "game" vs "chapters"; "my-soul"; "pms-readiness" vs "checklist").
- Where a user could get lost: back behavior, cross-links between game and home, how couples is discovered.

## Track 3 — Habit formation, retention loops, and the reminder system

The product thesis is: **the more consistently a user returns, the better her PMS window goes.** Retention here is not a growth trick — it is the treatment mechanism. Audit whether the app is actually built to create that habit. Benchmark against Duolingo's streak system, Flo's daily insights, and Me+'s routine loops. Stay on the right side of the line: we want habit-forming toward a health outcome, never dark patterns (guilt, manufactured anxiety, punishing lapses).

- **Map the core loop as built**: trigger → action → variable reward → investment (Hook model) for each surface — daily training (`game-v3.tsx`, `v3-points.ts`, the clean-run ring), the dashboard, and couples. Is there a clear *daily* reason to open the app, or only session-sized content that runs out? Where does the loop break?
- **The reminder loop, end to end**: `src/lib/notifications.ts`, `pms-reminders.ts`, `nudge-policy.ts`, `stress-nudge.ts`, `comeback-nudge.ts`, `src/store/nudge-history.ts`, `reminder-prefs.ts`, `comeback-nudge.ts`. Audit: when is notification permission requested (is the ask primed with value first?); notification copy quality; cadence and quiet-hours policy; whether reminders are **cycle-aware** (a nudge 3 days before the luteal window is the killer trigger — does it exist?); what happens after a user ignores 2–3 nudges; the lapsed-user comeback path.
- **Streaks and loss aversion**: `src/store/streak-freeze.ts`, points in `src/v3/v3-points.ts`. Is the streak visible on the home screen? What breaks it, how does freeze/recovery work, is a broken streak framed with grace (recovery) or guilt? Is there any variable reward (surprise bonus, changing daily content) or is every reward predictable?
- **Investment mechanics**: what accumulates that makes leaving costly and returning valuable — logged periods, training progress, readiness score, the partner in the couples loop (a second human is the strongest retention hook in the app: does anything bring the *partner* back, or prompt the user because of the partner?).
- **Progress → outcome legibility**: does the UI ever close the loop "you trained 5 days → your readiness is up → this PMS window should feel easier"? Is there a post-cycle moment ("how was this one vs last?") that proves the app works and re-commits the user for the next cycle? If not, that's likely the single biggest retention gap — say so and design the moment.
- **Missing hook opportunities**: list concrete, ethical hook candidates found in the existing code/content (e.g. daily 2-minute drill, luteal-countdown card, partner nudge, cycle recap) ranked by expected retention impact vs build cost.

## Track 4 — Code quality

- Run the CI suite locally and report results verbatim: `npx tsc --noEmit && npm run lint && npm test` (~33 pre-existing lint *warnings* are known and fine; errors are not).
- Architecture: god-component risk (measure line counts of `onboarding-v3.tsx`, `game-v3.tsx`, `home-v3.tsx`, the couples screens); separation of content vs presentation vs state; duplication across the five couples screens and across V3 surfaces.
- State: consistency of the `src/store/` patterns (persistence, hydration, migration safety for `onboarding-v3-progress` and `training-v3`).
- Tests: what content/logic modules have tests (`src/v3/*.test.ts`, `src/store/training-v3.test.ts`, `src/lib/pms-window.test.ts`) and what critical logic is untested (points economy, streak logic, couples content).
- Perf: reanimated worklet hygiene, re-render risks on the dashboard, heavy graphics components (`v3-graphics.tsx`, particles) mounted where they shouldn't be.
- Known repo pitfalls to check for (these have failed CI before): `StyleSheet.absoluteFillObject` (TS error on this SDK), `setState` inside `useEffect` (`react-hooks/set-state-in-effect` is an **error** here), lockfile drift after dependency changes.

## Method

Read the specs first, then audit each surface against them. Use parallel subagents per track/surface if helpful, but verify every finding against the actual code before reporting — no plausible-but-unchecked claims. Every finding needs a `file:line`.

## Deliverable — a single report, structured exactly like this

1. **Executive summary** — 10 lines max: overall verdict, the 3 biggest gaps to the Flo/Me+/Breathe bar, scorecard (0–10) for: copy, visual consistency, motion, haptics, IA, habit/retention loop, states/edge cases, accessibility, code quality.
2. **Findings backlog** — grouped P0 (ship-blocking / brand-damaging) / P1 (important) / P2 (polish). Each finding: `file:line`, what's wrong, why it matters at this quality bar, and the concrete fix — including rewritten copy where the finding is copy.
3. **Keep these** — 5–10 things already at or above the bar, so fixes don't regress them.
4. **Fix plan** — a phased sequence I can execute next: Phase 1 quick wins (< 1 day), Phase 2 consistency passes (haptics vocabulary, motion vocabulary, token sweep), Phase 3 structural work (IA/refactors, retention-loop builds like the cycle-aware reminder or post-cycle recap). Order by user-visible impact.
