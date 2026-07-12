# Moon & light — reward spec

The moon on Now is the whole reward system. One currency (light), two axes on
the moon: **brightness** (bright by default — dimmed only by fading lessons)
and **material** (lifetime mastery — moonstone → gold → opal → diamond, never
lost). Rings stay the first-order daily reward, unchanged from
today-action-spec. Companion to the IA rework (Now / Grow / You).

## Principles (locked)

1. **Bright by default.** Everyone's moon is bright, always. Absence never
   dims it — continuous decay proved forgettable and unmeasurable. Progression
   lives in the discrete, countable layers: rings, material, the shelf.
2. **Only fading knowledge dims.** The one thing that dims the moon is a
   lesson fading — a recall left past its grace ("not knowing answers"). One
   step per fading lesson, restored the instant she refreshes, floored at
   clearly-lit (0.4): a dim moon is an invitation, never a punishment.
3. **Nothing earned is ever lost.** Rings, material, and Lived skills only go
   up.
4. **Honesty is never penalized and never gamed.** Self-ratings change copy,
   not light. Rough moments themselves earn nothing; the skill used in one
   does.
5. **Copy never says "lost" or "failed".** A dim moon reads "the pause move is
   fading — 30s refresh", never "you forgot".
6. **Rewards celebrate, they never gate care.** Every technique, session, and
   level is always available to everyone. Nothing in this system unlocks
   content — a locked calming tool is the one thing this app must never have.

## Contract

```ts
// src/lib/moon-light.ts (pure, unit-tested like lib/today-action)

export type LightEvent = {
  date: string;               // YYYY-MM-DD local
  kind: 'visit' | 'calm' | 'train' | 'recall' | 'notice' | 'apply';
  amount: number;             // computed at append time, immutable after
  refId?: string;             // levelId / skillId / sessionId
  matchedAction?: boolean;    // was this the coached action that day
};

export type MoonState = {
  fullness: number;           // brightness, 0.4 … 1.0 — bright by default
  material: 'moonstone' | 'gold' | 'opal' | 'diamond';
  facets: number;             // post-diamond: kept cycles, cosmetic only
};

// Both derivable by folding the ledger; store caches the fold.
export function earnLight(input: {
  kind: LightEvent['kind'];
  todaysEvents: LightEvent[];        // for caps + diminishing repeats
  matchedAction: boolean;
}): number;

// Recalls left past their grace (dueRecalls + FADE_GRACE_DAYS slack).
export function fadingRecalls(events: LightEvent[], todayYmd: string): DueRecall[];

// 1 − 0.15 per fading lesson, clamped to [0.4, 1]. Recomputed on every earn.
export function moonBrightness(fadingCount: number): number;

export function deriveMaterial(input: {
  lifetimeLight: number;
  cyclesKept: number;                // from cycle mints, below
  skillsSolid: number;               // recall passed at 2d AND 7d
  skillsLived: number;               // applied in real life ≥1
  recognitions: number;              // notice events
}): MoonState['material'];           // monotonic: never returns a lower tier
```

## Earning light

| Act | Light | Rules |
|---|---|---|
| visit — first open of the day | 5 | once per day; a comeback is met warmly (copy + the mote), never by a dimmer moon |
| calming session | 15 | 2nd session same day 5, 3rd+ 0 — session still logged and acknowledged warmly; only light caps, never welcome |
| training level complete | 20 | per level id, first completion only |
| recall passed ("remember") | 25 | scheduled 2d and 7d after level completion; a miss re-offers tomorrow, no penalty, no light for the retry gap |
| recognized a symptom / pattern ("notice") | 30 | a noticing log entry, or naming the pattern inside a Rough moment session |
| applied a skill in life ("apply") | 40 | self-report with self-rating; **rating never changes the amount** — reflecting is the rewarded act |
| coached-action match | ×1.5 | applied to the one act that matches today's `TodayAction` (round up). This is how "train in luteal/ovulation, checklist in the window" earns more without separate rules |

Daily cap: 100 light. Binge days can't substitute for rhythm — material gates
require behaviors spread across cycles anyway.

Why this gradient: it mirrors depth of change. Showing up < doing < learning <
remembering < seeing it in your own life < changing the moment. The two
highest earners (notice, apply) are the two the app exists for.

## Rings (unchanged)

The ring closes per today-action-spec's completion table. Light is parallel:
the ring answers "did I do today's right thing", light answers "how much of my
life met the app today". No act closes the ring unless it is the coached ask;
extra acts still earn light.

## Brightness — bright by default

Everyone's moon is fully bright. The earlier wax/wane-by-engagement design was
dropped deliberately: continuous ±0.08 changes are invisible, forgettable, and
unmeasurable — they neither reward nor teach. Discrete layers (rings, material,
shelf, skill states) carry all progression; brightness carries one meaning
only: **is her learning alive?**

| Condition | Brightness |
|---|---|
| default — including any amount of absence | 1.0, full and bright |
| per fading lesson (a recall left ≥3 days past due) | −0.15 |
| floor | 0.4 — clearly lit; never a dark sky, never a punishment |
| the recall is answered | restored instantly |

- Recomputed from the ledger on every `recordLight` (so the first open of a
  day, and every recall answered, refreshes it).
- Copy names the fix, not the fault: "The pause move is fading — 30s refresh."
- **Feature-gated** (`RECALL_FADING` in config/features, OFF): dimming must not
  ship before the recall quiz UI does, or moons would dim with no way to
  brighten them.
