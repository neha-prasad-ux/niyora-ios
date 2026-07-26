# Flow loophole audit

2026-07-26. Every AI node in `moment-flow.yaml` checked against the corpus that
trains it. MEASURED = ran it and read the output. INFERRED = reasoning.

The question this answers: **does the flow have gaps that make the model fail
for our cases?** Six real loopholes, one clean result, two of my own errors.

---

## Method

Parse `moment-flow.yaml` for every node and its `kind:`. Compare the 16
`ai-*` nodes against the 14 slots the corpus actually trains. Then grade the
corpus targets with the project's own deterministic graders, per slot.

---

## L1. Slot names do not match the flow. 42.7% of examples. MEASURED

| corpus tags | flow node id |
|---|---|
| `[cbt_stem]` | `high_cbt_stem` |
| `[cbt_reframe]` | `high_cbt_reframe` |
| `[activity_context]` | `high_activity_context` |
| `[anchor]` | `mixed_anchor` |
| `[check_read]` | `mixed_check_read` |
| `[honor_real]` | `mixed_real` |

**At inference the app sends the flow's name and the model has never seen it.**
1,997 of 4,678 examples affected. Fixed in `build_flow_corpus.py` and
`rebuild.py`, which retag to the flow node id.

## L2. The `clarify` rule was never in the data. MEASURED

The flow says clarify *"fires only when entry is thin"* and routes
clarify to acknowledge. The corpus does not:

| she wrote | share tagged `acknowledge` |
|---|---|
| <= 5 words | 14.5% |
| 16+ words | 17.0% |

Essentially flat. A thin entry gets an acknowledge target as often as a rich
one, and an acknowledge target on a five-word entry **can only be grounded by
inventing**:

> she wrote: `"fuming"`
> target: "you asked Tom at midnight and he turned it up. you've got a
> presentation at nine..."

The generator even labelled these `style: "one word too thin"` and produced the
rich restatement anyway. 232 such rows now dropped.

## L3. `acknowledge` says "invent nothing" and 85% of targets invent. MEASURED

The node's own intent in the spec: *"say the specific thing that happened back,
in her words, grounded, <=2 lines, invent nothing."*

Grading the **targets** with `ground.no_invention`: the corpus scores **14.8%**.
The trained model scored 21.4%, so **the model is more faithful than the data it
learned from.**

Root cause, found in the recovered `traversals.json`: each beat carries a
`context` field holding the accumulated state, and the target was written
against it. `assemble.py` used `context` for GATING and then built the training
prompt from `user_text` alone.

**Restoring context to the prompt:**

| slot | she wrote only | + beat context |
|---|---|---|
| **acknowledge** | 46.0% | **74.5%** |
| **check_read** | 10.1% | **43.7%** |
| clarify | 42.9% | 45.9% |
| feel_heard | 0.7% | 1.7% |
| we_good_more | 0.0% | 0.0% |
| honor_real | 0.0% | 1.5% |

Free for the top two. Nothing for the bottom three, whose grounding was never
recorded anywhere, so those 1,045 targets were re-authored.

## L4. `activity_context` breaks voice-bible rule 13 in 71% of targets. MEASURED

Rule 13 bans mechanism and physiology claims. This node's job is explaining
**why** an activity helps, and the corpus explains via banned physiology:

> "walking burns off the adrenaline sitting in your chest"
> "light hits your eyes and nudges your body out of shutdown"
> "cold water on your face slows your heart rate down"

**The why-lines change note predicted this exact trap:** *"explain why is exactly
the prompt that tempts a mechanism claim, which the voice rules ban."*

### The finding that matters more than the count

Four passes, four undercounts:

| pass | method | found |
|---|---|---|
| 1 | named-chemical regex | 109 |
| 2 | widened regex | 193 |
| 3 | a second regex | +21 |
| 4 | **reading all 109 survivors by hand** | **+75** |

**Reading found 3.5x what the best regex did.** A word list cannot enforce "no
claims about what happens in her body", because the claim has unlimited
phrasings and each widening only catches the ones already thought of.

The `MECHANISM` gate added to `assemble.py` is therefore labelled in the code as
**necessary but not sufficient**: a pass means "not obviously wrong", never
"approved". It carries a nine-case self-test, because the first version had
`\\b` instead of `\b` in a raw string and **matched nothing**.

