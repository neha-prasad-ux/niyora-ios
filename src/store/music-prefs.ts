import AsyncStorage from '@react-native-async-storage/async-storage';

export type MusicTrack = 'serene' | 'ocean' | 'forest' | 'mute';

const STORAGE_KEY = 'niyora:music';
const DEFAULT_TRACK: MusicTrack = 'serene';

export async function getMusicTrack(): Promise<MusicTrack> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === 'serene' || raw === 'ocean' || raw === 'forest' || raw === 'mute') return raw;
  return DEFAULT_TRACK;
}

export async function setMusicTrack(track: MusicTrack): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, track);
}
