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
  body?: string; // read: the passage that holds on screen; action: the framing/tips above the message
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
    why: 'Cold on your face flips a built-in switch, the same reflex as splashing into cold water, that quickly slows your heart and pulls you out of a spiral.',
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
    why: 'Your brain reads physical warmth a lot like being held. Something warm in your hands nudges your nervous system from on-guard toward calm.',
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
    why: "Walking burns off the stress hormones that pool when you're tense, and daylight gives your mood a real, measurable lift.",
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
    why: 'Resting with your legs up tips you into rest mode with zero effort. Your heart rate eases and the held tension drains away.',
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
    why: "Folding forward gently presses your belly and opens your lower back, which softens cramps and tells your body it's safe to let go.",
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
    why: 'Slow stretching unwinds the muscle tension that quietly stacks up across your back and middle, so your body stops bracing.',
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
    why: 'A warm, slow meal keeps your blood sugar steady instead of spiking and crashing, and that crash is half of what makes the low feel so sharp.',
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
    why: 'Putting a feeling into words actually turns its volume down. Naming it hands some of the load from the reacting part of your brain to the calmer, thinking part.',
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
    why: 'Writing a worry down and setting it aside frees the mental space it was taking up. You can pick it back up later, when it will feel smaller.',
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
    body: "There is an old story about a man walking a beach at dawn after a storm. The sand was covered with thousands of starfish, washed up and stranded by the tide, drying in the early sun. Ahead of him a young girl was picking them up one at a time and gently setting them back into the sea. He watched her for a while, then called out that the beach ran for miles and there were thousands of them, she could not possibly make a difference. The girl bent down, picked up one more, and placed it carefully back in the water. She said, it made a difference to that one. Then she reached for the next, and kept going. The man stood there a moment longer, and then he bent down and started helping.",
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
    body: "A lion was asleep in the sun when a tiny mouse scurried across his paw and woke him. Quick as anything, the lion pinned her under one claw, ready to make a snack of such a small thing. The mouse squeaked out a plea, let me go, and one day I will repay the kindness. The lion laughed at the idea of a mouse ever helping a lion, but he was in a generous mood, so he lifted his paw and let her run off. Weeks later he blundered into a hunter's net and lay there roaring, tangled and stuck, all his strength useless against the ropes. The little mouse heard him from across the wood. She came running, found him, and set to work with her sharp teeth, gnawing through the cords one by one until the great lion stepped free. The smallest of them, it turned out, was the one who saved him.",
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
    why: 'Finishing one small thing gives your brain a genuine hit of done. A sense of control comes from doing something, not from doing everything.',
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
    why: "A small, honest repair matters more than the moment that needed it. It tells the other person the bond is still solid.",
    body: 'Had a fight while your body was already struggling to feel safe? First, give it some air. Step out of the room or move to a different space and let the heat drop. Most fights look smaller from the other side of ten minutes, so you do not have to sort it out right now. When you are ready, if you want to bridge it back, here is a soft message you can send.',
    template:
      "Hey, I was short with you earlier and I'm sorry. Today has been a rough one and it came out sideways at you. It wasn't really about you, and I didn't like how I left things. Shall we talk it through in a bit, maybe after an hour?",
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
    why: 'Lowering the noise gives your overloaded system fewer things to react to, so it can finally settle. Choosing it is care, not avoidance.',
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
