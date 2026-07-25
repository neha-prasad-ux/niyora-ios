# Why-lines — evidence audit of the 19 drafts

Audited 2026-07-25 against the repo only. Every verdict below cites a file and a
line **in this repo**. Where the repo does not settle a claim it says
**NOT SETTLED IN REPO** rather than filling the gap from general knowledge.

**The registers** (`moment-flow.yaml:65-80`):
1 = state it plainly · 2 = describe the practice · 3 = design rationale ·
4 = promise an outcome we can't back (**banned**; hedging does not rescue it).

**The bar** (`moment-flow.yaml:52-60`, `why-lines-draft.md:6-8`): EDUCATE **and**
MOTIVATE, or it is not approved. Length rule for why-lines is **ONE sentence**
(`moment-flow.yaml:103`), tighter than voice-bible rule 3's max-2
(`voice-bible.md:47`).

Neha's wording stands. The "minimal fix" column changes only the clause that
fails, never the line.

---

## The table

| # | beat | reg | verdict | source (file:line) | minimal fix |
|---|---|---|---|---|---|
| 1 | intensity in | 3 | **FIX ONE CLAUSE.** "helps us understand the next steps" is not true of this node — the 0-10 tap does not route anything (`intensity_in.next: clarify`, no branch); the big/small split already happened upstream off the crisis-scan pull. It also points the benefit at *us*, against the brief's "for her, not for us". | `moment-flow.yaml:223-232` (no branch), `:156` (intensity pulled at `crisis_scan`), `:207-209` (split precedes the tap), `why-lines-draft.md:20-21` | keep sentence 1 verbatim; swap the why to the comparison: *"how big is this issue? we'll ask again at the end so you can see if it moved."* |
| 2 | feelings | 3 | **REDUNDANT, not wrong.** "we will then know better" is again about us and carries no teach — but the teach already fired one beat earlier at `naming_science`. Fails EDUCATE only because the education is upstream. | `moment-flow.yaml:261-272` (`naming_science` fires immediately before `feelings`), `flow-methodology-check.md:36` (Lieberman 2007, affect labeling — real) | either drop the line (allowed: `moment-flow.yaml:113`) or motivate on cost: *"which of these feel closest to what you feel right now? one tap, that's the whole thing."* |
| 3 | body check | 4 → 1 | **CANNOT SHIP AS WRITTEN.** "Quickly make you feel better too" is an outcome promise we don't hold. "Fixing these 3 easily drive your mood" overstates in two ways: the finding is an *association* between day-to-day sleep/stress/fatigue and a regulation biomarker, not a fixing effect — and it covers sleep/stress/fatigue, **never hunger**. | `flow-evidence-findings.md:109-113` (what the body-check evidence actually is), `moment-flow.yaml:65-80` (register 4) | cut sentence 3. Keep the check, soften the driver: *"is any of the following true? sleep and food and movement move your mood more than people think."* |
| 4 | eat now / later | 4 | **CANNOT SHIP. Four separate failures, see below.** Also structurally wrong: this is four different beats (`body_ask_soon`, the moved-gap, `body_tired`, `time_it`) fused into one bubble. | see the "cannot ship" section | split into four one-sentence lines; only clause (a) survives as written |
| 5 | breathe 4:6 | 4 | **CANNOT SHIP.** "your body would feel much safer, relaxed" is quoted **verbatim in the spec as the ❌ example** for this exact beat. Separately, "6 long exhales" is the wrong count: the evidenced unit is ~6 breaths per *minute* (4+6=10s), and the node's verbatim is "in for four, out for six" with `want three more?` as the round control. | `moment-flow.yaml:93` (the ❌, word for word), `:92` (the ✅), `:401`, `:406`, `flow-methodology-check.md:38`, `voice-bible.md:67-69` (rule 13) | *"in for four, out for six. about six breaths a minute is the part that's actually been tested."* (spec's own line — but see open question 3) |
| 6 | want three more? | — | **NOT A WHY-LINE.** It is the existing node text (`"want three more?"`) restated. Educates nothing, so it fails the acceptance test by definition. | `moment-flow.yaml:406`, `:52-60`, `why-lines-draft.md:59-60` | add the why in front, register 3: *"three more or stop, neither one is the right answer."* |
| 7 | how long have you got? | 1 | **KEEP CLAUSE 1 — it is better than the spec's own copy.** "It takes 20mins of distraction for emotions to drop" carries the *distraction condition* inside the number, which the source requires and which our three-line `science_copy` needs three sentences to say. **Two problems after that:** (a) "Do you have 20 mins?" makes three of the four chips into losing answers, when the design deliberately fills *every* branch; (b) the don't-react clause paraphrases **verbatim-safety** copy, which is DV-suppressible and must not be folded into a why-line. | `flow-methodology-check.md:150-153` (~20 min **only** with active distraction), `moment-flow.yaml:434-438`, `:414` (four branches), `:429-441` (every branch filled), `:432`/`:438`/`:445` (verbatim), `flow-methodology-check.md:177-179` (DV suppression) | keep clause 1 verbatim. Restore the real question ("how long have you got?"). Leave the don't-react line where it is, as verbatim. |
| 8 | activity pick | 1 + 4 | **CLAUSE 1 IS THE BEST-EVIDENCED LINE IN THE SET** and shorter than the spec's. "here are few simple interesting things to **make you feel better**" is register 4 — the evidence backs *filling* the delay vs an empty one, not that a walk or music makes her feel better. | `moment-flow.yaml:448-451` (Bushman 2002, N=600, three conditions), `flow-methodology-check.md:172-174`, `:35` | *"doing nothing for 20 mins makes it worse. which one?"* — cut the middle promise, keep both ends |
| 9 | cbt stem | 2 | **PASSES, THINLY.** "A strong thought might hide other possibilities" is a description of the practice, not an outcome promise, so it is not register 4. But the premise itself is **NOT SETTLED IN REPO** — we hold Sheppes for *doing CBT after regulation*, nothing for "a strong thought hides other possibilities". Misses the one motivator here that *is* evidenced. | `flow-methodology-check.md:34` (Sheppes: CBT after the break is correct), `:85-87` (picking from options is far lower effort than generating one) | keep her sentence, replace sentence 2's bare instruction with the evidenced motivator: *"…picking from a list is much easier than coming up with one right now."* |
| 10 | cbt reframe | — | **NOT A WHY-LINE, AND THE WRONG TEST.** The criterion for a reframe is whether it *fits*, not whether it makes her feel better — the node's own chips are "does that land? · not really". "make you feel better" also invites exactly the self-report inflation the spec distrusts. "this line" is interface language; the moon does not refer to its own output. | `why-lines-draft.md:92-94`, `moment-flow.yaml:219-222` (self-report is the distrusted measure), `voice-bible.md:41-42` (not a narrator) | *"we're not deleting the thought, just checking if a smaller version fits. does that land?"* |
| 11 | any better? | — | **NOT A WHY-LINE, and it collides with #19.** As a question it matches the node (`"feeling better?"` / `"arousal dropped?"`) so it is not wrong — but drafts 11 and 19 both say "better than before", and the spec explicitly separates these two beats: 11 is **routing** while she is still working, 19 is **measurement** when the work is done. Identical phrasing makes 19 read as a repeat. | `moment-flow.yaml:477`, `:511`, `:239-242` ("NOT the same thing as the mid-flow 'any better?'"), `why-lines-draft.md:100-101` | add the routing why and stop echoing 19: *"are you feeling better than before? this just decides what comes next, it's not a grade."* |
| 12 | other practices | 3 | **KEEP THE SECOND HALF — it is better-evidenced than the spec's framing.** "lets learn what suits you the most" is directly supported: strategies favourable on average were "ineffective or even counterproductive for a meaningful subset of individuals", which is why no act may be presented as the right one. The spec's `high_ladder` framing never uses this, so her line supplies the educate half the spec is missing. "life is too short to be stuck with one" is a platitude and brushes rule 9. | `act-evidence-review.md:24-27`, `moment-flow.yaml:483-490` (offering beats prescribing; none have trial evidence), `voice-bible.md:55-56` (rule 9) | drop "life is too short": *"lets try some other methods, none of these beat the others, let's learn what suits you the most."* |
| 13 | the 3 act options | 3 | **STRONGEST DRAFT IN THE SET.** "its easy to pick than think" is named in the spec as one of the strongest lines available, and it is independently evidenced. "we have more if you want" is a *required* affordance, not padding. **One real fault:** "plan how to react to the situation" mis-describes rung 3 — "look after yourself tonight" is not reacting to the situation — and it collides with her own #7 ("dont react, respond"). | `moment-flow.yaml:75-76` (spec names this line), `flow-methodology-check.md:85-87`, `moment-flow.yaml:575`, `:584` ("show me some others" required), `act-taxonomy-findings.md:47-50` (ladder rule), `moment-flow.yaml:574` ("there's no one right move here") | change sentence 1 only: *"now it's time to choose what to actually do about this. shall we work on any of these? its easy to pick than think, we have more if you want."* |
| 14 | none feel possible | 3 | **BLANK — needs one.** Constraints are hard here: never argue, never re-ask, must look exactly as legitimate as the other three, and it routes to a full path (comfort act + coping if-then), not an exit. | `moment-flow.yaml:635-641`, `:648-655`, `:660-664`, `:697-716` | candidate, hers to overrule: *"none of these feel possible right now — that's a real answer, and it still goes somewhere."* |
| 15 | now or tomorrow | 3 | **FAILS EDUCATE.** "do it now anyway" reads un-shamed (good, that is the hard constraint). But the *only* reason to wait is dropped, so she learns nothing — and the spec already has a why-line drafted for this beat. Note "tomorrow" is a day, not the "concrete agreed window" the rule asks for; the window is un-built anyway, so this is not a copy failure. | `moment-flow.yaml:856` (node text), `:860-861` (existing why-line), `:864` ("never a vague later"), `:346` (the reason is sensible, **not evidenced** — say it plainly), `flow-methodology-check.md:112-115` (no node captures the window) | add the reason, register 3 not 1: *"do you want to handle this now? tired talking comes out sharper than you mean it, that's the only reason to wait."* |
| 16 | the if-then | 1 | **BREAKS THE SPEC'S OWN TEMPLATE.** The effect is real (d=0.53, k=29, N=1,208) and is the largest documented lever in the flow — but it requires **two fill slots, a specific trigger and a response**. "If this happens again I would ___" collapses that to one slot with a generic trigger, which is the part the mechanism depends on. "Fill in your take away here" also frames it as a reflection; the evidence is for *plans*, not takeaways. This is a model slot (must name her situation), so a generic template can't carry it. | `moment-flow.yaml:872` ("IF \<specific trigger\>, THEN \<what I say/do\>"), `:881` ("Two fill slots (trigger, response)"), `:866-871` (d=0.53), `act-evidence-review.md:35`, `why-lines-draft.md:141-144` | keep her educate clause, fix the template: *"it is important to be prepared for the same situation. if ___ happens, then i ___."* |
| 17 | comfort act | 3 | **ALREADY RESOLVED — "all of them lift you a little" CANNOT SHIP.** Not re-litigated here. Confirmed against the evidence: "lift" is backed by behavioural activation, BA is about doing something *engaging*, and the list Neha chose (shower, food, bed, warm) is soothing. The decision to keep the soothing list is hers and stands; the consequence is that the register-1 claim goes. | `why-lines-draft.md:154-181` (the resolution), `moment-flow.yaml:697-702` (comfort act rationale = BA), `:497-503` (LOW lane = activation), `flow-methodology-check.md:39` | already drafted at `why-lines-draft.md:174-176`; nothing to add |
| 18 | we good? | 3 | **KEEP VERBATIM.** "be frank, its ok" does the motivate half in four words and lowers the cost of saying no, which is the whole design intent. Only half-educates ("not really" leads to `we_good_more`, something untried), but the cost of adding that is higher than the gain. | `moment-flow.yaml:894`, `:926-930` (`we_good_more` = something untried), `why-lines-draft.md:184-185` | none. Optional: *"…be frank, its ok, we've got things we haven't tried."* |
| 19 | intensity out | 3 | **PASSES THE HARDEST CONSTRAINT, AND BEATS THE SPEC.** It does not presuppose improvement — which is the one thing this beat must not do — and naming the comparison out loud actually educates, where the spec's approved copy ("and now?") educates nothing and would fail Neha's own two-part test. Two small things: "its a safe space" is therapy-speak (rule 8 family), and "be honest" is the load-bearing half. | `moment-flow.yaml:217-222` (never "how much better"), `:236` (spec copy), `:52-60` (the test), `voice-bible.md:53-54` (rule 8) | drop three words: *"how does your emotion feel now, compared to what you felt before? be honest."* |

