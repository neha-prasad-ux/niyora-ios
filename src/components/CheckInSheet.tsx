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
  // Pending timeouts so we can cancel them if the sheet unmounts mid-animation,
  // avoiding an onDone() call (and parent state update) after teardown.
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
    const pending = timeouts.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, [opacity, translateY]);

  function dismiss(recorded: boolean) {
    opacity.value = withTiming(0, { duration: 320 });
    timeouts.current.push(setTimeout(() => onDone(recorded), 320));
  }

  async function handleLevel(level: CheckInLevel) {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    setPhase('done');
    appendCheckIn(level).catch(() => {});
    timeouts.current.push(setTimeout(() => dismiss(true), 900));
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: '#13101a',
    borderTopLeftRadius: 18,
    borderCurve: 'continuous',
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 28,
    paddingBottom: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  question: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    color: colors.textPrimary,
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 14,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  noted: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    paddingVertical: 10,
  },
});
