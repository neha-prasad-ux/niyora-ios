// Background music for an activity, with the same track picker as a breathing
// session. Mounting this starts the music (the stored track, or Ocean by
// default); tapping the note opens the picker to switch track or mute. Used on
// movement activities, where a soundtrack helps the eyes-closed/at-home poses
// land. Self-contained: owns its own useSessionMusic instance.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { useSessionMusic } from '@/hooks/use-session-music';
import { type MusicTrack } from '@/store/music-prefs';
import { colors } from '@/theme/colors';

const TRACK_OPTIONS: { id: MusicTrack; label: string; icon: SFSymbol }[] = [
  { id: 'serene', label: 'Serene', icon: 'music.note' },
  { id: 'ocean', label: 'Ocean', icon: 'waveform' },
  { id: 'forest', label: 'Forest', icon: 'leaf' },
  { id: 'mute', label: 'Mute', icon: 'speaker.slash' },
];

export function MusicControl() {
  const { track, changeTrack } = useSessionMusic();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel={track === 'mute' ? 'Music, muted' : `Music, ${track}`}
      >
        <SymbolView
          name={track === 'mute' ? 'speaker.slash' : 'music.note'}
          tintColor={open ? colors.textPrimary : colors.textSubtitle}
          size={20}
          weight="medium"
        />
      </Pressable>

      {open && (
        <View style={styles.card}>
          {TRACK_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={styles.row}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                changeTrack(opt.id);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: track === opt.id }}
            >
              <SymbolView
                name={opt.icon}
                tintColor={track === opt.id ? colors.textPrimary : colors.textSubtitle}
                size={16}
                weight="medium"
              />
              <Text style={[styles.label, track === opt.id && styles.labelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  card: {
    position: 'absolute',
    top: 34,
    left: 0,
    backgroundColor: 'rgba(18, 14, 26, 0.94)',
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: 4,
    minWidth: 130,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  label: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontFamily: 'Poppins-Medium',
    color: colors.textPrimary,
  },
});
