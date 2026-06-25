// The close (X) control, in a soft round so it reads clearly against any
// scene. Shared across the full-screen flows (result, activity, understand) so
// every close looks and sits the same.

import { Pressable, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';

type Props = {
  onPress: () => void;
  accessibilityLabel?: string;
};

export function CloseButton({ onPress, accessibilityLabel = 'Close' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.btn}
    >
      <SymbolView name="xmark" tintColor={colors.textPrimary} size={15} weight="semibold" />
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
});
