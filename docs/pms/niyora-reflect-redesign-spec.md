# Niyora — Reflect redesign spec (v1)

Turning the cycle-end reflection from a form she endures into a loop she comes back
for. Rebuilds `src/app/reflect.tsx` and touches the impact data model
(`src/store/cycle-impact.ts`) and the You chart (`src/app/(tabs)/you.tsx`,
`EffortImpactCard` / `EffortChart`). Obeys `DESIGN.md` and the neutrally-warm voice
([[brand-voice]]). Builds on the existing Reflect flow ([[now-reflect-flow]]) and the
result-screen ladder ([[result-screen-ladder]]).

## The problem this solves

Reflect is already short, but it is **all deposit, no withdrawal**: she rates work,
partner, and yourself, taps Save, and gets nothing back in the moment. The payoff —
*"is it working?"* — lives on a different tab (`you.tsx`, the effort·impact card) she
may never scroll to. So the loop that would justify the effort is invisible at the
exact moment she pays for it. If she doesn't reflect, we can't see whether the app is
helping her, and can't help her better. The redesign makes the payoff land **inside**
the flow, the instant she finishes.

A second, smaller problem: the current slider anchors the previous read at **centre**
and rests the thumb there before she drags (`ImpactSlider`, `reflect.tsx:308`). That
conflates *her memory* ("last time was here") with *her input* ("today is here"), and
makes "centre" read as a default answer. She has to think in relative terms — "better
or worse than before?" — which is the cognitive load that makes it feel like homework.

## Governing principles

- **Level 1 the input, Level 5 the reveal.** Spend the design budget unevenly. The
  questions are the plainest possible (one gesture, no reading). The *payoff* — the
  trend appearing — is where the richness, motion, and delight go. The reward is not a
  "Saved ✓"; it is *"you were Rough here last cycle, you're Fine now."*
- **She supplies the feeling, the interface supplies the memory.** She answers the
  easy absolute question ("where's Work today, worst → best?"). Past reads appear as
  quiet dots on the same track and do the comparison for her.
- **One thing per moment.** Never a wall of sliders — a stack of controls reads as a
  form even when short. Each answer should feel like progress, and the flow ends on a
  reward, not a Save button.
- **Nothing is required.** A skipped domain writes nothing (no phantom value). Muting
  ("don't ask this") is preserved. The reveal works with one domain or three.
- Voice: quiet, affirmative, neutrally warm, no em dashes in copy, no self-deprecation
  ([[brand-voice]]).

## The slider — continuous, with past reads as dots

Decision locked: **continuous**, not stepped. Coarse dots can't show "a little
better," which is exactly the signal that keeps her logging.

