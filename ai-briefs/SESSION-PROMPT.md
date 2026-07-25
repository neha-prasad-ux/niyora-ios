# Paste this to start the next session

---

You're picking up the **in-the-moment flow** for Niyora — an iOS app (Expo SDK 56 /
React Native / TypeScript) for women dealing with PMS. The flow is what happens
when a woman opens the app mid-distress: she types what happened, an on-device
model reflects it back, she gets regulated, she picks one small act, and she
leaves with a plan. It runs entirely on-device.

### The 60-second state of play

Three pieces have to work. **The design** (what the app says, in what order) is in
good shape, but the notes describing it contradict each other in ~70 places.
**The AI** — a LoRA trained overnight on 5,304 examples — learned the voice
perfectly (brevity 1.7%→100%) but only grounds facts correctly **34%** of the
time and swaps who-did-what; it was **never put on a phone**. **The app** has a
basic working version on device; most of the design isn't built yet.

**✅ 2026-07-25: on-device inference is PROVEN.** The bundled *untuned*
`gemma-3n-E2B-it-int4.task` generated a token on Neha's iPhone 15 (A16), twice in
two runs. Runtime only: trivial smoke prompt, nothing tuned, nothing measured about
quality. Full result in `WORKPLAN.md` → STREAM D → STEP 0.

Three things that will bite you if nobody says them out loud:

1. **Nothing tuned has ever run on the phone.** The runtime gate passed, but with
   the *untuned* model. The trained model is a Gemma-3-1B that was never exported.
   The app bundles an *untuned* gemma-3n-E2B. The stated target is Gemma 4 E2B,
   which nobody has trained and which has never run in Niyora. Three different
   models, and the one that ran is not the one we want.
2. **Corrections in this project don't propagate.** They land in one file and go
   stale in four others. This happened three separate times and each time the
   wrong version was the one being read.
3. **The training data has holes where the flow grew.** Four AI slots — including
   the options menu, the highest-risk component in the product — have **zero**
   examples.

**Work in the worktree at `.claude/worktrees/nervous-vaughan-7455dc`.**

## Read these first, in this order

1. `ai-briefs/moment-flow.yaml` — **THE spec, single source of truth.** Every node
   has an id, a `kind`, and the rationale for why it's shaped that way.
2. `ai-briefs/voice-bible.md` — 17 hard rules for how the moon speaks. Violations
   are rejected, not debated.
3. `ai-briefs/WORKPLAN.md` — the 8 streams, split by file ownership.
4. `ai-briefs/NEXT.md` — what's decided, what's still Neha's call.
5. `ai-briefs/JOURNEY.md` — what we tried, what we killed, and why.

Findings docs to consult when a stream touches their area: `act-evidence-review.md`,
`flow-methodology-check.md`, `selfguided-evidence-findings.md`, `dv-safety-findings.md`,
`regulatory-findings.md`, `failure-cases.md`, `competitive-findings.md`,
`chat-vs-flow-measurement.md`, `finetune-results.md`.

## What you're doing

### ✅ FIRST GATE: ALREADY CLEARED 2026-07-25. Don't re-run it as if it's open.

Neha's call was *"let's make sure we clear running on the phone first."* That is
done. On her iPhone 15 (A16, iOS 26.5.2), a Debug build with the
`increased-memory-limit` entitlement actually present, MediaPipe genuinely linked
(not the `#if canImport` stub), and the 2991MB `.task` in `Bundle.main`:
`availability()` returned `available`, `prewarm()` returned true (17518ms cold,
696ms warm), and the model answered *"Reply with exactly one short sentence: what
colour is the sky on a clear day?"* with **"The sky on a clear day is blue."** in
3421ms and 3693ms across two runs. Memory available to the process was 3638MB
before prewarm and 3030MB with the engine resident.

**Read the scope of that carefully before you repeat it to anyone:** untuned
model, `.task` / MediaPipe (NOT Gemma 4 `.litertlm`), a trivial non-clinical
prompt, no quality or grounding measurement, memory read in a probe screen and not
in a real session, latency on ~10 output tokens. Full detail and full caveats in
`WORKPLAN.md` → STREAM D → STEP 0.

**What still needs the device and her at the keyboard** (you drive these, don't
hand them to an agent): stock Gemma 4 E2B in *our* app, then a real session with
the full UI up to see whether the headroom survives it, then real-turn latency.
The rules that made the first gate trustworthy still bind: **the simulator does
not answer any of these questions**, and a build that launches and quietly routes
to scripted-only looks identical to success, so check the symbols rather than the
screen.

**Known environment gotchas, all of which have cost a session before:**
- The worktree needs a **`node_modules` symlink** for Metro. *(Already in place in
  this worktree, pointing at the main checkout — verified 2026-07-25. Don't
  `npm install` over it.)*
