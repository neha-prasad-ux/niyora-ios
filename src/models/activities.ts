// The non-session activities that sit alongside the breath + mindfulness
// library. Unlike a `Technique`, these are NOT orb-guided timed sessions; they
// render as one of four lighter card types. v1 ships the data only -- there is
// no UI yet. The recommend layer will later normalise techniques + activities
// into a single card shape so they mix in the hero + shelves.
//
// Source of truth: docs/pms/niyora-pms-activities.md. Copy voice is the
// neutrally-warm casual friend (no em dashes).

// How a card behaves on tap.
//   nudge  -- suggestion + benefit, a "the science" expand, soft Done / I'll try
//   write  -- one calm text field with a gentle placeholder
//   read   -- a short passage holds on screen
//   action -- an editable pre-written message she can copy or send
export type CardType = 'nudge' | 'write' | 'read' | 'action';

// The five PMS current-state feelings. These ids match the FEELINGS catalogue
// in ./recommend.ts exactly, so an activity's `fits` can be cross-referenced
// against a chosen feeling.
export type PmsFeeling = 'irritable' | 'anxious' | 'low' | 'foggy' | 'overwhelmed';

// The activity's flavour. Drives grouping/labelling, distinct from cardType.
// 'breath' and 'mind' are reserved for when the existing Technique catalogue is
// normalised into this shape; no Activity below uses them.
export type Modality =
  | 'sensory'
  | 'movement'
  | 'nourish'
  | 'express'
  | 'read'
  | 'smallwin'
  | 'repair'
  | 'withdraw'
  | 'breath'
  | 'mind';

export type Activity = {
  id: string;
  title: string;
  modality: Modality;
  cardType: CardType;
  fits: readonly PmsFeeling[]; // drives match + shelf filtering
  timeSeconds: number; // 0 = instant or open-ended
  fast: boolean; // the spec's ⚡ -- under a minute, hero-eligible for "a minute"
  mode: 'active' | 'receptive'; // do-something vs let-it-work-on-you
  benefit: string; // the card line
  why: string; // the copy behind "the science"
  body?: string; // read: the passage that holds on screen
  template?: string; // action: the editable prefilled message
  placeholder?: string; // write: the field prompt
  activatesMode?: 'retreat'; // withdraw: toggles a system mode
};

