// Shared bits for the activity experience views: a legibility scrim that sits
// over the living scene so text reads, and a calm pill button (filled for the
// primary action, ghost for the soft secondary).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';

export function Scrim() {
  return <View style={styles.scrim} pointerEvents="none" />;
}

type PillProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
};

export function Pill({ label, onPress, variant = 'primary', disabled = false }: PillProps) {
  const handle = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };
  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[
        styles.pill,
        variant === 'primary' ? styles.pillPrimary : styles.pillGhost,
        disabled && styles.pillDisabled,
      ]}
    >
      <Text style={[styles.pillText, variant === 'ghost' && styles.pillTextGhost]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.52)',
  },
  pill: {
    alignSelf: 'center',
    paddingHorizontal: 38,
    paddingVertical: 14,
    borderRadius: 26,
  },
  pillPrimary: {
    backgroundColor: 'rgba(150, 120, 235, 0.92)',
  },
  pillGhost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  pillDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pillTextGhost: {
    color: colors.textSubtitle,
  },
});
