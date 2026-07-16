// "Steady yourself": the in-the-moment PMS flow copy. The flow is a single
// stateful screen (src/app/steady-yourself.tsx) that walks recognise -> kinder
// read -> one breath -> (a few more? / break / 3-min reset) -> reflect -> repair
// -> gentle line -> close. It reuses existing surfaces for the heavy beats
// (the breath session, rough-moment reflect, couples-reconnect repair, the
// bridge-back gentle line), so this module holds only the flow's own copy.
//
// Voice: DESIGN.md neutrally-warm. Quiet, plain words, no exclamation points,
// no emojis, middle dots for beats. Nothing here diagnoses or treats.

// --- Recognise: what happened? -------------------------------------------

export type WhatHappenedId = 'snapped' | 'cried' | 'quiet' | 'turned-on-self' | 'else';

export interface WhatHappened {
  id: WhatHappenedId;
  label: string;
}

// The five ways a rough moment lands, in the order they're offered. "Something
// else" always sits last as the catch-all.
export const WHAT_HAPPENED: readonly WhatHappened[] = [
  { id: 'snapped', label: 'I snapped at someone' },
  { id: 'cried', label: 'I cried' },
  { id: 'quiet', label: 'I went quiet' },
  { id: 'turned-on-self', label: 'I was hard on myself' },
  { id: 'else', label: 'Something else' },
];

// The instant kinder read — one gentle, true reframe per recognise choice.
// Not a denial and not a silver lining: a smaller, truer way to hold it, with
// the cycle doing the naming so it never sounds like blame.
export const KINDER_READ: Record<WhatHappenedId, string> = {
  snapped:
    'You are on edge right now. That was the pressure talking, not the truth of who you are.',
  cried: 'Tears are pressure finding a way out. Nothing about that is weak, and it will pass.',
  quiet:
    'Going quiet is your system trying to protect you. It is very helpful.',
  'turned-on-self':
    'The voice inside you is not very kind to you this week, you are way more than that',
  else: 'PMS make you feel everything stronger, the feeling is real & it will pass',
};

// --- One breath ----------------------------------------------------------

// One long breath: a small lead so she knows it is a single breath (not an
// open-ended session), the two lines that ride it (in, then a longer out), and
// the settle line that lands when it finishes and the way forward appears.
export const BREATH_LEAD = 'Just one long breath';
export const BREATH_IN_LINE = 'Breathe in. Fresh oxygen, pumps energy.';
export const BREATH_OUT_LINE =
  'Now out, as slow as you can. The slow part tells your body you are safe.';
export const BREATH_DONE_LINE = 'Can you do a few more?';

// The "a few more?" rationale, shown right on the finished-breath screen (the
// choice lives there now, so there is no separate page).
export const FEW_MORE_WHY = 'A few slow breaths in a row settles your nervous system.';

// --- Break vs reset ------------------------------------------------------

// The reflect invitation, shown ONLY once she is cooled down (breathing helped,
// or after a break/reset) — never mid-spike. Reappraisal lands on a clear head
// and fails on a flooded one, so CBT is a peer choice here, not forced.
export const REFLECT_OFFER_TITLE = 'Feeling better?';
export const REFLECT_OFFER_WHY =
  'A clear head is a good time to reflect and know your next step.';

export const BREAK_TITLE = 'Put the phone down for 20 minutes, finish a small task';
export const BREAK_WHY =
  'A change of scene lets the stress settle, and finishing one small task gives your brain a real sense of control. Small wins are how it resets.';

// On the running timer screen: what to do with the time (finishing one small
// task gives the brain a real hit of "done" and a sense of control, a better
// use of the cooldown than idle waiting), and the promise to call her back.
export const BREAK_TASK_LINE =
  'Step away and finish one small thing. Finishing it rewards your brain and helps you think better.';
export const BREAK_PING_LINE =
  'When you are back, we will find your next step together. I will ping you.';

// The quick menu behind "I can't spare 20": short, different-modality options
// (she already tried breathing), so she picks what fits her minute instead of
// being dropped into a prescribed reset. Cold water = the dive reflex (DBT
// TIPP, the fastest reset there is); grounding = an attention shift; exit =
// permission to set it down (self-distancing), the quickest way out.
export type QuickOptionId = 'cold-water' | 'ground' | 'exit';

export const QUICK_OPTIONS_TITLE = 'No problem. Even a minute helps.';

export const QUICK_OPTIONS: readonly { id: QuickOptionId; label: string }[] = [
  { id: 'cold-water', label: 'Splash cold water on your face' },
  { id: 'ground', label: 'Ground yourself, 5-4-3-2-1' },
  { id: 'exit', label: 'Exit' },
];

// The parting line on exit: setting it down for now is itself a real move
// (self-distancing), so leaving still carries one gentle, useful thought.
export const RESET_CARRY_LINE =
  'Do not decide or act on anything right now. It can wait until tomorrow.';

// --- Gentle close --------------------------------------------------------

export const GENTLE_LINE_INTRO = 'Want to send someone a message to clear the air?';
export const CLOSE_LINE = 'You moved through it. That is the whole win.';
