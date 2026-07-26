# Export gate results

Written 2026-07-26 by the Mac-only session, answering `export-gate-handover.md`.
Nothing in `ios/`, `src/app/`, `modules/niyora-gemma/` was touched. No device, no
Metro, no 8099, no 8100. Only file written in `ai-briefs/` is this one.

## Verdict in one line

**The gate did not fail on tunability. It never got to run: this Mac has 8 GB of
unified memory and 1.4 GB of free disk, against a 10.25 GB base checkpoint.**
Both cheap checks passed, so the gate is still live. It just needs different
hardware.

**Everything that could be resolved without the weights has been resolved, and
it points the right way.** mlx-lm has a gemma4 module, the checkpoint is
ungated, and litert-torch's `export_hf` supports gemma4 specifically, including
a text-only export mode. Along the way the brief's stage-5 command name and one
of its stated reasons turned out to be wrong. Both are corrected below.

Confidence markers used below: **MEASURED** = I ran it and read the output.
**INFERRED** = reasoning from something I measured, not itself observed.

---

## The two cheap checks

### Is the HF checkpoint gated? No. **MEASURED**

`https://huggingface.co/api/models/google/gemma-4-E2B-it` returns HTTP 200 with
`"gated": false, "private": false`. Anonymous curl, no token, no license click.
Repo has 9 files including `model.safetensors`, `config.json`,
`generation_config.json`, `chat_template.jinja`, `tokenizer.json`.

Unblocked. Do not plan around gating.

### Does mlx-lm load `gemma-4-E2B`? Support exists; I could not run a load. **MEASURED (source) / NOT VERIFIED (runtime)**

What I measured: `mlx_lm/models/gemma4.py` and `gemma4_text.py` are present in
the mlx-lm repo, and present at release tag **v0.31.3** (the current PyPI
latest). They are **absent at v0.31.0 and v0.30.0** (HTTP 404 on both).

> **Pin `mlx-lm>=0.31.3`.** Anything older has no gemma4 module at all.

What I did **not** verify: an actual `load()` of the real weights. That needs the
10.25 GB download and more RAM than this machine has. So "mlx-lm has a gemma4
implementation" is measured; "mlx-lm loads this specific checkpoint cleanly" is
**not established**. It remains the first thing to run on adequate hardware, and
it is still a plausible failure point.

---

## The blocker

| | measured value | needed |
|---|---|---|
| Free disk | **1.4 GB** (228 GB volume, 100% full) | ~25 GB |
| Unified memory | **8 GB, Apple M1** | ~24 GB+ |
| `model.safetensors` | **10,246,621,918 B** (10.25 GB, bf16) | n/a |

Disk figure from `df -h` and `diskutil info` (Container Free Space
1,415,376,896 B). Checkpoint size from the `x-linked-size` header on the HF CDN
redirect. RAM from `sysctl hw.memsize`.

Rough disk budget, **INFERRED** from those sizes:

- base bf16 checkpoint 10.25 GB
- fused bf16 output (stage 3 mandates `--dequantize`) another ~10.25 GB
- exported `.litertlm` ~2.6 GB
- Python env: mlx + mlx-lm ~0.5 GB, and if the export path needs `litert-torch`
  it pulls `torch>=2.4` for another ~2.5 GB

Peak ~25 GB. Even staging aggressively (quantize then delete the original) the
floor is ~13 GB at the moment of conversion. There is no careful ordering that
fits this in 1.4 GB.

**RAM is the harder wall, and it lands specifically on stage 4.** Stage 3 fuses
to bf16, so stage 4's adapter-vs-fused temp-0 comparison requires holding a
10.25 GB bf16 model in 8 GB of unified memory. That is the one stage the brief
says explicitly must not be skipped. LoRA training against a 4-bit base (~2.9 GB)
might squeeze into 8 GB; the bf16 fuse and the decode after it will not.
**INFERRED** from weight sizes vs `hw.memsize`. I did not run it and watch it
OOM.

---

## Per stage

**1. Load base in mlx-lm.** Not run (disk). Support confirmed at v0.31.3 by
source inspection. **Still the right first move on real hardware.**

**2. Train 20-iteration LoRA.** Not run. **The brief's target-module warning is
correct and I verified the mechanism.** `config.json` gives
`num_hidden_layers: 35`, `num_kv_shared_layers: 20`. In mlx-lm's `gemma4_text.py`:

```
self.has_kv = layer_idx < config.num_hidden_layers - config.num_kv_shared_layers
```

35 - 20 = 15, and `k_proj` is only constructed `if has_kv`. So **layers 15-34
have no `k_proj`, and `v_proj` is conditional beyond even that** (config has
`attention_k_eq_v: false`). Target `[q_proj, o_proj, gate_proj, down_proj]` as
the brief says. **MEASURED** (config + mlx-lm source). I did not observe the
silent-skip behaviour itself.

**3. Fuse bf16 not 4-bit.** Not run. No new information; brief's warning stands
unchallenged and untested.

