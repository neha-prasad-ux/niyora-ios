# Niyora — Emotion-training game design (aligned)

The scenario game at the heart of the PMS dashboard. Pairs with
`niyora-emotion-bank.md` (the verified science) and
`niyora-pms-dashboard-v3-plan.md` (where the game lives). This doc fixes the
**mechanic and feel**; visual design is Neha's.

Status: **two core decisions locked** (2026-07-08). Content authoring + remaining
forks still open (bottom).

Supersedes the "Choose the right answer" quiz in `draft.svg`.

---

## The two locked decisions

1. **Feedback model = best-fit, gentle.** There is a *best move for this state*,
   but a lesser pick is never scolded — it shows a worse outcome and lets her
   retry. No red X, no "wrong." This satisfies the governing principle ("no wrong
   feeling, only strategies with better/worse outcomes") and the science (the
   right move is context-dependent).
2. **Core mechanic = intensity is the master variable.** The *same* strategy is
   the best move at low intensity and the wrong move when she's flooded. Reading
   her activation level is the central, trainable skill. Science: Sheppes 2011/13
   (F1, VERIFIED). This is what makes it a game an adult respects instead of
   trivia — you can't memorize "the healthy option," because it flips.

### Why this reads as adult, not childish
The draft's childish signal was never "gamification" — it was the **test frame**
("Choose the right answer", quiz dots, a "Result" pill, "i'm in!"). Adults aren't
put off by difficulty; they're put off by fake stakes and being graded on nuance.
So we keep the game and remove the test: a skill that trains, consequences instead
of grades, and a genuinely non-obvious decision (intensity) at its core.

---

## The engine

### The signature interaction: **read, then respond** (two taps)
Every scenario is solved in two beats, which *is* the Notice→Respond ladder:

1. **Read her intensity.** "How activated is she — simmering, or flooded?"
   (Simmering / Flooded, or a 1–5 dial.) This trains interoception and makes the
   master variable an explicit choice, not a hidden gate.
2. **Pick the move that fits that intensity.** Options are the strategy cards.

The best-fit is a function of `(feeling, intensity, driver-known?)`:

| State | Best-fit family | Why (science) |
|---|---|---|
| **Flooded** (high) | Distract / step away / soothe | Can't reason mid-flood; distraction intercepts "before it gathers force" (F1, Sheppes) |
| **Simmering + driver unclear** | Discern the driver (HALT check) | Investigate before solving — but see content-gate note |
| **Simmering + driver clear** | Reframe / assert the real need | Reappraisal fits at low intensity (F1) |

The flip is the lesson: pick "reframe" while she's flooded and it's a *lesser*
move (it bounces off); pick "step away" while she's only simmering and you've
skipped a solvable problem.

### Feedback rules (best-fit, gentle)
- **Best-fit pick:** affirm + the "why". *"Yes — she's too flooded to hear logic
  right now. Space lets the wave pass."* Skill meter ticks up.
- **Lesser pick:** never "wrong." Show its **future**, then offer the fitting one.
  *"That can work once she's calmer — right now she's too activated to reframe, so
  it may bounce off. Try the move that fits high intensity?"* Retry, partial
  credit, no penalty.
- **Suppression options** ("tell her to push through") always resolve to the worst
  future: *"push it down → the volume waits, it doesn't drop."* Present, never
  scold — they're how we teach the cost.
- Consequences are the payload. Every option carries its "two futures" copy.

### The skill meter (keep the 7/10 — reframe it)
The result screen's *Emotional regulation 7/10* becomes a **trainable meter**, not
a grade: it starts from the assessment and rises with reps, like a fitness metric.
Never a score she's failing. Never goes down for a lesser pick (skips are free).
It's the honest progress signal that replaces streak-guilt.

### Progression: single-turn default, multi-turn at chapter ends
- **Single-turn** reps are the workhorse (one scene, read + respond + consequence)
  — keeps completion high; finishing the *in-app* rep unlocks the next.
- **Multi-turn "it didn't land" scenes** cap each chapter: you soothed, she's still
  flooded, now what? This is where adult depth lives — regulation is iterative, not
  a single correct tap. Real-world **missions** stay a bonus (extra soul progress).

