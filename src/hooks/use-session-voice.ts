// Spoken breath guidance, layered over the session music. Clips are Neha's own
// voice, pre-recorded and bundled, so nothing leaves the device at play time.
//
// One player drives everything: an opening sequence plays uninterrupted
// (settle → optional technique intro → begin), then each breath boundary fires
// a short phase cue that replaces whatever is playing, and the session ends on
// "well done". Voice is opt-in and off by default (see voice-prefs).

import { setAudioModeAsync, useAudioPlayer, type AudioSource } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

import type { VoiceClip } from '@/models/voice-cues';

export { clipForLabel, introClipsFor } from '@/models/voice-cues';
export type { VoiceClip } from '@/models/voice-cues';

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

export function useSessionVoice(enabled: boolean) {
  const player = useAudioPlayer(VOICE_SOURCES.begin);
  const loadedRef = useRef<VoiceClip>('begin');
  // Remaining clips of the opening sequence; non-empty means the intro is still
  // playing and per-phase cues should hold off.
  const queueRef = useRef<VoiceClip[]>([]);
  // True while the opening sequence is running, so the playback listener knows
  // its final clip's completion should release the breath.
  const introActiveRef = useRef(false);
  const onIntroDoneRef = useRef<(() => void) | undefined>(undefined);
  // Live ref so the playback listener and callbacks always see the latest value
  // without resubscribing.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
  }, []);

  const playOne = useCallback(
    (clip: VoiceClip) => {
      player.volume = 1;
      if (clip !== loadedRef.current) {
        player.replace(VOICE_SOURCES[clip]);
        loadedRef.current = clip;
      } else {
        // Same source already loaded: rewind so a repeated cue (e.g. "hold")
        // plays again from the top.
        player.seekTo(0);
      }
      player.play();
    },
    [player]
  );

  // Advance the opening sequence as each clip finishes; when its last clip ends,
  // fire the completion callback (which releases the breath).
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!;
        playOne(next);
      } else if (introActiveRef.current) {
        introActiveRef.current = false;
        const done = onIntroDoneRef.current;
        onIntroDoneRef.current = undefined;
        done?.();
      }
    });
    return () => sub.remove();
  }, [player, playOne]);

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
    [playOne]
  );

  // Fire a per-phase cue, unless the opening sequence is still playing.
  const playCue = useCallback(
    (clip: VoiceClip | undefined) => {
      if (!enabledRef.current || !clip) return;
      if (queueRef.current.length > 0) return;
      playOne(clip);
    },
    [playOne]
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
    [playOne]
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    introActiveRef.current = false;
    onIntroDoneRef.current = undefined;
    player.pause();
  }, [player]);

  return { playIntro, playCue, playEnd, stop };
}
