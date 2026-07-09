# Niyora — PMS training visuals (design spec)

The visual + motion language for the emotion-training game: the recurring
**Riding the wave** meter, the six level interactions, and the woven kind-word
beat. Pairs with `niyora-pms-game-design.md` (mechanic/feel) and
`niyora-irritability-levels-draft.md` (the six levels + copy). Obeys `DESIGN.md`.

Status: **direction approved 2026-07-08** from an interactive motion prototype
(`pms-motion-board.html`, published as an Artifact). Values below are design
intent; exact reanimated tuning happens in the RN build. Page-by-page screen
design is the next pass.

---

## 1 · The 3-role palette (locked)

Resolves the open "purple vs calm-blue" question: the game is **not** a purple
minigame. It is blue-and-amber *content* with violet *chrome*, so it reads as the
app. Tokens already live in `src/v3/v3-theme.ts`.

| Role | Meaning | Value | Token |
|---|---|---|---|
| **Blue** | steadiness · skill · calm water | `hsl(220,55%,75%)` ≈ `#9cb4e2` | `v3.regulated` |
| **Amber** | heat · how worked up she is | `hsl(35,70%,62%)` ≈ `#e2a95a` | `v3.activated` |
| **Violet** | progress chrome (meter fill, level) | `hsl(270,50%,55%)→hsl(280,55%,68%)` | `v3.meterFrom/To` |

Never alarm-red (DESIGN.md: warnings use soft red/amber). The home orb never
changes hue; it is the **water** that tints, not the orb.

Ground, text, and type come straight from `DESIGN.md`: near-black indigo gradient
background, Poppins (Light 300 / Medium 500 / SemiBold 600), text as white at
opacity. Uppercase labels get letter-spacing.

---

## 2 · The wave (the spine)

One live water element recurs across ~7 of the 8 surfaces. It **extends the
existing `SpectrumBar`** in `src/v3/v3-graphics.tsx` (already described there as a
"thick flowing wave"), rendered on a Canvas/reanimated surface.

**Two variables, two visual channels:**
- **Water height** = activation. Higher = more worked up / in her PMS window.
- **Line steadiness** (amplitude + choppiness) = skill band. Beginner = choppy;
  mastery = a near-flat glassy line.

**Physics (from the prototype, for parity):**
- Water top ≈ `0.80 − level·0.55` of the canvas height (`level` 0..1).
- Amplitude ≈ `4 + turbulence·30` px, `turbulence = (1 − skill)`.
- Tint interpolates blue→amber by activation.
- A white "you" dot rides the crest at center (the result-screen marker slides in
  along the crest, reusing the built `SpectrumBar` slide motion).
- Transitions smooth (lerp current→target ~0.07/frame), never snap.

**Reward on a good rep:** the line visibly **smooths** (amplitude eases down ~15%
over ~1.4s) and the violet progress fill nudges right. You *see* the water settle.
This is the honest progress signal that replaces streak-guilt.

**Recurs as:** full hero on the result + My Soul screens; a compact one-line strip
atop the dashboard and each level; and *as the interaction itself* in L2.

### Meter label logic

`label = f(skillBand, inWindow)`:

| Skill (0–10) | Label |
|---|---|
| 0–2 | Learning the water |
| 3–4 | Finding your footing |
| 5–6 | Riding the wave |
| 7–8 | Steady in the swell |
| 9–10 | Calm in the current |

**In-window rule:** during her PMS window the water sits higher (prototype:
`level 0.72` vs `0.30`) and the label gains a soft amber suffix
*"· and the water's high this week"* — but the **band never drops**. Rough water,
not lost ground.

---

## 3 · Motion grammar (applies to all)

- **No red X, ever.** Feedback = the water reacts + a warm "why". Lesser picks
  show a worse *future*, never a grade (best-fit, gentle).
- The wave is the connective tissue: same water under L1's cards, *is* L2, settles
  as the reward in L2/L3, feeds the meter.
- Easing feels like a breath, not a bounce (per DESIGN.md). No animation outlasts
  ~7s.
- `reduceMotion` respected throughout: freeze the wave to a static crest, disable
  orb pulse, cross-fades become instant.
- Intensity input is **binary** (A little / A lot), not a 1–5 dial.

---

## 4 · Per-interaction spec

Every level uses a *different* response, by design. Values are the prototype's.

### L1 · Know the water — swipe true / myth
Statement card over a faint water strip. Drag right = true (blue glow from the
right), left = myth (amber glow from the left). Past ~100px threshold the card
commits, flips in place to the reveal (verdict + plain line), and the water reacts
+ settles. No X. "Next" advances the stack.

### L2 · Read the wave — binary tap
The wave *is* the screen. Read the scene, tap **A little** or **A lot**. The water
**swells** to the read (lot `0.8` / little `0.4`), then after ~650ms **settles to
blue** as the why appears. A miss reads "Look again." + the why, never "wrong".
This trains the master variable directly.

### L3 · Match the move — press-hold to preview
Three move-cards over the scene, with an A-little / A-lot toggle that **flips which
card is best-fit**. **Press and hold ~260ms** to unfold a card's future (ghosted);
release to retract; quick-tap to commit. A hold progress bar fills at the card's
base. Commit tints the wave to the outcome and settles on best-fit.

