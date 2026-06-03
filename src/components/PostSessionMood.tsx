/**
 * PostSessionMood
 *
 * Gentle post-session check shown after every completed breath session.
 * Replaces the minimal "well done / take this calm with you" inline text.
 *
 * Flow: fades in -> user taps 1-5 dot or skip -> brief "thank you"
 * (on tap) -> fades out -> onDone() called so session.tsx can router.back().
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

// Dot hues: cool blue -> mid violet -> warm purple across positions 1..5
const DOT_HUES = [215, 240, 260, 278, 295] as const;

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

  async function handleDot(mood: MoodValue) {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    setPhase('thanks');
    appendMood(techniqueId, mood).catch(() => {});
    setTimeout(dismiss, 900);
  }

  function handleSkip() {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    dismiss();
  }

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.overlay, wrapStyle]} pointerEvents="box-none">
      <View style={styles.card}>
        {phase === 'picking' ? (
          <>
            <Text style={styles.eyebrow}>After breath</Text>
            <Text style={styles.heading}>How does this feel?</Text>

            <View style={styles.dotRow} accessibilityRole="radiogroup">
              {([1, 2, 3, 4, 5] as MoodValue[]).map((n) => (
                <Pressable
                  key={n}
                  onPress={() => handleDot(n)}
                  hitSlop={14}
                  accessibilityRole="radio"
                  accessibilityLabel={`Mood ${n} of 5`}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: `hsl(${DOT_HUES[n - 1]}, 52%, 62%)` },
                    ]}
                  />
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleSkip} hitSlop={16}>
              <Text style={styles.skip}>skip</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.thanks}>thank you</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 96,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 0,
  },
  eyebrow: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    marginBottom: 10,
  },
  heading: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 24,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#9b7fd4',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  skip: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  thanks: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