### Scenario data model (authorable)
```
Scenario {
  feeling: irritability | sadness | anger | anxiety | overwhelmed
  intensity: simmering | flooded            // what the player must read
  driverKnown: boolean                       // gates discern-vs-act
  scene: string                              // her situation, self-distanced ("your friend…")
  options: [{ family, label, future }]       // family ∈ discern|reframe|distract|soothe|assert|suppress
  bestFit: family                            // derived from (intensity, driverKnown)
  sourceTag: VERIFIED | MEDIUM | GAP         // gate: ship only VERIFIED/MEDIUM
}
```

---

## Example scenarios (science-anchored)

**Flagship — the intensity flip (VERIFIED, F1). Ship first.**
Same feeling, two scenes, opposite best-fit — this is the whole pitch in two cards.
- *Simmering:* "Your friend's partner forgot to text back. She's mildly annoyed."
  → best-fit **Reframe** ("he's busy, not careless"). Step-away = skipped a solvable
  thing.
- *Flooded:* "She hasn't slept, he low-balled her effort, she's shaking." → best-fit
  **Step away** (20 min, then talk). Reframe = bounces off mid-flood.

**Anger — the venting myth (VERIFIED, Bushman).**
"She wants to punch a pillow / rant it out." Best-fit is **not** venting — doing that
while dwelling *increases* anger; quiet/distraction beats it. Counterintuitive, strong.

**Sadness — rumination vs behavioral activation (VERIFIED).**
"Sit with it and think it through until it lifts" (brooding, lesser) vs **one small
meaningful action** (behavioral activation, best-fit). Frame the reflect-option as a
*lesser* future, not wrong.

**Irritability — discern the driver (CONTENT-GATED).**
The draft's hunger/sleep scenario ("check both before jumping to a solution") is a
good *discern* rep, but the underlying HALT / sleep→irritability claim is **[GAP]**
in the science bank. Mechanic is fine; hold the specific copy until the second
research pass verifies it. Don't ship the "sleep doubles the odds" line yet.

---

## Flow / copy fixes (vs draft.svg)

- **"Choose the right answer" → "What's the move?"** (or "What would help her?").
  Kill the quiz dots + "Result" pill; show the skill meter instead.
- **L1 education isn't trivia.** Replace "How common is irritability? 10/40/95%"
  (95% isn't even in the bank — prevalence is ~half) with a **myth-buster**: pick
  the true statement, distractors are plausible myths ("PMS is just in your head"
  ✗). Choosing right = a small act of self-validation.
- **Reveal the answer *after* the pick,** not as a card sitting under the options.
- **"i'm in!" → "Start training"** (or "Let's go"). Adults choosing to train, not
  summer camp.
- **Keep the friend-frame** ("help Neha") — coaching a friend is self-distancing
  (people reason more wisely about a friend's feelings than their own), not
  childish. Make it a relationship that builds across chapters. (Use a non-user
  name so it never collides with the actual user.)

---

## Next session — visuals (handoff)

The mechanic + copy are settled; the **look and feel are not.** For the design pass:

- **The "Riding the wave" meter must be designed from the result page onward.** It
  first appears on the assessment result (the old 7/10) and then recurs across the
  dashboard and every level. Design it as one coherent, recurring element — result
  screen is where it's introduced, so start there.
- **The game's visual language is undecided** — color, motion, and the feel of each
  interaction are open. The draft's game screens went purple; whether that holds or
  returns to the app's calm-blue palette (`DESIGN.md`) is a deliberate decision for
  this pass, not a default. Motion design (how cards flip, how the wave moves, the
  press-and-hold preview, the Wind Down breath) is core to whether it feels adult
  and alive — think it through here.
- Design targets: the six distinct interactions in
  `niyora-irritability-levels-draft.md` (swipe, binary tap, hold-to-preview, slider,
  Wind Down breathe, chip-assembly) + the hold-to-fill "kind word" beat.

## Still open

- **Content authoring:** how many scenarios per feeling at launch; who writes them
  (same citation rigor). Flagship + anger + sadness are shippable now; discern/HALT
  and all interpersonal scenes wait on the second research pass ([GAP] list).
- **Intensity input:** binary (Simmering/Flooded) or a 1–5 dial? Dial trains finer
  interoception but is harder to author best-fit bands for.
- **Meter naming:** keep "Emotional regulation 7/10", or a less clinical label?
- **Multi-turn authoring cost:** how many chapter-end scenes at launch.
- Inherits the dashboard plan's open questions (goal picker, distress signal,
  level↔checklist coordination).
