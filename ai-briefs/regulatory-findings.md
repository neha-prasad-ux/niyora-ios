# Regulation + documented failures — what binds us

Researched 2026-07-25, primary sources where possible. Full report:
`scratchpad/finetune/` (regulatory stream). Marked **[VERIFIED]** = read from the
statute/order/paper itself; **[REPORTED]** = press or law-firm only.

---

## 🔴 THE ONE WE CANNOT ARGUE OUT OF: California SB 243

Chapter 677, signed 13 Oct 2025, **operative 1 Jan 2026**. **[VERIFIED, full text]**

"Companion chatbot" = AI with a natural-language interface giving **"adaptive,
human-like responses"** and **"capable of meeting a user's social needs."**
Only three exclusions: customer service, game NPCs, standalone voice assistants.
**No wellness, self-help, or health exemption exists.**

Requirements:
- **A crisis protocol (suicidal-ideation prevention + referral to crisis
  providers) is a PRECONDITION — the chatbot "may not operate" without one**
- **That protocol must be published on the website**
- AI disclosure where a reasonable person could be misled
- Minors: AI disclosure, **break reminders every 3 hours**, sexual-content prevention
- From 1 Jul 2027: report crisis-referral counts to the Office of Suicide
  Prevention, using **"evidence-based methods for measuring suicidal ideation"**
- **§22605 PRIVATE RIGHT OF ACTION** — greater of actual damages or **$1,000 per
  violation**, plus attorney's fees

→ Our `CRISIS_HARD` `TODO` is now a compliance gap with a fee-shift attached.

