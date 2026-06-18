// Home-screen header. Person icon on the left, wordmark + tagline center.
// Speaker/mute toggle removed for v1 -- audio is out of scope until #5 lands.

import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type HeaderProps = {
  onPressProfile: () => void;
};

const ICON_SIZE = 22;
const HIT_SLOP = 12;

export function Header({ onPressProfile }: HeaderProps) {
  function handleProfile() {
    onPressProfile();
    Haptics.selectionAsync().catch(() => {});
  }

  return (
    <View style={styles.row}>
      <Pressable
        onPress={handleProfile}
        // Explicit box around the icon so the button always has a solid layout
        // size; with hitSlop this gives a 46pt tap area centered on the glyph.
        style={styles.iconButton}
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

      {/* Placeholder keeps layout symmetric; remove when #5 adds real audio */}
      <View style={{ width: ICON_SIZE }} />
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
  iconButton: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
