// One hold activity, as a card: an icon and a short title, in a two-up grid.
//
// Same motion language as the option rows — rises in on the group stagger,
// springs down under the thumb, and holds the phase tint for a beat before the
// beat advances — just laid out as a card instead of a full-width row, because
// six choices read faster as a grid than as a long list while she is flooded.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';

const tap = () => Haptics.selectionAsync().catch(() => {});
const STAGGER = 45;
const STAGGER_BASE = 60;
const ADVANCE_MS = 260;
const PRESS_SPRING = { stiffness: 320, damping: 26, mass: 1 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActivityCard({
  icon,
  label,
  onPress,
  tint,
  hue = 220,
  index = 0,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tint?: StyleProp<ViewStyle>;
  hue?: number;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * (reduce ? 0 : 0.03) }],
    opacity: 1 - press.value * 0.1,
  }));
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );
  return (
    <Animated.View
      style={styles.cell}
      entering={reduce ? undefined : FadeInUp.delay(STAGGER_BASE + index * STAGGER).duration(220)}
    >
      <AnimatedPressable
        style={[styles.card, flash && tint, pressStyle]}
        onPressIn={() => {
          press.value = withSpring(1, PRESS_SPRING);
        }}
        onPressOut={() => {
          press.value = withSpring(0, PRESS_SPRING);
        }}
        onPress={() => {
          tap();
          setFlash(true);
          flashTimer.current = setTimeout(onPress, ADVANCE_MS);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <SymbolView
          name={icon as SymbolViewProps['name']}
          tintColor={`hsl(${hue}, 42%, 82%)`}
          size={26}
          weight="regular"
        />
        <Text style={styles.label}>{label}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { width: '48%' },
  card: {
    minHeight: 96,
    borderRadius: 18,
    borderCurve: 'continuous',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
