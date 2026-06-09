# DESIGN.md (iOS)

The visual, interaction, and tonal language for the Niyora iOS app. This document is for designers, contributors, and AI agents making changes to the app's surface.

## Brand promise

> Calm in 60 seconds. Privacy-first. Nothing leaves your iPhone.

Three claims, in this order:
1. The product is fast, small, and finishes in a minute.
2. The product respects you.
3. The product earns trust through architecture, not promises.

Every interaction decision should reinforce at least one of these. If a change doesn't, it probably shouldn't ship.

## Voice and copy

- **Quiet, not chirpy.** No exclamation points. No "Yay!" or "Great job!"
- **Direct, not preachy.** State what's happening. Trust the user.
- **No motivational mantras.** "You've got this!" is out.
- **No em dashes.** Use periods, commas, or middle dots (`·`).
- **No emojis** in body copy or notifications. The visuals are the cue.
- **Second person or impersonal voice.** The founder's first-person voice is reserved for the marketing site.

## The core experience

The user has a stressful moment. They open Niyora and are calmer 60 seconds later.

### The one-minute session

1. Tap app icon (or tap a Niyora notification) · home screen appears
2. Home screen shows one technique pick + Begin
3. Tap Begin · 60 seconds of breathing visual + audio cue
4. Optional post-session mood check (single tap)
5. Back to the home screen

If any step takes more than a few seconds of friction, it's broken. The user shouldn't have to think.

## Navigation model

- The app is **tab-less in v1**. The home screen IS the pre-session info screen.
- My Soul opens via the person icon in the top-left of the home screen (as a sheet, not a push).
- The session screen is a `.fullScreenCover` over the home screen.
- All other screens dismiss back to the home screen, never to a nested stack.

## The five Soul tiers

Practice history unlocks more advanced techniques and shifts the visual identity of the My Soul screen.

| Tier       | Hue (HSL)          | Sat | Feeling                          |
|------------|-------------------:|----:|----------------------------------|
| Spark      | ~30 (warm orange)  | 70% | First flame, beginner energy     |
| Glow       | ~335 (rose)        | 70% | Settled, regular practice        |
| Shine      | ~280 (violet)      | 65% | Confidence, deeper work          |
| Radiance   | ~230 (deep blue)   | 65% | Steady, embodied                 |
| Brilliance | ~210 (cool blue)   | 60% | Quiet mastery                    |

Tier progression is based on practice history (frequency + recency), not technique difficulty.

The **default home orb** (no measured stress, no progression) uses the "calm" palette below, NOT the user's current tier hue. The tier hue tints My Soul; the home orb stays pearly white-blue.

## Breathing techniques

Seven pranayama practices. Each has a unique particle personality on the session screen:

- **Box Breath** · square cadence, even · soft white-blue particles in even drift
- **Ocean Breath (Ujjayi)** · wave-like fall and rise · deeper teal-blue, horizontal wave drift
- **Cooling Breath (Sheetali)** · cool palette · pale icy blue particles, slow snowfall
- **Alternate Nostril (Naadishodhana)** · left/right alternation · two streams (warm + cool) swapping with breath
- **Left Nostril** · single-side breath, deeper hue · warm single stream from the left
- **Belly Breath (Diaphragmatic)** · slow, grounded · warm amber, slow upward drift like embers
- **Wind Down (4-7-8)** · extended exhale, dimming visual · lavender, fading out as session ends

## Mindfulness practices

Seven non-breathing moments grounded in CBT, self-compassion, and grounding research:

- Be Kind to Yourself (self-compassion · Neff 2003)
- Let It Drift (CBT thought defusion)
- Bring Someone to Mind (gratitude)
- Hold Yourself (somatic)
- Kind Words (affirmation)
- Five Senses (5-4-3-2-1 grounding)
- Soft Gaze (Trataka · Talwadkar 2014)

Every practice has a citation behind it. No mystic claims.

Mindfulness sessions use minimal particles · soft white pinpricks, very sparse, just enough to feel alive without distracting.

## Visual language

### Background

App background is a linear gradient, near-black with a faint indigo cast:

```
top:    hsl(250, 30%, 6%)
middle: hsl(260, 20%, 3%)
bottom: black
```

The gradient extends edge-to-edge (`.ignoresSafeArea()` on the background only · content respects safe area).

### The orb

The home and session orbs are 3D-shaded spheres. Default ("calm") gradient stops:

