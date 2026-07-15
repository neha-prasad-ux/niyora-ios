# Niyora — PMS preparedness spec (v1)

The preparedness arc: a readiness score she can fulfil, the set of things that fill
it, and the two-cycle story that teaches them. Builds on the existing checklist
(`src/app/pms-readiness.tsx`, `src/store/pms-readiness.ts`), the Steady-yourself
flow (`src/app/steady-yourself.tsx`), the emotion-regulation content
(`src/models/emotion-regulation.ts`, `src/v3/game-content.ts`), the couples screens,
and the moon reward system (`src/lib/moon-light.ts`). Obeys `DESIGN.md`.

## The problem this solves

When she opens the app there is no reason to come back, and no way to *know* she has
done her best before the hard week. She should be able to arrive at PMS able to say:
*"I did everything that helps. Whatever this week brings, I'm as ready as anyone can
be."* That reassurance — the **guarantee**, not the fear — is the product.

## Governing principles (from DESIGN.md + locked decisions)

- **Earn peace, not fear a gap.** Every surface reads as *preparation and relief*,
  never *deficit or judgment*. This is a luteal-sensitive audience; a scary number
  is cruelest at the worst moment.
- **No parallel points.** The score pays out through the moon (fullness / rings) via
  the existing `recordLight` channel. No second currency. (See [[moon-reward-system]].)
- **One number, one action.** The only number surfaced is *this cycle's readiness*.
  The score hands her **one thing to do**, never a backlog, then **releases her** —
  "you're set for today." Reaching a clean stopping point every day is what makes her
  come back.
- **Nothing is required.** 3 of 4 skills rehearsed + basics kept is a prepared woman.
  The score reflects effort; it never demands completion, never subtracts for a miss.
- Voice: quiet, affirmative, neutrally warm, no em dashes, no self-deprecation
  ([[project-content-voice]]).

## Three layers that stack

| Layer | What it is | Role |
|---|---|---|
| **The set** | The topics — mind, body, us | *what* readiness is made of |
| **The story** | 2 cycles, learn → prove | *how* the set is sequenced so it isn't a bare checklist |
| **The score** | Fullness / rings | *progress* and the payoff |

## The set — three tracks

The score composes from three tracks. If a track doesn't apply (no partner, opted
out), it **reweights to the others with zero penalty** — her rings still fill fully.

### Mind — skills she *rehearses*
The four moves are the exact sequence in [Steady yourself](../../src/app/steady-yourself.tsx).
Prep = rehearsing in calm what she'll reach for in the storm.

- **Notice** — her own early signs; "what's shifting?"
- **Breathe** — one guided breath, banks the rhythm
- **Size it** — rate it 1–10; "is this the luteal amplifier, or real?"
- **Deal with it** — rehearse one response / reframe

> **Learning order** (curriculum): notice → size → deal → breathe.
> **Live order** (in the moment): notice → **breathe** → size → deal — a hijacked
> nervous system can't right-size until it's calmer. Keep the rehearsal faithful to
> the live order.

### Body — basics she *does*
Evidence-backed, already in the readiness store; ticks feed the daily ring.
- **Calcium** (strongest evidence) · **Move** · **Sleep / wind-down**

### Us — the relational move she *does*
The highest-leverage item: the only one whose payoff is **external** (a gentle week
vs. a fight). Already plumbed — `RelationshipCard`, the couples-texts screens.
- **The heads-up message** to her partner, sent proactively in the late build days.
- **Fight topics** for if it happens anyway.

Rules for the partner message:
- **Optional and never a penalty.** No partner / opted out → score reweights to mind
  + body.
- **Collaborative framing, never apology.** *"My PMS window's this week; when I'm
  short, a bit of space and a cup of tea goes a long way."* Her voice, her edit, her
  tap to send. **Never auto-sent.** Not "sorry I'll be difficult"; never her body as
  a problem.

## The score → the payoff

- **Composition:** four skills rehearsed (mind) + three basics kept (body) + the
  heads-up (us). Each element ≈ one ring segment.
- **Baseline:** starts at a **generous non-zero** (tracking your cycle already
  counts); first points are trivially easy. Never reads as "you're failing."
- **In-session reward:** she acts, the bar ticks *right there*, small pulse. Cause
  and effect in one sitting — not "check back tomorrow."
