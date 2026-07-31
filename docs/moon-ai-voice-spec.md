# Moon AI — where it talks (Gemma integration map)

Built 2026-07-29 from the code. This marks every stage where **Moon AI can generate words**, so the Gemma seam gets wired only where it's allowed and never where it isn't.

## The one rule that governs everything

The model has exactly **three verbs**, defined in `src/v3/moment-ai.ts`:

- **echo** — her own sentence back, rearranged. Invents nothing.
- **pick** — reorder a closed authored list. Never writes a new item.
- **transform** — mechanical rewrite of her words. Correct by construction.

There is **deliberately no `compose`**. A model that could write a new sentence about her situation could invent a fact about her life, which is the failure she can't catch. Anything not doable by those three verbs is **authored copy** — Gemma must not touch it.

Measured on device (iPhone 15, 2026-07-27): **echo 77%, compose 26%.** That gap is why compose beats were deleted, not flagged.

Naming note: the word **"Moon" never enters a model prompt.** A 2B free-associates on lunar imagery and writes poetry. "Moon" is the app persona; the model only ever sees the trained system string below.

---

## Where Moon AI talks — every stage

Owner column is from `src/v3/moment-flow.ts`. Only `echo` and `pick` rows are model-touchable. Everything else is listed so it's explicit the model stays out.

### Reflect phase

| Stage (node) | Owner | Model's job | Currently | File |
|---|---|---|---|---|
| `intro` | authored | none | fixed: "with Moon AI" | moment-copy.ts:255 |
| `raw_entry` | ui | none | free-text field | moment-flow.ts:132 |
| `safe_check` / `crisis_handoff` | safety | **never generated** | crisis scan on raw text, verbatim copy | crisis-scan.ts:71 |
| `intensity_in` | ui | none | 0–10 scale | moment-flow.ts:156 |
| **`clarify`** | **echo** | say her words back (only if entry is thin) | deterministic carve | moment-flow.ts:165 |
| **`acknowledge`** | **echo** | say her words back | deterministic carve; **only beat live on device** | moment-flow.ts:173 |
| `together` / `naming_science` | authored | none | fixed copy | moment-flow.ts:180 |
| **`feelings`** | **pick** | reorder a closed feeling set | deterministic scoring | moment-flow.ts:189 |
| `reframe_small` | authored* | (planned pick) | authored; label "The moon's read" reserved for model output | moment-copy.ts:310 |

\* `reframe_small` is `owner: authored` in the flow table today but the copy carries a `[DRAFT]` "moon's read" slot and `reframe_small_angles` intro — the intended future pick/echo slot. Wire it as **pick over a closed reframe set**, never compose.

### Regulate phase

| Stage | Owner | Model's job | File |
|---|---|---|---|
| `breathe` | ui | none (breath ball) | moment-flow.ts:232 |
| `make_safe` / `activities` | authored | none | moment-flow.ts:240 |
| `arousal_check` | ui | none | moment-flow.ts:305 |
| `mixed_check_read`, `mixed_real` | echo | say her words back (legacy mixed lane, cut from live path) | moment-flow.ts:338 |

### React phase

| Stage | Owner | Model's job | File |
|---|---|---|---|
| `ready_reward` | reward | none | moment-flow.ts:371 |
| **`options`** | **pick** | reorder a closed act set (13 acts); safety items filtered out *before* ranking | moment-flow.ts:373 |
| `act` / `today_action` / `unctrl_ifthen` | she | her words in her slots | moment-flow.ts:387 |
| `intensity_out` | ui | none | moment-flow.ts:436 |
| `we_good_more` | echo | say her words back | moment-flow.ts:446 |
| `close` | reward | none (scratch card) | moment-flow.ts:459 |

**Live model touchpoints to wire: `clarify`, `acknowledge`, `feelings`, `options`** (plus `reframe_small` when its set is authored). The legacy `mixed_*` echoes are off the current path.

---

## The prompt (shared by every model beat)

Assembled in `src/v3/rough-moment-content.ts` and `src/lib/reflect-model-parse.ts`. **Byte-identical to the training corpus — do not "improve" any of it.** A sentence-case rewrite already regressed the model to third-person degenerate output.

