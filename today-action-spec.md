# Today-action selector — spec

The Now tab shows exactly one coached action. This spec defines how it is picked,
as a pure function over stores that already exist. Companion to the IA rework
(Now / Grow / You).

## Contract

```ts
// src/lib/today-action.ts  (pure, unit-tested like lib/pms-window)
export type TodayAction = {
  id: string;                 // stable, for rotation memory + ring completion
  kind: 'assessment' | 'readiness' | 'train' | 'checkin' | 'done';
  title: string;              // "Wind down early tonight"
  caption: string;            // "Closes today's ring · 10 min"
  route: string;              // expo-router href
};

export function pickTodayAction(input: {
  prefs: PmsPrefs;                    // store/pms-prefs
  reads: PmsRead[];                   // store/pms-reads
  readiness: ReadinessState;          // store/pms-readiness (today's)
  calmDoneToday: boolean;             // derived from session-history
  training: TrainingState;            // store/training-v3
  lastAction: { date: string; id: string } | null; // new tiny store, rotation memory
  now: Date;
}): TodayAction;
```

## Phase derivation

From `pmsOffsetDays` / `daysUntilPmsWindow` in `lib/pms-window` (offset: negative =
days before predicted period; window = offset in [-7, +2]):

| Phase | Condition (checked in order) |
|---|---|
| `setup` | `reads.length === 0`, or onboarding-v3 in progress |
| `window` | offset in **[-7, -1]** (premenstrual stretch) |
| `period` | offset in **[0, +2]** (predicted bleed + grace) |
| `prep` | `daysUntilPmsWindow` in **[1, 7]** |
| `open` | everything else, and whenever `pmsMode` is off / no `lastPeriodStart` |

Note: `isInPmsWindow` treats [0, +2] as in-window; the selector deliberately splits
that tail into `period` so the ask gets *lighter* once bleeding likely started,
instead of still pushing prep checks. Existing window UI is unaffected.

## Weakest lever

From the **last** read's `answers.levers` (`sleep` | `food` | `movement`, 0–2):

- Candidates = levers scoring ≤ 1 (same rule as `deriveLevers`; unanswered = 2, never flagged).
- Order candidates by score ascending; tie-break by evidence strength descending
  (`PMS_FACTORS`: movement 5 > sleep 3 > food 2).
- No candidates → "no weak lever" column applies.

**Time of day:** `morning` = before 17:00 local, `evening` = 17:00 onward. The
action may switch at 17:00; only one ask is ever current.

## Selection table

First matching phase row wins. Within a cell, first item not blocked by the
rotation rule wins.

### `setup` — any lever, any time
→ **assessment** · "Know your PMS level" · `/onboarding-v3`. Nothing below can
personalize without a read.

### `window` (offset −7 … −1)
Action = today's readiness, but the title names ONE concrete unchecked item so it
never reads as "do the checklist":

| Weak lever | Morning | Evening |
|---|---|---|
| food | first unchecked of `calcium → micronutrient → steady → antiInflammatory` | `steady` if unchecked, else `woundDown` |
| sleep | first unchecked food item (sleep asks are evening asks) | `woundDown` |
| movement / none | first unchecked of the five, stored order | `woundDown` if unchecked, else first unchecked |

- All five checked, or her "Done for today" tap → **done** state (ring closed, no
  further ask). The calming practice is the checklist's bonus sixth item,
  reached through the ever-present Calm now button — **the selector never asks
  for calm**, because the button already owns it.
- Route for readiness asks: `/pms-readiness` (titles from `READINESS_CHECK_CONTENT`).