---

## Cannot ship as written

**#5 — "your body would feel much safer, relaxed."**
This exact sentence is the ❌ example in the spec for this exact beat
(`moment-flow.yaml:93`) and a rule-13 mechanism claim (`voice-bible.md:67-69`).
Hedging it does not help: "some find it makes your body feel safer" still asserts
that it does (`moment-flow.yaml:77-80`). The **pace** is ours to claim, the
**physiology** is not (`flow-methodology-check.md:38`).
Secondary: "6 long exhales" is the wrong count — the evidenced unit is ~6
breaths/minute, and the node is "in for four, out for six" with a three-more
control (`moment-flow.yaml:401`, `:406`).

**#4 — four failures in one bubble.** Taking them in order:

- (a) *"can you eat something right now? if you can not eat, we will add it as a
  task"* — ✅ **correct and keepable.** It matches `body_ask_soon` exactly,
  including the branch (`moment-flow.yaml:306-321`).
- (b) *"you will feel better when you feel full"* — 🔴 **the worst claim in the
  set.** Hunger→mood is **NOT SETTLED IN REPO**: zero hits for the claim
  anywhere in the tree; `02-body-check.md:12` is a *design role* statement, not
  evidence; and the actual body-check finding covers **sleep, stress and
  fatigue**, never hunger (`flow-evidence-findings.md:109-113`). Worse, the repo
  has already flagged this exact prompt as an **unscreened food prompt** with
  binge eating elevated throughout the luteal phase
  (`flow-evidence-findings.md:114-115`) — so this promises a mood benefit from
  eating to the population we were told to screen. It also implies her feeling
  *is* hunger, which `02-body-check.md:13` bans as "the cousin of the
  never-just-hormones rule" (`voice-bible.md:57-58`).
