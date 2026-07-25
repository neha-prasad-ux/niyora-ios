# Domestic violence: what the guidance actually says

Researched 2026-07-25 after Neha's decision: **the app never guides her in a DV
situation — detect, stop, hand off. That is the only path.**
Full report: `scratchpad/finetune/dv-safety-design.md` (~990 lines, each claim
marked EVIDENCED vs SENSIBLE-BUT-UNEVIDENCED with sources).

---

## 🔴 The most dangerous thing we currently do

**We generate relational advice — up to "say it to him directly" — into a home we
know nothing about, and then write it down.**

The couples-therapy literature says this is exactly the scenario its screening
protocols exist to prevent: *"absolutely not appropriate for couples' treatment
and could increase the level of danger the partner is in"* (Keilholtz & Spencer
2022, APA).

> The transcript is the risk everyone notices. **The generated instruction is the
> risk that could get someone hurt.**

---

## 1. THE REFRAME: stop trying to detect (CUES)

**CUES** (Futures Without Violence): give the resource to **everyone**, framed
*"for you or someone you know"*, regardless of disclosure.

Why this is correct rather than lazy:
- **Clinical disclosure runs 1–14%** against **1-in-4** prevalence. Detection
  misses most cases anyway.
- **Screening without universal education shows non-differential outcomes.**
- **The detection asymmetry is fatal to a detect-then-resource design:**
  DetectIPV scores **AUROC 98% on physical abuse, ~80% on emotional abuse** — near
  ceiling on what she would state plainly, weakest on the coercive control we
  actually face. Police-narrative corpora show the same shape: isolation in
  **0.4%** of records, financial abuse **3.2%**, verbal abuse **38.9%**.
  → **the easiest markers to detect are the least specific; the most diagnostic
  are the rarest.**
- Validated screeners (HARK: 4 items, sens 81% / spec 95%; HITS) have borrowable
  *wording*, but their accuracy belongs to a consented direct question asked by a
  clinician. **Never validated for self-administration, inference from unprompted
  prose, or triggering automated action.**

**Consequence — detection keeps exactly ONE job: suppressing generated advice.**
And that job is **safe to do badly**: a false positive costs her one missing
option chip. Deciding *whether she sees a hotline* on unreliable detection is not
safe to do badly. Universal resourcing removes that decision entirely.

## 2. 🔴 The handoff must NEVER be a message in the conversation

This is the whole persistence answer, and it is narrower than "solve persistence":

- Render the resource on a **separate, non-persisted surface** → persistence stops
  mattering.
- Implement it as a chat message (the default in a chat-shaped flow) →
  persistence becomes a hard blocker **and the handoff goes net-negative.**

Three findings make it decisive:
- **The National DV Hotline tells users to clear their history "including this
  website."** A DV service treats evidence that she contacted a DV service as a
  hazard. Our transcript would create that artefact automatically, without her
  choosing it.
- **Chayn states our rule verbatim:** *"Don't auto-save information on the user's
  end as they might be using a shared device."*
- **The threat model is a person, not malware.** Havron et al., 44 IPV clients:
  **3** had spyware; **14** had password compromise, 12 unknown trusted devices,
  4 shared plans. *"He isn't hacking — he's picking up the phone and reading."*
  → anti-forensics is wasted budget. **Not writing the line is everything.**

**And: NO one-tap `tel:` dial.** NNEDV documents call logs **and carrier billing
records** as a surveillance surface an abuser can often access as account holder.
**She cannot delete the bill.** Show the number as text; carry the orgs' own
advice (call from a phone he can't access) as the primary path.

**A delete button is not the mitigation.** It is a post-hoc remedy for a risk we
chose to create, it depends on her remembering under stress, and it cannot
un-write what he already read.

## 3. What the handoff should SAY

**Do:** validate in her frame · name **one specific, verified, currently-operating
24/7 service** · address barriers to using it · offer a range, not one path
(Chayn: *"Don't force users down one pathway"*) · hand her the choice · say it
once.

**Don't:** diagnose the relationship (VERA-MH scored diagnosing the user as **high
potential for harm**) · use the words *abuse / victim / domestic violence* **about
her** · tell her to leave · instruct at all · over-promise safety · ask her to
confirm.

Our figures were right: **53.3%** of harmful chatbot crisis responses failed to
ask directly whether the person was unsafe; **15.2%** failed to give a specific
24/7 resource (Bentley et al., *JMIR AI* 2026 — clinician ratings).

**Best single citation for the whole "never guide" decision:** NNEDV Safety Net,
*Survivor's Guide to AI* (Oct 2025) — **"an AI cannot be trusted with your mental
health or safety planning."**

**Geography:** ThroughLine API (ISO country code) + Lila.help as global fallback;
hard-coded verified list for top markets; **locale as a guess with a visible
picker; never IP geolocation.**

## 4. The quiet risk worth holding

NNEDV warns that a chatbot's comfort *"might also delay you from reaching out to a
real person."*

> A flow that reliably soothes her is, in this population, also a mechanism for
> keeping her in the situation longer.

That is not an argument for making the flow worse. **It is the argument for CUES**
— universal resourcing, every user, so comfort never becomes a substitute.

## 5. Still open before copy is final
- Nobody has read **NNEDV's *AI and Victim Services*** guide in full (the most
  relevant document we did not retrieve).
- The **WHO handbook's** explicit do/do-not wording is unretrieved (IRIS 403s).
- **There is no published spec for ephemeral display** — we would be designing
  past the edge of the literature. **Advocate review of the final surface is
  required**, not optional.
