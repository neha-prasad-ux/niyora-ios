// Shared action button. Solid matches the Begin button (the same violet
// gradient capsule + glow), so every primary action across the app looks the
// same; ghost is the soft secondary. This is deliberately distinct from the
// selection chips, which are translucent toggles, not buttons.
//
// The full Begin button (with the particle burst) stays the special entry CTA
// on home + onboarding; this is its lighter sibling for in-flow actions.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost';
  disabled?: boolean;
};

export function Pill({ label, onPress, variant = 'solid', disabled = false }: Props) {
  const press = useSharedValue(0);
  const handle = () => {
    if (disabled) return;
    Haptics.selectionAsync().catch(() => {});
    onPress();
  };
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.04 }] }));

  const inner =
    variant === 'ghost' || disabled ? (
      <View style={[styles.capsule, variant === 'ghost' ? styles.ghost : styles.disabled]}>
        <Text style={[typography.beginLabel, variant === 'ghost' ? styles.ghostLabel : styles.disabledLabel]}>
          {label}
        </Text>
      </View>
    ) : (
      <LinearGradient
        colors={[colors.beginStart, colors.beginEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.capsule, styles.solid]}
      >
        <Text style={[typography.beginLabel, styles.solidLabel]}>{label}</Text>
      </LinearGradient>
    );

  return (
    <Pressable
      onPress={handle}
      disabled={disabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 140 });
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Animated.View
        style={[variant === 'solid' && !disabled && styles.glow, animStyle]}
      >
        {inner}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glow: {
    shadowColor: colors.beginGlow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
  },
  capsule: {
    alignSelf: 'center',
    paddingVertical: 13,
    paddingHorizontal: 40,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { borderColor: colors.beginBorder },
  // Filled translucent panel + brighter rim so the secondary action stays legible
  // over busy living-scene backgrounds (it used to be transparent and washed out).
  ghost: { borderColor: 'rgba(255, 255, 255, 0.30)', backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  disabled: { borderColor: 'transparent', backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  solidLabel: { color: '#fff' },
  ghostLabel: { color: colors.textPrimary },
  disabledLabel: { color: 'rgba(255, 255, 255, 0.35)' },
});