- Metro leaks across worktrees and will pull another worktree's broken routes.
  Pin it: `EXPO_ROUTER_APP_ROOT="$(pwd)/src/app" --clear`.
- CocoaPods fails with `Unicode Normalization not appropriate for ASCII-8BIT`
  unless you run `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`.
- **The web target is broken.** Don't use it to "verify" anything.
- Don't thrash Metro — restart it deliberately, not reflexively.

### IN PARALLEL: Stream 0 — doc reconciliation, via agents.

The build blocks on her; the docs don't. Dispatch Stream 0 while you wait.
**Nothing else starts until Stream 0 lands.**

A sweep found ~70 contradictions across the briefs. The critical ones in the four
authoritative files are already fixed, but **the eight step briefs (`00-entry.md`
… `08-we-good.md`) still describe the pre-correction flow** — they carry the
removed day-14 hold, the removed `deweight` beat, the "escalation ladder", the
banned vagus-nerve line, and attachment-language closes. They are the most-read
docs and the most wrong. Rewrite them against the spec or delete them; deleting
is a legitimate answer, since they add nothing `moment-flow.yaml` doesn't have.

Then dispatch the rest to **parallel agents**, split by file ownership so they
don't collide. A/B/C/D/D2/E/F can overlap. **G runs last** — it touches every
content file. Full detail per stream is in `WORKPLAN.md`; this is the shape:

| stream | what it is |
|---|---|
| **A** · the app | first message · clarify gate (a loop, not one-shot) · per-stage caps · acknowledge tiering · **wire the human nudge** (written, referenced zero times in the screen) · **move the tired now/tomorrow question to `time_it`** · kill the "escalation ladder" naming in code |
| **B** · options + safety | the 3-act menu, **safety screen as a precondition of generation, not a filter after it** · CUES · **the if-then Today action** (she fills both slots) · the after-the-fight checklist for acts that have an "after" |
| **C** · measurement | local-only session record · intensity **twice** (in, out — the delta is the measure) · 24h follow-up · `completion_rate`, never DAU |
| **D** · the model | **Gemma 4 E2B** — see below |
| **D2** · targeted tuning | contrastive pairs · hard multi-actor cases · reweight `acknowledge` · actor-swap · drop the ~176 stale rows |
| **E** · echo experiment | ~20 min, produces the number that decides A's acknowledge tiering |
| **F** · act modules | the 12 acts, evidence attached honestly |
| **G** · why-lines | the 16 choice points that don't say what they're for. **LAST** |

## The model track — this is a major piece, not a footnote

**Nothing tuned is on the phone.** That's the headline. Current state:

- We trained a **LoRA on Gemma-3-1B** overnight. It fixed the voice completely
  (brevity 1.7%→100%, no-advice 83%→100%) but grounding only reached **34%**, and
  the 1B swaps who-did-what. **It was never shipped.**
- Meanwhile **the app is configured for an *untuned* `gemma-3n-E2B-it-int4.task`.**
  So the trained model and the configured model are two different models, and
  neither is the target. **Resolve this inconsistency explicitly.**
- **The target is Gemma 4 E2B** (ungated, 2.588GB prebuilt `.litertlm`).
- Neha's iPhone 15 is an **A16 — it cannot run Apple Intelligence**, which is why
  on-device Gemma is the primary provider rather than Apple FM.

