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
  how?: string; // nudge: the "what to do" step shown on the tap-in screen
  body?: string; // read: the passage that holds on screen; action: the framing/tips above the message
  template?: string; // action: the editable prefilled message
  placeholder?: string; // write: the field prompt
  activatesMode?: 'retreat'; // withdraw: toggles a system mode
};

// The 15 activities, in the spec's table order. `mode` is 'receptive' only for
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
    how: 'Run the tap cold, cup it in your hands, and press it to your cheeks and under your eyes for a few slow breaths.',
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
    how: 'Put the kettle on, make a tea or cocoa, and wrap both hands around the mug before you drink it.',
    why: 'Your brain reads physical warmth a lot like being held. Something warm in your hands nudges your nervous system from on-guard toward calm.',
  },
  {
    id: 'om-chant',
    title: 'Chant a low ommm',
    modality: 'sensory',
    cardType: 'nudge',
    fits: ['anxious', 'overwhelmed', 'low'],
    timeSeconds: 120,
    fast: false,
    mode: 'active',
    benefit: 'Hums your nervous system quiet.',
    how: 'Breathe in slow through your nose, then chant a long, low ommm on the way out, letting the mmm trail until your breath runs out. Five or six rounds, feeling the buzz in your chest and face.',
    why: 'A long, humming out-breath stretches your exhale and vibrates through your throat and chest, which switches on the vagus nerve and tips you toward rest. Brain scans show the ommm sound also quiets the amygdala, the part of the brain that runs your stress response.',
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
    how: 'Head outside and walk slow, no destination. Let your eyes wander and your shoulders drop.',
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
    how: 'Lie on your back, scoot your hips to a wall, and rest your legs up it. Let your arms fall open and breathe.',
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
    how: 'Kneel, sink your hips back to your heels, and fold forward, forehead down, arms long. Let your belly go soft.',
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
    how: 'Reach your arms up, then fold gently side to side and forward. Slow, no pushing, follow whatever feels tight.',
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
    how: 'Make something warm and simple, oats or soup, and eat it slow somewhere comfy with your phone face down.',
    why: 'A warm, slow meal keeps your blood sugar steady instead of spiking and crashing, and that crash is half of what makes the low feel so sharp.',
  },
  {
    id: 'get-it-out',
    title: 'Get it all out on paper',
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
    title: 'Park the worry for now',
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
    title: 'Read something comforting',
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
    title: 'Read something easy',
    modality: 'read',
    cardType: 'read',
    fits: ['foggy', 'irritable'],
    timeSeconds: 60,
    fast: false,
    mode: 'receptive',
    benefit: 'A small lift.',
    why: "A bit of lightness, for when you've got the room for it.",
    body: "Three tired travellers came to a village at the end of a long road, hungry and with nothing to eat. The villagers had food, but it had been a hard year, and one by one they shut their doors. So the travellers built a small fire in the square, filled a big pot with water, and dropped in a single smooth stone. A curious child wandered over and asked what they were making. Stone soup, they said, the most delicious soup in the world, though it is even better with a carrot or two. The child ran home and came back with a handful of carrots. An old woman passing by offered an onion she could spare. Someone brought a few potatoes, another a bunch of herbs, a little salt, a knuckle of bone. Each person gave only the small thing they had, and into the pot it went. By evening the whole village sat together around a soup that fed everyone, warm and rich and real, made from a stone and a hundred small kindnesses.",
  },
  {
    id: 'one-tiny-thing',
    title: 'Knock out one small thing',
    modality: 'smallwin',
    cardType: 'nudge',
    fits: ['overwhelmed', 'low'],
    timeSeconds: 120,
    fast: false,
    mode: 'active',
    benefit: 'Proof you can still move.',
    how: "Pick one tiny thing that's been nagging you, a dish, a text, and just finish that one. Leave the rest.",
    why: 'Finishing one small thing gives your brain a genuine hit of done. A sense of control comes from doing something, not from doing everything.',
  },
  {
    id: 'bridge-back',
    title: 'Send the sorry text',
    modality: 'repair',
    cardType: 'action',
    fits: ['irritable'],
    timeSeconds: 60,
    fast: false,
    mode: 'active',
    benefit: 'Mend it in one message.',
    why: "A small, honest repair matters more than the moment that needed it. It tells the other person the bond is still solid.",
    body: "A few things first:\n• Step out, let the heat drop\n• Give it ten minutes, most fights shrink from the other side\n• When you're ready, sending something like this might help?",
    template:
      "Hey, I was short with you earlier and I'm sorry. Today has been a rough one and it came out sideways at you. It wasn't really about you, and I didn't like how I left things. Shall we talk it through in a bit, maybe after an hour?",
  },
  {
    id: 'cave-mode',
    title: 'Hide out for a bit',
    modality: 'withdraw',
    cardType: 'nudge',
    fits: ['overwhelmed', 'irritable'],
    timeSeconds: 0,
    fast: false,
    mode: 'receptive',
    benefit: 'Permission to pull back.',
    how: 'Find a quiet spot, dim the lights, silence your phone, and pull back from everyone for a little while.',
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