- **The rings finally mean something.** All rings filled = *"nicely done — you got all
  the rings. You did everything that helps."* Each ring is now a literal picture of "I'm
  ready," not abstract lifetime-light.

**Open architecture decision (recommend option A):**
- **A — Fullness.** The score drives the moon's *brightness/fullness* (already waxes
  and wanes) toward the PMS date; 100% = the moon is full. Lifetime rings untouched.
  *Fits the existing model exactly.*
- **B — Dedicated cycle-ring set** that fills and resets each cycle, alongside the
  permanent soul-rings. More literal to "got all the rings," but two ring systems to
  explain.

## The story — two cycles, the blend

A **companion models each move; she does it for real** on her own cycle. Vicarious
learning (the companion carries the "not ready yet," so she never wears the shame) +
personal application. The companion is the warm narrator voice / the moon-soul.

The story is the **onboarding-to-mastery runway**, not a forever treadmill. After two
cycles she **graduates** into the evergreen loop (score refills each cycle, no story;
she has the skills and the proof).

### Cycle 1 — "Meet it"
She goes through a PMS window *with the tools for the first time.* The companion
models each move as it becomes relevant; she does it on her own day:
- a spike → notice + breathe
- a hard exchange → size it + the reframe
- the run-up → calcium / sleep, and the heads-up message
- if a fight lands → she learns, after the fact, that a heads-up would have helped

First time the score fills; first rings appear. Emotional beat: *"oh — this is
manageable."*

### Cycle 2 — "The difference"
Second pass. She anticipates it; the skills are rehearsed; she sends the heads-up
**proactively.** The payoff is the **contrast**, and the star is the relationship:
*"we didn't fight this month."* Proof-it-worked that isn't a number she has to trust —
it's a week she can feel. This is the single most retention-powerful moment in the app.

### Chapter rules
- **One topic per chapter**, spread across the two cycles. Never cram (a chapter that
  touches calcium + sleep + a fight + breathing is a lecture).
- **Chunked rewards:** each chapter closes satisfyingly (score ticks, a ring segment
  fills, a warm line). A hit every few days — never one payoff at 8 weeks out.
- Chapters **are** the one-a-day nodes. The story is the thread that connects them.

## Where it surfaces

- **Now card** (above the progress bar): `14 days to PMS` ↔ `Your readiness`. One
  number, timely. Honors "the only number surfaced is this cycle's prep."
- **Grow → PMS → readiness chip** is the entry to the guided session.
- **Last build days = today's action.** In the late build phase the prep surfaces as
  the day's one coached action (slots into the phase-action / today-action system,
  `src/lib/today-action.ts`).
- **One notification**, late build phase, capped (reuse the comeback-nudge plumbing,
  `setLastCombackNudgeSentAt` in `now.tsx`). Invite, don't accuse:
  *"Your PMS window's coming up. A few minutes now makes the week easier."*
  Not *"you're not prepped."*

## What she does after seeing the score

| Situation | Next action |
|---|---|
| Far out, low | one easy, high-yield thing; no urgency in copy |
| Close (last build days), low | the strongest-evidence item first; prioritize, don't dump |
| Already high, any time | **nothing** — "you're ready, rest." Permission to stop *is* the feature |
| PMS window arrives | score stops being a to-do → becomes the reassurance → hands off to Steady-yourself |

**At the window**, the arc closes:
- **High:** moon full / rings land — *"you did everything that helps."*
- **Any level:** hands straight to [Steady yourself](../../src/app/steady-yourself.tsx)
  for the live hard days. Even at 30% she isn't left with a bad number and nothing to
  do — she's caught by the in-the-moment tools.

## Engineer notes

- Extend `src/store/pms-readiness.ts` from a per-day binary checklist to a
  **per-cycle** readiness composite (mind skills rehearsed + body basics kept + us
  message sent), keyed by cycle, not calendar day. Keep the daily reset semantics for
  the body ticks; skills-rehearsed persist across the cycle.
- Reweighting: readiness = weighted sum over *applicable* tracks; drop the `us` track
  cleanly when no partner / opted out.
- Payoff via `recordLight` / moon fullness (`src/lib/moon-light.ts`) — no new currency.
- Reuse existing couples screens (they score themselves) for the `us` track.
- Story state: chapter cursor + per-chapter completion, one node surfaced per day
  through `today-action`.

## The stories (v1 content)

