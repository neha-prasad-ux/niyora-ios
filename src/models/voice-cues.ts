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

// Every breath phase maps to one of just three calm cues — breathe in / breathe
// out / hold — no matter the technique. The on-screen instruction already
// carries the specifics (which nostril, tongue position, "haaa" sound), so the
// voice only keeps the universal in/out/hold cadence. This deliberately drops
// the longer variant clips ("inhale through your right nostril", "exhale through
// your nose"): they ran longer than their phase and got cut off when the next
// cue fired, which read as the voice dropping out. Three short clips always fit.
const LABEL_TO_CLIP: Record<string, VoiceClip> = {
  'breathe in': 'breathe-in',
  inhale: 'breathe-in',
  'inhale through nose': 'breathe-in',
  'inhale through teeth': 'breathe-in',
  'inhale through mouth': 'breathe-in',
  'inhale left': 'breathe-in',
  'inhale right': 'breathe-in',
  'breathe into belly': 'breathe-in',
  hold: 'hold',
  'breathe out': 'breathe-out',
  exhale: 'breathe-out',
  'exhale slowly': 'breathe-out',
  'exhale through nose': 'breathe-out',
  'exhale right': 'breathe-out',
  'exhale left': 'breathe-out',
  'release slowly': 'breathe-out',
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
