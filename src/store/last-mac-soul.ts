// Persists the most recent Mac soul-state so the home screen can tint the orb
// without running its own network discovery (which would trigger the
// local-network permission prompt on first launch). My Soul writes the latest
// reading here whenever sync delivers one; home reads it back.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MacSoulState } from 'niyora-sync';

const KEY = 'niyora:last-mac-soul';

export async function saveMacSoul(state: MacSoulState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Best-effort cache; a write failure just means the orb stays calm.
  }
}

export async function loadMacSoul(): Promise<MacSoulState | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MacSoulState) : null;
  } catch {
    return null;
  }
}
