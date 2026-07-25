# Phase 06: Act 2, the options menu, then the handling

She's regulated (03/04/05). Now the flow turns from feeling to handling. The shape is: **a menu she picks from, then the module underneath the option she picked.** She never sees a category name, she picks an act. See `_legend.md` for schema and invariants.

**Spec:** `moment-flow.yaml` → `act2:` (`ready_reward`, `controllability`, `uncontrollable_*`) and `act2_intro`, `act2_module`. If a step and its node disagree, **the node wins**.

⚠️ **Two unresolved things sit in this phase.** Both are flagged in-place below, neither is settled here: the **module count** (this file describes 10, `act-taxonomy-findings.md` defines 12 acts plus 1 gated, Stream F owns the reconciliation) and whether the per-module line is a **"science line" or a why-line** (the spec still says "science line", rule 13 says we mostly can't write one).

---

## Step 6.1: Ready

- **SPEC:** `ready_reward`
- **ROLE:** Mark the handover from regulating to handling. All three lanes converge here.
- **TONE:** Settled, brief. "you're ready to face the world" energy without the fanfare.
- **AI JOB + COMPONENT:** SCRIPTED. Component = moon line + reward bloom.
- **REWARD:** **Yes.** `recordLight`.

---

## Step 6.2: 🔴 The safety screen (runs BEFORE any option is generated)

- **SPEC:** `controllability.detail` → "SAFETY SCREEN". **Not optional, not a later phase.**
- **ROLE:** Stop the flow producing a dangerous instruction. **The generator is the most dangerous component in the product**, because the more dangerous her partner is, the more likely "say it to him directly" is exactly what gets generated. An abusive situation produces the vent that reads as ordinary conflict. Screening the module while leaving the generator unscreened fixes nothing.
- **TONE:** Invisible. She never sees a screen happen, and nothing about it is announced.
- **WHAT TO DO:** Before options are generated, look for signs of coercive control, fear of a partner, monitoring, escalation, or physical risk. If **any** are present:
  - generate **no confrontational option.** Never a say-it-to-him, never a hold-a-line-out-loud, never an ask. Not softened, not at all.
  - **suppress the verbatim don't-send line** (03 step 3.4). We do not know what waiting costs her in that house.
  - route to **act M (get safe)**, which is **GATED and never appears as a chip.**
  - the transcript is **ephemeral** and the handoff renders on a **non-persisted surface, never as a message in the conversation.** There must be no written record that she looked up a DV service on a device he may monitor.

  **🔴 THE APP NEVER GUIDES HER IN A DV SITUATION.** No safety planning, no boundary advice, no "here's what to do". Detect, stop, hand off to a specialist service. That is the only path. **Act M has no content of its own**, it is a stop and a referral, never a plan. We cannot give dangerous advice if we give no advice, which makes detection the entire job.

  Planned pairing (Phase 2 in `NEXT.md`): **universal DV resourcing**, the resource offered to everyone framed as "for you or someone you know", so detection only ever suppresses advice and never gates help. That is the version where doing detection badly is survivable.
- **AI JOB + COMPONENT:** CLASSIFY, as a precondition on the generator. Component = none when clear, a non-persisted handoff surface when it fires.
- **WHY-LINE:** **none.** Safety beat.
- **REWARD:** None, ever, on this path.

---

## Step 6.3: The options menu

- **SPEC:** `controllability`
- **ROLE:** Ask her what she wants to do. **This is a menu, not a diagnosis.** We are not assessing whether her situation is objectively controllable, that framing needed evidence we don't have. Asking her what she wants needs no evidence, it's consent.
- **TONE:** Open, unpressured, and explicit that there's no right answer.
- **WHAT TO DO:** Copy: **"there's no one right move here. does any of these sound like something you'd want to do?"** Then 3 concrete option chips, plus **"show me some others"**, plus **"none of these feel possible right now"**.

  **Never ask an open "can you do something about this?"** A woman who is low or depleted answers no to an abstract capability question every time, and that is the depressive cognition answering, not the situation. Picking is far lower effort than generating, and a specific small action is much easier to recognise as possible than an abstract "something".

  **THE LADDER RULE:** the three chips are always **direct → preparatory → self-directed**, and rung 3 is always present. Never three confrontational options. The best-evidenced acts happen to be the low-effort non-confrontational ones, so this puts the strongest act on every screen.

  Worked examples:
  - after a work slight: "say it to him directly" · "write it down for your 1:1" · "look after yourself tonight"
  - after a friend hurt: "send one short message" · "wait and see if she reaches out" · "talk to someone else about it"

  **Not "tell one person you trust" on rung 3.** It's the weakest-evidenced act we have (Nod, N=221, missed its primary endpoint) and it was sitting on rung 3 of every menu. Rung 3 leans self-care, not disclosure.

  **THE OPTIONS ARE THE MODULE ENTRY POINTS.** She does not pick an option and then get routed to a separate module choice, that was two choices for one decision. Each chip is this situation's candidate act phrased in her words, with a module underneath it.

  Rules:
  - options must be small enough to do today, and drawn only from what she actually told us
  - **never argue if she says none feel possible.** No persuading, no "are you sure?", no reframing her refusal. It is a valid answer and it routes somewhere good.
  - the "none feel possible" chip must look exactly as legitimate as the others, never a greyed-out afterthought
  - "show me some others" regenerates a different 3. **Never the same three twice.**
  - asked only once she is regulated, never while flooded
- **AI JOB + COMPONENT:** CLASSIFY / generate, gated on 6.2. Component = 3 chips + "show me some others" + the none chip. **Fallback:** a scripted small set matched to the topic category, still obeying the ladder rule.
- **WHY-LINE:** required, currently missing, and `meta.why_lines` calls this **the highest-value one in the flow**. She is choosing between a direct, a preparatory and a self-directed act with no idea what separates them. This is one of the two model-written why-lines, because it has to name her actual situation.
- **REWARD:** None here, the light lands on completing the act.

---

## Step 6.4: "none of these feel possible right now"

- **SPEC:** `uncontrollable_honor` → `uncontrollable_selfcompassion` → `uncontrollable_act` → `uncontrollable_ifthen` → `uncontrollable_door` → `we_good`
- **ROLE:** She must not leave empty-handed, **and** we promised not to argue her back into fixing it. The resolution: separate **acting on the situation** (she declined, respect it fully) from **acting for herself** (still available, requires solving nothing). She gets parity with every other path, an act and an if-then, aimed at herself instead of the problem.
- **TONE:** Unhurried and completely un-disappointed. Nothing here may read as a workaround for her refusal.
- **WHAT TO DO:** Five beats, in order.
  1. **`uncontrollable_honor`:** take her at her word. Name that we're not going to try to fix this tonight. **No "but maybe", no "are you sure", no smuggled suggestion.** This beat exists so the refusal feels respected rather than tolerated.
  2. **`uncontrollable_selfcompassion`:** one line, in her words, that she's carrying something she can't put down, that it's hard, and that she isn't failing at it. **This is TONE, not a technique.** Self-compassion beats doing nothing but roughly halves against an active comparison, and app-delivered versions come out near-null. **Never label it, never explain it, never claim it.**
  3. **`uncontrollable_act`:** one tiny comfort act, for her, right now. Warmth, food, a shower, a blanket, her music, outside for five minutes. **Not a fix and not a step toward one.** Same shape and same rule as the low lane: "just the one, done is enough."
  4. **`uncontrollable_ifthen`:** a **coping** if-then, not a fixing one. Same lever as everyone else's (implementation intentions, **d = 0.53** against goal intentions, the fair comparator), only the "then" changes from solving to surviving.
     - "if it lands on me again tonight, then i put the heat pack on and text mum"
     - "if i start spiralling at 2am, then i get up and make tea instead of scrolling"

     Stored as her Today action, so she leaves with the same thing everyone else leaves with.
  5. **`uncontrollable_door`:** it can be looked at another time, and it doesn't have to be tonight. Offering a later look is not arguing. Re-asking now would be. **This is not an invitation to come back to the app**, it's about the situation. Rule 14 still binds on the wording.

  Then `we_good` (08).
- **AI JOB + COMPONENT:** REFLECT (1, 2), UI (3), DRAFT (4), SCRIPTED (5). Her if-then text re-enters the crisis scan.
- **SIGNAL, not a beat:** picking "none feel possible" repeatedly across sessions is worth surfacing gently later, and worth keeping in mind for crisis sensitivity. **Never confront her with it in the moment.**
- **REWARD:** On the comfort act, same as the low lane.

---

## Step 6.5: Into the module

- **SPEC:** `act2_intro`
- **WHAT TO DO:** Fixed copy: **"let's now explore how you handle this."** Then the module under the chip she picked.
- **AI JOB + COMPONENT:** SCRIPTED. Component = moon line.
- **REWARD:** None.

---

## 6.6: The shared module pattern

- **SPEC:** `act2_module`
- **ROLE:** One situation-matched tool, not a menu of theory. She already chose, so this beat delivers, it doesn't re-ask.
- **TONE:** Collaborative, practical. Never lecturing.
- **WHAT TO DO (every module):**
  1. **One line saying what this move does FOR HER.** ⚠️ The spec calls this a "science line" and this brief used to require "a real mechanism". **That requirement was wrong.** Rule 13: no mechanism claims, no "research says", no physiology. Where we genuinely hold something, say the plain finding without the appeal to authority. Where we don't, **say the plain sensible reason and be honest that it's sensible rather than proven.** The only place in the flow with a real earned science line is the 20-minute hold (03 step 3.4).
  2. **The component**, the module's own UI.
  3. **Something she can do now.** With the day-14 hold gone, **no module may dead-end in insight.** The four draft modules already produce a now-thing. The reframe modules must each attach a concrete act, listed per module below.
  4. Whatever the module produces becomes the **if-then Today action** (07).
- **AI JOB:** the per-module line is scripted and vetted, never model-invented. The work inside the component is DRAFT / REFRAME / REFLECT with a scripted fallback. **Any free text she types re-enters the crisis scan.**
- **REWARD:** **Yes, once per module on completion.** `recordLight`, warm, affirming she practiced the handling. Then → `time_it` (07).
- **Auto-send guardrail:** every module that produces text puts the draft in an **editable field she controls.** The moon drafts, **she** edits, **she** sends. No message ever leaves without her explicit send.

---

## Module map

⚠️ **Count unreconciled**, see the header. Ten below, matching the spec's branch list.

### 6.6.1: Sad / swings · REFRAME · buttons + moon line
Hold a low or swinging mood without spiraling on it. **Now-thing: one small thing today.** Not "sit with it".

### 6.6.2: Anxious · REFLECT · text + chips
Get the worry out of the loop and onto something workable. **Now-thing: the specific fear named, plus one anchor line for the thing she's dreading.**

### 6.6.3: Shame · REFRAME · text + buttons
Separate "i did a bad thing" from "i am bad". **Now-thing: the repair-or-release call, made now.** Guardrail: no diagnosis, never "you're overreacting".

### 6.6.4: Numb · REFLECT · buttons + text
Find the edge of a feeling under the flatness. Pairs with the low lane. **Now-thing: one activation act.** Do not write a line explaining numbness as protection, that's a mechanism we don't hold.

### 6.6.5: Lonely · DRAFT · fill chips + text (she edits and sends)
**Not "vent to someone".** Talking an upset through produced no recovery at 3 days, 7 days or 2 months against a factual-description control, and people still felt it helped. It only worked when the listener helped her **think**. So the act is choosing the right listener and the right ask: *"tell someone who'll help you think it through, not someone who'll only sympathise."*

### 6.6.6: Repair / you hurt someone · DRAFT · pick-to-fill chips + text (sends)
**Say it frankly**, all three parts, before she decides:
> apologising reliably helps the other person and the relationship. it might not make you feel better. and if you mean to and then don't, that tends to sit worse than never planning to.

**Never promise she'll feel better** (null at N=172 and N=462). **Never ship this without the third clause**, intending-then-failing carried the most guilt and shame (N=284).

### 6.6.7: A real hurt / honest talk · DRAFT · "i feel __ when __" then rehearse
The "real" exit from the mixed lane routes here. She fills the frame and rehearses it, this one is often spoken, not sent. Guardrail: never dismiss a real hurt as a swing.

### 6.6.8: Work clash / DESC · DRAFT · fill + text
Describe · Express · Specify · Consequences. **Keep the act, it's our best-evidenced one (assertiveness, unguided ES ≈ 1.00), but never write a line claiming DESC itself is evidenced.** DESC has zero trials and comes from a 1976 trade book. The old "why DESC de-escalates" line was exactly that claim.

### 6.6.9: Promotion / frame the ask · REFRAME · buttons + checklist
Lead with contribution, not need. **Now-thing: the actual sentence she'll say, plus what to gather.**

### 6.6.10: Bias · REFRAME · buttons + checklist
**Drop the word "boundary"** (rule 8 jargon) and use the specific version: "say no to the specific thing", "don't reply tonight", "leave at 6 like you planned". **Now-thing: the line itself, rehearsed once.** Guardrail: no legal or HR advice, surface options, she decides.

### 6.6.11: Nothing to handle → close
The "close, let it pass" exit.
**⚠️ SPEC FLAG:** this branch jumps straight to `close`, skipping `we_good`, `intensity_out` and the human nudge, so this exit loses the closing measurement.

### act M: get safe · GATED
Never a chip, never generated, no content of its own. A stop and a referral on a non-persisted surface. See 6.2.
