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

**✅ 2026-07-25: on-device inference is PROVEN.** The *untuned*
`gemma-3n-E2B-it-int4.task` generated a token on Neha's iPhone 15 (A16), across
four runs. Runtime only: trivial smoke prompt, nothing tuned, nothing measured
about quality. Full result in `WORKPLAN.md` → STREAM D → STEP 0.

**Also 2026-07-25, later:** Stream 0 landed, the spec is now parseable and
CI-guarded, on-demand model download is built and working, and Gemma 4 E2B
`.litertlm` was shown to LOAD in MediaPipe (but not to terminate). Three claims
in `export-decisions.md` were measured false. **Read "START HERE: the model
track" below before planning any model work.**

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

### ✅ Stream 0 — doc reconciliation. LANDED 2026-07-25.

Don't re-dispatch it. Four agents ran, split by file ownership:

- **The eight step briefs (`00`–`08`) were REWRITTEN**, not deleted. The agent
  argued against deleting: they carry per-beat tone, the scripted fallback, and
  reward placement, none of which exist in `moment-flow.yaml`. **If Neha does
  want them gone, the correct order is to fold `tone` / `fallback` / `reward`
  into the spec as node fields FIRST, then delete all nine together.**
- `_legend.md` persistence reversal and the stale ~1B runtime claim: fixed.
- `flow-methodology-check.md`: GAP 1 recorded as rejected, GAPs 2-4 closed with
  the spec node that closes each (GAP 2 with two honest caveats, not papered).
- Seed files: ~40 voice violations fixed, 11 new generator gates added.

**🔴 The single most important thing Stream 0 found: `moment-flow.yaml` did not
parse.** A `memory:` block had been inserted mid-sequence, orphaning every node
from `act2_intro` down. It had been unreadable as data for some time and nobody
noticed, because it was only ever read by eye. Fixed, and now guarded in CI by
`src/__tests__/moment-flow-spec.test.ts`, which asserts it parses, has the
expected sections, has unique ids, has no dangling `next:` target, and leaves no
node unreachable. **That test is the thing standing between you and the same
class of silent breakage. Do not weaken it to make an edit pass.**

It also caught two nodes that were written, agreed, and unreachable in the
graph: `intensity_in` and `body_tired`. Both are now wired (Neha's calls:
`intensity_split → intensity_in` on both branches; `body_tired` off
`body_reward` so the general gap is handled first). One edge case is flagged
in the spec and NOT decided: if tired is her only gap, `body_ask_soon` still
asks whether she can lie down now.

Streams A/B/C/D/D2/E/F can now overlap, split by file ownership. **G runs
last** — it touches every content file. Full detail per stream in `WORKPLAN.md`.
Note some why-line work has since been committed, so check `git log` and
`ai-briefs/why-lines-draft.md` before assuming G is untouched.

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

## 📍 STATE AT HANDOVER (end of 2026-07-25) — read before you touch the device

**What Neha wants next: to test Gemma 4 on her phone.** That is blocked on two
things, and the second one is not about Gemma.

**1. Gemma 4 does not terminate.** Last trustworthy data point (run 9):
`prewarm → true in 4398ms`, then generation never returned. Earlier, with a bare
prompt, it answered correctly and then emitted turn tokens for 92s until the
512-token cap. Real decode speed is still UNKNOWN because every timing so far
was a runaway.

**2. ⚠️ The probe loop went unreliable and you must fix this first.** Runs 10
and 11 launched the app process successfully but produced **no output at all**,
not even the first line.

**Do not interpret probe silence as a model result.** There are at least THREE
independent causes and they are indistinguishable from the Mac:

- **The log sink died.** Confirmed: the sink process was killed (SIGTERM) around
  this time. The probe's POST is deliberately fire-and-forget
  (`.catch(() => {})`) so the app never notices, and every line vanishes.
- **Metro's console forwarding is intermittent.** It produced nothing for the
  first several runs, started working later, and its last line is run 9's. So a
  stale Metro log does NOT prove the JS didn't run.
- **The dev client may stop reconnecting** after a plain `niyora://gemma-probe`
  launch, and need the full
  `niyora://expo-development-client/?url=http%3A%2F%2F<host>%3A8081` first.

I originally wrote this section claiming the JS never ran. **That was
overstated** — it rested on Metro's log, which is itself unreliable. Rule the
causes out in order before concluding anything about the model.

**Make the harness prove itself before each run:** POST a known line to the sink
from the Mac (`curl -X POST -d ping http://<host>:8099/`) and confirm it lands,
and have the probe emit a line at the very top of the component before it
touches the model. A harness that cannot distinguish "no answer" from "no
connection" is worse than no harness, because it produces confident wrong
conclusions.

**Live services on the dev Mac** (all may be dead by the time you read this):
- Metro, pinned: `EXPO_ROUTER_APP_ROOT="$(pwd)/src/app" npx expo start --dev-client --clear`
- Log sink on **8099** — the probe POSTs every line here; the script is
  throwaway and lives in the session scratchpad, so rewrite it if it's gone.
  It is ~30 lines: accept POST, append to a file.
- LAN model server on **8100**, serving `~/code/product/niyora-models/`

**Model files, moved somewhere durable:** `~/code/product/niyora-models/`
contains `gemma-4-E2B-it.litertlm` (2.4G) and `gemma-4-E2B-it-web.task` (1.9G).
Both are ALSO already installed on the phone in Application Support, so a re-run
needs no download. Re-fetch from
`litert-community/gemma-4-E2B-it-litert-lm` if needed — ungated, no token.