**4. Temp-0 gate, adapter vs fused.** Not run. **This is the stage the 8 GB
ceiling kills.** Flagging it because it is also the stage the brief marks as
non-skippable. On marginal hardware there will be pressure to skip it, and
skipping it makes stages 5 and 6 meaningless.

**5. Export with `export_hf`. RESOLVED, and gemma4 is supported. MEASURED**

`export_hf` is **not** in `litert-lm`. I installed `litert-lm` 0.14.0 and its
CLI exposes only `benchmark, delete, import, list, rename, run, serve`, with no
`export_hf` anywhere in `litert_lm`, `litert_lm_builder`, or `litert_lm_cli`,
and none in the LiteRT-LM repo's `python/` or `tools/`.

**It lives in `litert-torch` 0.9.1** (the renamed `ai-edge-torch`), at
`litert_torch/generative/export_hf/`. I downloaded the wheel (562 KB, pure
Python) and read it without installing torch.

**gemma4 is a first-class supported architecture.** `model_ext/` contains
exactly four: `gemma3`, `gemma3n`, `gemma4`, `lfm2`. The `gemma4` package has:

- `patch.py`, registering `@patches_lib.register_patch(["gemma4"])` and swapping
  in LiteRT versions of `Gemma4RMSNorm`, `Gemma4VisionEncoder`,
  `Gemma4VisionPatchEmbedder`, `Gemma4VisionPooler`
- `metadata_builder.py`, building `llm_metadata.llm_model_type.gemma4` including
  the code-fence, quote and `function_response_start` tokens
- `cache.py` with a registered cache implementation, plus `exportable_module.py`
  and `vision_exportable.py`

**This is the single most important positive result in this document.** The
export path knows gemma4 specifically, not just generically.

Entry point is `litert_torch/generative/export_hf/export_main.py`, which is
`fire.Fire(lib.export)`. Signature highlights from `export.py:76`:

- `model` accepts a HF repo name **or a path to a safetensors directory**, so
  the fused mlx output directory feeds in directly
- `task='text_generation'` for text-only, `'image_text_to_text'` for vision.
  **Text-only export is a supported mode**, which is what backs the stage 6
  recalibration below
- `bundle_litert_lm` controls whether you get a `.litertlm` or loose `.tflite`
- `litert_lm_llm_metadata_override` exists, which is the lever for stop tokens
  if the defaults come out wrong

### ⚠️ Correction: `dynamic_int8` is not a valid recipe name

`core/export_lib.py:387` resolves the recipe by name lookup:

```python
recipe = recipe_lib.__dict__[quantization_recipe]()
```

against `ai_edge_quantizer.recipe`. litert-torch pins
`ai-edge-quantizer==0.7.*`. I unpacked **0.7.0** and enumerated it. The complete
set of valid names is:

```
dynamic_wi8_afp32          dynamic_wi4_afp32          dynamic_legacy_wi8_afp32
weight_only_wi8_afp32      weight_only_wi4_afp32
static_wi8_ai8             static_wi8_ai16
```

**`dynamic_int8` is not among them.** Passing it raises `KeyError` and then
`Invalid quantization recipe`. The brief's intent maps to **`dynamic_wi8_afp32`**.

### ⚠️ Correction: the stated reason for avoiding int4 is wrong

The brief says the int4 recipe "is channelwise and destroys small models". In
0.7.0 **every one of these recipes is channelwise**: the op configs carry
`'granularity': 'CHANNELWISE'` with `'block_size': 0`, including the int8 one.
Channelwise is not what separates them. Bit width is.

The advice to prefer int8 is still right. The reason given for it is not, and
0.7.0 offers **no blockwise int4 named recipe** to reach for as an alternative.
If int8 quality disappoints, the lever in 0.7.0 is `weight_only_wi8_afp32`
rather than a different granularity. **MEASURED** on the pinned version; I have
not run any of these recipes.

### One more pin: `transformers>=5.5.0`

`gemma4/patch.py` does `from transformers.models.gemma4 import modeling_gemma4`.
litert-torch's METADATA requires `transformers` with **no version bound**, so
this will not be caught by the resolver. By tag bisect on the transformers repo:
`models/gemma4/modeling_gemma4.py` is **absent at v5.4.0 and present at v5.5.0**
(also 404 at v5.0.0 and v4.57.0). Latest is 5.14.1. **MEASURED.**

**Disk impact:** litert-torch pulls `torch>=2.4,<2.13`, `transformers`, `scipy`,
`ai-edge-litert`, `litert-converter`. Add roughly 3 GB to the environment
budget, which is already in the 25 GB estimate above.

**6. Structural sanity check. Done early, for free, on the stock file. MEASURED**

`litertlm_peek` runs on this Mac against
`~/code/product/niyora-models/gemma-4-E2B-it.litertlm` with no GPU, no phone and
no RAM pressure. Container: **LiteRT-LM version 1.5.0, 12 sections.**