- (c) *"can you walk towards the window and we talk while you do that?"* — right
  copy, **wrong node.** "walk to the window and back" is the HIGH-lane hold
  filler at `high_stepaway` (`moment-flow.yaml:439`). At the body check the moved
  gap is "step outside" / a Today action (`moment-flow.yaml:315-316`).
- (d) *"Movement easily brings better feeling"* — 🔴 **directly contradicted by
  our own audit.** "Exercise as an acute regulator. The SMD −1.08 everyone quotes
  is an 8-week effect, I²=87%, 87% high risk of bias. **Not an in-the-moment
  claim**" (`flow-evidence-findings.md:103-104`).
- (e) *"Do you want to rest or fix this now? resting easily makes you feel
  better"* — 🔴 **re-introduces a bug the spec deleted on 2026-07-25.** Asking
  now/tomorrow at the body check is "asking her to time an action THAT DOES NOT
  EXIST YET. Unanswerable" — the question was moved to `time_it` for exactly this
  reason (`moment-flow.yaml:337-343`). And the rest claim is unsupported: the spec
  says outright "exhaustion-as-a-reason-to-wait is SENSIBLE, not evidenced. Say it
  plainly; never dress it as science" (`moment-flow.yaml:346`).

**#3 — "Quickly make you feel better too."** Outcome promise, register 4. The
sentence before it ("Fixing these 3 easily drive your mood") is salvageable but
overstated: the finding is an association covering sleep/stress/fatigue, not a
fixing effect and not hunger (`flow-evidence-findings.md:109-113`).

