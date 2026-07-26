# The model gate: Gemma 3 or Gemma 4, and why it is still open

A decision record, written 2026-07-26. It covers how we chose which language
model runs inside Niyora, what we measured, what we got wrong, and why the
decision is not made yet.

Every claim below is tagged:

- **MEASURED** = someone ran it and read the output.
- **INFERRED** = reasoning from something measured. Not itself observed.

That tagging is not decoration. It is the whole lesson of this stretch of work.

---

## 1. Why the model runs on the phone at all

Niyora is where a woman writes down what just happened to her, in her own words,
in the moment it is happening. That text is the most private thing the product
touches.

Two reasons the model runs on the device:

| reason | what it buys |
|---|---|
| Privacy | Her words never leave the phone. There is no server to breach, no log to subpoena, no vendor terms to read. |
| Offline | It works on a train, in a basement, on a bad connection, at 2am with no signal. |

The cost of that choice is real and it is the source of every difficulty in this
document:

| cost | detail |
|---|---|
| Size | The model file must fit on the phone. The stock Gemma 4 file is 2.59 GB. **MEASURED** |
| Speed | A phone decodes at single-digit tokens per second, not hundreds. **MEASURED** |
| Conversion | A model trained on a Mac cannot run on a phone as-is. It has to be converted, and the conversion is a separate piece of engineering that can fail. See `on-device-ml-primer.md`. |
| No hotfix | If the model behaves badly, we cannot fix it server-side. We ship a new file. **INFERRED** |

A cloud model would remove all four costs. It would also mean sending her worst
day to someone else's computer. We are not doing that. So the four costs stay,
and the rest of this document is about paying them.

---

## 2. The two candidates, measured on device

| | Gemma 4 E2B (`.litertlm`) | Gemma 3n E2B (`.task`) |
|---|---|---|
| Decode rate after first token | **~5.5 tok/s** | **~10.4 tok/s** |
| Total time, templated prompt | 3.8 to 4.3s | 2.4 to 3.3s |
| Time to first token | 2.1 to 2.3s | 1.5 to 2.3s |
| Stop reason, 3 runs of 3 | `stopMarker` 3/3 | `eos` 3/3 |
| Status | Non-deprecated runtime path | Incumbent, runs today |

All **MEASURED**, three runs each, on the A16. Token counts were identical on
every run (11 and 10), so these are deterministic figures, not noisy samples.

Two things fall out of that table.

**3n is about 1.9x faster.** Not marginally faster. Nearly double.

**Gemma 4 has never once stopped by itself.** `eos` means the model wrote its own
end-of-message marker and the runtime honoured it. `stopMarker` means our own
Swift code watched the stream, spotted the turn marker in the text, and cut the
generation off. 3n finishes its sentence and stops. Gemma 4 finishes its sentence
and would keep going forever if we did not interrupt it. Three runs out of three,
every time.

That distinction matters more than the speed number, because it is a dependency
rather than a fix. Our stop is client-side. It works because Gemma 4 currently
emits a particular string in a particular place. A fine-tune changes what the
model emits. **INFERRED:** if a fine-tune shifts Gemma 4's turn behaviour, our
stop list has to move with it, or the runaway comes straight back.

---

## 3. The correction that mattered

Before those numbers existed, there was an estimate.

The estimate divided the number of characters in each reply by a guess at
characters-per-token, and concluded that **both** models ran at roughly 4 to 5
tokens per second. From that it followed that the models were the same speed, and
that the entire visible gap between them (110 seconds versus 2.7 seconds) was
purely a termination bug, not a performance difference.

That estimate was wrong.

| | char-count estimate | real token measurement |
|---|---|---|
| Gemma 4 | ~4-5 tok/s | **5.5 tok/s** |
| 3n | ~4-5 tok/s | **10.4 tok/s** |
| Conclusion drawn | "speed does not discriminate" | speed discriminates by ~1.9x |

The real numbers came from `Session.sizeInTokens`, which counts actual tokens
instead of guessing from characters. **MEASURED.**