| § | model_type | bytes | note |
|---|---|---|---|
| 0 | `LlmMetadataProto` | 12 K | |
| 1 | `SP_Tokenizer` | 4.7 M | |
| 2 | `tf_lite_embedder` | 104 M | |
| 3 | `tf_lite_per_layer_embedder` | **1.28 G** | MatFormer per-layer embeddings |
| 4 | `tf_lite_audio_encoder_hw` | 94 M | cpu |
| 5 | `tf_lite_audio_adapter` | 9.4 M | cpu |
| 6 | `tf_lite_end_of_audio` | 6.8 K | |
| 7 | `tf_lite_vision_encoder` | 224 M | fp16 |
| 8 | `tf_lite_vision_adapter` | 4.7 M | cpu |
| 9 | `tf_lite_end_of_vision` | 6.8 K | |
| 10 | `tf_lite_prefill_decode` | **818 M** | the actual text decoder, fp16 |
| 11 | `tf_lite_mtp_drafter` | 44 M | multi-token-prediction drafter |

> **Recalibrate stage 6's success criterion.** The brief says compare against
> 2,588,147,712 bytes, "plausible size". But the text decoder is only 818 MB of
> that 2.59 GB. 1.28 GB is per-layer embeddings, 328 MB is vision, 104 MB is
> audio, 44 MB is an MTP drafter. A text-only fused export **should** come out
> far smaller with far fewer sections, plausibly 4 to 6 sections and well under
> 2 GB. **A size mismatch against the stock file is the expected result, not a
> failure signal.** Judge the export by `litertlm_peek` parsing it and the
> section list being coherent, not by byte count. **INFERRED**, since I have not
> seen a successful text-only export to compare against.

---

## Two corrections to the reference material

**1. The stock file stops on three tokens, not two. MEASURED**

Stock `.litertlm` `LlmMetadata` carries `stop_tokens` **1, 50, and 106**, and
`start_token` 2. Resolved against `tokenizer.json`:

| id | token |
|---|---|
| 1 | `<eos>` |
| 2 | `<bos>` |
| **50** | **`<|tool_response>`** |
| 105 | `<|turn>` |
| 106 | `<turn|>` |

The brief's `eos_token_id: [1, 106]` guidance is **correct** and matches
`config.json`. Token 50 is a serving-level stop (halt when the model starts
emitting a tool response), not a generation-config EOS. **I am not calling this a
defect.** Flagging it only so nobody "fixes" a hand-built export by adding 50 to
`generation_config.json`, where it does not belong.

**2. A note for the session owning the runaway bug, not a conclusion. MEASURED**

Token 106 = `<turn|>` **is already** in the stock file's stop list. So the
110s/510-token non-termination on the stock `.litertlm` is **not** explained by a
missing stop token in that file. Its stop config looks right. I did not
investigate further, since that is your scope and I stayed out of it. Section 11
being a `tf_lite_mtp_drafter` may or may not be relevant to how stopping is
evaluated under speculative decoding; that is a **guess**, offered only as a
place to look.

Turn format from the embedded `jinja_prompt_template`, confirming the brief:
opens `<|turn>` + role + `\n`, closes `<turn|>\n`, generation prompt
`<|turn>model\n`. **The trailing newlines are part of it**, worth matching
exactly in any temp-0 comparison.

---

## What I did not verify

- Any actual mlx-lm load, train, fuse, decode or export. **Zero of stages 1 to 5
  were executed.** Everything above is package and source inspection plus one
  real run of `litertlm_peek` against the stock file.
- That `export_hf` actually completes on a gemma4 checkpoint. I established that
  the code path exists and is gemma4-aware. Existing is not the same as working,
  and MatFormer per-layer embeddings are exactly the kind of thing that breaks
  late in a converter.
- Whether the exported artifact would load on device. Out of scope, not tried.
- Real peak RAM for LoRA on a 4-bit gemma4 base. My 8 GB claim is arithmetic on
  weight sizes, not a profiler reading.
- Any of the quantization recipes in practice. I read their configs, ran none.

## To resume this on adequate hardware

Needs roughly **25 GB free disk and 24 GB+ RAM**. Verified pins:

```
mlx-lm>=0.31.3          # gemma4 module absent at 0.31.0 and earlier
transformers>=5.5.0     # models/gemma4 absent at v5.4.0; litert-torch does NOT
                        # bound this, so the resolver will not catch it
litert-torch==0.9.1     # owns export_hf; pulls torch, ~3 GB
```

1. **Run stage 1 first.** It is still the cheapest real disqualifier and is
   still genuinely unresolved. Do not skip it because this document sounds
   encouraging.
2. Train and fuse per the brief, including the `--dequantize` warning and the
   `[q_proj, o_proj, gate_proj, down_proj]` target list, both of which I checked
   and both of which are correct.
3. **Do not skip stage 4.** It is the stage this Mac could not reach, so it is
   also the stage with the least evidence behind it.
4. Export with `task='text_generation'` and
   **`quantization_recipe='dynamic_wi8_afp32'`**, not `dynamic_int8`, which does
   not exist.
5. Judge stage 6 on section coherence via `litertlm_peek`, not byte count
   against the stock file.

Scratch venv used for `litertlm_peek` is disposable, under this session's
scratchpad. Nothing was written to `~/code/product/niyora-models/`.
