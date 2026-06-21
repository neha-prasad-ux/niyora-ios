# Niyora — PMS flow spec (v1)

The reconciled screen-by-screen flow. Builds on the existing code (`ios-v1/src/app/index.tsx`, `RecommendSheet.tsx`, `recommend.ts`, `session.tsx`, `PostSessionMood.tsx`) and obeys `ios-v1/DESIGN.md`. Pairs with `niyora-pms-understand-content.md` (the Understand cards) and `niyora-pms-activities.md` (the 14 new activities).

## Governing principles (from DESIGN.md)

- "Calm in 60 seconds." Every gate before relief sheds users. Minimize them.
- One primary action per screen. No multi-step wizard, no swiping carousel.
- Motion is an inhale, not a bounce. The orb is the through-line.
- Voice: quiet, affirmative, no em dashes, no mantras. Neutrally warm ([[project-content-voice]]).

## The flow (two gates, then relief)

```
Home (Soul)  →  Q1 feel  →  Q2 what you need (pre-filled)  →  Result (hero + small cards, time toggle)  →  Activity  →  Delta + closure
```

### 1. Home (Soul)
The orb, present and pulsing, plus one card with one primary action. (Existing: returning-user "made for you" card + Begin, `index.tsx`.)
- PMS copy: speak to the moment ("Feeling off today? Start here") over the generic "shaped by your stress."
- One tap in. Add nothing else here.

### 2. Q1 — "How do you feel?"
Chips, one tap, auto-advance (existing `RecommendSheet`). Relabel the 7 generic feelings to the 5 PMS feelings: **irritable · anxious · low · foggy · overwhelmed.**
- **Orb on the card:** the soul sits at the top-center edge of the card and shifts color + warmth the instant she taps a feeling. This is the mirror mechanic and what makes the chips feel alive. Slow, breath-paced, never bouncy.

### 3. Q2 — "What do you need?"
Outcome chips: **settle · cool off · lift · rest · let it out.** This is the emotion-regulation direction (the target isn't always "calm", foggy wants to lift, wired-at-night wants rest).
- **Pre-filled from Q1** so it's barely a gate: anxious→settle, irritable→cool off, low→lift, foggy→lift, overwhelmed→settle. The default is already lit; she taps through, or changes it in one tap.
- Orb keeps reacting (warms for lift, cools for settle, etc.).

### 4. Result — hero + small cards
- **Hero:** one big recommended card, the obvious one-tap path (this IS the 60-second route, fully on-brand). Picked from `(feeling, need, time)`.
- **Small cards below:** the rest, as a **calm vertical scroll** (not a swiping carousel, per DESIGN.md). Filtered + ordered by the emotion/need priority.
- **Time lives here, not as a third question:** default to a quick option; a "got longer?" toggle reveals longer activities. Folding time in keeps the question gates at two.

### 5. The activity (richer components, not just particles)
Different activity types get their own calm component, not the particle field:
- **Guided session** (existing breath + mindfulness) → the orb session, particles as the per-technique personality.
- **Write** (thoughts, park-it) → a soft writing surface.
- **Read** (story, Understand cards) → a quiet reading layout.
- **Checklist / confirm** ("I walked") → one satisfying check, no particles.
- **Capture** ("go outside, look up, photograph the sky") → camera capture that lifts her gaze and gives a gentle real proof. Stays on device, never uploaded (privacy moat). Never required.
- Rule: different shapes, same soul. Each stays dark, calm, unhurried. Not a grab-bag of mini-games.
- **Orb mirror-then-lead** earns its keep during guided sessions: starts dim/heavy, settles and warms across the minute.

### 6. Delta + closure (not an auto-loop)
- After the activity, "how do you feel?" (existing single-tap `PostSessionMood`), then show the **delta plainly**: "you came in heavy, you're a little lighter." Her own body is the reinforcement, better than a streak.
- **End on completion.** A calm "you did that," then ONE quiet optional "want one more?", never an automatic next card pushed at her. Closure is what makes her trust it next time and come back. ("Calm in 60 seconds, then done", not a chore loop.)

## Data / code touch points

- `recommend.ts`: signature becomes `recommend(feeling, need, minutes)`. FEELINGS relabeled to the 5 PMS feelings; add the `need` axis (outcome) and a feeling→need default map. Returns a **hero + emotion/need-ordered shelves** drawn from `[...techniques, ...activities]` normalized to one Card shape (see `niyora-pms-activities.md` data model).
- `RecommendSheet.tsx`: 2 steps stay (feel, need); add the orb at the card's top edge reacting to taps; drop a separate time step (time moves to the result page).
- New screens/components: result page (hero + scroll), write surface, reading layout, checklist/confirm, capture. New `Activity` type alongside `Technique`.
- New orb behavior: mirror-then-lead (state-reactive dim→settle→warm).
- All via branch + PR, green CI ([[feedback-never-commit-to-main]]). Doesn't block the in-flight launch; PMS is the next chapter ([[project-ios-launch-inprogress]]).

## Open / next
- Feeling → visual signature map (color temperature + motion + orb state per feeling).
- `serves`/outcome tagging on activities so `need` can re-rank them.
- Shelf-preview teaser lines (the one line each small card shows).
