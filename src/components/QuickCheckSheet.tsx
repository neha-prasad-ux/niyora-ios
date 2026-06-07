import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { Emotion } from '@/lib/recommendation';
import { colors } from '@/theme/colors';

const EMOTIONS: { emotion: Emotion; label: string }[] = [
  { emotion: 'anxious',     label: 'anxious' },
  { emotion: 'frustrated',  label: 'frustrated' },
  { emotion: 'lonely',      label: 'lonely' },
  { emotion: 'helpless',    label: 'helpless' },
  { emotion: 'overwhelmed', label: 'overwhelmed' },
  { emotion: 'scattered',   label: 'scattered' },
];

const TIME_OPTIONS: { label: string; seconds: number }[] = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
];

export type QuickCheckResult = {
  emotion: Emotion | null;
  targetSeconds: number | null;
};

interface Props {
  onDone: (result: QuickCheckResult) => void;
}

export function QuickCheckSheet({ onDone }: Props) {
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [targetSeconds, setTargetSeconds] = useState<number | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 380 });
    translateY.value = withTiming(0, { duration: 380 });
  }, [opacity, translateY]);

  function dismiss(result: QuickCheckResult) {
    opacity.value = withTiming(0, { duration: 280 });
    setTimeout(() => onDone(result), 280);
  }

  function handleEmotion(e: Emotion) {
    Haptics.selectionAsync();
    setEmotion((prev) => (prev === e ? null : e));
  }

  function handleTime(seconds: number) {
    Haptics.selectionAsync();
    setTargetSeconds((prev) => (prev === seconds ? null : seconds));
  }

  function handleUpdate() {
    Haptics.selectionAsync();
    dismiss({ emotion, targetSeconds });
  }

  function handleSkip() {
    Haptics.selectionAsync();
    dismiss({ emotion: null, targetSeconds: null });
  }

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const hasSelection = emotion !== null || targetSeconds !== null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={handleSkip}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
      />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <Text style={styles.question}>what's here right now?</Text>
        <View style={styles.pillGrid} accessibilityRole="radiogroup">
          {EMOTIONS.map(({ emotion: e, label }) => (
            <Pressable
              key={e}
              onPress={() => handleEmotion(e)}
              style={[styles.pill, emotion === e && styles.pillActive]}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: emotion === e }}
              hitSlop={6}
            >
              <Text style={[styles.pillLabel, emotion === e && styles.pillLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.question, styles.questionSpaced]}>got a minute, or five?</Text>
        <View style={styles.timeRow} accessibilityRole="radiogroup">
          {TIME_OPTIONS.map(({ label, seconds }) => (
            <Pressable
              key={seconds}
              onPress={() => handleTime(seconds)}
              style={[styles.pill, targetSeconds === seconds && styles.pillActive]}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: targetSeconds === seconds }}
              hitSlop={6}
            >
              <Text
                style={[styles.pillLabel, targetSeconds === seconds && styles.pillLabelActive]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSkip}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.skipLabel}>skip</Text>
          </Pressable>
          {hasSelection && (
            <Pressable
              onPress={handleUpdate}
              style={styles.updateButton}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Update suggestion"
            >
              <Text style={styles.updateLabel}>update</Text>
            </Pressable>
          )}
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
  },
  sheet: {
    backgroundColor: '#13101a',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 28,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  question: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textSubtitle,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  questionSpaced: {
    marginTop: 24,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  pillActive: {
    borderColor: 'rgba(150, 110, 220, 0.60)',
    backgroundColor: 'rgba(150, 110, 220, 0.12)',
  },
  pillLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  pillLabelActive: {
    color: colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
  },
  skipLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 0.3,
  },
  updateButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 110, 220, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(150, 110, 220, 0.35)',
  },
  updateLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
});