Here is why this is the important part of the story. The estimate had already
done work. The handover brief for the model gate opens with this line:

> "So runtime does not decide this. **Tunability does.**"

That framing was built directly on the bad number. If both models run at the same
speed, then runtime performance is a tie, and the only remaining axis is which
model you can fine-tune. The whole gate was scoped around tunability because the
speed question looked settled.

It was not settled. It was mis-measured. And the mis-measurement was not a crash
or an error message. It was a division that ran fine and produced a plausible
number.

**INFERRED:** the tunability gate is still worth running. But "runtime does not
decide this" is no longer true, and any argument that leans on it needs
rebuilding on the measured figures.

---

## 4. The structural discovery: nothing fine-tuned has ever run on the phone

This is the finding that reframes the project.

We fine-tuned Gemma 3 1B overnight on 2026-07-25. It worked. Brevity went from
1.7% to 100%. Grounding went from 1.7% to 34%. Composite score 71.7% to 88.2%.
All **MEASURED** on 100 held-out prompts with deterministic graders, recorded in
`finetune-results.md`.

That fine-tuned model has never run on a phone.

| what ran on the phone | origin |
|---|---|
| `gemma-3n-E2B-it-int4.task` | stock file downloaded from Google |
| `gemma-4-E2B-it.litertlm` | stock file downloaded from Google |
| `gemma-4-E2B-it-web.task` | stock file downloaded from Google, does not load |

**MEASURED**, from the device work logged in `export-decisions.md`. Every artifact
that has ever been loaded into Niyora is a file someone else built and published.

The consequence, stated plainly:

> **The conversion step has never been attempted for any model in this project.**

Not attempted and failed. Not attempted at all. Zero of stages 1 through 5 of the
export gate were executed, confirmed in `export-gate-results.md`. The Mac that
would have run them has 8 GB of unified memory and 1.4 GB of free disk against a
10.25 GB checkpoint. **MEASURED.**

And for Gemma 3 specifically, there was no route to attempt:

- MediaPipe LoRA serving supports Gemma-2 2B, Gemma 2B and Phi-2. Never Gemma-3.
  **MEASURED**, from the MediaPipe documentation trail in `export-decisions.md`.
- Converting a fused Gemma-3 back into a `.task` bundle is unproven. Nobody in
  this project has seen it done.

So the shape of the situation is this. We have a fine-tuned Gemma 3 that improves
the voice measurably and cannot be put on a phone. We have a Gemma 4 that has
never been fine-tuned, and whose conversion tool supports it by name.

**That is the actual reason Gemma 4 is a candidate.** Not because it is newer or
bigger. Because it is the first model in this project where the conversion step
is even possible to try.

`litert-torch` 0.9.1 ships exactly four supported architectures in
`export_hf/model_ext/`: `gemma3`, `gemma3n`, `gemma4`, `lfm2`. The `gemma4`
package has its own patch registration, metadata builder and cache implementation.
It knows Gemma 4 specifically, not generically. **MEASURED** by reading the wheel.

---

## 5. Three notes in our own documentation that were wrong

All three had been written down, read back, and used. None of them announced
themselves.

### (a) The export setting name does not exist

Our brief said to export with `dynamic_int8`.

`litert-torch` resolves the recipe by direct dictionary lookup:

```python
recipe = recipe_lib.__dict__[quantization_recipe]()
```

The complete set of valid names in the pinned `ai-edge-quantizer` 0.7.0 is:

```
dynamic_wi8_afp32          dynamic_wi4_afp32          dynamic_legacy_wi8_afp32
weight_only_wi8_afp32      weight_only_wi4_afp32
static_wi8_ai8             static_wi8_ai16
```

`dynamic_int8` is not among them. Passing it raises `KeyError`. The name we meant
is **`dynamic_wi8_afp32`**. **MEASURED** by unpacking 0.7.0 and enumerating the
module.

### (b) The reason we gave for avoiding int4 is not the real reason

Our brief said the int4 recipe "is channelwise and destroys small models".

