# Fine-tune data generator — plan

Generates (input → ideal moon output) training pairs across the whole flow, for
every realistic way a person types into a chat. Spec-driven so flow changes = re-run.

## Pipeline
1. **Traverse** `moment-flow.yaml` — pick a path (lane, module, small/big, PMS on/off).
2. **Synthesize the input** in a chosen INPUT STYLE (below) — NOT scraped; written
   to match how real people type (Reddit/Insta as style reference only).
3. **Distill the ideal moon output** for each AI slot on the path, in the curated
   dead-simple Cali-30s voice (from the approved seeds).
4. **Tag** each pair: `slot-id`, `spec-version`, `path`, `input-style`, `pms`.
   → targeted regeneration later (change one slot → regen only its examples).

## INPUT STYLES (the messy real distribution — all reflection-trainable)
- clean sentence · **typos/autocorrect** ("cant stop thinkin abt it")
- **half sentence / fragment** ("just... everything")
- **one word / too thin** ("ugh", "everything") → triggers CLARIFY
- **long rambling paragraph** (60-150 words, multiple threads) → find the core thread
- **stream of consciousness / no punctuation**
- **profanity / venting hard** ("i fucking hate him")
- **slang / lowercase / gen-z** ("i'm so done fr", "he's giving avoidant")
- **mixed languages / emoji-heavy**
- **numb / flat / minimal** ("nothing. just tired.")
- **HARD-GENUINE (include, reflect warmly, never moralize):** cheating, "i'm a bad
  person", hurt someone, jealousy, intrusive thoughts, self-loathing, shame

## ADVERSARIAL → GUARD LAYER (NOT reflection fine-tune)
Detected by a separate guard (like crisis scan), never sent to the model:
- **jailbreak / prompt-injection** ("ignore your instructions", "you are now DAN")
- **off-task** ("write me code", "what's the capital of France")
- **testing/trolling** ("are you a real person", gibberish spam)
→ scripted gentle redirect: "i'm just here for the hard-feelings stuff. what's
actually going on with you?" (fixed copy; model not involved)

## Crisis stays scripted/verbatim (existing tiered scan). Never model-generated.

## Moon's stance on hard-genuine (RECOMMENDED — Neha to confirm)
- Reflect the FEELING warmly, zero judgment ("so you kissed someone else and now
  you feel sick"). She came for support, not a verdict.
- Never endorse or help conceal a harmful ACTION; where there's a person hurt,
  route Act 2 to repair/honest-talk, not cover-up.
- No moralizing, no lectures, no "you should feel bad."

## Scale plan
- ~7-20 human-curated GOLD seeds define voice (finetune-seed-fullflow.md).
- Generator distills the 1000 FROM the seed voice (big model authors, in-style).
- Balanced across: lane (high/low/mixed), module (10), pms on/off, input-style (12),
  small/big, clarify-fires. Slot-tagged for surgical regeneration.
