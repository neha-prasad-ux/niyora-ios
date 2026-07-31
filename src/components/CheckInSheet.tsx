import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { appendCheckIn, type CheckInLevel } from '@/store/checkin-history';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';

const LEVELS: { level: CheckInLevel; label: string; hue: number }[] = [
  { level: 'light', label: 'light', hue: 215 },
  { level: 'okay', label: 'okay', hue: 260 },
  { level: 'heavy', label: 'heavy', hue: 335 },
];

interface Props {
  onDone: (recorded: boolean) => void;
}

export function CheckInSheet({ onDone }: Props) {
  const [phase, setPhase] = useState<'picking' | 'done'>('picking');
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  // Track pending timers so a fast unmount (parent hides the sheet mid-animation)
  // cannot fire onDone after teardown.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
  }, [opacity, translateY]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
    };
  }, []);

  function dismiss(recorded: boolean) {
    opacity.value = withTiming(0, { duration: 320 });
    timers.current.push(setTimeout(() => onDone(recorded), 320));
  }

  async function handleLevel(level: CheckInLevel) {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    setPhase('done');
    appendCheckIn(level).catch(() => {});
    timers.current.push(setTimeout(() => dismiss(true), 900));
  }

  function handleBackdrop() {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    dismiss(false);
  }

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={handleBackdrop} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {phase === 'picking' ? (
          <>
            <Text style={styles.question}>How heavy does it feel?</Text>
            <View style={styles.levelRow} accessibilityRole="radiogroup">
              {LEVELS.map(({ level, label, hue }) => (
                <Pressable
                  key={level}
                  onPress={() => handleLevel(level)}
                  style={[
                    styles.pill,
                    { borderColor: `hsl(${hue}, 40%, 40%)` },
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  hitSlop={8}
                >
                  <Text style={[styles.pillLabel, { color: `hsl(${hue}, 62%, 72%)` }]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.noted}>noted</Text>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrimSoft,
  },
  sheet: {
    backgroundColor: colors.surfaceOverlay,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: 1,
    borderColor: colors.border.faint,
    paddingTop: spacing.xxxl,
    paddingBottom: 56,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
  },
  question: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    color: colors.textPrimary,
    marginBottom: spacing.xxxl,
    letterSpacing: 0.2,
  },
  levelRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pill: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.fill.faint,
  },
  pillLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    letterSpacing: 0.3,
  },
  noted: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    paddingVertical: spacing.sm,
  },
});