In 0.7.0, **every** recipe in that list is channelwise. The op configs all carry
`'granularity': 'CHANNELWISE'` with `'block_size': 0`, the int8 one included.
Channelwise is not what separates int4 from int8. Bit width is. **MEASURED.**

The advice to prefer int8 survives. The justification behind it does not. And
because there is no blockwise int4 recipe in 0.7.0, anyone who believed the stated
reason would go looking for an alternative that is not there.

### (c) The speed estimate

Covered in section 3. Characters counted, tokens assumed, conclusion wrong,
conclusion already load-bearing.

### What the three have in common

| | it announced itself? | it had already been used? |
|---|---|---|
| `dynamic_int8` | no, would have failed at the last stage | yes, written into the plan |
| int4 reasoning | no, the conclusion happened to be right | yes, as a rule of thumb |
| speed estimate | no, produced a plausible number | yes, it framed the whole gate |

None of them were bugs in the ordinary sense. Each was a sentence that read as
fact, was treated as fact, and was not.

---

## 6. Where the decision actually stands

**Not decided.** Stated flatly so nobody reads this document as a conclusion.

### For Gemma 4

| point | confidence |
|---|---|
| On the supported, non-deprecated runtime. `MPPLLMInference` is declared `SWIFT_DEPRECATED_MSG("Migrate to LiteRT LM instead")`. | **MEASURED** in the shipped header |
| The conversion tool supports it by name, with its own patch and metadata code. | **MEASURED** by reading the wheel |
| The HF checkpoint is ungated, no token, no licence click. | **MEASURED**, HTTP 200 with `"gated": false` |
| Text-only export is a supported mode (`task='text_generation'`). | **MEASURED** in the signature |

### Against Gemma 4

| point | confidence |
|---|---|
| Half the decode speed of the incumbent. | **MEASURED**, 5.5 vs 10.4 tok/s |
| Has never self-terminated. Stopping depends entirely on our client-side patch. | **MEASURED**, `stopMarker` 3/3 |
| A fine-tune could change the turn behaviour the patch depends on. | **INFERRED** |
| Conversion has never been run. Existing code is not working code. | **MEASURED** that it was not run |

### What has to happen before this can be decided

1. Run the export gate on hardware with roughly 25 GB free disk and 24 GB+ RAM.
   **INFERRED** from checkpoint sizes against `hw.memsize`, not from a profiler.
2. Start with stage 1, loading the base in `mlx-lm`. It is still the cheapest real
   disqualifier and it is genuinely unresolved. The `gemma4` module exists at
   `mlx-lm` v0.31.3 and is absent at v0.31.0 (**MEASURED**), but nobody has loaded
   the real weights.
3. Do not skip stage 4, the temp-0 comparison of adapter-served against fused. It
   is the stage the 8 GB Mac could not reach, so it is the stage with the least
   evidence behind it, and it is the one that catches a fuse silently eating the
   adapter.
4. Judge the export on whether `litertlm_peek` parses it and the section list is
   coherent. **Not** on byte count against the stock file. See the primer for why
   a text-only export should be far smaller.

---

## 7. The transferable lesson

Look back at the expensive failures in this project.

| failure | did it crash? | what it looked like at the time |
|---|---|---|
| Fusing a LoRA into a 4-bit base | no | model talks fluently, passes a smoke test, is completely untrained |
| Char-count speed estimate | no | a plausible number that framed a whole gate |
| `dynamic_int8` | no, not yet | a setting name sitting confidently in a plan |
| "int4 is channelwise" | no | a right conclusion resting on a wrong reason |
| `mlx-lm` skipping missing target modules | no | a smaller adapter than you asked for, silently |
| Assuming a fine-tuned model had run on device | no | months of work that had never touched a phone |

Not one of them threw an error. Every one was an operation that succeeded,
produced something plausible, and was quietly wrong.

The habit that catches this class of failure is the one used throughout this
document: for every claim, say whether someone ran it and read the output, or
whether someone reasoned their way to it. The two look identical on the page.
They are not worth the same.

That is why the MEASURED and INFERRED tags are here, and why they should stay in
anything written next.
