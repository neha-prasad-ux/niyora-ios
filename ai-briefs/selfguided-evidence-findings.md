# Does a self-guided phone tool actually work? — the evidence closest to us

Researched 2026-07-25. This is the literature that speaks to OUR situation
(structured, self-guided, on a phone, no therapist) — deliberately independent of
the component papers the flow was built from, to avoid circular validation.
Full report: `scratchpad/finetune/selfguided-evidence.md`.

---

## 1. Structure beats open chat — the thesis is evidenced

Every direct datapoint tilts the same way. No definitive RCT exists (this is
genuinely unclaimed territory), but:

| source | finding |
|---|---|
| **GUIDE** (preregistered, N=237) | structured composed intervention **beat an LLM cognitive-restructuring chat control** on stress (p=.02) and UX (p=.04). Closest published match to our exact question |
| **"Structure Matters"** (N=66, 8-day RCT) | finite-state-machine multi-agent chatbot rated **significantly more natural and human-like** than a single agent AND than unguided LLM chat |
| rule-based vs LLM meta (15 studies) | rule-based depression **g=0.266, p=.04 (significant)**; LLM-based g=0.407, **p=.17, CI −0.73 to 1.55 (not significant)** |
| expressive writing | structured g=0.583 vs free emotional disclosure g=0.137 |

**Structure felt MORE human, not less.** That is the positioning line, and it is
evidenced rather than asserted.

*In fairness, the counter-evidence:* Linardon found chatbot-using apps had higher
depression effects (g=0.53 vs 0.28) — but that is a between-study moderator
confounded with novelty and waitlist controls.

## 2. The honest effect size to plan against

- Standalone mental-health apps (Linardon, 176 RCTs): vs **waitlist** g=0.56/0.45
  (dep/anx) → vs **active control g=0.21/0.19**. The quoted number is inflated ~2.5x.
- Chatbots specifically: g=0.31/0.28 (39 studies, n≈7,400).
- Generative-AI chatbots: ES=0.30, **95% CI 0.004–0.59** (lower bound ≈ zero),
  **prediction interval −0.85 to 1.67** — the literature cannot predict whether a
  NEW chatbot will help or harm.
- **Digital SINGLE-SESSION interventions — our closest analogue** (16 RCTs,
  N=9,353, time-matched active controls, I²=0%): **g = −0.18** for depression.
- JITAI review (closest format to "in the moment"): symptom reduction vs
  no-treatment, **no difference vs active control**.

Publication bias is measured, not speculated: p<.025 studies were **3.54x** more
likely to be published; **no** included trial was rated low risk of bias.

Context worth holding: **Woebot — the most evidence-based consumer chatbot ever
built — shut down June 2025.** Therabot's d=0.85 was vs **waitlist**, **excluded
215 high-suicide-risk screenees**, and required ~**15 safety interventions + 13
response corrections per 101 users/month, clinician-supervised**. The one
successful generative mental-health RCT was not an autonomous product.

## 3. 🔴 Harms we must design against

**a) Sycophancy — worst exactly at our reflection beat.**
Stanford/FAccT 2025: LLMs encouraged delusions, failed to recognise crises, and
showed stigma that bigger/newer models did NOT fix.
→ **Rule: reflect the event, the feeling, and the body. NEVER paraphrase or
endorse her attributions about another person's intent.** Our `check_read` and
`deweight` beats are directly exposed.

**b) Intermediate-risk crisis blindness — and we removed the crisis link.**
RAND/Psychiatric Services (9,000 responses): chatbots handle very-low and
very-high risk correctly but **cannot discriminate intermediate risk at all**.
"I can't do this anymore" is exactly where a PMS app operates.
VERA-MH: **23.9% of responses had high potential for harm** — of those, **53.3%
failed to ask directly whether the user was unsafe**, **15.2% failed to give a
specific 24/7 resource**.
→ Our shipped flow **removed the crisis link**. That is precisely the failure
mode the benchmark penalises. PMDD patients themselves rank suicidal thoughts and
wanting a safety plan among their top priorities. **This needs an explicit
decision, not a default.** (See also the menstruation-risk finding in
`flow-evidence-findings.md`.)

**c) Dose is a RISK FACTOR, not a KPI.**
MIT/OpenAI RCT (~1,000 people, 4 weeks): higher daily usage predicted higher
loneliness, emotional dependence, and problematic use across **every** modality
and conversation style.
→ **The flow ENDING is a feature. Do not optimise for time-in-app.**

**d) Reassurance-seeking / co-rumination loops.**
npj Digital Medicine 2026: frictionless, infinitely-patient bots are OCD/anxiety
maintenance machines. Co-rumination longitudinally predicts depression via
brooding — and an LLM is the perfect co-rumination partner (no fatigue, no
bedtime, no "we've been over this").

## 4. Retention reality

- Trials: 18.1% attrition ≤8 weeks, 26.6% >8 weeks — but those are paid, screened,
  prompted participants.
- **Real world (Baumel, independent panel, 93 apps): median 15-day retention
  3.9%, 30-day 3.3%.** Self-guided iCBT completion in routine care ≈25%.
- What actually reduces dropout (attrition meta-analysis): **symptom tracking**
  and a **visually represented agent** — we have both (the moon, the cycle log).
  Reminders, personalisation, payment, and AI-vs-rule-based made **no** difference.
- **Our real attrition risk is not week 3. It is minute 4 of an episode** —
  abandoning mid-flow IS the failure, because that is when she sends the message.

## 5. The single highest-value thing we can do

**Run structure-vs-open-chat in-product, against a time-matched active control,
with RUMINATION and post-episode behaviour ("did you send it?") as co-primaries.**

**Nobody has measured rumination as an outcome of chatbot-mediated distress
conversation.** It is our central mechanistic claim, two small trials support it,
and no one has confirmed it. That is simultaneously the paper and the moat.

Secondary: instrument the **20-minute break as the primary funnel step**, and
stop reading engagement as success.