// The 14 activities, in the spec's table order. `mode` is 'receptive' only for
// the things you let work on you (legs up the wall -- the one the spec flags --
// the two reads, and cave mode); everything else is something you actively do.
export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'cold-water',
    title: 'Cold water on your face',
    modality: 'sensory',
    cardType: 'nudge',
    fits: ['anxious', 'overwhelmed', 'irritable'],
    timeSeconds: 30,
    fast: true,
    mode: 'active',
    benefit: 'Resets your whole system in seconds.',
    why: 'Cold on your face trips a reflex that slows your heart and pulls you out of panic, fast.',
  },
  {
    id: 'make-something-warm',
    title: 'Make something warm',
    modality: 'sensory',
    cardType: 'nudge',
    fits: ['low', 'anxious'],
    timeSeconds: 120,
    fast: false,
    mode: 'active',
    benefit: 'Warmth your body reads as safe.',
    why: 'Hands wrapped around something warm signals calm to your nervous system.',
  },
  {
    id: 'slow-walk',
    title: 'A slow walk outside',
    modality: 'movement',
    cardType: 'nudge',
    fits: ['irritable', 'foggy', 'low'],
    timeSeconds: 300,
    fast: false,
    mode: 'active',
    benefit: 'Lets the tension burn off.',
    why: "Moving clears the stress chemistry you're holding, and daylight lifts the heavy.",
  },
  {
    id: 'legs-up-the-wall',
    title: 'Legs up the wall',
    modality: 'movement',
    cardType: 'nudge',
    fits: ['anxious', 'overwhelmed', 'foggy', 'low'],
    timeSeconds: 180,
    fast: false,
    mode: 'receptive',
    benefit: 'Calm without any effort.',
    why: 'Lie down, legs up, that\'s it. It flips you into rest mode while you do nothing.',
  },
  {
    id: 'childs-pose',
    title: "Curl into child's pose",
    modality: 'movement',
    cardType: 'nudge',
    fits: ['irritable', 'anxious'],
    timeSeconds: 120,
    fast: false,
    mode: 'active',
    benefit: 'Eases your back and your belly.',
    why: 'Folding forward softens cramps and quiets the body.',
  },
  {
    id: 'slow-stretches',
    title: 'A few slow stretches',
    modality: 'movement',
    cardType: 'nudge',
    fits: ['irritable', 'overwhelmed'],
    timeSeconds: 180,
    fast: false,
    mode: 'active',
    benefit: "Loosens what's clenched.",
    why: 'Gentle spine movement releases the tension that builds down your back and middle.',
  },
  {
    id: 'warm-to-eat',
    title: 'Make something warm to eat',
    modality: 'nourish',
    cardType: 'nudge',
    fits: ['low', 'foggy'],
    timeSeconds: 300,
    fast: false,
    mode: 'active',
    benefit: 'Steady energy instead of a crash.',
    why: 'Something warm and slow, like oats, keeps you even instead of spiking then dropping you.',
  },
  {
    id: 'get-it-out',
    title: 'Get it out of your head',
    modality: 'express',
    cardType: 'write',
    fits: ['overwhelmed', 'irritable', 'low'],
    timeSeconds: 0,
    fast: false,
    mode: 'active',
    benefit: "Lighter once it's on paper.",
    why: 'Naming what you feel takes some of its charge away.',
    placeholder: "Whatever's loudest right now. Put it here.",
  },
  {
    id: 'park-it',
    title: 'Park it for later',
    modality: 'express',
    cardType: 'write',
    fits: ['anxious', 'overwhelmed'],
    timeSeconds: 60,
    fast: false,
    mode: 'active',
    benefit: 'Set the worry down for now.',
    why: "Drop the thought here. Pick it back up after your period, when it'll feel smaller.",
    placeholder: 'The worry you\'re setting down.',
  },
  {
    id: 'gentle-read',
    title: 'A small, gentle read',
    modality: 'read',
    cardType: 'read',
    fits: ['low'],
    timeSeconds: 180,
    fast: false,
    mode: 'receptive',
    benefit: 'Somewhere soft to land.',
    why: 'Something tender meets you where you are.',
    body: "Today your body is doing something hard, and you're feeling the weight of it. That heaviness is real and physical, and it does lift. Until it does, slow is allowed.",
  },
  {
    id: 'something-light',
    title: 'Something light',
    modality: 'read',
    cardType: 'read',
    fits: ['foggy', 'irritable'],
    timeSeconds: 60,
    fast: false,
    mode: 'receptive',
    benefit: 'A small lift.',
    why: "A bit of lightness, for when you've got the room for it.",
    body: "Foggy and a little off, that's where you are right now. It has an end date you can count on. Nothing to push through today.",
  },
  {
    id: 'one-tiny-thing',
    title: 'One tiny thing',
    modality: 'smallwin',
    cardType: 'nudge',
    fits: ['overwhelmed', 'low'],
    timeSeconds: 120,
    fast: false,
    mode: 'active',
    benefit: 'Proof you can still move.',
    why: 'Pick one small thing and finish it. Control comes from doing something small, not everything.',
  },
  {
    id: 'bridge-back',
    title: 'A bridge back',
    modality: 'repair',
    cardType: 'action',
    fits: ['irritable'],
    timeSeconds: 60,
    fast: false,
    mode: 'active',
    benefit: 'Mend it in one message.',
    why: "Here's a soft text to send. A small repair shows a hard moment isn't the whole story.",
    template:
      "Hey, I was short with you earlier and I'm sorry. I'm having a rough day and it came out sideways. It wasn't about you.",
  },
  {
    id: 'cave-mode',
    title: 'Cave mode',
    modality: 'withdraw',
    cardType: 'nudge',
    fits: ['overwhelmed', 'irritable'],
    timeSeconds: 0,
    fast: false,
    mode: 'receptive',
    benefit: 'Permission to pull back.',
    why: 'Dims things down and quiets notifications. Pulling back today is care, not avoidance.',
    activatesMode: 'retreat',
  },
];

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}

// All activities that fit a given feeling, in catalogue order. This is the raw
// match set; hero selection and shelf ordering happen in the recommend layer.
export function activitiesForFeeling(feeling: PmsFeeling): readonly Activity[] {
  return ACTIVITIES.filter((a) => a.fits.includes(feeling));
}