- The daily ring, the mote of light, and the tab-bar moon pulse remain the
  live per-day feedback; the shelf's minted fullness (per-cycle engagement
  record) is a separate, historical axis and is unaffected.

## Rings — the first two weeks (chapter one)

The material ladder is cycle-paced, which is exactly wrong for day three of a
new user's life. Rings are the early game: every act visibly advances the ring
band, so the fragile first days always have something growing. Same light as
everything else — no parallel currency.

| Ring | Lifetime light | Typical day (~50 light/day) |
|---|---|---|
| Spark | 20 | day one — a visit plus one act always rings |
| Glow | 100 | ~day 3 |
| Shine | 300 | ~week one |
| Radiance | 600 | ~week two |

- **The fourth ring fuses the band into the soul halo** — one ceremony — and
  only then is the material story revealed ("your moon is moonstone; it can
  become gold"). The ladder stays hidden while it would feel hopelessly far,
  and becomes the visible goal exactly when the rings run out.
- **No dead zone:** Radiance (600) sits just under the gold gate (800), so the
  light she already has immediately counts toward the next chapter.
- **Rings are permanent** — never waned, never lost — and gate nothing
  (principle 6). The names and Saturn-band visuals (ring counts, hues, the
  celebration) carry over unchanged from the original Soul tiers; the logic
  underneath (`models/tiers.ts`) is rewritten onto lifetime light so training
  and noticing advance the band too. The session-count logic is removed;
  `recordLight` reports each ring crossing for the celebration.
- **Grandfather clause:** a user with session history but an empty ledger gets
  her sessions seeded as light once (a calm's worth each, capped at Radiance),
  dated yesterday so it neither eats the daily cap nor fires a celebration for
  rings she already had. Earned rings stand.
- **Week-one messaging** rides this chapter as invitations, never threats:
  "Your second ring is one calm away." Rings cannot be missed or lost; the
  only same-day urgency in the app is today's coached ring.
- Visual disambiguation: the daily ring is the arc hugging the moon; the
  collectible band is the Saturn band around it, collapsing to a single halo
  after graduation.

## Material — the lifetime ladder

Monotonic. Checked after every ledger append; tier-up gets a small ceremony
(and is echoed at the next cycle mint).

| Material | Requires (all of) | Intent |
|---|---|---|
| moonstone | — | everyone starts here; it's already pretty |
| gold | 800 lifetime light · 1 cycle kept | ~one engaged cycle: consistency |
| opal | 2,500 light · 3 skills Solid · 5 recognitions | learning is sticking and she sees it in her life |
| diamond | 6,000 light · 3 cycles kept · 3 skills Lived · 10 applications | the app worked: skills live outside it |

- **Depth gates, not volume gates.** Light alone can never reach opal or
  diamond — grinding calm sessions won't do it. The gates are the behaviors
  that mean real change.
- **Skill states** (Grow tab): Learned = level complete → Solid = both recalls
  passed → Lived = ≥1 apply event for that skill. Lived never decays.
- **After diamond:** the daily loop never ends (the ring, the motes, the
  shelf), and each further kept cycle adds a **facet** — a subtle sparkle,
  purely collector, no mechanics. Diamond is the last *name*, not the last
  *reward*.

Pacing sanity: a typical engaged day earns ~50 (visit 5 + matched train 30 +
calm 15). Gold lands inside the first kept cycle; opal around cycle 2–3;
diamond around cycle 4–6. Diamond ≈ the 5-month retention mark, which is the
point.

## Cycle mint (bridge to the shelf)

At period confirmation (the existing `checkin`), the cycle mints a shelf moon:

- **fullness** = share of *key days* engaged (window + prep days weighted 2×,
  open days 1×; "engaged" = any light earned that day)
- **clarity** = the remission answer (yes / soft / no → clear / soft / hazy)
- **material** = current tier at mint (so the shelf shows the ladder climbing)
- **cycle kept** = minted fullness ≥ 0.6 — feeds `cyclesKept` for material

## Anti-gaming and kindness rules

- Self-rating on apply events changes the response copy only, never light.
- No light for opening a Rough moment; light for the skill used inside it
  (an `apply` event) or the pattern named (a `notice` event).
- Diminishing repeats on calm (above); `train`/`recall` are naturally
  once-per-id; `notice`/`apply` capped at 2/day each.
- Decay never runs during `period` phase; the return moment always fires
  before any ask.
- Never render an empty moon; never lower a material; never show a minus sign
  anywhere in the UI.

## New surface area (v1)

1. `src/lib/moon-light.ts` — `earnLight`, `moonBrightness`/`fadingRecalls`, `deriveMaterial` + tests.
2. `src/store/light-ledger.ts` — append-only `LightEvent[]` (lifetime totals
   fold from it; cache the fold).
3. `src/store/moon-state.ts` — cached `MoonState` + `lastEarnedDate`.
4. Recall scheduler — derive due recalls from `training-v3` completion dates
   (pure); answered recalls append to the ledger as `recall`.
5. Noticing log + apply log — new `checkin-history` entry kinds (`notice`,
   `apply {skillId, selfRating}`), also appended as ledger events.
6. Moon rendering: fullness drives the existing Now-tab moon's lit share;
   material drives its palette (moonstone silver → gold → opal → diamond).

Everything else (ring, selector, session/training stores) is read, not changed.
