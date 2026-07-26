# Export gate: PASSED

2026-07-26. Answers `export-gate-handover.md`. Supersedes the "blocked on
hardware" verdict in `export-gate-results.md`, which was written before we
rented a machine.

**A fine-tuned Gemma 4 E2B was converted to a loadable `.litertlm`.** First time
in this project, for any model.

MEASURED = ran it, read the output. INFERRED = reasoning, not tested.

---

## The answer

| stage | result |
|---|---|
| 1. Load base | **PASS**. Loads in transformers, 9.51 GB VRAM |
| 2. Train LoRA | **PASS**. 140 modules, 34.0M trainable (0.66%), loss 8.93 to 2.2 |
| 3. Merge to bf16 | **PASS** |
| 4. Verify merge kept adapter | **PASS** on the decisive check, see note |
| 5. Export to `.litertlm` | **PASS**. 5,081,176,016 bytes, rc=0 |
| 6. Structural check | **PASS with caveats**, see divergences below |

All MEASURED on an A100 80GB PCIe RunPod pod, ~$1.15 total.

## The numbers nobody had

| | measured |
|---|---|
| Training peak VRAM | **12.68 GB** |
| Training peak host RAM | **11.6 GB** |
| **Export peak host RAM** | **50.67 GB** |
| Export wall time | 472s |
| Full 1600-step fine-tune | ~12.5 min |

**Consequence:** the export step, not training, is what forces a big machine.
A 16 GB Mac cannot do it. Nor can a 41 GB RTX 4090 pod. Training alone would fit
on a modest card.

## The environment, which was most of the battle

None of this is documented upstream. Every line cost a failed run.

| package | pin | why |
|---|---|---|
| `torch` | **>= 2.8, cu126** | stock RunPod images ship 2.4.1; transformers 5.x needs `DTensor` (torch 2.5+) |
| `transformers` | **>= 5.5.0 AND <= 5.12.1** | narrow window, see below |
| `litert-torch` | **0.9.1** | owns `export_hf` |
| `torchao` | **uninstall** | dies on `torch.int1` |
| `torchaudio` | **uninstall** | stale .so fails to link |

**The transformers window, both ends measured.** Below 5.5.0 there is no
`models/gemma4` at all. From 5.13.0 the export dies with
`Can't instantiate abstract class LiteRTLMCacheLayerForGemma4 with abstract
method get_max_length`, because 5.13.0 renamed `get_max_cache_shape` to
`get_max_length` and litert-torch 0.9.1 implements the old name. Verified
working on 5.5.0, 5.7.0, 5.9.0. **litert-torch bounds transformers nowhere**, so
pip installs a broken combination by default and nothing warns you.

INFERRED alternative, not tried here: `litert-torch-nightly >= 0.10.0.dev20260707`
carries the fix and would allow current transformers.

## Four things that will bite the next person

**1. `--externalize_embedder=True` is mandatory for Gemma 4.** Without it:
`AssertionError: External embedder is required for Gemma4.`

**2. Invoke the package, not `export_main`.**
`python -m litert_torch.generative.export_hf.export_main` fails with
`TypeError: main() missing 1 required positional argument: '_'`. Use
`python -m litert_torch.generative.export_hf`.

**3. Scope the LoRA target modules to the text stack, by regex.** A bare name
list like `["q_proj", ...]` also matches the vision and audio towers, whose
`Gemma4ClippableLinear` PEFT cannot adapt, and the run dies.

**4. Do NOT pass `--litert_lm_model_type_override gemma4`.** It does not help,
see below.

## The shared-KV warning was right, and is now measured

Counted on the real model:

| in `model.language_model` | count |
|---|---|
| q_proj, o_proj, gate_proj, down_proj | **35 each** |
| k_proj, v_proj | **15 each** |

35 layers, 20 with shared KV, so 15 have their own. Targeting k_proj/v_proj
would have produced a quietly smaller adapter. Target
`[q_proj, o_proj, gate_proj, down_proj]`, exactly as the handover said.