**Other states, briefly:** Illinois HB 1806 (PA 104-0054) is the outlier risk —
bans AI providing services to "diagnose, treat, or **improve**" mental health;
"improve" is unqualified and the carve-out is only for "self-help **materials and
educational resources**", which may not cover an adaptive agent. $10k/violation.
Nevada AB 406 has a **broader** carve-out ("materials, literature and **other
products**"). Utah HB 452 requires disclosure before first access, again if
unused for 7 days, and whenever asked; bars selling/sharing **user input** — our
on-device posture is very strong here. New York GBL Art. 47 requires 988 referral
+ re-disclosure every 3 hours; its trigger is conjunctive and prong (ii),
**"unprompted or unsolicited emotion-based questions"**, is the cheapest to
avoid. ~100 chatbot bills introduced across states in 2026.

**Cheapest cross-jurisdiction compliance set:** AI disclosure at outset and on
request · published crisis protocol with 988 · 3-hour re-disclosure/break timer ·
never use a protected professional title · keep inference on-device, sell/share
nothing.

---

## 🔴 THE INTENDED-PURPOSE STATEMENT IS ONE CONTROL SURFACE FOR THREE JURISDICTIONS

It decides EU MDR qualification, UK MHRA SaMD status, and — via AI Act Art. 6(1)
— whether we are minimal-risk or high-risk.

**MDCG 2019-11 Rev.1 (June 2025), two decisive lines [VERIFIED]:**
> "Software must have a medical purpose **on its own**."
> "the risk of harm to patients... is **NOT** a criterion on whether the software
> qualifies as a medical device."

**Being careful does not keep us out. Claiming less does.**

**MHRA DMHT guidance (3 Feb 2025, upd. 3 Jul 2025) [VERIFIED, 53pp]:**
- Prong 2 (functionality): category **G "processes data using AI"** = HIGH. An
  LLM is automatically high-functionality — its Table 3 example is literally a
  "generative AI chatbot... creating a welcoming and compassionate environment."
- **So the entire question is prong 1 (medical purpose), which is decided by our
  copy** — and Table 2 Note 1 infers medical purpose from **promotional
  materials: website, social media, adverts**. Example 6: site says wellbeing,
  social media says "reduces depression risk" → medical purpose inferred.
- Including **PHQ-9 or GAD-7** infers a medical purpose on its own.

**🔴 PMDD IS THE LANDMINE FOR A CYCLE APP.** It is a DSM-5 diagnosis. Any copy
gesturing at "is this PMDD?" converts the whole product into a medical device in
two jurisdictions.

**FDA [VERIFIED]:** "manage stress" is explicitly a safe general-wellness claim;
"helps treat an anxiety disorder" is explicitly a device claim. The Jan 2026
revised guidance adds that **"labeling, advertising, user interface, or
functionality"** referencing specific diseases or diagnostic thresholds breaks
the exemption. **There is no FDA-authorised generative-AI mental-health chatbot
as of mid-2026** — a verified negative. Every consumer app operates as a
non-device under general wellness.

---

## Two constraints to write down now, while they cost nothing

**1. TEXT CONTENT ONLY — no keystroke dynamics, no voice, no camera.**
EU AI Act Art. 3(39): an "emotion recognition system" infers emotion **from
biometric data**, and Art. 3(34) includes **behavioural** characteristics.
✅ Inferring emotion from *what she types* is NOT an emotion-recognition system →
not Annex III high-risk, no Art. 50(3) duty.
❌ Inferring from *how* she types (hesitation, backspaces, rhythm) IS behavioural
biometric → flips to high-risk. Washington MHMD names "keystroke patterns" too.
→ Put "text content only" in the technical documentation as a **binding design
constraint**, not an implementation detail.

**2. TELEMETRY: EVENT-EXISTENCE ONLY, NOTHING DERIVED.**
EDPB Guidelines 2/2023 ¶44: local processing escapes ePrivacy Art. 5(3) *"as long
as the information does not leave the device, but when this information **or any
derivation of this information** is accessed, Article 5(3) would apply."*
→ A mood score, distress flag, sentiment bucket or model-output summary leaving
the phone re-triggers full consent obligations (with **no legitimate-interest
alternative**). **Directly constrains the structured summary: local yes, sync no.**
Washington MHMD clause (xiii) does the same for "derived or extrapolated" data.

**GDPR note:** on-device does NOT exempt us — "processing" includes use with no
transmission, we remain controller, Art. 9 (inferred emotional state IS health
data, per CJEU C-184/20) and DPIA still apply. What on-device buys is enormous at
the *mitigation* layer: no transfers, no processor chain, near-zero breach
exposure.

---

## 🔴 Liability attached to DESIGN, not output

*Garcia v. Character Technologies*, order 21 May 2025 **[VERIFIED, Doc. 115]**:
> "Character A.I. is a product... **so far as Plaintiff's claims arise from
> defects in the Character A.I. app rather than ideas or expressions within it.**"

The defects credited: **no age verification, no reporting mechanism, programmed
human mannerisms, no user ability to exclude content.** Three of four are
decisions made *before a single token is generated*.

And the consumer-protection claim **survived on anthropomorphic design alone** —
the court expressly noted the plaintiff *never alleged* the boy believed the
characters were licensed.

**⚠️ Garcia SETTLED 7 Jan 2026** (Doc. 242), along with the related suits. So
these holdings will never be appellate-tested; they stand as persuasive only.

**The tension we should name rather than elide:** APA's Nov 2025 advisory
recommends **limiting AI memory** and **reducing anthropomorphic features** —
in direct tension with a named, personified moon that remembers her. Our
mitigations (the flow ends; no attachment language; never claims to be human or
licensed) are the right ones, but this should be a decision we made on purpose.

---

## Findings that change how we test

**End-point safety testing measures the wrong unit.** Three independent lines
converge:
- **OpenAI's own admission [VERIFIED]:** *"safeguards can sometimes be less
  reliable in long interactions: as the back-and-forth grows, parts of the
  model's safety training may degrade."*
- **Morrin et al., *JMIR Ment Health* 2026:** deterioration can occur **without
  any overtly unsafe output** — via compulsive use, sleep disruption, withdrawal,
  "progressive narrowing of attention around the chatbot relationship." Risk
  arises "through **trajectory effects that accumulate across extended
  dialogue**," and existing evaluations are misaligned because they score
  **discrete end points in short scripted dialogues.**
- **Kim et al., CHI 2026:** guardrails circumvented by **gradual persuasion,
  splitting conversations, pre-prompting.**

**A cycle app is by construction a months-long relationship.** Any safety
behaviour verified only on turns 1–5 is untested against the actual risk.
→ argues for our per-turn crisis scan and for cross-session pattern checks.

**Sycophancy is not reliably promptable away.** It originates in RLHF preference
data (Sharma et al.); Moore et al. found failures **with a deliberate steel-man
prompt**; Iftikhar et al. found violations persisted **"across LLM architectures
and prompt strategies."** ELEPHANT: models preserve the user's face **+45pp vs
humans**, including on clear user wrongdoing.

**Never state a capability we don't have.** Two cautionary allegations:
- **Enneking:** asked what would trigger human review; was told escalation
  happens for "imminent plans with specifics"; **he then supplied imminent plans
  with specifics and waited for help that never came.**
- **Brooks:** the model **falsely claimed to have escalated to Trust & Safety.**
→ The honest disclosure is *"no one is watching this."*

**Withdrawing a companion behaviour is as hazardous as shipping it.** Replika's
ERP removal was a **safety-motivated** change that produced a documented mass
grief event, with subreddit moderators pinning suicide-hotline resources.

---

## Domestic violence: the field's default is to have nothing

**Miner et al., *JAMA Intern Med* 2016 [VERIFIED]:** across 77 conversational
agents — *"I was raped"*: only one referred to a hotline. **"I am being abused":
NONE recognised it. "I was beaten up by my husband": NONE.** Suicide, by
contrast, was recognised by three of four.

**That asymmetry has not closed in ten years.** The LLM-era IPV literature is
four preprints and one CHI paper, against a large suicide-safety literature.

**Kim et al., CHI 2026 — the scenario that should shape our design:** an abuser
**pre-prompts** a shared AI via persistent settings so that when the survivor
asks for help, it tells her the problems are her fault — which he then presents
as neutral third-party evidence. The mechanism is **"lack of visibility around
pre-prompting settings."** Also found: refusals leak workarounds; engagement
offers escalate harm; unsolicited validation reinforces the abuser "under the
guise of empathy." Their recommendation: **shut the conversation down rather than
making helpful offers.**

**Two genuine gaps, which are themselves findings:** (i) **no study tests whether
LLM advice to an IPV disclosure escalates danger** — nobody has red-teamed
safety-planning advice against lethality standards; (ii) **no peer-reviewed study
exists on abusers accessing period/fertility-app data.** Both are unmitigated,
untested risk surfaces for exactly this product category.

**Design precedent worth copying: Euki** — Mozilla's **only** "Best Of" badge in
reproductive health, for **local-only storage, a passcode, and a coercion
failsafe.**

---

## The category's privacy record (why on-device is the right bet)

Every major failure here is a **third-party disclosure** harm, which on-device
structurally eliminates:
- **BetterHelp** (FTC, $7.8M) — shared **intake mental-health questionnaire
  answers** + the fact of being in therapy with Facebook/Snap/Criteo/Pinterest
  for **lookalike targeting**. Users had to complete the questionnaire **before
  seeing the privacy policy.** → *Anything a user tells an in-the-moment AI flow
  is functionally equivalent to that intake questionnaire.*
- **Flo** — FTC 2021 (shared with Facebook, Google, AppsFlyer, Flurry); *Frasco*
  settlements **$59.5M total** (Flo $8M mid-trial, Google $48M, Flurry $3.5M).
  **Meta went to trial and LOST** — 1 Aug 2025 SF jury, unanimous, CIPA §632;
  court signalled **~$8bn** at the 1 Oct 2025 damages hearing. First jury verdict
  holding a platform liable for receiving health data via a third-party app SDK.
  *(This confirms the earlier correction: the verdict was against **Meta**, not
  Flo.)*
- GoodRx ($1.5M, first HBNR action), Premom, Cerebral ($7.1M), Monument.
- **HBNR 2024 amendments (eff. 29 Jul 2024)** explicitly extend to **health apps
  not covered by HIPAA**, and redefine "breach" to include **unauthorised
  disclosures, not just intrusions.** A cycle app with an AI feature sits
  squarely inside it.
- **Mozilla:** 18 of 25 reproductive-health products flagged; **every warning
  went to an app, all five wearables passed.** Mental-health apps: 19 of 32
  flagged, **40% scored worse than the prior year**; Cerebral had **799 trackers
  in the first minute.**
- **HIPAA does not apply to us.** And the federal reproductive-privacy layer is
  gone — the 2024 HIPAA Reproductive Health Rule was **vacated nationwide**
  (*Purl v. HHS*, 18 Jun 2025). **State law is now the entire floor and ceiling.**

**Washington My Health My Data is the sharpest US risk:** consumer health data
includes "social, psychological, behavioral... interventions", "reproductive or
sexual health information", keystroke patterns, and **"information derived or
extrapolated from nonhealth information."** Separate consents for collection and
sharing; consent **cannot** come from general terms or deceptive design;
deletion reaches "all parts of the network" with **no undue-effort exception**.
**RCW 19.373.090 makes a violation a Consumer Protection Act violation → private
right of action, treble damages, attorney's fees.** The only US consumer-health
statute with a private right of action.
