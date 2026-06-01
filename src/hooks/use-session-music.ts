import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getMusicTrack, setMusicTrack, type MusicTrack } from '@/store/music-prefs';

// Paths are relative to this file (src/hooks/ → assets/audio/).
const SOURCES = {
  serene: require('../../assets/audio/serene.mp3'),
  ocean: require('../../assets/audio/ocean.mp3'),
  forest: require('../../assets/audio/forest.m4a'),
} as const;

const VOLUME = 0.5;
const FADE_STEPS = 12;
const FADE_MS = 600;

export function useSessionMusic() {
  const [track, setTrackState] = useState<MusicTrack>('serene');
  // Single stable player — track switches use player.replace().
  const player = useAudioPlayer(SOURCES.serene);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks which source is currently loaded so we avoid redundant replaces.
  const loadedTrackRef = useRef<Exclude<MusicTrack, 'mute'>>('serene');
  // Always-current track ref so fadeOut doesn't need track in its dep array.
  const trackRef = useRef(track);

  useEffect(() => {
    trackRef.current = track;
  }, [track]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  // Restore the last-chosen track from storage.
  useEffect(() => {
    getMusicTrack().then(setTrackState).catch(() => {});
  }, []);

  // React to track changes: swap source or pause for mute.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- player is a stable SharedObject ref
  useEffect(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
    if (track === 'mute') {
      player.pause();
      return;
    }
    if (track !== loadedTrackRef.current) {
      player.replace(SOURCES[track]);
      loadedTrackRef.current = track;
    }
    player.loop = true;
    player.volume = VOLUME;
    player.play();
  }, [track]);

  const changeTrack = useCallback((next: MusicTrack) => {
    setTrackState(next);
    setMusicTrack(next).catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- player is stable; trackRef always current
  const fadeOut = useCallback(() => {
    if (trackRef.current === 'mute') return;
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    const stepMs = FADE_MS / FADE_STEPS;
    let step = 0;
    fadeIntervalRef.current = setInterval(() => {
      step++;
      player.volume = Math.max(0, VOLUME * (1 - step / FADE_STEPS));
      if (step >= FADE_STEPS) {
        clearInterval(fadeIntervalRef.current!);
        fadeIntervalRef.current = null;
        player.pause();
      }
    }, stepMs);
  }, [player]);

  return { track, changeTrack, fadeOut };
}
