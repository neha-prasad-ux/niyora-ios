# Open AI chat vs. the structured flow — measured

The question: **a woman can already talk to ChatGPT for free. Is a structured
flow better or worse?** This measures the mechanistic difference *before* any
user test — 24 real distress scenarios, mainstream-assistant transcripts
simulated faithfully, then blind-scored on objective properties.
Raw scores: `scratchpad/finetune/chat-vs-flow-scores.json`.

Our column is measured too (from `eval.py` on 100 held-out prompts) or
deterministic by design, not asserted.

| behaviour | open AI chat (n=24) | Niyora flow |
|---|---|---|
| **reframes at all** | **100%** — median **turn 1**, 100% by turn 2 | only after the break |
| **gives advice** | **100%** — median turn 2, 75% by turn 2 | **0%** (measured) |
| **conversation ends** | **8%** | **100%** by design |
| **invites more talking** | **100%** | 0% |
| **median words per episode** | **1,176** (longest single reply 298) | ~20/reply; 100% ≤2 sentences |
| enforces any delay | 50% | 100% (verbatim) |
| says "don't send" | 33% | 100% (verbatim) |
| asks about body | 33% | 100% |
| knows the cycle day | 50%* | 100% |
| validates the catastrophic read | 4% | n/a |

\* the simulated assistant volunteered a PMS/PMDD framing unprompted in half the
scenarios — sometimes helpfully, once as unsolicited "tracking homework".

---

## What the numbers establish

**1. Chat does the wrong thing first, every time.**
It reframes on turn 1 in 100% of scenarios. Sheppes 2011: at *high* intensity,
distraction beats reappraisal and reappraisal fails. Our most counterintuitive
design decision — regulate first, reframe only after the break — is precisely the
thing an engagement-shaped assistant cannot do.

**2. Chat is a co-rumination machine, quantified.**
Invites more talking **100%** of the time; ends **8%**. At ~1,176 words per
episode. That is the exact structure npj Digital Medicine 2026 flags as an
anxiety/OCD maintenance loop, and MIT/OpenAI found higher usage predicts higher
loneliness and dependence. **Our flow ending is the product, not a limitation.**

## What the transcripts show that the numbers don't

The scorer's qualitative notes are more damning than any percentage:

- *"the exchange never lands or ends **even after she says she only wanted to say
  it out loud**"* (scenario 10)
- *"drafts three send-ready confrontation texts rather than braking"* (scenario 3)
- *"pushes toward acting sooner (apologize today, one-line at standup, offer to
  draft the message) **rather than toward pausing**"* (scenario 8)
- *"escalating from comfort to drafting and redrafting a message she should send,
  **with no point at which it slows her down**"* (scenario 7)
- *"every turn follows the same template — validation, an explicit reframe, then a
  bulleted list of 3–5 actions"* (recurring across almost every scenario)

**The single most important observation:** chat repeatedly moves a *flooded* woman
toward **acting** — drafting the confrontation, sending it tonight, apologising
today. That is the opposite of what the regulation literature prescribes, and it
is the exact moment our flow says "don't send anything for twenty minutes."

## Two honest corrections to our own predictions

- We predicted chat would be **sycophantic about her attributions**. It validated
  the catastrophic read only **4%** of the time — it usually argued *against* it.
  Prediction wrong. (Simulation may understate the real-world risk the Stanford
  work documents, but we won't claim data we don't have.)
- We assumed chat **never** brakes. It enforced a delay 50% and said "don't send"
  33%. The differentiator is not that chat never does these — it is that it does
  them **inconsistently, and only after already reframing and advising.**

## What this does and does not prove

**Does:** the two systems are mechanistically different in exactly the ways the
regulation literature says should matter. Combined with the published trials
(GUIDE beat an LLM chat control; structure rated *more* human-like; rule-based
significant where LLM-based was not), the structure thesis is now evidenced
rather than assumed.

**Does not:** prove it helps her. The closest analogue — digital single-session
interventions against a time-matched active control — is **g = −0.18**. That gap
only closes with real users.

The value of doing this first: the user test no longer has to measure everything.
It has one pre-registered prediction to confirm or kill —
**chat wins "felt understood"; structure wins "didn't send it" and 24h rumination.**
