/**
 * PostSessionMood
 *
 * Gentle post-session check shown after every completed session (breath or
 * mindfulness). Sits centred over the SessionDoneBackdrop (dark-blue gradient +
 * white falling particles).
 *
 * Flow: fades in -> user taps a mood row or skip -> brief closing line
 * "take this calm with you" -> fades out -> onDone() so the screen can go back.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { appendMood, type MoodValue } from '@/store/mood-history';
import { colors } from '@/theme/colors';

// Dot hues: cool blue -> mid violet -> warm purple across positions 1..5.
const DOT_HUES = [215, 240, 260, 278, 295] as const;

// Vertical scale, lightest feeling at the top down to heaviest at the bottom.
const MOODS: { value: MoodValue; label: string }[] = [
  { value: 5, label: 'at peace' },
  { value: 4, label: 'calm' },
  { value: 3, label: 'settling' },
  { value: 2, label: 'a little lighter' },
  { value: 1, label: 'still tense' },
];

interface PostSessionMoodProps {
  techniqueId: string;
  onDone: () => void;
}

export function PostSessionMood({ techniqueId, onDone }: PostSessionMoodProps) {
  const [phase, setPhase] = useState<'picking' | 'thanks'>('picking');
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 480 });
  }, []);

  function dismiss() {
    opacity.value = withTiming(0, { duration: 380 });
    setTimeout(onDone, 380);
  }

  async function handleMood(mood: MoodValue) {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    setPhase('thanks');
    appendMood(techniqueId, mood).catch(() => {});
    setTimeout(dismiss, 1600);
  }

  function handleSkip() {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    // Still send them off with the closing line rather than cutting straight out.
    setPhase('thanks');
    setTimeout(dismiss, 1600);
  }

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.overlay, wrapStyle]} pointerEvents="box-none">
      {phase === 'picking' ? (
        <View style={styles.card} pointerEvents="box-none">
          <Text style={styles.heading}>how does this feel?</Text>

          <View style={styles.moodList} accessibilityRole="radiogroup">
            {MOODS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => handleMood(value)}
                hitSlop={10}
                style={styles.moodRow}
                accessibilityRole="radio"
                accessibilityLabel={label}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: `hsl(${DOT_HUES[value - 1]}, 60%, 66%)` },
                  ]}
                />
                <Text style={styles.moodLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSkip} hitSlop={16}>
            <Text style={styles.skip}>skip</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.closing}>take this calm with you</Text>
      )}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
  },
  heading: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 36,
    letterSpacing: 0.2,
  },
  moodList: {
    alignItems: 'flex-start',
    gap: 22,
    marginBottom: 40,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    shadowColor: '#9b7fd4',
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  moodLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  skip: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  closing: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