**#8 — "…to make you feel better."** Register 4 on the activities themselves. The
evidence covers filling the delay versus an empty one, not the mood effect of a
walk (`moment-flow.yaml:448-451`).

**#17 — "all of them lift you a little."** Already resolved in
`why-lines-draft.md:163-179`. Confirmed correct.

### The one-word pattern behind three of these
"easily" appears in #3 and twice in #4, and each time it converts a *maybe* into
a *certainty* — it is doing the same work a hedge does in reverse. Treat it as
one habit to drop rather than three separate flags.

---

## Keep verbatim

Being generous here, as asked. These are done and she should not spend another
minute on them.

- **#18** — "Are we good? be frank, its ok." Whole line. Four words doing the
  motivate half is better than anything we'd write.
- **#13, the second half** — "its easy to pick than think, we have more if you
  want." The spec already calls this one of the strongest lines in the set
  (`moment-flow.yaml:75-76`). Only sentence 1 needs touching.
- **#12, the second half** — "lets learn what suits you the most." Evidenced
  (`act-evidence-review.md:24-27`) and it fills a gap the spec left open.
- **#7, clause 1** — "It takes 20mins of distraction for emotions to drop."
  Accurate, and tighter than our own copy.
- **#8, clause 1** — "Doing nothing for 20 mins makes it worse." Best-evidenced
  single clause in the whole set (`moment-flow.yaml:448-451`).
