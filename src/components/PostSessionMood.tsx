/**
 * PostSessionMood
 *
 * Gentle post-session check shown after every completed session (breath or
 * mindfulness). Sits centred over the SessionDoneBackdrop (dark-blue gradient +
 * white falling particles).
 *
 * Closes the loop: when the session was reached via the "recommend by feeling"
 * flow, the entering `feeling` is saved alongside the resulting mood so we can
 * later recommend better (emotion -> recommendation -> impact). Local-only.
 *
 * Flow: fades in -> user taps a mood chip (or skip) -> brief "saved to calm you
 * better" with a soft pulsing dot -> "take this calm with you / come back soon"
 * -> fades out -> onDone() so the screen can go back.
 */

import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { appendMood, type MoodValue } from '@/store/mood-history';
import { colors } from '@/theme/colors';

// Dot hues across positions 1..5 (still tense -> at peace): warm purple for
// tension, cooling to calm blue at peace. Blue is the calm end everywhere.
const DOT_HUES = [295, 278, 260, 240, 215] as const;

// Lightest feeling first, heaviest last.
const MOODS: { value: MoodValue; label: string }[] = [
  { value: 5, label: 'at peace' },
  { value: 4, label: 'calm' },
  { value: 3, label: 'settling' },
  { value: 2, label: 'lighter' },
  { value: 1, label: 'still tense' },
];

type Phase = 'picking' | 'saving' | 'closing';

interface PostSessionMoodProps {
  techniqueId: string;
  feeling?: string;
  onDone: () => void;
}

export function PostSessionMood({ techniqueId, feeling, onDone }: PostSessionMoodProps) {
  const [phase, setPhase] = useState<Phase>('picking');
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 480 });
  }, []);

  function dismiss() {
    opacity.value = withTiming(0, { duration: 380 });
    setTimeout(onDone, 380);
  }

  function runSavedSequence() {
    // "saved to calm you better" (with the pulsing dot) -> closing lines -> out.
    setPhase('saving');
    setTimeout(() => setPhase('closing'), 1300);
    setTimeout(dismiss, 3100);
  }

  function handleMood(mood: MoodValue) {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    appendMood(techniqueId, mood, feeling).catch(() => {});
    runSavedSequence();
  }

  function handleSkip() {
    if (phase !== 'picking') return;
    Haptics.selectionAsync();
    // Still send them off softly rather than cutting straight out.
    setPhase('closing');
    setTimeout(dismiss, 1800);
  }

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.overlay, wrapStyle]} pointerEvents="box-none">
      {phase === 'picking' && (
        <View style={styles.card} pointerEvents="box-none">
          <Text style={styles.heading}>how does this feel?</Text>

          <View style={styles.chipWrap} accessibilityRole="radiogroup">
            {MOODS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => handleMood(value)}
                hitSlop={6}
                style={styles.chip}
                accessibilityRole="radio"
                accessibilityLabel={label}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: `hsl(${DOT_HUES[value - 1]}, 60%, 66%)` },
                  ]}
                />
                <Text style={styles.chipLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={handleSkip} hitSlop={16}>
            <Text style={styles.skip}>skip</Text>
          </Pressable>
        </View>
      )}

      {phase === 'saving' && (
        <View style={styles.savedWrap}>
          <PulsingDot />
          <Text style={styles.saved}>saved to calm you better</Text>
        </View>
      )}

      {phase === 'closing' && (
        <View style={styles.closingWrap}>
          <Text style={styles.closing}>take this calm with you</Text>
          <Text style={styles.closingSub}>come back soon</Text>
        </View>
      )}
    </Animated.View>
  );
}

// Soft breathing dot used during the "saved" beat.
function PulsingDot() {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  return <Animated.View style={[styles.pulseDot, dotStyle]} />;
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
    paddingHorizontal: 24,
  },
  heading: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 36,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#9b7fd4',
    shadowOpacity: 0.55,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  chipLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  skip: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  savedWrap: {
    alignItems: 'center',
    gap: 20,
  },
  pulseDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'hsl(265, 60%, 70%)',
    shadowColor: '#9b7fd4',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  saved: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  closingWrap: {
    alignItems: 'center',
    gap: 10,
  },
  closing: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  closingSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