### `prep` (window opens in 1–7 days) — build days
Revised 2026-07-12: build days (prep + open) always coach from Grow. The
checklist is the window's tool and NEVER appears outside it — a readiness ask
before PMS days would turn the clear stretch into a chore list. The phase
still exists (the card's eyebrow sharpens to "N days to PMS") but the ask is
the same as `open`: training first, a Grow replay when everything is trained.

### `period` (offset 0 … +2)
Lightest asks; also the feedback loop the window math never had. Two-step:
period confirmation first, remission only after it.

| State | Ask |
|---|---|
| period not yet confirmed this cycle | **checkin** · "Period arrived? Add it" → opens the period calendar (any time of day) |
| confirmed, remission unanswered | **checkin** · "Did symptoms ease once your period started?" (yes/soft/no, any time of day) |
| both answered or dismissed | **done** — the day settles; calm stays a button-tap away |

Dismissing the ask suppresses it until the next morning (and still closes the
ring — honesty is the ask, not the period). The remission answer
re-asks onboarding's `remission` question per cycle — appended to a small log,
it sharpens her level over time and later powers the You-tab "your PMS, cycle
over cycle" view.

### `open` (everything else) — build days
| Condition | Action |
|---|---|
| uncompleted levels in `game-content` order vs `training.completed` | **train** · "Continue: {chapter}, Level {n}" · `/game-v3?chapter=…` |
| all levels complete | **train** · "Revisit a practice in Grow" (`train:revisit`) · `/grow` — a replay re-stamps `lastCompletedOn` (without re-counting progress), so the ring still closes honestly |

## Period logging (closing the prediction loop)

The window math currently never observes a real period; one late cycle skews
every prediction after it. One button on Now, opening the existing period
calendar flow (built for the PMS checklist / V3 multi-add) — no new UI flow,
one write path.

- **Placement:** a quiet text button near the state line under the moon (also
  reachable from You → cycle settings). Never a card.
- **Phase-aware label** (same button, the app does the remembering):

  | Offset | Label / state |
  |---|---|
  | most of the cycle | "Add periods" — quiet, low emphasis |
  | −2 … +4, unconfirmed | "Period arrived? Add it" — emphasized; during `period` phase, opening the calendar and logging IS the morning action (checkin row above) |
  | past +4, unconfirmed | "Running late? Log it when it arrives" — and window copy softens ("window may shift") instead of pretending precision |

- **Tap → existing calendar flow**, which already handles picking the real
  start date, past periods, and multi-add.

**On confirm:** set `pms-prefs.lastPeriodStart` to the logged date (re-anchors
all phase math from the true start), and append the completed cycle's actual
length to `period-history`. Once ≥ 3 real cycles are recorded, auto-tune
`cycleLength` to the median of the last 3 (clamped 20–40) — prediction becomes
observation-driven. This reuses the multi-add-periods machinery from V3
onboarding; the logged date must flow through the same code path.

## Rotation rule

Retired 2026-07-12: every cell now has a single progressive candidate
(training advances on its own; the window checklist always did), so there is
nothing to rotate between. The `store/today-action.ts` memory remains for the
daily dismiss suppression (`dismissedDate`).

## Ring completion (per kind)

| kind | Ring closes when |
|---|---|
| assessment | a read is appended to `pms-reads` |
| readiness (window) | all five checks done, or the "Done for today" tap (progress = five-check count / 5) |
| train | a level completed today (`lastCompletedOn` = today; replays re-stamp it) |
| checkin | answered (one tap; "Not yet" on period confirmation also counts — honesty is the ask, not the period) |

When the ring closes, the action card swaps to the done state ("Done for today —
see you tomorrow"). No second ask is ever stacked after completion.

## Edge cases

- `pmsMode` off but assessment complete → permanent `open` phase; app fully usable, no cycle framing.
- Short cycles (20–22 days): `prep` and `window` can nearly touch the previous period; phase order above already resolves overlaps (window/period win over prep).
- Cycle length changed in My Soul mid-window → phases recompute next render; ring state is date-keyed so nothing double-closes.
- Last read older than ~3 cycles → optional low-priority variant: replace one `open`-phase day with "Retake your read" (feeds the then-vs-now compare). Not in v1.

## New surface area (v1)

1. `src/lib/today-action.ts` — the pure selector + tests.
2. `src/store/today-action.ts` — rotation memory (`{ date, id }`).
3. Movement prep content (2 strings + a tick) — or defer via the `none` column.
4. Remission-per-cycle log (can start as a `checkin-history` entry kind).
5. "Add periods" button on Now with the phase-aware label, opening the existing
   period calendar flow. No new store: "unconfirmed" is derivable (predicted
   start passed while `lastPeriodStart` still belongs to the previous cycle),
   and the daily dismiss suppression rides the rotation store's date.

Everything else reads existing stores unchanged.