## L5. Six AI nodes have zero training data. MEASURED

| node | kind | examples |
|---|---|---|
| `controllability` | ai-classify | 0 |
| `uncontrollable_honor` | ai-reflect | 0 |
| `uncontrollable_selfcompassion` | ai-reflect | 0 |
| **`uncontrollable_ifthen`** | **ai-draft** | 0 |
| `today_action` | should be AI | 0 |
| `crisis_scan` | ai-classify (corrected 2026-07-26) | 0 |

**The corpus trains the naming beat and not the action half.**
`uncontrollable_ifthen` is the **only `ai-draft` node in the flow** and has never
been trained. It serves the woman change 02d identifies as most likely to be low
or hopeless, and change 00c calls the if-then the highest-stakes slot for the
invented-person bug.

Filtering cannot fix data that does not exist. This needs generation.

## L6. The diagram hid six AI nodes. MEASURED

`:::new` was applied after `:::ai`, so **any AI node touched in a revision
silently left the blue set**. Every missing node had been changed at some point.
Fixed with a combined `ainew` class.

Two are also wrong in the YAML itself, so regenerating the map would not have
caught them:

- `act2_module` is `kind: branch`. A branch cannot produce "a message she edits
  and sends". The map's own prose lists "Act 2 module (x10)" as AI.
- `today_action` is `kind: ui`, yet change 00c says "model may offer options".

---

## What is NOT a loophole

### Rule 07 holds. MEASURED

*"The reflection beat never echoes her attributions."* The flow calls this the
one place an AI can make a spiral worse while sounding kind.

| | violations |
|---|---|
| corpus targets | **0.1%** (1 case, itself compliant) |
| model output after fine-tuning | **0.8%** |

**The sycophancy guard survives fine-tuning.** Reaching that number took three
corrections to the detector: `mixed_check_read` is exempt because voicing her
read IS its job, "your brain's checked out" is her brain, and "you're sure
everyone hates you" is hedged. The naive number was 2.5%.

### The seed files are correct

`finetune-seed-fullflow.md` and `-high.md` were suspected of teaching day-14,
prescribed crying, "research says" and attachment closes. **They ban all four,
explicitly, with rationale.** A keyword scan reads a prohibition list as
instructions; every hit was a line like *"no ~day-14 hold"*.

The corpus predates them: every example carries `spec: moment-flow@2026-07-24`
and the seeds were corrected **2026-07-25**. The correction came one day late.

---

## Two errors of my own, recorded so they are not repeated

**Guessing an undefined handoff.** `build_flow_corpus.py` mapped `deweight` to
`uncontrollable_selfcompassion` with no basis. Different lane, different job, and
change 01b had **deleted** the beat. Now `None`, with the general rule for dead
slots: *a deleted beat has no node, and the honest answer is nothing, not a
plausible neighbour.* This is exactly the failure change 00d names.

**Enforcing grounding on the wrong nodes.** Applying no-invention to every slot
collapsed six of eleven to a single example. **Reframing must introduce new
words; that is what reframing is.** The flow's own `kind:` is the discriminator:
enforce on `ai-reflect`, never on `ai-reframe` or `ai-classify`.

---

## Consequences for the training data

| fix | effect |
|---|---|
| retag to flow node ids | 1,997 rows corrected |
| restore beat context to the prompt | acknowledge 46.0% to 74.5% |
| drop thin-entry acknowledge | 232 rows |
| drop dead `deweight` slot | 126 rows |
| gate mechanism claims | 244 rows |
| re-author the three ungrounded reflect slots | 1,045 targets |
| re-author `activity_context` | 214 of 302 |

Rebuilt corpus: **3,315 train / 229 valid / 224 test**, with every `ai-reflect`
slot at 100% grounded targets.

## Still open

- **6.1% of the held-out test set** is `activity_context` rows that themselves
  violate rule 13, so the benchmark partly rewards banned output. Cleaning it
  breaks comparability with all prior runs; that switch has not been made.
- The **app sends a flat prompt string** with no chat template while the corpus
  trains a three-message format, so every eval is off-distribution.
  `stripWrapping` also strips **Gemma 3** markers on a Gemma 4 model.
- The six zero-data nodes still need generation.