## Divergences from the stock file

The export is structurally valid but not identical to
`gemma-4-E2B-it.litertlm`. MEASURED via `litertlm_peek`:

| | stock | our export | status |
|---|---|---|---|
| sections | 12 | 5 | expected, text-only |
| `llm_model_type` | `gemma4 {...}` | **`generic_model {}`** | **fix built** |
| stop tokens | 1, 50, 106 | 1, 106 | **fix built** |
| start_token | ids `[2]` | str `"<bos>"` | equivalent, NOT a problem |
| tokenizer | `SP_Tokenizer` | `HF_Tokenizer_Zlib` | **unresolved** |
| size | 2,588,147,712 | 5,081,176,016 | int8 vs int2 quantization |

### The generic_model bug, and its fix

`core/litert_lm_builder.py` dispatches model type with a `match` carrying cases
for qwen3, qwen2p5, gemma3 and function_gemma but **no case for gemma4**, so it
falls through to the default. Passing `--litert_lm_model_type_override` lands in
the same default branch, so it does not help either.

**Why it matters:** the runtime reads `llm_model_type` to learn this model's
turn and tool markers. A file declaring itself generic gets none of Gemma 4's
handling. INFERRED: this is a plausible contributor to the never-stops behaviour
seen on device.

`gemma4-runpod/fix_metadata.py` rewrites the metadata and feeds it back via
`--litert_lm_llm_metadata_override`, which the builder accepts as a file path.
Tested: `generic_model` becomes `gemma4`, stop tokens become 1, 106, 50.

### A correction to the handover's stage 6

The handover says judge the output by comparing against 2,588,147,712 bytes.
**That is the wrong test.** Our text-only export is nearly twice the size,
because the stock file comes from a quantization-aware variant with int2 tensors
that litert-torch cannot produce. Judge by `litertlm_peek` parsing and a
coherent section list, not by size.

## The stopping question moved, and this is the biggest finding

**MEASURED**, temp-0 prompts through transformers with correct chat templating:

| model | self-terminated |
|---|---|
| 20-step throwaway adapter | 2 of 3 |
| full 1600-step fine-tune, gate prompts | 3 of 3 |
| **full fine-tune, whole eval set** | **124 of 124 (100%)** |
| stock Gemma 4, on device, every run to date | **0** |

On device Gemma 4 has never once stopped by itself; every run was cut off
client-side by string matching. In a correct runtime the same model emits its
own stop token, and the fully tuned model did so on **every one of 124 prompts**.

This is close to decisive at the model level. Gemma 4 knows how to stop. What
has been failing is the path around it: the device runtime, the prompt
formatting, or metadata that says `generic_model`.

INFERRED, still: this does not prove the device will behave differently. It
does mean the problem should be hunted in the runtime and the file's metadata,
not in the model or the fine-tune.

INFERRED, and the whole reason this matters: the runaway looks like a runtime
and metadata problem rather than a property of the model. That was the strongest
argument against Gemma 4 and it is now weaker. Small sample, and it does not
prove device behaviour will change.

## What is still NOT proven

- **That this file runs on the phone.** Not tested, out of scope for this gate.
  Independent reports describe self-exports crashing where prebuilt files work,
  citing float32 vs int8 KV cache and a missing input tensor.
- **Whether the metadata fix changes device behaviour.** Built and unit-tested,
  never run on hardware.
- **Why the tokenizer section type differs.**
- **Quality.** See the actor-attribution results, tracked separately.

## Reproducing

`~/Claude Workspace/niyora/gemma4-runpod/` has `setup.sh`, `train.py`,
`gate_check.py`, `export.py`, `fix_metadata.py`, `predict.py`, the corpus, and
the eval set. `README.md` there carries the full version matrix.

Pod creation needs **`--ports '22/tcp'`**. Without it the pod bills at full rate
while SSH never becomes reachable. Two pods were burned learning that.