```
highlight: white at 97% opacity, anchored at 35%, 30%
mid:       hsl(220, 25%, 92%) at 95% opacity
edge:      hsl(220, 40%, 72%) at 90% opacity
glow halo: hsl(220, 55%, 75%) at 50% opacity, blurred, 1.15× the sphere
```

Additional depth:
- Upper-left crescent highlight at 28%, 22% (white fade to transparent at 42%)
- Inset darkening toward bottom-right
- Drop shadow below for atmospheric weight

Sphere diameter: 200-240pt on iPhone. Hero size on Pro models, scales down only on SE.

### The Begin button

Single primary action, anchored to bottom safe area.

```
background: linear-gradient(135deg, hsl(270, 50%, 45%), hsl(280, 40%, 35%))
border:     1px solid hsl(270, 40%, 55%) at 30% opacity
shadow:     soft purple glow below + thin inner top highlight
text:       white at 95% opacity, "BEGIN", uppercase, letter-spacing 2pt
font:       Poppins-Medium 15pt
padding:    14pt vertical, full width minus 24pt horizontal
corner:     26pt continuous
```

On tap: scale to 0.97 + opacity 0.92 over 150ms (press feedback), soft haptic, then transition to session screen.

### Color use

- Tier colors come from the user's progression, not arbitrary accent choices.
- The home orb stays calm-blue regardless of tier (tier color shows on My Soul instead).
- Errors and warnings, when needed, use soft variants of red/amber.
- Body text contrast ≥ 7:1.

### Typography

- **Poppins** is the canonical typeface across all screens (loaded via expo-font at app start).
  - Light (300) for taglines, subtitles, and secondary actions.
  - Medium (500) for chrome labels and the BEGIN button.
  - SemiBold (600) for technique names and other emphasis.
- Line-height: 1.6 body, 1.2 headings.
- No display fonts, no script fonts.

Specific home-screen sizes:

```
NIYORA wordmark         13pt, weight 500, letter-spacing 3pt, UPPERCASE, white@70%
Tagline                 11pt, weight 300, white@40%
Technique name          22-24pt, weight 600, letter-spacing 0.3pt, white@95%
Subtitle                13pt, weight 300, white@55%, middle dot separator
Try a different one     13pt, weight 300, white@60%
BEGIN                   15pt, weight 500, letter-spacing 2pt, UPPERCASE, white@95%
```

### Motion

- Breath cycles dictate animation cadence. Easing should feel like an inhale, not a bounce.
- The home orb pulses 5.5s ease-in-out, normalised to ~6px absolute radius change (scale ≈1.055 at 220px, ≈1.11 at 110px), repeats forever.
- The session orb pulses on the technique's specific breath rhythm (Box = 4-4-4-4, 4-7-8 = 4-7-8, etc.).
- `accessibilityReduceMotion` must be respected throughout. Disable orb pulse, freeze particles, replace particle field with a static soft radial vignette.
- No single animation should outlast ~7 seconds.
- Sheets and full-screen covers use the default iOS slide-up. Never a hard pop-in.

### Particles

Particles are atmospheric, never decorative. They are the per-technique visual personality.

- **No particles on the home screen.** The orb is the only motion.
- **Session screen:** drift behind the orb at low density (30-50 alive at a time).
  - Color is the technique's personality (see Breathing techniques above).
  - Speed up gently on inhale, slow on exhale.
  - Size 2-6pt, randomised. Opacity 0.5-0.9, randomised.
  - Fade in over the first 2s of the session, fade out over the last 2s.
- **Begin button micro-shimmer (optional):** 4-6 lavender sparks emit from the button center on tap, fade out over 1.4s.

What particles must never do:
- Spell words or shapes. They are weather, not graphics.
- Move erratically. The session is meant to slow the user, not animate at them.
- Stack into bright clusters that pull focus from the orb or instruction text.

Performance: Metal-backed Canvas or CADisplayLink. Cap at 60fps on Pro models, 30fps on SE. Pause particles the moment the app backgrounds.

## Layout
Keep it responsive and fitting all the mobile, the CTA Begin sits below for the fingers to interact. Go through iOS best practices for making an app.
### Orientation

Portrait only. Lock in `Info.plist` with `UISupportedInterfaceOrientations` = portrait. The session orb design assumes vertical centering on a tall screen.

### Color scheme