**The phone:** iPhone 15, UDID `00008120-001A11262201A01E`, devicectl id
`D60EA350-8D6E-51C0-9F40-CBEE487AE01B`. Ask Neha to set **Auto-Lock → Never**
before doing anything. Lock retries cost more time than any technical problem
on 2026-07-25.

**Cheapest path to "Neha can test Gemma 4 today"**, if the C API work is too
big for one sitting: cap `maxTokens` low (64) and trim client-side at the stop
markers. That bounds the runaway and yields a usable answer plus the first real
tokens/sec number. It is a workaround, not a fix. The matrix to do exactly this
is already written into `gemma-probe.tsx` and has **never successfully run**.

## 🔴 START HERE: the model track, as of end of 2026-07-25

Read `ai-briefs/export-decisions.md` **including its new correction banner**
before you plan anything. Three of its load-bearing claims were measured false
on device. If you read past the banner you will re-derive a multi-day rewrite
from reasons that do not hold.

### What is now established by measurement

| | |
|---|---|
| `gemma-3n-E2B-it-int4.task` (2991MB) | **Works.** Loads, generates, terminates. 0.7s warm prewarm, 1.8-4.7s per short answer. This is the incumbent. |
| `gemma-4-E2B-it.litertlm` (2468MB) | **Loads in MediaPipe on iOS** (`prewarm → true`, 4398ms). Does **not** terminate. |
| `gemma-4-E2B-it-web.task` (1910MB) | **Does not load**: `Unable to open zip archive`. The web build is not a valid MediaPipe bundle. Dead end. |
| GPU backend | **Hangs**, >16 min, no error. Selectable and non-functional. Never request it. |
| Skia collision | **Did not reproduce** under the real `BreathingParticles` workload. |
| Memory | Non-issue. 2589-3030MB free with a ~2.5GB engine resident on a 6GB A16. |
| On-demand download | **Built and proven.** Background `URLSession`, progress events, size + SHA-256 verify before install, atomic install to Application Support, backup-excluded, Wi-Fi default, free-space precheck. Pulled 1.9GB and 2.5GB to the device. `setActiveModel()` + `downloadModel()` mean changing model is a download, not a rebuild. No HF token needed: `litert-community/gemma-4-E2B-it-litert-lm` is `gated: false`. |

### The actual fork, and it is NOT "3n or 4"

The reason to move to Gemma 4 was Route B's GPU story. **That reason is gone.**
`gemma-3n` works today. So the deciding question is the **export path**, which
neither of us has tested:

- **gemma-3n**: runs well, but can we *tune and deploy* it? `export-decisions.md`
  says MediaPipe LoRA serving never supported Gemma-3, and converting a fused
  model back to `.task` is unproven. A model you can run but cannot tune is
  worthless here.
- **Gemma 4**: doesn't terminate yet, but LiteRT-LM is Google's supported path
  and `export_hf` is one command from a fused HF dir. Also `MPPLLMInference` is
  `SWIFT_DEPRECATED_MSG("Migrate to LiteRT LM instead")`, so MediaPipe is
  end-of-life either way.

### The gates before betting on Gemma 4, cheapest disqualifier first

1. **Can we export a fine-tuned Gemma 4 to `.litertlm` at all?** Mac-only, no
   device, 20-iteration throwaway adapter. If the toolchain doesn't work,
   everything downstream is moot. **Do this first.**
2. **Does Gemma 4 terminate?** Needs `LlmPromptTemplates` via the C API. See the
   "Gemma 4 turn format" section of `export-decisions.md`, including the note
   that inline markers were tried and FAILED, so don't retry that.
3. **Is it fast enough?** `MODEL_TIMEOUT_MS` is 5s; a reflection is 30-50 tokens.
   Both Gemma 4 timings so far were runaways, so tokens/sec is unknown. **This
   gate can kill Gemma 4 on its own.**
4. **Stock quality baseline** on the held-out set, before any tuning. Without it
   you cannot tell whether tuning helped, and a 2B-class model may already
   ground well untuned.
5. **Only then train**, into a bf16 base with `--dequantize`, gated on a temp-0
   decode comparison. RunPod belongs between 4 and 5, not before.

### Dev scaffolding built on 2026-07-25 (throwaway, not committed)

- `src/app/gemma-probe.tsx` at `niyora://gemma-probe`, registered under `__DEV__`
  in `_layout.tsx`. **Self-runs on mount** and POSTs every line to a sink on the
  Mac, because a physical phone cannot be tapped by script and app `console.log`
  did not reliably reach Metro. Silence after a step IS the failure signal.
- A log sink on port 8099 and a LAN file server on 8100 (both in the session
  scratchpad). The probe derives the host from Expo's `hostUri`, so it follows
  the LAN rather than hardcoding an IP.

### Two traps that cost real time, worth knowing

- **Xcode 16 debug builds split the binary.** `Niyora` is a ~92KB launcher stub;
  all real code is in `Niyora.debug.dylib`. Searching the main binary for
  MediaPipe symbols finds nothing and looks exactly like the `#if canImport`
  stub trap. The decisive check is the `GemmaEngine` symbol, which only exists
  inside the `canImport` branch.
- **The phone locking is the biggest single time sink.** Every build, install,
  and launch fails with `Locked` and the retries add up to more lost time than
  anything technical. Ask her to set Auto-Lock to Never before you start.

## The model track — background, superseded in places by the section above

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
