// Pure mapping from breath phases to spoken-cue clip ids. Kept free of any
// audio imports so it can be unit-tested and so techniques.ts changes that
// rename a phase label get caught by the test rather than silently going mute.

export type VoiceClip =
  | 'breathe-in'
  | 'breathe-in-nose'
  | 'breathe-in-mouth'
  | 'inhale-left'
  | 'inhale-right'
  | 'breathe-into-belly'
  | 'hold'
  | 'breathe-out'
  | 'breathe-out-slowly'
  | 'breathe-out-nose'
  | 'exhale-left'
  | 'exhale-right'
  | 'release-slowly'
  | 'intro-ocean'
  | 'settle'
  | 'begin'
  | 'well-done';

// Phase labels are authored in techniques.ts; map each to its cue. A few labels
// share a clip (plain "inhale" reuses "breathe in"; cooling's "inhale through
// teeth" reuses the mouth cue since the tongue curl sits in the mouth).
const LABEL_TO_CLIP: Record<string, VoiceClip> = {
  'breathe in': 'breathe-in',
  inhale: 'breathe-in',
  'inhale through nose': 'breathe-in-nose',
  'inhale through teeth': 'breathe-in-mouth',
  'inhale through mouth': 'breathe-in-mouth',
  'inhale left': 'inhale-left',
  'inhale right': 'inhale-right',
  'breathe into belly': 'breathe-into-belly',
  hold: 'hold',
  'breathe out': 'breathe-out',
  exhale: 'breathe-out',
  'exhale slowly': 'breathe-out-slowly',
  'exhale through nose': 'breathe-out-nose',
  'exhale right': 'exhale-right',
  'exhale left': 'exhale-left',
  'release slowly': 'release-slowly',
};

/** The cue clip for a breath phase label, or undefined if none matches. */
export function clipForLabel(label: string): VoiceClip | undefined {
  return LABEL_TO_CLIP[label];
}

/** The opening sequence for a technique: settle, the Ocean haaa intro (Ocean
 *  only, since the throat sound can't be conveyed by a normal cue), then begin. */
export function introClipsFor(techniqueId: string): VoiceClip[] {
  return techniqueId === 'ocean'
    ? ['settle', 'intro-ocean', 'begin']
    : ['settle', 'begin'];
}