**System turn** (`INSTRUCTIONS`, rough-moment-content.ts:145):

```
you reply to a woman having a hard moment. warm, plain, like a close friend in her 30s. say her own words back. never advise. lowercase, max 2 sentences, no dashes.
```

**User turn** (`buildUser`, fixed field order, newline-joined):

```
[<slot>]
she wrote: "<her text>"
she feels: <feeling>          ← suppressed when slot is acknowledge
cycle: <day 24, premenstrual window>   ← only inside PMS window
```

- `<slot>` is the **flow node id the corpus was trained on** (`BEAT_SLOT`), not our beat name. `confirm → acknowledge` is the only trained echo mapping today.
- Cycle line (`cycleContextLine`) is injected **only in the PMS window** and kept short — off-distribution context degenerates a 2B.

**Format footer** (`composeGemmaPrompt`): appended after the user turn —

```
Reply with only the sentence or two, nothing else. No quotes, no preamble.
```

**Parse** (`parseGemmaTurn`): strips both Gemma 3 (`<start_of_turn>`/`<end_of_turn>`) and Gemma 4 (`<|turn>`/`<turn|>`) markers. **No JSON is ever requested** — the corpus has zero JSON targets.

Model: `niyora-gemma4-e2b-v4-wide-deduped-int4.litertlm` (~3GB, gemma-3n-E2B int4), `GEMMA_MAX_CONTEXT = 2048`, timeout 5000ms.

---

## Guardrails (enforced above the provider, in `echo()` / `pick()`)

**echo** — three floors, in order (`moment-ai.ts` `echo`):
1. model line, but only if `isGrounded` (introduces **≤2 novel words** not in her text, `ground-floor.ts:198`) **and** not `echoBlocked`.
2. else the mechanical carve of her own sentence (cannot invent).
3. else `null` → the authored line renders.

`echoBlocked` runs on the model's **output**, not just her input — a reply that repeats her self-attack is perfectly grounded but forbidden. It blocks:
- her self-attack / core-belief statements (`CORE_BELIEF`, `NO_ECHO`, e.g. "you're too much")
- her read of someone else's intent (`ATTRIBUTION`)

**pick** — the model only orders items in the set it was handed. Anything not in the set is dropped; short-fills from authored order. **Safety suppression is an `array.filter` before the call** — a filtered option cannot come back however confidently the model ranks.

**Always, before any model call:** crisis scan on raw text (`crisis-scan.ts`). Crisis copy is verbatim and never modelled.

**Every verb may return `null`, and null is never an error** — the beat renders its authored line. The flow is complete with no model at all.

---

## Tone + word limits

From the system prompt, `DESIGN.md` (Voice and copy), and `moment-copy.ts:1–22`:

- **Max 2 sentences.** Lowercase in the model line. No dashes (no em dashes ever; use middle dot `·`).
- Warm, plain, close friend in her 30s. **Say her words back. Never advise.**
- Quiet, not chirpy. **No exclamation points** ("Yay!"/"Great job!" banned) — the flow has exactly one sanctioned exclamation (`hold_done`). No emojis. No motivational mantras.
- Never "it's fine" / "it's normal." Sentence case for human copy, lowercase for tiny labels.
- Provenance tags in copy: `[MAP]` approved · `[SAFETY]` locked · `[NEHA]` her voice · `[DRAFT]` placeholder awaiting her voice. **`[DRAFT]` slots (many `feelings`, reframes, acts) are the intended targets for on-device generation.**

---

## Integration reality check

- **`rough-moment.tsx` is the only path with a live Gemma call today** (`ReflectModel.generate`), gated by `EXPO_PUBLIC_REFLECT_AI=1`. Store build ships **no AI** — every beat scripted.
- **The Moon-tab `moment.tsx` flow has no provider seam wired at all.** `moment-ai.ts` defines the `MomentProvider` port but `moment.tsx` never calls it — the echo/pick beats are deterministic carves/scoring today. Comments there say "Gemini"; the shipping on-device model is **Gemma**. Wiring Gemma into the Moon flow means implementing `MomentProvider.generate` and calling `echo()`/`pick()` from those four nodes for the first time.
