import type { SFSymbol } from 'expo-symbols';

import type { MusicTrack } from '@/store/music-prefs';

export type TrackOption = { id: MusicTrack; label: string; icon: SFSymbol };

// Single source of truth for the music picker, shared by the breath session,
// the mindfulness session, and the activity MusicControl so the three pickers
// can never drift apart.
export const TRACK_OPTIONS: TrackOption[] = [
  { id: 'serene', label: 'Serene', icon: 'music.note' },
  { id: 'ocean', label: 'Ocean', icon: 'waveform' },
  { id: 'forest', label: 'Forest', icon: 'leaf' },
  { id: 'mute', label: 'Mute', icon: 'speaker.slash' },
];