- Track runs **Rough → Fine** (keep the app's words; not "Worst → Best"). Free
  placement anywhere along it.
- **No resting default.** Un-placed until she touches it, with a quiet hint ("drag to
  place"). A domain she never touches records nothing.
- **1–2 ghost dots** from prior cycles sit on the track, labelled by cycle — *"last
  cycle"*, *"2 cycles ago"* — **never by date**. Dates make her do math; the screenshot's
  `18.11 / 20.11` is the thing to avoid. Cap at 2 so the line reads as a trajectory,
  not noise.
- Today's thumb, once placed, is visually distinct from the ghost dots (solid vs.
  hollow / dimmed).

## The flow — Level 1 cards → Level 5 reveal

Re-shape from one scrolling form into a short sequence, one decision per card:

1. **Notice** — "Did you notice the emotional change this time?" (Yes/No). One quiet
   science line here, not a gate (see below).
2. **Right-size** — "Did you catch how big it was, and pick your next move?" (Yes/No).
3. **Manage better** — "What could you manage a little better next time?" (multi-select
   chips: nutrition / sleep / emotions; "or none").
4. **Ease** — "Did your symptoms ease this time?" (Not really / Softer / Yes).
5. **How the cycle landed** — the three domain sliders (work / partner / yourself),
   each with its ghost dots and mute toggle.
6. **The reveal (Level 5)** — the moment she places the last slider, her trend animates
   in: today's dots joining the ghost dots, the line moving. This is the payoff that is
   currently missing. From cycle two onward, this reveal *is* the argument for why she
   reflects — no copy needed.

Same content as today, but it ends on a reward instead of a Save. Whether steps 1–5
are literal separate cards or a tighter scroll is an implementation call; the
non-negotiable is that the **reveal is its own beat at the end**, not buried on another
tab.

## Data model changes (`cycle-impact.ts`)

Today `reads` stores `ImpactLevel = 1 | 2 | 3`. Continuous requires a finer scale.

- **New scale: integer `0–100`.** Introduce `ImpactValue = number` (0–100, clamped).
  Keep `ImpactLevel` as a *derived* bucket where any code still wants rough/okay/fine
  (e.g. a caption), via a helper `levelOf(v: number): 1 | 2 | 3`.
- `CycleImpactEntry.reads` becomes `Partial<Record<ImpactDomain, ImpactValue>>`.
- `parseReads` accepts any number, clamps to `0–100`, rounds to int. **Back-compat:**
  legacy entries hold `1 | 2 | 3` — map them on read: `1 → 15`, `2 → 50`, `3 → 85`
  (mid-band values so old history plots sensibly beside new continuous reads). Because
  the store is **append-only**, we never rewrite old entries; we only reinterpret them
  at parse time. No migration script, no destructive step.
- `appendCycleImpact`, `latestReadsByAnchor`, `lastImpactReads` keep their shapes; only
  the value type widens. `setDomainMuted` / muting is unchanged.
- Tests (`cycle-impact.test.ts`) update expected values; add cases for legacy `1|2|3`
  parsing → mapped ints, and out-of-range clamping.

## You chart changes (`you.tsx`)

`EffortChart` (`you.tsx:736`) currently types `levels: (1 | 2 | 3 | null)[]` and maps
`yForLevel(lvl) = padT + ((3 - lvl) / 2) * plotH` — a 3-position vertical axis.

- Widen `levels` to `(number | null)[]` (0–100).
- `yForLevel(v) = padT + ((100 - v) / 100) * plotH` — same axis, continuous.
- `EffortImpactCard` reads via `latestReadsByAnchor(impacts)?.[domain]` — now a number,
  passed straight through. Ghost/empty-state series (`GHOST_LEVELS`) update to the new
  scale.
- The dots (per-cycle `Circle`) now land at any height, giving a real slope. No axis
  labels needed beyond the existing Rough/Fine endpoints.

## Why it matters, and when to say it

Do **not** open with a "why reflection matters" page — a lecture before she's earned a
reason to care is friction, and it will get skipped.

- **Earn it by showing the payoff.** After her first reflection the reveal is the
  argument. From cycle two, the moving dots make the case with zero copy.
- **One quiet science-backed line**, on the first *question* card (step 1), not a gate.
  The science that actually backs the flow:
  - **Affect labeling** — naming an emotion measurably lowers its intensity (Lieberman
    et al., 2007, *Putting Feelings Into Words*). Justifies step 1 "did you notice the
    change": noticing + naming *is* the intervention.
  - **Self-monitoring reactivity** — tracking a symptom tends to improve it,
    independent of anything else (standard CBT / behavioral self-monitoring).
  - **Progress feedback drives adherence** — people continue a practice when they can
    *see* movement. This is the reason the dots exist.
- **Timing** — cycle-end is right (keep the `lastPeriodStart` anchor). Add a proactive
  nudge on Now/You a cycle later — "your last two cycles, side by side" — so the reward
  isn't only reachable from inside Reflect.

## Implementation order

1. `cycle-impact.ts`: widen value type to `0–100`, `levelOf` helper, legacy `1|2|3`
   read-mapping, clamp in `parseReads`. Update `cycle-impact.test.ts`.
2. `you.tsx`: continuous `yForLevel`, widen `EffortChart` types, ghost series. Verify
   the chart plots old + new reads together.
3. `reflect.tsx`: rebuild `ImpactSlider` as continuous free-placement with ghost dots
   labelled by cycle; no resting default. Re-shape flow to end on the reveal beat.
4. The reveal component: today's dots + ghost dots + animated line, reusing chart
   primitives so Reflect and You read as one system.
5. One science line on step 1; proactive "two cycles side by side" surface on Now/You.
6. Run `npx tsc --noEmit && npm run lint && npm test` before any PR.

## Open decisions

- **Reveal placement:** its own final card (cleanest Level 5 beat) vs. inline-expand
  under the sliders. Leaning own-card.
- **Ghost dot count:** 1 vs 2. Leaning 2 (a trajectory needs two prior points to read
  as one), but 2 only once she has that much history.
- **Endpoint words:** keep "Rough → Fine" vs. adopt the screenshot's "Worst → Best".
  Leaning Rough/Fine for voice consistency.