**✅ STEP 0, THE GATE, PASSED 2026-07-25.** Neha's call was to prove it runs on the
phone before anything else in the model track, and it does: a token came out of the
bundled untuned `gemma-3n-E2B-it-int4.task` on the A16, twice. Details above and in
`WORKPLAN.md`. Disk is 22GB free, the old "98% full" blocker is gone, signing and
the Increased Memory Limit entitlement are both sorted (the entitlement is in the
built app's embedded entitlements, via a profile regenerated on 2026-07-25).

**The false pass is still the thing to watch.** The module compiles behind
`#if canImport(MediaPipeTasksGenAI)`, so if the pods leave the binary it becomes a
silent stub rather than failing loudly. This time it was checked properly, by
finding the `GemmaEngine` symbol and 788 `LlmInference` symbols in
`Niyora.debug.dylib`. Do the same on any future build. `availability()` alone is
not proof: it only says the file is in the bundle.

Note the model that passed is `gemma-3n-E2B-it-int4` (`.task`, MediaPipe) — **not**
Gemma 4 E2B (`.litertlm`), a different file and loader. What it proves is that
the A16 can run a ~3GB model inside Niyora, which was the actual risk. Gemma 4 is
now a swap, not a leap, but it is still a swap nobody has performed.

**Then do the rest of Stream D in this order — prove the cheap thing first:**
1. Prove the **stock** Gemma-4-E2B runs in *our* app on device. It has only been
   seen running in Google's AI Edge Gallery, **not in Niyora** — do not treat that
   as verified, and do not treat the 2026-07-25 `.task` pass as covering it.
2. Prove the **export** with a 20-iteration throwaway adapter.
3. Only then train for real, on the existing corpus (model-agnostic, no regen).

**Two silent traps — both fail without an error message:**
- Gemma 4 shares KV across layers 15–34 (no `k_proj`/`v_proj` there) and mlx-lm
  **skips missing keys without warning**. Use `[q_proj, o_proj, gate_proj, down_proj]`.
- **Never fuse into a 4-bit base** — it discards the adapter silently and the model
  still talks fluently enough to pass a smoke test. Use `fuse --dequantize`
  (bf16 is 10.24GB). Gate on a temp-0 decode comparison.
- Set `eos_token_id: [1, 106]` or generation runs past `<end_of_turn>`.

## Ground rules — these are not style preferences

- **Never invent a person, pet, place, or detail she didn't say.** This shipped a
  bug once ("your sister") and cost us 63 corpus examples. It is the single
  failure mode that most destroys trust.
- **Never claim a mechanism we don't hold.** No "research says", no physiology,
  no vagus nerve. Say what it does *for her*.
- **Never use attachment language.** No "I'm always here", "come back anytime",
  "I've been thinking about what you said". The flow **ending** is a safety
  feature — this is the exact mechanism named in the Character.AI wrongful-death
  complaints.
- **Safety copy is verbatim.** The model is never the arbiter of a crisis.
- **If evidence is thin, say so in a code comment** rather than writing a
  confident science line.
- **CI bar, no exceptions:** `npx tsc --noEmit && npm run lint && npm test` all
  green. `react-hooks/set-state-in-effect` is an ERROR here.
  `StyleSheet.absoluteFillObject` does not exist on this SDK.

## ⚠️ The trap that has bitten this project repeatedly

**Corrections get applied to one file and left stale in four others.** This has
now happened three separate times, and each time the wrong version was the one
being read and shared.

The worst case: an effect size was written as **d=0.91**, corrected once to
**0.65** *with no citation*, and corrected again to **0.53** (k=29, N=1,208, vs
goal intentions — the fair comparator). All three values were live in different
files simultaneously.

**So: when you change a claim, grep the whole repo for the old one.** And when
you read a number, check whether another file disagrees before you rely on it.
`d = 0.53` is correct. If you see 0.91 or 0.65, it is stale.

**And check the artifact, not the doc that describes it.** A sweep claimed the
training corpus was poisoned because the *seed* file carried the day-14 hold,
prescribed crying, and attachment closes. Counting the actual JSONL: all three
appear **zero** times — the gates caught them. Two real liabilities survive
(`deweight`, 120 examples; physiology claims, 56). The corpus is **5,304** pairs
(4,678 + 313 + 313, line-counted); 5,367 is the pre-gate number and the 63-pair
gap is the `invented_person` gate. Inferring from the seed would have sent an
agent to regenerate thousands of good examples.

## Decided — do not reopen

- **Anthropomorphism: a warm voice, not "someone."** It may react to what she
  just said; it may not have standing feelings, needs, or a bond that persists
  after she closes the app. The ✅/❌ table is at the top of `voice-bible.md`.
- **The ending.** Both branches converge: something concrete → an if-then →
  `we good?` → intensity out → frequency-gated human nudge → close. The
  **after-the-fight checklist** attaches only to acts that have an "after"
  (say-it-to-them, own-my-part, a-real-hurt, work-clash) — nobody needs one for
  "have a shower."
- **The tired question moved** from the body check to `time_it`. At the body check
  she hasn't chosen an act yet, so "now or tomorrow?" was asking her to time an
  action that didn't exist. The body check now only names the cost.
- **She fills both if-then slots, not the model.** Self-generated intentions work
  better, and it's structurally impossible for the model to invent a person that way.
- **The crisis scan runs on every message**, not just the first, and never
  relaxes by cycle phase. (Suicide attempts peak *at menstruation*, so a
  luteal-weighted design would have relaxed exactly as risk peaked.)
- **The DV rule: we never guide her. Detect → stop → hand off.** No safety
  planning, no boundary advice. We cannot give dangerous advice if we give none.
- **The ~day-14 hold is gone.** Only the short regulate-first delay remains.
- **Why-lines are required at every choice point** — see `meta.why_lines` in the
  spec for the 16-item inventory.

## Still Neha's call — ask, don't decide

- Which crisis services to name (drafted: 988 + findahelpline.com).
- Whether the deterministic echo becomes the floor for `acknowledge` or stays a
  fallback. **Do not settle this until Stream D2 has run** — the 34% grounding
  figure came from general data, never from data aimed at the failure.

## How to work with Neha

She will catch you when you overstate. That has happened more than ten times in
this project and every single correction improved the work. So: **state
confidence honestly, flag what you haven't verified, and never round a finding
up.** If you're inferring rather than checking, say which one you're doing.

Start by confirming the spec, the code, and the diagram agree — then dispatch.
