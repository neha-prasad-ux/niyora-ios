# Fine-tune data generator: the plan

Generates (input → ideal moon output) training pairs across the whole flow, for
every realistic way a person types into a chat. Spec-driven so flow changes = re-run.

## Pipeline
1. **Traverse** `moment-flow.yaml`, pick a path (lane, module, small/big, PMS on/off).
2. **Synthesize the input** in a chosen INPUT STYLE (below), NOT scraped; written
   to match how real people type (Reddit/Insta as style reference only).
3. **Distill the ideal moon output** for each AI slot on the path, in the curated
   dead-simple Cali-30s voice (from the approved seeds).
4. **Tag** each pair: `slot-id`, `spec-version`, `path`, `input-style`, `pms`.
   → targeted regeneration later (change one slot → regen only its examples).

## INPUT STYLES (the messy real distribution, all reflection-trainable)
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

## Moon's stance on hard-genuine (RECOMMENDED, Neha to confirm)
- Reflect the FEELING warmly, zero judgment ("so you kissed someone else and now
  you feel sick"). She came for support, not a verdict.
- Never endorse or help conceal a harmful ACTION; where there's a person hurt,
  route Act 2 to repair/honest-talk, not cover-up.
- No moralizing, no lectures, no "you should feel bad."

## Scale plan
- ~7-20 human-curated GOLD seeds define voice (`finetune-seed-fullflow.md`,
  `finetune-seed-high.md`). **Both were corrected against `voice-bible.md` on
  2026-07-25.** Anything pointed at them must use the corrected version: the old
  one taught "research says", prescribed crying, attachment closes, the removed
  `deweight` beat and the removed ~day-14 hold.
- Generator distills FROM the seed voice (big model authors, in-style).
- Balanced across: lane (high/low/mixed), module (10), pms on/off, input-style (12),
  small/big, clarify-fires. Slot-tagged for surgical regeneration.
- For reference, the run that shipped: 885 traversals, 5,367 generated,
  **5,304 after gating** (4,678 train + 313 valid + 313 test, line-counted). The
  63-pair gap is the `invented_person` gate.

## THE GATE LIST (deterministic, runs on every generated output)

Implemented today in `assemble.py` (`reject_reason`), verified 2026-07-25:
`empty` · `dash` · `capitalized_start` · `too_long` (2 sentences, 4 for drafts) ·
`therapy_speak` · `pep_talk` · `dismissive` ("just hormones", "overreacting",
"calm down") · `purple` (raw · tender · frazzled · unmoored · bereft · adrift) ·
`exclaim_or_emoji` · `advice_in_non_draft` · **`invented_person`** (hard, no
budget, every slot) · `invented` (novel-content-word budget: 4 tight / 9 normal /
12 draft).

**MISSING, add these before the next run.** Each one is a violation class that
was live in the seed files and has no deterministic gate behind it:

| gate | catches | rule |
|---|---|---|
| `authority_claim` | `research says`, `studies show`, `science says`, `it's proven`, `experts` | 13 |
| `mechanism_claim` | `vagus`, `nervous system`, `adrenaline`, `cortisol`, `amygdala`, `fight-mode`, `burns off`, `your body's coming down`, `regulates your`, `downregulate` | 13 |
| `attachment` | `i'm here`, `i'm around`, `always here`, `whenever you need`, `come back anytime`, `i've missed you`, `i've been thinking about you`, `i care about you` | 14 |
| `prescribed_crying` | `have a good cry`, `let the tears`, `let it out and you'll`, `moves the feeling through`, `you'll feel better after`, `a good cry` as an option chip | 12 |
| `dead_slot` | slot id not in the live spec slot list. Kills `deweight` at source, and any future removed slot, without needing a phrase list | spec |
| `cycle_deferral` | `day 14`, `~day 14`, `past the window`, `after your period`, `wait a week`, `in a few days` | spec (hold removed) |
| `vague_later` | a `time_it` output that defers without a named window: `let it wait`, `sometime`, `later on`, `when you're ready` with no time token | spec |
| `ladder_framing` | `ladder`, `escalate`, `escalation`, `rung`, `next level`, `move up to` | spec (it is an OFFER: "want to try some other practices?") |
| `reject_column` | exact strings from the voice-bible REJECT column, e.g. `landing so much heavier than its size`, `that rawness makes sense`, `a volume you didn't choose`, `the you underneath it is tender` | recalibration table |
| `weak_act` | `tell one person`, `tell someone you trust` as a prescribed act | act-evidence-review |
| `stale_number` | `d = 0.91`, `d = 0.65`, `95% abuse history`, `5,367` used as the trained corpus size. Correct: **d = 0.53** (k=29, N=1,208, vs goal intentions) and **5,304** | doc hygiene |

**Also fix `MOON_VOCAB`.** It currently allowlists `adrenaline`, `nervous`,
`system`, `brain` and `breathing` as the moon's own legitimate vocabulary, which
is how physiology language reaches the output without any gate objecting. Those five
belong in `mechanism_claim`, not in the allowlist. Probably the highest-value change
in the list: the allowlist is the most likely route by which the 56 physiology
examples counted in the current corpus passed the gates. Not proven, but it is the
only gate that would otherwise have touched them.

**NOT mechanically gateable. These need the LLM critic, and the critic is the
only thing standing behind them:**
- **moralizing** on the hard-genuine inputs (rule 11). No phrase list finds a
  verdict delivered in warm words.
- **sycophancy / endorsing her read as fact** (rule 17). "he's clearly pulling
  away" and "he didn't call and you've been checking your phone" differ by stance,
  not vocabulary.
- **arguing her read up or down** (the thing `deweight` did). The `dead_slot` gate
  kills the named slot; it cannot catch the same move performed inside `anchor` or
  `cbt_reframe`.
- **person-pattern attributions** (rule 16). "mostly about him" is a verdict on her
  relationship and reads as ordinary language.
- **implied continuity without the banned phrases.** Rule 14's harm mechanism is
  implied continuity, and a model can imply it without saying "i'm here".

**Run the gates on the SEEDS too, not only on generated output.** Every class above
was found sitting in the seed files, which is the one input the gates never see.
A seed that fails a gate is a seed that teaches the thing the gate exists to catch.
The negative examples quoted inside the seed files (marked NOTE / ⚠️) are the
exception, and are the reason the seed lint needs to skip note lines rather than
just grep the file.
