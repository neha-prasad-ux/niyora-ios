// Home-screen header. Person icon on the left, wordmark + tagline center,
// speaker icon on the right. Selection haptic on icon taps.

import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type HeaderProps = {
  muted: boolean;
  onPressProfile: () => void;
  onToggleMute: () => void;
};

const ICON_SIZE = 22;
const HIT_SLOP = 12;

export function Header({ muted, onPressProfile, onToggleMute }: HeaderProps) {
  function handleProfile() {
    Haptics.selectionAsync();
    onPressProfile();
  }
  function handleMute() {
    Haptics.selectionAsync();
    onToggleMute();
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleProfile}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="My Soul"
      >
        <SymbolView
          name="person"
          tintColor={colors.iconChrome}
          size={ICON_SIZE}
          weight="regular"
        />
      </Pressable>

      <View style={styles.center}>
        <Text style={[typography.wordmark, { color: colors.textWordmark }]}>Niyora</Text>
        <Text style={[typography.tagline, { color: colors.textTagline, marginTop: 4 }]}>
          Calm in 60 seconds
        </Text>
      </View>

      <Pressable
        onPress={handleMute}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Unmute audio cues' : 'Mute audio cues'}
        accessibilityState={{ selected: muted }}
      >
        <SymbolView
          name={muted ? 'speaker.slash' : 'speaker.wave.2'}
          tintColor={colors.iconChrome}
          size={ICON_SIZE}
          weight="regular"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  center: {
    alignItems: 'center',
    flex: 1,
  },
});