### L4 · Say it or save it — slider on a timeline
Three zones: **now** (amber) · **take 20** (blue, best-fit) · **never** (grey).
Drag the thumb; the outcome text **crossfades live** and the water re-levels to
match. Best-fit is the middle. Both ends cost her something; "say nothing" is drawn
as a bad future so we never train self-silencing. *(Content-gated: assertiveness
copy waits on the interpersonal research pass.)*

### L5 · Rehearse — press-hold to breathe (the hinge)
Reuses the built **Wind Down 4-7-8** orb (`id: 'wind-down'`, `techniques.ts`).
Press and hold: orb grows over 4s (inhale), hold 7 (guide), release for the long
8s exhale (orb eases down). Cue text steps through. This is the beat that lands in
the body; no new breath content to build.

### L6 · Your move next time — tap-to-assemble chips
An if-then sentence with empty slots; tap chips to fill them (mad-libs). Completing
all three seals the sentence with a violet underline and dates it to her
`pms-window`. Finishing in-app completes the level; doing it for real is the bonus.

### Kind word (woven) — press-hold to fill
Not a level. A small water-orb; **press and hold ~3s** and it fills like a slow
breath, tinting blue→violet, with a progress arc. Held, not tapped, so it feels
like a small act. Can close any session (F2 self-compassion).

---

## 5 · Copy rules (voice, load-bearing)

In-app copy follows `DESIGN.md` voice **and** the game voice ("frank, warm
30-year-old Californian friend · specific over vague · no jargon, no shame, no
hype"). The build must not reintroduce these:

- **No em dashes.** Use periods, commas, or middle dots (`·`).
- **No exclamation points.** Quiet, not chirpy.
- **No emojis** in body copy or notifications. Visuals are the cue. (Geometric
  direction glyphs like `◀ ▶` for a swipe affordance are fine; they are UI, not
  emoji.)
- **No motivational mantras / hype.** "You've got this" is out. State the real
  thing, kindly.
- **Specific over vague:** "breathe out for 6", not "breathe deeply".
- **Second person or the self-distanced friend.** The recurring friend is
  **Neha** (the user's own name is fine to use; there is no collision concern).
  Same friend across all five emotion chapters, so a relationship builds.
- No shame. Every "correction" is about a strategy's consequence, never her worth.

---

## 6 · Build log + next

**Result screen — built (RN, 2026-07-08).** Two reads, two visuals, in `WaveMeter`
(`src/v3/v3-graphics.tsx`) + a reworked `Result`. Decisions locked in code (Neha's
page-1 direction 2026-07-08):

- **Card 1 · severity keeps the spectrum.** The mild → PMDD `SpectrumBar` stays
  (Neha: "I still want the spectrum"); the level word takes `waveTint(activation)`
  so it is never alarm-red.
- **Card 2 · the water IS emotional regulation** (the "old 7/10 becomes water").
  Water HEIGHT = how hard PMS pushes (`levelActivation()` mild `0.32` · mod `0.50`
  · severe `0.66`, `+0.16` in-window, clamp `0.82`). Top-line STEADINESS = her
  regulation skill, seeded from coping standing via `standingSkill()`: engaging 7
  ("Steady in the swell") · mixed 5 ("Riding the wave") · disengaging 3 ("Finding
  your footing") · none 1 ("Learning the water"). No fake numeric score — the
  model has none. Card carries a plain-language caption of the metaphor.
- **Card 2 caption:** plain two-line read per band via `regulationBlurb()` — about
  her, no "trainable" lecture (Neha's note). Water card no longer shows the level
  word or a metaphor sentence.
- **Card 3 · "Things making PMS worse"**: her flagged levers as colour-swept pills
  (`LEVER_WORSE`: Poor sleep / Unhealthy food / Too little movement) + one plain
  fact line. Icons, per-item citations, and accent bars removed (Neha's note).
- **Card 4 · next window** reworded: `cycleLine` drops "dip", says "PMS window",
  motivating ("You won't walk into it cold").
- **No icons** on the result page (removed the SF Symbol card glyphs); headings are
  plain uppercase labels. **Orb + "your read" title removed** — page opens straight
  on card 1. Cards keep soft accent-coloured borders.
- **Spectrum + water fill the card width** (`min(screenW − 72, 368)`).
- **Closing + CTA:** "These are all trainable, not a fixed trait." + button
  **"Wanna know what's next?"** → advances to the new Goal step (below).
- **Meter dimensions:** `viewBox` 320×150 inside a rounded "tank" (r=20).
- Physics per §2, smoothed: three sine components (broad swell always on + primary
  + counter-moving chop scaled by `1 − skill/10`) drawn with quadratic-Bézier
  smoothing (`wmSurfaceY` / `wmWavePath`), slow drift, entrance rise, "you" dot,
  `reduceMotion` freeze.

**Goal screen — built (new `goal` step after `result`).** "Your goal / Win one
symptom at a time", then a "Niyora will help you" checklist (train what to react to
· practise a calming activity · match your breath · learn the research), colour-dot
bullets, button **"But I'm ready"** → `finish()` → home. This is the first cut of
the dashboard-plan's open "goal picker" question (currently informational, not yet
an interactive picker or persisted).

**Next pass:**

- **Dashboard** (five stacked cards + cycle-aware ordering), then each level's
  full layout. The compact one-line meter strip gets designed with the dashboard.
- Prototype used "Maya" as a placeholder friend name; align to **Neha** when we
  build the level screens.
- Content gates unchanged: L1 cards 3–4 ship as general truths (no PMS stats), L4
  waits on the interpersonal research pass.
