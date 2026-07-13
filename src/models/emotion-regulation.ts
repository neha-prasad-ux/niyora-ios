// The emotional-regulation card on the PMS Day checklist. One in-the-moment
// mechanic: name what you feel (a chip), and naming it reveals a kind reframe
// for that exact feeling. Small waves get the reframe; big ones get 20 minutes
// and a breath. Awareness is already the win.
//
// App voice: no em dashes, exclamation points, or emoji; gender-neutral (see
// emotion-regulation.test).

export type EmotionChip = {
  id: string;
  label: string;
  // The kind rephrase shown the moment she names this feeling.
  reframe: string;
};

export const EMOTION_HEADER = 'Name what you are feeling';
export const EMOTION_SUBHEAD = 'Naming the emotion is step 1.';
// The decision rule under the reframe: small gets a reframe, big gets a breath.
export const EMOTION_RULE = 'Small stuff, let it pass. Big stuff, step away and breathe.';

export const EMOTION_CHIPS: readonly EmotionChip[] = [
  { id: 'irritable', label: 'Irritable', reframe: 'The PMS is turning the volume up, not everyone being annoying. Give it a day.' },
  { id: 'tears', label: 'Tears', reframe: 'Crying it out is fine. Let it come, it will not last.' },
  { id: 'rage', label: 'Rage', reframe: 'The anger is real, just louder than it needs to be. Skip any big decisions today.' },
  { id: 'anxiety', label: 'Anxiety', reframe: 'Your body is on edge, not onto something. The worry feels bigger than it is.' },
  { id: 'other', label: 'Other', reframe: 'Whatever it is, you named it. That is the hard part. It is the week talking, and it passes.' },
];

// The breath offered for the big version. Id maps to models/techniques.
export const EMOTION_BREATHS: readonly { id: string; label: string; technique: string }[] = [
  { id: 'wind-down', label: 'Wind down', technique: 'wind-down' },
];

// Ledger ref: naming a feeling is recognizing the pattern (moon-reward: notice).
export const EMOTION_NAMED_REF_ID = 'emotion-named';