The onboarding runway is delivered as a serial: **Neha's life.** The story is just
a warm, relatable life story where you would never guess it is "about PMS." The
PMS lens surfaces only in the Q&A after the story. Voice: Californian, simple,
clear, a 30s woman. Obeys the DESIGN.md economy rule (cut any line that does not
earn its place).

### Chapter structure (locked)

Never interrupt the story with questions. Reflection always comes after.

1. **The story** — ~5 beats, read straight through, one faceless painterly scene
   per beat (see image recipe below).
2. **A moment to reflect** — 2 questions, warm, un-failable, a soft redirect on a
   wrong tap. **This is the only place PMS is named.**
3. **Build your own better-PMS kit** — a short list with exactly one wrong option.
   The chosen items become her checklist and tick the score. Some items are live
   (e.g. "take a breath in Niyora" opens the Steady-yourself breath).
4. **The payoff** — the rings fill: *"Nicely done. You're prepped for PMS. Come
   back here whenever you need a hand."* The last line links to Steady yourself.
5. **The hook** — *"Neha's story continues in a few days."*

### Story 1 · Neha moves across the world

**1.** Neha was moving across the world in a few days. New country, new job, new
everything. She'd wanted this forever. Now that it was actually happening, she was
equal parts thrilled and totally freaking out.

**2.** The night before her flight, she could not fall asleep. Her brain just kept
listing everything that could go wrong. What if it's lonely there. What if I mess
the whole thing up. At some point she caught herself. Okay, this is just fear
talking, she thought. And fear's a drama queen, it always assumes the worst. Then
she thought about the last big scary move she'd made. I went off to boarding
school and I turned out fine. Sure, I got bullied, had no friends for a while. But
look at me now. I'm so cool, flying off to a whole new country. Uncomfortable
isn't the same as bad.

**3.** The flight was the middle of the night, and the whole family came to see her
off. Neha was holding it together, because the second she cried, her mom would cry,
and then it'd be a whole production. Her mom tried to lighten things up. "Well, at
least now you get a place you actually like," she said, teasing about how Neha
always complained about her tiny room. Neha didn't find it funny. Her stomach felt
tight and off. "Momma, I wasn't always complaining. Why would you even say that."

**4.** She could tell that if she kept talking, it'd only get worse. So she stepped
away and wandered into the airport bookshop for something to read on the flight.
She grabbed a cozy romance. Of course I'm gonna sob when they get torn apart at the
end, she thought, buying it anyway. In all the rush she'd skipped lunch. (Her mom
had been after her all day to eat a banana. She hated bananas.) So she got some
nuts and a really nice coffee, found a seat in the café, and skimmed the back of
the book while she breathed, letting each breath out slow.

**5.** Twenty minutes later, she texted her mom. "Momma, I can only imagine how
hard it is to send your cool best friend off. And you're doing it so well. Of
course I'm painting the new room pink. And I fully expect to give you the house
tour. The travel plus the PMS have me feeling really weak, and I'm sorry I snapped.
I love you. I'm going to miss you so much." She walked back over. Her mom was
already crying. It was time to go. They hugged for a long time.

**Reflect (2 questions)**
- *Neha's brain wouldn't stop listing worst-case scenarios, and she couldn't
  sleep. What actually helped her drift off?* — forced herself to stop thinking ·
  **reminded herself of a real time she'd handled something hard ✓** · scrolled
  until she passed out.
- *Neha snapped at her mom over a sweet little joke, then felt off about it. Ever
  get days where everything feels ten times bigger than it should? For a lot of us
  that's the PMS window, the few days before your period when feelings get turned
  way up. It's real, and it's not you being dramatic. So when it hit, what helped
  Neha?* — kept arguing · **stepped away, took a breath, got some food in her ✓** ·
  bottled it up.

**Build your own better-PMS kit** (one wrong answer)
- Notice the feeling and how big it really is. If it's small, reframe it. If it's
  big, step away for twenty and take a breath in Niyora.
