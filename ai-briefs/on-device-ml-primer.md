# On-device ML: a primer

Written 2026-07-26. This explains the machinery behind the model work in plain
language. No prior machine-learning knowledge assumed. It is the companion to
`model-gate-journey.md`, which covers the decisions.

Claims are tagged **MEASURED** (someone ran it and read the output) or
**INFERRED** (reasoning, not tested).

---

## 1. Fine-tuning: you do not retrain the model

The instinct is that "training the model on our data" means rebuilding it. It
does not. Rebuilding Gemma from scratch would take a data centre and months.

What actually happens:

1. You take the finished model and freeze it. You never change it.
2. You train a small extra piece alongside it, called an **adapter**. The adapter
   is tiny relative to the model.
3. The adapter learns to nudge the model's answers toward what you want.
4. When you are done, you **merge** (or "fuse") the adapter into the model, so
   there is one file instead of two.

A rough analogy. The model is a fluent speaker. The adapter is not a new brain,
it is a set of habits: be brief, use her words, do not give advice. You train the
habits, then you make them permanent.

| term | what it means here |
|---|---|
| base model | the frozen original, e.g. `gemma-3-1b-it` |
| LoRA adapter | the small trained piece, a few tens of MB |
| fuse / merge | fold the adapter into the base, producing one model |

**MEASURED:** our Gemma 3 fine-tune trained a LoRA at rank 16 across 12 layers for
1,600 iterations, peaking at 3.2 GB of memory on an 8 GB M1. Brevity went from
1.7% to 100%. Grounding went from 1.7% to 34%. See `finetune-results.md`.

### The trap that lives here

Merging the adapter into a heavily compressed base **silently deletes it**. The
adapter's nudge is smaller than the rounding step of the compressed numbers, so it
rounds away to nothing. No error appears. The model still speaks fluently, so it
passes any casual check, while being completely untrained. This is documented in
`export-decisions.md` and is the reason every plan says "fuse into bf16, never
into 4-bit".

---

## 2. Conversion: from a chef to a recipe card

A trained model does not run on a phone. It has to be converted first. This is
the step that has never been attempted in this project.

Here is what conversion actually is.

**A trained model is like a chef who cooks by feel.** Ask for a dish and you get
one. There is no written procedure. The knowledge is in the hands.

**A phone needs a written recipe.** It cannot improvise. It needs an explicit list
of steps it can execute the same way every time.

So the converter does this:

| step | what happens |
|---|---|
| 1. Watch | Give the model one question. Follow it through answering. |
| 2. Record | Write down every single mathematical operation, in order. Every multiplication, every addition. |
| 3. Tidy | Clean up the list. Merge steps that can be merged, drop steps that do nothing. |
| 4. Round down | Replace precise numbers with coarser ones that take less space. This is where roughly 10 GB becomes roughly 2.5 GB. |
| 5. Staple | Bundle the recipe, the numbers and the vocabulary into one file. |

Step 4 has a name: **quantization**. The setting we need is
`dynamic_wi8_afp32`, which stores the weights as 8-bit integers while keeping the
arithmetic in floating point. **MEASURED:** that is a real recipe name in
`ai-edge-quantizer` 0.7.0. `dynamic_int8`, which our own brief used to specify,
is not.

Step 1 is worth pausing on. The converter learns the recipe by **watching one
example run**. If a part of the model only activates for certain inputs, it may
never be recorded. **INFERRED:** that is a general property of trace-based
conversion, and it is one reason converters break late and strangely on unusual
architectures.

---

## 3. Why conversion needs so much memory

The output file is small. The process of making it is not.

While the converter is recording, three things exist in memory at the same time:

| held in memory | why |
|---|---|
| the original model | it is being run, so it must be loaded |
| the half-written recording | the growing list of operations, plus copies of the numbers |
| every intermediate result | each step's output has to be kept so the next step can be traced |

So you need several times the model's size in working space, even though the file
that comes out is a quarter of the size that went in.

**MEASURED** figures for our case:

| | size |
|---|---|
| base Gemma 4 checkpoint (`model.safetensors`, bf16) | 10,246,621,918 B (10.25 GB) |
| fused bf16 output | another ~10.25 GB |
| exported `.litertlm` | ~2.6 GB |
| Python environment (torch, transformers, etc.) | ~3 GB |

**INFERRED** peak requirement: roughly 25 GB of disk and 24 GB+ of RAM. The Mac
that tried had 8 GB of unified memory and 1.4 GB of free disk. **MEASURED.** That
is why the export gate did not run.

The point to take away: **a 2.6 GB output does not mean a 2.6 GB job.**

---

## 4. What is actually inside the model file

We opened the stock Gemma 4 `.litertlm` and read its table of contents. It is not
one thing. It is a container with 12 labelled sections.

**MEASURED**, total 2,588,147,712 bytes, LiteRT-LM container version 1.5.0:

