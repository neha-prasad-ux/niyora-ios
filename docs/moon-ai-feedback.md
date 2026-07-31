# Moon AI — feedback backlog (2026-07-31)

30 items from Neha. Reference by ID (M1–M30). Status: `todo` / `wip` / `done` / `decide` (needs Neha's call).

| ID | Area | Item | Status |
|----|------|------|--------|
| M1 | Card | Fix card to max height, stop the below-part text jump | todo |
| M2 | Loading | AI "thinking" animation for the gap | todo |
| M3 | Loading | Skeleton placeholders for options before answer lands | todo |
| M4 | Loading | Stagger AI options (reframe / emotion / responses), not one wall | todo |
| M5 | AI quality | Stop grounding/repeating — dilutes the words | todo |
| M6 | AI quality | Ask for more context before answering | todo |
| M7 | AI quality | Emotions chosen by AI are low quality | todo |
| M8 | Flow | Body-prep: own page vs inside 20-min list | decide |
| M9 | Drawing | Add SVGs + captions to reveal | todo |
| M10 | Drawing | Penguin → "You're my person. For life." — **asset missing** | decide |
| M11 | Drawing | Giraffe → "You help me rise above it." | todo |
| M12 | Drawing | Cat → "You're my calm at the end of the day." | todo |
| M13 | Drawing | Teddy → "You're my soft place. Thank you." | todo |
| M14 | Drawing | Elephant → "You're the one I'll never forget." | todo |
| M15 | Card | Split Done vs Share; Share = icon (for drawings) | todo |
| M16 | Flow | Wind-down should be voice-activated | todo |
| M17 | AI quality | "Respond to situation" options personalised to the person; generic = useless | todo |
| M18 | Flow | Activity starts immediately; kill the now-vs-later prompt mid-flow | todo |
| M19 | Flow | "Edit with Moon" button → make shorter / longer | decide |
| M20 | Card | Drop "skip / I'll do this later" → just Done | todo |
| M21 | UI | "Fill in to remember" → dashed-line text UI | todo |
| M22 | Copy | "Say to them" intro = one line, right under the title | todo |
| M23 | AI quality | "Say to them" copy: regulated, mature, not fight-inviting | todo |
| M24 | Share | Share opens iOS share sheet (WhatsApp/AirDrop), not Messages | todo |
| M25 | Flow | Drop "and now" ask in respond (dup of M18) | todo |
| M26 | Drawing | Scratch-to-reveal unveils too early, before full scratch | todo |
| M27 | Theme | "Space mover" is placeholder → our own theme | decide |
| M28 | Reward | Done → lights dim, big moon reacts + confetti congrats | todo |
| M29 | Home | Replace popup with card: "Let's think / Are you going through an emotion?" + reflect→regulate→respond + "Think with me" CTA | todo |
| M30 | Home | Reimagine whole Home around Moon AI (M29 lives inside this) | decide |

## Decisions (resolved 2026-07-31)
- **M8** → (a) conditional: "I'm calm enough to respond" → dedicated body-prep page; else item in 20-min list.
- **M10** → penguin already in app (was swapped to flowers). Just add teddy/elephant/cat/giraffe + captions.
- **M19** → buttons: Shorter · Longer · Softer · More direct. On ALL AI-written text. Must keep visual hierarchy clean — ask Neha if a placement risks clutter.
- **M27** → propose 3 theme directions (in progress).
- **M30** → Neha drafting home direction, will hand off.

## Assets
Colouring-page SVGs in `~/Downloads`: teddy, elephant, cat, giraffe. Penguin already in-app.
Constellation badge system spec: `moon-ai-constellations.md`.

## Conversation-flow feedback (C1–C10, 2026-07-31)

| ID | Item | Verdict / decision | Reuse |
|----|------|--------------------|-------|
| C1 | Crisis scan + handoff on typed input | Yes, mandatory. Scan exists; build shared handoff screen. US phrases first, generic global line fallback. | `src/lib/crisis-scan.ts` |
| C2 | Cycle/PMS data feeds reframe + response options | Yes, key edge. Pass cycle phase into prompt; two reframe modes. | PMS voice in `emotion-regulation.ts` |
| C3 | Reward micro-steps (e.g. naming) | Yes but NO confetti per step. Ambient reward in space behind card; naming lights first star of that constellation. Big "nicely done" reserved for completion. Auto-advance, no click. Color warms per step. | celebration in `moment.tsx` |
| C4 | Finish mixed + low lanes | Yes, half-built already. Complete wiring + copy. | `moment-flow.ts` `low_*`/`mixed_*` |
| C5 | Quick regulation (cold water, relax shoulders) | Yes, as items INSIDE the 20-min list (not a separate lane). | activities |
| C6 | After-fight/repair as a next step | Yes, pure reuse, when context = conflict. | `couples-content.ts`, couples-reconnect |
| C7 | "Recommended" tag on response options | Yes, but only after AI phrasing is trustworthy (seq after C8/M17/M23). | — |
| C8 | Reframe asks "is there anything you can do?" | Yes, gated: only when there's real agency. Never for grief/uncontrollable. Science shown as ONE earned line, not a paragraph. | — |
| C9 | Better components for response options | Yes. Consolidate 9 bespoke layouts → 5 reusable components (below). | — |
| C10 | "Later" → set a when → remind | Yes, heaviest item. Offer "remind me" at END (not mid-flow, per M18), then schedule + notify. | needs expo-notifications |

### C9 — the 5-component kit (replaces ~9 ad-hoc layouts)
1. **Choice cards** — tappable options, one marked *recommended* (C7), staggered in (M4). → Sad/swings, Shame, Numb, promotion, Bias.
2. **Chips** — quick selectable tags. → Anxious (likely/worst, one thing you control).
3. **Fill-in template** — dashed-blank UI (M21); each blank fillable by tapping a suggested chip OR typing. Replaces fill-chips / pick-to-fill / fill+text. → Lonely, hurt ("I feel __ when __, I need __"), work-clash (Describe/Effect/Ask/How-helps).
4. **Draft editor** — pre-filled message + Edit with Moon (M19: shorter/longer/softer/direct) + share sheet (M24). Replaces all "text (she edits/sends)." → Numb, Lonely, hurt, work-clash.
5. **Checklist** — reuse app checklist. → promotion, Bias.
Plus **Moon line** = ambient text, not a component.

### Branch → components (from Neha's flow diagram)
| Branch | Approach (one earned science line + steps) | Components |
|--------|--------|-----------|
| Sad, swings | acceptance + kinder read + block the loop | Choice cards + moon line |
| Anxious | reflect worry → likely/worst → one thing you control → worry-window | Chips (+ short text) |
| Shame | catch the line → whose voice → friend-line → kinder true line | Choice cards + draft |
| Numb | rewarding thing / check "no one cares" → draft small message | Choice cards + draft editor |
| Lonely | own-your-part → impact → gentle line → draft | Fill-in template + draft editor |
| You hurt someone / a real hurt | "I feel __ when __, I need __" → rehearse | Fill-in template |
| Work clash | Describe → Effect → Ask → How-helps | Fill-in template + draft |
| Promotion | wins → ask → anchor/timing → practice | Checklist + choice cards |
| Bias | name the bias → don't self-blame → document → who to tell | Checklist + choice cards |

### Build progress (2026-07-31)
Approach change (Neha): NO situation router. Instead attach the named feeling and tailor the options under it. `optionPlanFor(feeling)` maps each FEELING_SET word → one science line (C8) + which component leads the respond step (`cards` for hot feelings, `fill` for relational).

Landed, tested (175 pass), typechecks:
- **C1** crisis — verified already built, untouched.
- **M19** Edit with Moon — draft editor's free-text note → Shorter/Longer/Softer/More direct chips calling `revise()`. `src/app/moment.tsx`.
- **Fill-in template + Chip** — `src/components/moment/fill-in.tsx` (+ pure `fill-in-assemble.ts`, tested).
- **M21** — "fill in to remember" if-then now uses the dashed fill-in. `src/app/moment.tsx` today_action.
- **C8** — options step shows the per-feeling science line via `src/v3/option-plan.ts` (tested). Copy is [DRAFT], needs Neha's voice.
- **Fill-in compose path** — for `fill` feelings the respond step now LEADS with the fill-in ("I felt __ when __, I need __") + science line + universal DV line. Continue runs the crisis scan on her words, seeds the draft editor (Edit with Moon + send). Hot feelings still get the act cards. `src/app/moment.tsx` options case.

NOT visually verified: the sim renders black (project dev-client gotcha, not the diff). Types + 175 tests are the only verification so far. Needs a real device/sim run.

Next:
- AI-quality prompt pass (M5/M6/M7/M17/M23 + C2 cycle context) to feed tailored content into these components.
- Neha's voice pass on option-plan science lines + fill-in suggestions.

### Build order (locked)
C1 (safety) → C2 + C4 (core) → C3 (reward/theme) → C5 + C6 → AI-quality cluster (M5/M6/M7/M17/M23) → C9 components + M4/M21/M19 → C7/C8 → C10.
