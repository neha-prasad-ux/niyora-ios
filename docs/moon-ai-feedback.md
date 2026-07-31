# Moon AI — feedback backlog (2026-07-31)

30 items from Neha. Reference by ID (M1–M30). Status: `todo` / `wip` / `done` / `decide` (needs Neha's call).

| ID | Area | Item | Status |
|----|------|------|--------|
| M1 | Card | Fix card to max height, stop the below-part text jump | done |
| M2 | Loading | AI "thinking" animation for the gap | done |
| M3 | Loading | Skeleton placeholders for options before answer lands | done |
| M4 | Loading | Stagger AI options (reframe / emotion / responses), not one wall | done (OptionRow) |
| M5 | AI quality | Stop grounding/repeating — dilutes the words | done |
| M6 | AI quality | Ask for more context before answering | done |
| M7 | AI quality | Emotions chosen by AI are low quality | done |
| M8 | Flow | Body-prep: own page vs inside 20-min list | done (now→page; wait→list item) |
| M9 | Drawing | Add SVGs + captions to reveal | note: teddy/cat/elephant/giraffe/penguin = the colouring DRAWING reveal (unchanged). SEPARATE: gift-scratch reward = 6 in-order drawings (duck/dragon/bird/sailboat/bow/peacock) in assets/images/moon-drawings/ (bg-removed placeholders; replace with clean transparent). Awarded sequentially (reward-progress store). Soul display DONE (DrawingsCard grid on My Soul: earned shown, rest locked). TODO: captions on each drawing. |
| M10 | Drawing | Penguin → "You're my person. For life." — **asset missing** | decide |
| M11 | Drawing | Giraffe → "You help me rise above it." | todo |
| M12 | Drawing | Cat → "You're my calm at the end of the day." | todo |
| M13 | Drawing | Teddy → "You're my soft place. Thank you." | todo |
| M14 | Drawing | Elephant → "You're the one I'll never forget." | todo |
| M15 | Card | Split Done vs Share; Share = icon (for drawings) | done (paint.tsx: Share icon + Done split; share stays on card) |
| M16 | Flow | Wind-down should be voice-activated | done (already: /session voice guidance) |
| M17 | AI quality | "Respond to situation" options personalised to the person; generic = useless | done (prompt) |
| M18 | Flow | Activity starts immediately; kill the now-vs-later prompt mid-flow | done |
| M19 | Flow | "Edit with Moon" button → make shorter / longer | done |
| M20 | Card | Drop "skip / I'll do this later" → just Done | done |
| M21 | UI | "Fill in to remember" → dashed-line text UI | done |
| M22 | Copy | "Say to them" intro = one line, right under the title | done (C8 science line under title) |
| M23 | AI quality | "Say to them" copy: regulated, mature, not fight-inviting | done |
| M24 | Share | Share opens iOS share sheet (WhatsApp/AirDrop), not Messages | done (already: Share.share({url}) → iOS sheet) |
| M25 | Flow | Drop "and now" ask in respond (dup of M18) | done |
| M26 | Drawing | Scratch-to-reveal unveils too early, before full scratch | done |
| M27 | Theme | "Space mover" is placeholder → our own theme | done (flow now runs on Home's cosmic sky + moon behind the card, no aurora) |
| M28 | Reward | Done → lights dim, big moon reacts + confetti congrats | done (on Done: sky dims, moon blooms, CelebrationParticles, then leaves) |
| M29 | Home | Replace popup with card... + "Think with me" CTA | done (Neha, committed: Moon home now.tsx) |
| M30 | Home | Reimagine whole Home around Moon AI | done (Neha, committed; flow runs in front of it) |

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
| C3 | Reward micro-steps | DONE — each forward step: the moon behind shines (brief bloom) + a short praise line ("Good." / "Great job."). | done |
| C4 | Finish mixed + low lanes | DONE — every low/mixed beat wired into SPOKEN + 4 missing lines drafted ([DRAFT], Neha to tune). | done |
| C5 | Quick regulation (cold water, relax shoulders) | DONE — two items in the 20-min list; tap shows a how-to line. | done |
| C6 | After-fight/repair as a next step | DONE — a "Make up after the fight" option appears in the respond list when her words match conflict cues (`CONFLICT_CUES`), routing to /couples-reconnect. | done |
| C7 | "Recommended" tag on response options | DONE — the self-directed calming act is marked "recommended" (sits last). | done |
| C8 | Reframe asks "is there anything you can do?" | Yes, gated: only when there's real agency. Never for grief/uncontrollable. Science shown as ONE earned line, not a paragraph. | — |
| C9 | Better components for response options | Yes. Consolidate 9 bespoke layouts → 5 reusable components (below). | — |
| C10 | "Later" → set a when → remind | DONE. "Do this later" → when-chooser (In 20 min / This evening / Tomorrow morning / no reminder) → schedules a local notification. Reused `@/lib/notifications` (expo-notifications already installed); `scheduleActionReminder` added, fails safe if permission denied. | done |

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

- **C2** cycle context — `CYCLE_NOTE` appended to reframe, options-ranking and act-draft prompts only while `pmsMode && isInPmsWindow`. Gentler read, lower-stakes options. `src/app/moment.tsx` + `draftAct` param in `moment-ai.ts`.
- **M2** thinking animation — `ThinkingDots` (pulsing dots) in `controls.tsx`, shown during act-draft generation. Edit chips hidden while loading.
- **M23 + M17** — `act_help` + `revise` slot prompts in `moment-gemini.ts` tightened: grounded in her situation, mature, de-escalating, "more direct" means clearer not harsher. Doc `moon-gemini-prompts.md` synced.
- Copy simplified per Neha: option-plan science lines use plain words (no "stings"/"steady first"); DEFAULT line reworded without "it".

NOT visually verified: sim renders black (project dev-client gotcha, not the diff). Types + 175 tests only. Needs a real device/sim run.

M23/M17/M5/M7 landed. M6 needs one more decision.
- **M5** DONE — acknowledge prompt shortened to gist-not-parrot (one short line, her words). Still vetted by isGrounded; drifted paraphrase falls back to the carve. `moment-gemini.ts` + doc synced.
- **M7** DONE — `FEELING_SET` rebuilt: 23 feelings, each tagged with its `constellation` (covers all 19), situational labels kept so the cue scorer stays accurate. `option-plan.ts` expanded to a plan per feeling (fill for relational-wound, cards for hot/heavy/self-directed). 360 tests pass. All copy [DRAFT].
- **M6** DONE (option b) — new `has_event` model gate (`moment-ai.ts` `hasConcreteEvent`, `moment-gemini.ts` slot) runs in the background at entry while she rates. If a clear sentence has no concrete event, the rating card routes her to clarify with Neha's copy: "Can you give a bit more, like who did what, and where and how? It helps." Asymmetric + null-safe so a failure never over-clarifies (respects the documented anti-over-clarify design). Tested (`moment-ai.test.ts`).

### Later additions (2026-07-31, session 2)
Done: captions on the 6 badges (approved); Home CTA opens straight on "tell me what happened" (intro node removed, `ENTRY='raw_entry'`); card top-anchored + hugs content (fixed height dropped, spacer moved below, scroll flexShrink); **dictate into the entry** (mic under the field, `expo-speech-recognition` added + iOS permission strings — NEEDS a dev-client rebuild); C5 quick-regulation items; C7 recommended self-act.

C3/C4/C6 now done (2026-07-31): C4 lane copy drafted + wired to SPOKEN; C6 conflict-cue → repair option; C3 moon shine + per-step praise. All [DRAFT] copy is Neha's to tune.

Whole M1–M30 + C1–C10 backlog is now built (types + 692 tests). Outstanding are only: Neha's transparent badge PNGs (placeholders in place), a dev-client rebuild for the dictation native module, tuning the [DRAFT] copy, and an eyes-on run (nothing sim-verified).

### Build order (locked)
C1 (safety) → C2 + C4 (core) → C3 (reward/theme) → C5 + C6 → AI-quality cluster (M5/M6/M7/M17/M23) → C9 components + M4/M21/M19 → C7/C8 → C10.
