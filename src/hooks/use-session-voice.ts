// Spoken breath guidance, layered over the session music. Clips are Neha's own
// voice, pre-recorded and bundled, so nothing leaves the device at play time.
//
// One player PER CLIP, created up front and cached. An opening sequence plays
// uninterrupted (settle → optional technique intro → begin), then each breath
// boundary fires a short phase cue, and the session ends on "well done". Voice
// is opt-in and off by default (see voice-prefs).
//
// Why a player per clip (not one shared player with replace()): expo-audio's
// replace() loads the new source asynchronously, so calling play() immediately
// after raced the load and cues dropped at random across rounds and techniques
// (a silent hold here, a missing exhale there). Independent, pre-warmed players
// just seekTo(0) and play every time, which is reliable.

import { createAudioPlayer, setAudioModeAsync, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import type { VoiceClip } from '@/models/voice-cues';

export { clipForLabel, introClipsFor } from '@/models/voice-cues';
export type { VoiceClip } from '@/models/voice-cues';

type Player = ReturnType<typeof createAudioPlayer>;

// Paths are relative to this file (src/hooks/ → assets/audio/voice/).
const VOICE_SOURCES: Record<VoiceClip, AudioSource> = {
  'breathe-in': require('../../assets/audio/voice/breathe-in.m4a'),
  'breathe-in-nose': require('../../assets/audio/voice/breathe-in-nose.m4a'),
  'breathe-in-mouth': require('../../assets/audio/voice/breathe-in-mouth.m4a'),
  'inhale-left': require('../../assets/audio/voice/inhale-left.m4a'),
  'inhale-right': require('../../assets/audio/voice/inhale-right.m4a'),
  'breathe-into-belly': require('../../assets/audio/voice/breathe-into-belly.m4a'),
  hold: require('../../assets/audio/voice/hold.m4a'),
  'breathe-out': require('../../assets/audio/voice/breathe-out.m4a'),
  'breathe-out-slowly': require('../../assets/audio/voice/breathe-out-slowly.m4a'),
  'breathe-out-nose': require('../../assets/audio/voice/breathe-out-nose.m4a'),
  'exhale-left': require('../../assets/audio/voice/exhale-left.m4a'),
  'exhale-right': require('../../assets/audio/voice/exhale-right.m4a'),
  'release-slowly': require('../../assets/audio/voice/release-slowly.m4a'),
  'intro-ocean': require('../../assets/audio/voice/intro-ocean.m4a'),
  settle: require('../../assets/audio/voice/settle.m4a'),
  begin: require('../../assets/audio/voice/begin.m4a'),
  'well-done': require('../../assets/audio/voice/well-done.m4a'),
} as const;

// The clips actually reachable: the universal three cues, plus the opening and
// closing clips. The variant clips above are kept in the source map but are no
// longer referenced by the cue mapping (voice-cues collapses every phase to
// in/out/hold), so we don't warm them.
const WARM_CLIPS: readonly VoiceClip[] = [
  'breathe-in',
  'breathe-out',
  'hold',
  'settle',
  'begin',
  'intro-ocean',
  'well-done',
];

export function useSessionVoice(enabled: boolean) {
  const playersRef = useRef<Map<VoiceClip, Player>>(new Map());
  // The player currently sounding, so we can silence it before the next cue.
  const currentRef = useRef<Player | null>(null);
  // Remaining clips of the opening sequence; non-empty means the intro is still
  // playing and per-phase cues should hold off.
  const queueRef = useRef<VoiceClip[]>([]);
  // True while the opening sequence is running, so a clip's finish knows to
  // release the breath when the last intro clip ends.
  const introActiveRef = useRef(false);
  const onIntroDoneRef = useRef<(() => void) | undefined>(undefined);
  // Live ref so listeners and callbacks always see the latest enabled value.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  // Forward ref so a player's finish listener can advance the intro without a
  // circular dependency on playOne.
  const playOneRef = useRef<(clip: VoiceClip) => void>(() => {});

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  // Build (or fetch) the dedicated player for a clip. Each player carries a
  // finish listener that advances the opening sequence when its own clip is the
  // one currently sounding; per-phase cues end naturally and are ignored here.
  const getPlayer = useCallback((clip: VoiceClip): Player => {
    const existing = playersRef.current.get(clip);
    if (existing) return existing;
    const p = createAudioPlayer(VOICE_SOURCES[clip]);
    p.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      if (currentRef.current !== p) return;
      if (queueRef.current.length > 0) {
        playOneRef.current(queueRef.current.shift()!);
      } else if (introActiveRef.current) {
        introActiveRef.current = false;
        const done = onIntroDoneRef.current;
        onIntroDoneRef.current = undefined;
        done?.();
      }
    });
    playersRef.current.set(clip, p);
    return p;
  }, []);

  const playOne = useCallback(
    (clip: VoiceClip) => {
      const p = getPlayer(clip);
      const prev = currentRef.current;
      if (prev && prev !== p) {
        prev.pause();
      }
      currentRef.current = p;
      p.volume = 1;
      // Rewind, THEN play. A clip that finished on its own sits parked at its
      // end; seekTo is async, so playing immediately raced the rewind and the
      // cue went silent every other round. Waiting for the seek guarantees it
      // starts from the top each time.
      p.seekTo(0)
        .then(() => p.play())
        .catch(() => p.play());
    },
    [getPlayer],
  );
  useEffect(() => {
    playOneRef.current = playOne;
  }, [playOne]);

  // Warm the reachable players once at mount so the first cue of each kind is
  // already loaded and never races its initial load.
  useEffect(() => {
    WARM_CLIPS.forEach((clip) => getPlayer(clip));
    const players = playersRef.current;
    return () => {
      players.forEach((p) => {
        try {
          p.remove();
        } catch {
          // already gone
        }
      });
      players.clear();
      currentRef.current = null;
    };
  }, [getPlayer]);

  // Start the opening sequence (uninterrupted); onDone fires when it ends, or
  // immediately when voice is off so the caller never waits forever.
  const playIntro = useCallback(
    (clips: VoiceClip[], onDone?: () => void) => {
      if (!enabledRef.current || clips.length === 0) {
        onDone?.();
        return;
      }
      onIntroDoneRef.current = onDone;
      introActiveRef.current = true;
      queueRef.current = clips.slice(1);
      playOne(clips[0]);
    },
    [playOne],
  );

  // Fire a per-phase cue, unless the opening sequence is still playing.
  const playCue = useCallback(
    (clip: VoiceClip | undefined) => {
      if (!enabledRef.current || !clip) return;
      if (introActiveRef.current || queueRef.current.length > 0) return;
      playOne(clip);
    },
    [playOne],
  );

  // The closing cue always interrupts whatever is playing.
  const playEnd = useCallback(
    (clip: VoiceClip) => {
      if (!enabledRef.current) return;
      queueRef.current = [];
      introActiveRef.current = false;
      onIntroDoneRef.current = undefined;
      playOne(clip);
    },
    [playOne],
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    introActiveRef.current = false;
    onIntroDoneRef.current = undefined;
    currentRef.current?.pause();
  }, []);

  return { playIntro, playCue, playEnd, stop };
}