- Get some food in you
- Remember something hard you've already handled
- Give the people you love a heads-up that it's not them
- ~~Just push it down and tell yourself to stop being dramatic~~ (the wrong one;
  soft redirect: "that one usually backfires, pushing it down tends to come out
  sideways")

### Story 2 · The callback

**1.** A few months in, Neha was finding her feet. She'd crushed the first
interview for a job she really wanted, and they called her back for round two. She
was pumped.

**2.** The interview was in the morning, and of course she couldn't sleep. Her
brain went straight to the worst. What if I choke. What if the first one was a
fluke. She knew this spiral by now. Alright, drama queen, she thought, and pulled
up the receipts. I got the callback. They liked me enough to want a second look.
I've walked into harder rooms than this. She still didn't feel great, but she got a
few hours.

**3.** Morning of, all that prep and she still felt shaky. So she gave herself
twenty minutes. Coffee, a handful of nuts, a few slow breaths. Then she did
something new. She opened her notes and wrote down three things she'd actually
pulled off. The project she shipped. The team she led. The first interview she just
nailed. Reading it back, she felt herself land. Right. I'm good at this.

**4.** The room was cold. Not the temperature, the people. They weren't giving her
much, and she could feel herself working twice as hard for half the warmth. She
kept going anyway. Near the end, one of them tilted their head. "You don't seem as
confident as last time. Why's that?" It stung. She took a second. "Honestly, it's a
different room today, and I don't feel quite as at home in it yet. But I'm the same
person you called back."

**5.** She replayed that question the whole way home. When she walked in, her
husband could see it on her. "Hey. You'll get the next call," he said. And somehow
that was the thing that broke her. "That's a lot of pressure to put on me right
now. I would never do that to you." It came out sharp. He looked a little stung.
She went quiet and walked to the other room. A few minutes later she texted him
from ten feet away. "I'm sorry. That wasn't about you. I'm just fried and I need a
little space to reset. It's not you. I love you." She sat with herself for a while.
And somewhere in there, her phone buzzed. An email. Subject line: we'd love to have
you.

**Reflect (2 questions)**
- *The morning of, Neha felt her confidence sliding. What pulled her back?* — told
  herself to just calm down · **wrote down three real things she'd actually
  accomplished ✓** · read the job description again.
- *Neha snapped at her husband when he was only trying to help, then felt terrible.
  Those extra-raw days often line up with the PMS window, the stretch before your
  period when everything hits harder. It doesn't make you difficult, it just helps
  to know it's coming. What did Neha do that helped?* — insisted he'd upset her ·
  **took space, then owned it and told him it wasn't about him ✓** · pretended
  everything was fine.

### Image recipe (faceless painterly scenes)

Prepend this style block to every scene; use the negative prompt on each. Reuse one
`--sref` / fixed seed across a story so the moon and painting style stay identical.

```
STYLE: Soft stylized storybook illustration, digital painting, painterly and
matte, reduced detail, dreamy and calm, NOT photorealistic. Deep near-black indigo
palette (#0e0b14 to #070609 to black). A large smooth glowing moon in most scenes
(skipped where warmth serves better), a simple luminous pearl-white disc, faint
surface texture, soft halo, not a cratered moon. Cool moonlit whites and soft blues
(#e7e9ee, #a5b8d5, #8ca9d5) as the only light, faint rose (#ed93b1) in the shadows.
Painted soft shadows, gentle volumetric light, atmospheric depth, subtle grain.
Minimal, generous negative space, lower third in soft shadow with room for text.
No people, no faces, no figures, no text or letters. Vertical 9:16.
NEGATIVE: photorealistic, photograph, 3d render, realistic textures, cratered moon,
heavy clouds, people, faces, text, watermark, cluttered.
```

Story 1 scenes:
1. A bedroom corner, a half-packed open suitcase on the floor, a folded coat over a
   chair, soft piles of clothes, the moon glowing in the window above.
2. A quiet bedroom at night, a softly rumpled empty bed with one pillow and a
   folded blanket, a large moon through a paned window casting a gentle beam across
   the sheets.
3. A dim, nearly empty airport gate at night, rows of waiting-room seats, a single
   suitcase standing alone, a huge moon over the runway through the glass.
4. A small café table with a closed paperback, a little bowl of nuts, and a coffee
   with a wisp of steam, the moon reflected in the dark window behind.
5. (closing) The view from an airplane window at night. Beyond the curved window
   and a sliver of wing, a smooth glowing moon hangs over a soft sea of moonlit
   clouds, the last city lights scattered far below and fading. A faint warm cabin
   light catches the edge of the window frame. Quiet and hopeful.

Story 2 scenes:
1. A small new apartment at night, a couple of moving boxes still stacked in a
   corner, a laptop open on a desk, a mug beside it, the moon in the window.
2. A bed in a new apartment at night, sheets rumpled, a phone face-down on the
   nightstand, city lights and a large moon out the window.
3. A desk by a window in soft early light, an open notebook and a pen, a coffee and
   a small bowl of nuts, the pale moon fading into morning.
4. A quiet modern meeting room at dusk, one empty chair on the near side of a long
   table, a single glass of water, cool blue light, the moon in the floor-to-ceiling
   window. (The empty chair reads as the cold room without a face.)
5. (closing) A cozy couch corner late at night, a mug of tea, a soft lamp glow, a
   phone on the cushion lit with a message, warm light with the moon just visible in
   the window. Quiet and hopeful.

## Reward model (resolved 2026-07-15)

Replaces the permanent soul-ring tier system. Three signals, three jobs:

- **Moon colour = lifetime progression.** The more she practices (lifetime light),
  the deeper and richer her moon's colour. Permanent, never lost. The floor: her
  growth is always safe. (Re-point the existing moon-body colour evolution to
  lifetime light directly; retire the permanent ring tiers as the identity signal.)
- **Rings = cyclical preparedness.** Earned by completing Neha's story, all rings
  landing together. Lost and re-earned every cycle — the recurring reason to come
  back. A maintenance/regain loop beats a one-way lifetime counter.
- **Fullness = this cycle's engagement.** Fills if she opens the app and does
  anything, or goes through the story. No open → half moon. Resets each cycle.

**Guardrail (brand-critical).** Losable rings reintroduce the loss/streak pressure
the app deliberately removed. Keep it safe two ways: (1) frame the reset as the moon
naturally waning into a fresh cycle — *new month, new prep*, a hopeful invitation,
never *you lost your rings*; (2) permanent colour is the floor, so real growth is
never punished. Ring loss means *this month's readiness resets*, never *you failed*.

Supersedes [[moon-reward-system]]'s permanent-ring model. Engineering: re-point moon
colour to lifetime light, retire `src/models/tiers.ts` permanent ring tiers as the
identity signal, add per-cycle rings + fullness with a natural reset.

## Decisions (resolved 2026-07-15)

- **Reward model:** as above (colour = lifetime, rings = cyclical, fullness = engagement).
- **Scoring:** standard, generous baseline; no special per-track weighting.
- **Cadence:** one story per cycle. Ship two — Story 1 at install (the AHA moment),
  Story 2 as the first PMS prep. Fresh Neha chapter each month after. Front-load
  teaching in the first few; later chapters reinforce and keep her life going. Keep
  a 2–3 chapter backlog; quality over cadence (a skipped month beats a phoned-in one).

## Engineering plan — reward-model migration

Colour is **already aligned and shipped**: `bodyHue(lifetimeLight)` drives the moon
body and Now passes it live (`src/app/(tabs)/now.tsx:571`, `src/models/tiers.ts`).
Nothing to change there beyond letting colour own its lifetime→hue mapping once
rings depart.

The work is turning rings from permanent-lifetime into cyclical-losable:

1. **Per-cycle ring state.** New store (or extend `pms-readiness`): rings earned
   this cycle, keyed by cycle; set on Neha's-story completion (plus kit items);
   reset at cycle rollover. Replaces `tierRingCount(lifetimeLight)` as the ring
   source for the readiness moon.
2. **Decouple colour from the ring tiers.** Give the colour ladder its own
   lifetime-light → hue stops in `tiers.ts` so it no longer rides the departing
   ring thresholds; retire `TIER_RING_COUNTS` / the permanent-ring role once
   consumers move.
3. **Rework the celebration.** Today `earnedTierBetween(prev, next)` fires on a
   lifetime-light crossing. New: it fires on story completion (all rings land at
   once); cycle rollover plays a gentle **wane**, framed as a fresh cycle, never
   loss (the brand guardrail).
4. **Move consumers** off lifetime rings: `now.tsx`, `onboarding-v3`, `game-v3`,
   `moon-probe` (decide which render cyclical rings vs. static demos).
5. **Tests:** keep the colour tests (`tiers.test.ts`); add cyclical-ring + reset
   tests.

Feature-sized change to the shipped moon system — build it **with** the
preparedness feature, not as a standalone gut. Removing permanent rings before the
cyclical replacement exists would break the celebrations and several screens.

## Still open

- Neha's season arc (life-events → skills) as the monthly content pipeline.