Dark mode only. Force `.preferredColorScheme(.dark)` at the root. The brand is dark; we do not maintain a light theme.

### Home screen anatomy (top to bottom, all horizontally centered)

```
┌─────────────────────────────────────┐
│ ▣ status bar (system)               │
├─────────────────────────────────────┤
│ [person]   ⊙ NIYORA      [speaker] │  ← header, flush top
│         Calm in 60 seconds           │
│                                      │
│              [ ORB ]                 │  ← hero, ~210pt
│                                      │
│           Box Breath                 │
│       calms under pressure · 65s     │
│                                      │
│         Try a different one          │
│                                      │
│         ┌──────────────────┐         │
│         │      BEGIN       │         │  ← anchored bottom
│         └──────────────────┘         │

└─────────────────────────────────────┘
```

## Interaction grammar

- **One primary action per screen.** Either BEGIN, Done, or a close icon. Never two equal-weight buttons.
- **Tap "Try a different one"** to rotate through unlocked techniques.
- **Tap the speaker icon** to toggle the audio cue mute. Icon updates immediately. Selection haptic.
- **Tap the person icon** to open My Soul. Selection haptic.
- **Tap BEGIN** to enter the session. Soft impact haptic.
- **Swipe down to dismiss** sheets and full-screen covers (iOS default).
- **No carousel, no modal stack, no multi-step wizard** outside onboarding.

Haptic feedback uses the standard generators:
- `UISelectionFeedbackGenerator` for icon toggles and rotates
- `UIImpactFeedbackGenerator(.soft)` for the primary BEGIN tap
- Success feedback for session completion

## Notifications

Smart reminders run during work hours (9am–6pm, configurable in onboarding).

- Use `UNUserNotificationCenter`. Request permission once, on first launch, with a clear "why" copy.
- Notifications have one action: "Breathe now" (deep-links to the home screen, pre-loaded with the technique most fitting the time of day).
- iOS doesn't show inline action buttons on the banner by default · the action appears on long-press. That's fine for v1.
- The app must NEVER nag. If a notification is dismissed, the next one is computed gently, not aggressively.

## Onboarding

A six-beat narrative flow on first launch, built around a single orb that stays
mounted the whole way and transforms per step. This deliberately replaces the
earlier "single minimal screen" spec: the orb, the privacy promise, and the
first real breath are the product's whole pitch, and a fast-forgettable splash
threw that away. The flow earns the same trust the architecture does by letting
the user feel it once. The minimalist principles below still hold inside it
(asks little, no accounts, sensible defaults, one primary action per screen).

Beats, in order:
1. **Welcome** · calm orb, "Calm in 60 seconds." / "Nothing leaves your phone."
2. **Privacy** · the hero moment. No account. No data leaves your phone. No wearables.
3. **First breath** · the orb becomes the session orb and runs one short guided
   cycle (~20s, exhale longer than inhale, with a dramatic swell, big on inhale,
   small on exhale). Then a rotating, verified science fact rewards the breath
   just taken (see `src/lib/onboarding-facts.ts`).
4. **My Soul** · the orb holds still and accumulates rings one by one, each in
   its own tier colour (rose, violet, blue, cool blue) and staying as the next
   joins, to show the soul growing with practice. "This is your Soul. It grows
   every time you practice."
5. **Reminders** · a nightly wind-down framing ("Slow breathing makes falling
   asleep feel easier"), bedtime presets (9 / 10 / 11pm), then the notification
   permission prompt. Reuses the daily-reminder infra. This is the last beat in
   v1, so finishing it (or "Not now") completes onboarding and routes home.

A sixth **Mac** beat (cross-device sync placeholder) is built but hidden behind
`MAC_STEP_ENABLED` in `onboarding.tsx`, since sync isn't shipping in v1. Flip
the flag to restore it as the final beat once Mac sync lands.

Rules:
- Shows once (gated on `niyora:onboarding-complete`), before the home first-run state.
- **Skip** (top-right) finishes immediately from any step. Replayable later from My Soul.
- **Back** chevron (top-left) on every beat after the first.
- No account creation. No email collection. No "share with a friend" CTA.
- `reduceMotion` respected throughout (orb pulse off, breath becomes a static cue).


## App icon

- Round-square iOS icon mask, dark indigo background, single pearly orb centered. No text in the icon.
- Light and dark variants both lean dark (we are a dark-mode product).



If a future PR proposes one of these, it should justify it against this list, not just say "users would like it."
