# Niyora — new activities spec (v1)

The non-session activities that sit alongside the existing breath + mindfulness library. These are NOT orb-guided timed sessions; they use 4 lighter card types. Voice: casual Californian-friend, affirmative, no em dashes (see [[project-content-voice]]). Pairs with the Understand content in `niyora-pms-understand-content.md`.

## The 4 card types (behavior on tap)

- **Nudge** — suggestion + benefit, a "the science" expand, and a soft *Done / I'll try*. Optional timer.
- **Write** — one calm text field with a gentle placeholder.
- **Read** — a short passage holds on screen (like the Understand cards).
- **Action** — an editable pre-written message she can copy or send.

## Activity inventory (15)

Feeling key: IRR irritable · ANX anxious · LOW low/tearful · FOG foggy · OVW overwhelmed. ⚡ = under a minute, hero-eligible.

| Modality | Title | Type | Fits | Time | Benefit / why |
|---|---|---|---|---|---|
| Sensory | Cold water on your face | nudge | ANX OVW IRR | ⚡ | Resets your whole system in seconds. *Cold on your face trips a reflex that slows your heart and pulls you out of panic, fast.* |
| Sensory | Make something warm | nudge | LOW ANX | 2m | Warmth your body reads as safe. *Hands wrapped around something warm signals calm to your nervous system.* |
| Sensory | Chant a low ommm | nudge | ANX OVW LOW | 2m | Hums your nervous system quiet. *A long humming exhale vibrates through the chest and triggers the vagus nerve into rest mode; fMRI also shows the ommm sound quiets the amygdala.* |
| Movement | A slow walk outside | nudge | IRR FOG LOW | 5–10m | Lets the tension burn off. *Moving clears the stress chemistry you're holding, and daylight lifts the heavy.* |
| Movement | Legs up the wall | nudge (receptive) | ANX OVW FOG LOW | 3m | Calm without any effort. *Lie down, legs up, that's it. It flips you into rest mode while you do nothing.* |
| Movement | Curl into child's pose | nudge | IRR ANX | 2m | Eases your back and your belly. *Folding forward softens cramps and quiets the body.* |
| Movement | A few slow stretches | nudge | IRR OVW | 3m | Loosens what's clenched. *Gentle spine movement releases the tension that builds down your back and middle.* |
| Nourish | Make something warm to eat | nudge | LOW FOG | 5m | Steady energy instead of a crash. *Something warm and slow, like oats, keeps you even instead of spiking then dropping you.* |
| Express | Get it out of your head | write | OVW IRR LOW | open | Lighter once it's on paper. *Naming what you feel takes some of its charge away.* |
| Express | Park it for later | write | ANX OVW | 1m | Set the worry down for now. *Drop the thought here. Pick it back up after your period, when it'll feel smaller.* |
| Read | A small, gentle read | read | LOW | 3m | Somewhere soft to land. *Something tender meets you where you are.* |
| Read | Something light | read | FOG IRR | 1m | A small lift. *A bit of lightness, for when you've got the room for it.* |
| Small win | One tiny thing | nudge | OVW LOW | 2m | Proof you can still move. *Pick one small thing and finish it. Control comes from doing something small, not everything.* |
| Repair | A bridge back | action | IRR (after a blowup) | 1m | Mend it in one message. *Here's a soft text to send. A small repair shows a hard moment isn't the whole story.* |
| Withdraw | Cave mode | nudge (toggles a mode) | OVW IRR | instant | Permission to pull back. *Dims things down and quiets notifications. Pulling back today is care, not avoidance.* |

Note: "Swap the next coffee" was cut (too restrictive/nagging, weak evidence). "Make something warm to eat" replaces the cravings card and drops the unverified serotonin claim.

## Data model (engineer)

A new `Activity` type alongside the existing session `Technique` (ios-v1/src/models/techniques.ts), both normalized to one `Card` shape so they mix in hero + shelves.

```ts
type CardType = 'nudge' | 'write' | 'read' | 'action';
type PmsFeeling = 'irritable' | 'anxious' | 'low' | 'foggy' | 'overwhelmed';
type Modality = 'sensory' | 'movement' | 'nourish' | 'express' | 'read' | 'smallwin' | 'repair' | 'withdraw' | 'breath' | 'mind';

type Activity = {
  id: string;
  title: string;
  modality: Modality;
  cardType: CardType;
  fits: PmsFeeling[];        // drives match + shelf filtering
  timeSeconds: number;       // 0 = instant
  fast: boolean;             // ⚡ hero-eligible for "a minute"
  mode: 'active' | 'receptive';
  benefit: string;           // card line
  why: string;               // behind "the science"
  body?: string;             // read: the passage
  template?: string;         // action: editable prefilled text
  placeholder?: string;      // write: field prompt
  activatesMode?: 'retreat'; // withdraw: toggles a system mode
};
```

The recommend layer (ios-v1/src/models/recommend.ts) draws from `[...techniques, ...activities]` normalized, picks the hero (top match for feeling + time, ⚡ when "a minute"), and groups the rest into the emotion-priority shelves. Implement via branch + PR per [[feedback-never-commit-to-main]].