- **#19, minus three words** — "be honest" is the guard that matters; only
  "its a safe space" needs to go.
- **#1, sentence 1** — "How big is this issue?" Matches the required framing
  (`moment-flow.yaml:217`); only the why clause is wrong.
- **#4, clause (a)** — "can you eat something right now? if you can not eat, we
  will add it as a task." Matches the spec node exactly.
- **#16, clause 1** — "It is important to be prepared for the same situation."
  Only the fill template below it is wrong.

**Four of her drafts are better than what the spec currently holds** (#7 clause 1,
#8 clause 1, #12 second half, #19 vs the bare "and now?"). #19 is the notable one:
the spec's own approved copy for `intensity_out` educates nothing and would fail
the acceptance test the spec itself introduced.

---

## Length: which earn it, which are padded

The binding rule is **ONE sentence** (`moment-flow.yaml:103`), not voice-bible's
max-2. Against that, most drafts are long. But they are not long for the same
reason, and they should not be trimmed the same way.

**Earn their length — do not cut:**
- **#13 (3 sentences)** — three distinct jobs: what the menu is, why picking
  beats thinking, and the "more options" affordance, which is a *required* part
  of the design (`moment-flow.yaml:575`, `:584`). Cutting any one loses something.
- **#7 (3 sentences)** — the extra length is a *structural* problem, not padding.
  The don't-react clause is verbatim-safety copy that must stay separate and
  DV-suppressible (`flow-methodology-check.md:177-179`). Split it out and the
  why-line is one sentence on its own.
- **#19's "be honest"** — this is the anti-inflation guard on the beat the whole
  measurement depends on. It earns its four words. "its a safe space" does not.
- **#18's "be frank, its ok"** — same job, and it is already short.

**Padded — cut with no loss:**
- **#3, sentence 3** ("Quickly make you feel better too") — restates sentence 2
  as a promise. It is both the padding and the banned claim.
- **#8, the middle** ("here are few simple interesting things to make you feel
  better") — same.
- **#12's "life is too short to be stuck with one"** — platitude, and it brushes
  rule 9 (`voice-bible.md:55-56`). The real line is the clause after it.
- **#16's "Fill in your take away here"** — the UI already shows the slots.
- **#1's second sentence** is not padding, it is her only why — it is just
  aimed at us instead of at her.

**Not a length problem at all — a structure problem:**
- **#4 (~7 sentences)** is four different why-lines for four different nodes
  fused into one bubble. It needs **splitting**, not trimming. Trimming it to one
  sentence would silently pick a winner among four beats.

---

## Open questions for Neha — the repo cannot settle these

1. **The "hangry" claim has no record anywhere in this repo.** Zero hits for the
   claim in any brief, the spec, or the corpus seeds. The nearest thing is
   `02-body-check.md:12`, which is a statement of *design intent* ("so she doesn't
   do emotional work on a problem that is really low blood sugar"), not evidence.
   The actual body-check evidence we hold covers **sleep, stress and fatigue**
   (`flow-evidence-findings.md:109-113`). So the food half of the body check is
   currently the least-supported part of a beat we otherwise rate highly. Decide:
   find a citation, or drop the mood claim and keep the practice.

2. **The 95% figure is corrected in three files and still stale in a fourth.**
   `act-evidence-review.md:38`, `act-taxonomy-findings.md:16` and `JOURNEY.md:117`
   all say the 95% sexual-abuse figure is n=42 and the defensible range is
   **~40–60%**. `flow-evidence-findings.md:56` still states **95%** with no
   correction note. This is exactly the "correction lands in one file, goes stale
   in four" pattern. It does not touch any why-line, but it is a live
   disagreement between two docs on this audit's reading list.

3. **The spec's own approved breath line may itself brush rule 13.**
   `moment-flow.yaml:92` offers *"about six breaths a minute is the part that's
   actually been tested"* as the ✅. "actually been tested" is an appeal to
   research, and rule 13 bans "research says" (`voice-bible.md:67-69`). This is
   the line #5 is supposed to be replaced with, so it is worth settling before it
   ships. Not settled in the repo either way.

4. **Who fills the if-then** — bears directly on #16. `today_action` says "SHE
   fills both slots, not the model" (`moment-flow.yaml:873`) while
   `uncontrollable_ifthen` is typed `kind: ai-draft` with model-written examples
   (`moment-flow.yaml:704-712`). Already flagged unresolved at
   `flow-methodology-check.md:144-147` and `:277-280`. #16's why-line cannot be
   finalised until this is decided, because the line has to say who is writing.

5. **Whoever takes the `nothing` exit never sees why-line #19.** The
   `{when: nothing, module: none, next: close}` branch jumps past `we_good`,
   past `intensity_out` and past the human nudge (`moment-flow.yaml:792`,
   flagged at `flow-methodology-check.md:281-285`). So the measurement why-line
   is written for a beat a subset of women never reach.

6. **The count is off, harmlessly.** The spec says "16 choice points" twice
   (`moment-flow.yaml:27`, `:49`) but its own inventory at `:117-138` lists 20
   once the paired rows are split, and `why-lines-draft.md` enumerates 19. Nothing
   depends on it; worth a one-word fix so nobody audits against 16.

---

## What is not in scope of this audit

- **#17** was resolved before this audit ran. I checked the reasoning against the
  evidence and it holds — behavioural activation backs "lift", the comfort list
  she kept is soothing, so the register-1 claim goes and register 3 replaces it.
  Nothing to reopen.
- **Wording.** Every "minimal fix" above changes only the clause that fails
  against evidence. Where a line is merely long, or merely plain, it is left
  alone.
