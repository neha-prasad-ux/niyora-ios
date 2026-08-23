// The back control, a soft round that matches CloseButton exactly so a
// full-screen flow can carry both, back on the left, close on the right, 
// and they read as one set. Same size, same fill, same weight; only the glyph
// differs.

import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function BackButton({ onPress, accessibilityLabel = 'Back' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.btn}
    >
      <SymbolView name="chevron.left" tintColor={colors.textPrimary} size={15} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill.strong,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
  },
});