| § | section | size | what it is |
|---|---|---|---|
| 0 | `LlmMetadataProto` | 12 K | settings, including the stop tokens |
| 1 | `SP_Tokenizer` | 4.7 M | the vocabulary |
| 2 | `tf_lite_embedder` | 104 M | turns tokens into numbers |
| 3 | `tf_lite_per_layer_embedder` | **1.28 G** | MatFormer per-layer embeddings |
| 4 | `tf_lite_audio_encoder_hw` | 94 M | hearing |
| 5 | `tf_lite_audio_adapter` | 9.4 M | hearing |
| 6 | `tf_lite_end_of_audio` | 6.8 K | hearing |
| 7 | `tf_lite_vision_encoder` | 224 M | seeing |
| 8 | `tf_lite_vision_adapter` | 4.7 M | seeing |
| 9 | `tf_lite_end_of_vision` | 6.8 K | seeing |
| 10 | `tf_lite_prefill_decode` | **818 M** | **the actual text model** |
| 11 | `tf_lite_mtp_drafter` | 44 M | guesses ahead to go faster |

Read the two bold rows together. **The part that writes text is 818 MB out of
2.59 GB. Under a third of the file.** The single largest section is 1.28 GB of
per-layer embeddings, and roughly 229 MB is vision and 104 MB is audio, neither of
which Niyora uses at all.

> Small arithmetic note for anyone cross-reading: `export-gate-results.md` rolls
> the vision total up as 328 MB. Adding sections 7 to 9 gives ~229 MB. 328 looks
> like 224 + 104, which counts the general embedder as vision. The section table
> above is the measured source; prefer it.

### The consequence

We export **text only**. So a successful export should drop the audio, the vision
and probably the drafter entirely.

> **A text-only export SHOULD come out much smaller than the stock file, with
> fewer sections. Plausibly 4 to 6 sections, well under 2 GB.**

Which means: **comparing file sizes to judge whether the export worked is wrong.**
A size mismatch is the expected result, not a failure signal. The right check is
whether `litertlm_peek` parses the file and whether the section list makes sense.
**INFERRED**, because no successful text-only export exists yet to compare
against.

---

## 5. Stop tokens: the Enter key, not a turn limit

This one is easy to misread, and getting it wrong costs days.

**A stop token is not a limit on how many turns a conversation can have.** It is
the marker the model writes to say "I have finished my message."

The model does not know it is finished in any human sense. It writes one token,
then the next, then the next. It stops when it writes a specific token that means
stop, and the runtime sees that token and closes the stream.

### The distinction that matters

There are two completely different things that look identical in a transcript.

| | what the model did | what the machine sees |
|---|---|---|
| **A** | emitted the special token, id 106 | one token that means "end of message" |
| **B** | wrote the characters `<`, `t`, `u`, `r`, `n`, `\|`, `>` as ordinary text | seven or so ordinary text tokens that mean nothing special |

The analogy: **pressing the Enter key versus typing the letters E-N-T-E-R.**

On screen you might not be able to tell. To the machine they could not be more
different. One ends the message. The other is just more message.

**INFERRED, and it is the leading hypothesis:** this is why Gemma 4 does not stop.
It may be spelling out its own stop marker as text rather than emitting the real
token. The runtime is watching for the token, never sees it, and keeps generating
until it hits the cap.

Our current fix works on exactly this. Our Swift code watches the streamed text,
spots the characters, and cancels the generation itself. That is why Gemma 4's
recorded stop reason is `stopMarker` and not `eos`. **MEASURED**, 3 runs of 3.
It is a patch over the symptom, not a repair of the cause.

### The file is configured correctly and still does not stop

**MEASURED:** the stock `.litertlm` metadata carries three stop tokens.

| id | token | role |
|---|---|---|
| 1 | `<eos>` | end of sequence |
| 50 | `<\|tool_response>` | serving-level stop, halt when a tool response starts |
| 106 | `<turn\|>` | end of turn |

Token 106 **is present.** So the runaway is not explained by a missing stop token
in the file. Its stop configuration looks right, and it still runs to the cap.

This narrows the problem usefully. It is not a configuration mistake in the file.
It is something about what the model emits or how the runtime evaluates it.
Section 11, the multi-token-prediction drafter, changes how tokens are produced
and is one place to look. That is a **guess**, offered as a direction, not a
finding.

For contrast, Gemma 3n stops with reason `eos` on 3 runs of 3. **MEASURED.** It
presses Enter. Gemma 4 has never once done so.

---

## 6. Vocabulary, in one table

| term | plain meaning |
|---|---|
| token | a chunk of text, roughly a word-piece. Models read and write tokens, not letters. |
| tok/s | tokens per second. How fast the model writes. |
| prefill | reading your prompt before writing anything. |
| time to first token | how long you wait before the first word appears. |
| decode | writing the answer, one token at a time. |
| LoRA adapter | the small trained piece that nudges behaviour. |
| fuse / merge | folding the adapter into the model permanently. |
| quantization | rounding the numbers down to shrink the file. |
| conversion / export | turning a trained model into a file a phone can run. |
| `.litertlm` / `.task` | two phone-runnable container formats. |
| stop token | the marker that means "message finished". |
