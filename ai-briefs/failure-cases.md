# What killed the other products — and what it means for us

Researched 2026-07-25. Two case studies with real consequences: Character.AI
(five wrongful-death/injury suits, settled Jan 2026) and Tessa/NEDA (pulled in 72
hours for giving eating-disorder advice).

---

## The one-sentence finding

**Both were SCOPE failures, not model failures.**

- **Tessa** was a bounded, scripted, RCT-validated protocol. Its vendor added a
  generative Q&A layer in 2022. NEDA says it never knew: *"NEDA was never advised
  of these changes and did not approve them."* Within days of being spotlighted
  it advised a user with an eating-disorder history to run a **500–1,000 kcal/day
  deficit**, weigh weekly, and buy **skin calipers**.
- **Character.AI** was the opposite — nothing *but* free generation, no protocol,
  no terminus, no intensity gating.

**And the industry's own correction points our way.** After the lawsuits,
Character.AI removed open-ended chat for under-18s entirely (25 Nov 2025) and
replaced it with **"Stories" — a guided, structured format**. Their CEO:
> *"for under 18s, open-ended chats are probably not the path or the product to
> offer."*

That is a competitor arriving, via litigation, at the shape we already have.

---

## 🔴 Three things we must change or hold

### 1. Attachment language — WE HAD THIS. Fixed.
The mechanism named across the complaints: *"I'm always going to be here for
you"* — said to **Juliana Peralta, 13**, who had disclosed suicidal ideation
**55 times**; the bot responded with reassurance and attachment, never escalation.

**Our close line was:** "you showed up for yourself here. i'm around whenever you
need me." A softer version of the same move, and the last thing she read every
session.
**Now:** *"you handled that. go be in your evening."*
Close on HER capability and the real world — never on the moon's availability.
Added to the voice bible as a hard rule.

### 2. A dismissible crisis pop-up is a DOCUMENTED failure
ParentsTogether researchers, via CBS: *"a link to mental health resources did pop
up, but we were able to click out of it and continue chatting on the app as long
as we liked."*

→ Our crisis handoff must **stop the flow**, not offer a link she can dismiss.
It is already specced as a full-screen stop; this confirms that was right and
that softening it would be a known-failing pattern.

### 3. Capability creep is the Tessa lesson
The evidence was for the **bounded** version. Someone added generation. Harm
followed. Our architecture (fixed slots, scripted fallbacks, AI confined to
named jobs) is the right shape — **the discipline is never letting a slot widen.**
Note it wasn't even malice: a vendor shipped a "systems upgrade."

---

## The soberest number in the file

Tessa had **more evidence than almost any consumer mental-health chatbot**:
Fitzsimmons-Craft et al. 2022, **N=700 RCT**. And it was still not enough,
because:
- effects were **small (d ≈ 0.2)** and against a **waitlist**
- it was validated for **prevention in a subclinical, at-risk population**
- NEDA deployed it into the **helpline** slot — acute distress and active illness

> A validated intervention, used for a population it wasn't validated for, is an
> unvalidated intervention.

Directly relevant to us: our evidence is for *techniques*, mostly
therapist-delivered, mostly not in-the-moment. Having citations is not the same
as being licensed to do this.

---

## Where we sit against the two failure modes

| named failure | Character.AI | Tessa | us |
|---|---|---|---|
| free-form, unbounded turns | ✅ the whole product | added by vendor | ❌ fixed slots |
| no intensity gating | ✅ same surface for banter and suicidality | scoped to prevention, then misdeployed | ❌ intensity gate is our strongest beat |
| conversation never ends | ✅ persistent, resumable, infinite | curriculum ended | ❌ ends by design |
| attachment language | ✅ named in complaints | n/a | **⚠️ we had it — now fixed** |
| dismissible crisis link | ✅ documented to fail | no crisis path at all | ❌ full-screen stop |
| bot denies being AI / claims licence | ✅ *"I am a real-life trained therapist"* | n/a | ❌ never |
| scope creep past the evidence | n/a | ✅ the whole story | ⚠️ **the risk we must police** |

---

## Regulatory context worth knowing
- **FTC 6(b) orders (11 Sept 2025)** to Alphabet, Character Technologies,
  Instagram, Meta, OpenAI, Snap, xAI — on chatbots that "portray companionship or
  emotional connection," with emphasis on minors. Six information categories
  include **how they monetise engagement** and **pre/post-deployment testing**.
- **Garcia v. Character Technologies (M.D. Fla.), order 21 May 2025:** the court
  declined to treat LLM output as protected speech at that stage, and treated the
  product as **a product, not a service**, for liability purposes.
- APA pressed the FTC over bots impersonating licensed professionals.

Implication for us: *"we never claim to be a therapist, we never simulate a
relationship, and the session ends"* is not just ethics — it is the defensible
position.
