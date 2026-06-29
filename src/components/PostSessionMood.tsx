/**
 * PostSessionMood
 *
 * The close of every session, shown over the SessionDoneBackdrop (dark-blue
 * gradient + gentle falling snow particles).
 *
 * "Feel better?" -> "Yes" carries the calm and goes home. "Wanna try another?"
 * holds the moment, then starts a different technique for the same feeling. The
 * second option is an invitation, never a verdict: the user never has to report
 * that it did not work.
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Orb } from '@/components/orb';
import { ReflectionFlow } from '@/components/reflection-flow';
import { alternate } from '@/models/recommend';
import { TIER_RING_COUNTS, SOUL_RING_HUES, type Tier } from '@/models/tiers';
import { getSessionCount } from '@/store/session-history';
import { colors } from '@/theme/colors';

type Phase = 'first' | 'asking' | 'reflect' | 'better' | 'another' | 'ring' | 'ringClosing';

// "Still feeling a little ___": the feeling she chose, or a soft fallback.
function stillFeelingLabel(feeling?: string): string {
  return feeling ? `Still feeling a little ${feeling}` : 'Still feeling a little off';
}

interface PostSessionMoodProps {
  techniqueId: string;
  feeling?: string;
  /**
   * The tier newly reached by the session that just finished, if it crossed a
   * threshold (5/15/40/80). When set, the close becomes the ring-earned
   * celebration instead of the usual "Feel better?" beat.
   */
  earnedTier?: Tier | null;
  onDone: () => void;
}

export function PostSessionMood({ techniqueId, feeling, earnedTier, onDone }: PostSessionMoodProps) {
  // Crossing a tier opens straight into the ring celebration; everyone else
  // starts on the usual "Feel better?" beat. Set at mount so we never flip
  // phase synchronously inside an effect.
  const [phase, setPhase] = useState<Phase>(() => (earnedTier ? 'ring' : 'asking'));
  // CBT is offered once per journey; after she reflects, the second option
  // becomes "try a different activity" instead.
  const [hasReflected, setHasReflected] = useState(false);
  const opacity = useSharedValue(0);
  // Track pending timers so a back-tap (unmount) during a hold cannot fire a
  // late navigation or onDone on a dead screen.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wait = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 480 });
    // Crossing a tier (earning a ring) owns the close: the phase already opened
    // on 'ring', so here we just mark it with a warm, affirming pulse. It
    // replaces the usual "Feel better?" question on that rare session.
    if (earnedTier) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return () => {
        timers.current.forEach(clearTimeout);
      };
    }
    // First-ever completion gets an aha beat before the usual close. The 500ms
    // gap before this overlay mounts means the session is already counted, so
    // count === 1 is reliably "their first."
    getSessionCount()
      .then((n) => {
        if (n === 1) {
          setPhase('first');
          wait(() => setPhase('asking'), 2600);
        }
      })
      .catch(() => {});
    return () => {
      timers.current.forEach(clearTimeout);
    };
  }, []);

  function dismiss() {
    opacity.value = withTiming(0, { duration: 380 });
    wait(onDone, 380);
  }

  function handleBetter() {
    if (phase !== 'asking') return;
    Haptics.selectionAsync();
    // Snow keeps falling behind; we just carry the calm and leave.
    setPhase('better');
    wait(dismiss, 1800);
  }

  function handleRingContinue() {
    if (phase !== 'ring') return;
    Haptics.selectionAsync();
    // "I'm in" is a warm close, not a commitment screen: acknowledge, then home.
    setPhase('ringClosing');
    wait(dismiss, 1500);
  }

  function handleReflect() {
    if (phase !== 'asking') return;
    Haptics.selectionAsync();
    setPhase('reflect');
  }

  function handleAnother() {
    if (phase !== 'asking') return;
    Haptics.selectionAsync();
    setPhase('another');
    wait(() => {
      const alt = alternate(feeling, techniqueId);
      if (!alt) {
        dismiss();
        return;
      }
      const params: Record<string, string> = { id: alt.techniqueId };
      if (alt.feelingId) params.feeling = alt.feelingId;
      if (alt.rounds != null) params.rounds = String(alt.rounds);
      router.replace({ pathname: '/session', params });
    }, 1500);
  }

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.overlay, wrapStyle]} pointerEvents="box-none">
      {phase === 'ring' && earnedTier && (
        <View style={styles.ringCard}>
          <Orb
            size={132}
            tierRingCount={TIER_RING_COUNTS[earnedTier.id] ?? 0}
            tierHue={earnedTier.hue}
            ringHues={SOUL_RING_HUES}
            accumulate
          />
          <Text style={styles.ringHeading}>
            {(TIER_RING_COUNTS[earnedTier.id] ?? 0) <= 1
              ? 'You earned your first ring.'
              : 'You earned a new ring.'}
          </Text>
          <Text style={[styles.ringTier, { color: `hsl(${earnedTier.hue}, 70%, 75%)` }]}>
            {earnedTier.name}
          </Text>
          <Text style={styles.ringQuestion}>Keep helping your body?</Text>
          <Pressable
            onPress={handleRingContinue}
            hitSlop={8}
            style={[styles.btn, styles.btnPrimary, styles.ringButton]}
            accessibilityRole="button"
            accessibilityLabel="I'm in"
          >
            <Text style={styles.btnPrimaryText}>I&apos;m in</Text>
          </Pressable>
        </View>
      )}

      {phase === 'ringClosing' && (
        <Text style={styles.closing}>Carry this calm with you.</Text>
      )}

      {phase === 'first' && (
        <View style={styles.card}>
          <Text style={[styles.heading, styles.firstHeading]}>Congratulations.</Text>
          <Text style={styles.closing}>Your first breath with Niyora.</Text>
        </View>
      )}

      {phase === 'asking' && (
        <View style={styles.card}>
          <Text style={styles.heading}>How are you feeling now?</Text>
          <View style={styles.optionList}>
            <Pressable
              onPress={handleBetter}
              style={[styles.optionCard, styles.optionGreat]}
              accessibilityRole="button"
              accessibilityLabel="I feel great"
            >
              <Text style={styles.optionTitle}>I feel great</Text>
              <Text style={styles.optionSub}>The activity helped.</Text>
            </Pressable>
            {hasReflected ? (
              <Pressable
                onPress={handleAnother}
                style={[styles.optionCard, styles.optionSecondary]}
                accessibilityRole="button"
                accessibilityLabel="Try a different activity"
              >
                <Text style={styles.optionTitle}>Try a different activity</Text>
                <Text style={styles.optionSub}>Carry what you found into the next one.</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleReflect}
                style={[styles.optionCard, styles.optionSecondary]}
                accessibilityRole="button"
                accessibilityLabel={stillFeelingLabel(feeling)}
              >
                <Text style={styles.optionTitle}>{stillFeelingLabel(feeling)}</Text>
                <Text style={styles.optionSub}>Let&apos;s reflect on the feeling to heal.</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {phase === 'reflect' && (
        <View style={styles.reflectFill}>
          <ReflectionFlow
            feeling={feeling}
            recordOnComplete
            onComplete={() => {
              setHasReflected(true);
              setPhase('asking');
            }}
          />
        </View>
      )}

      {phase === 'better' && (
        <Text style={styles.closing}>Carry this calm with you.</Text>
      )}

      {phase === 'another' && <Text style={styles.closing}>You have got this</Text>}
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
    paddingHorizontal: 24,
  },
  ringCard: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ringHeading: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  ringTier: {
    fontFamily: 'Poppins-Medium',
    fontSize: 26,
    letterSpacing: 0.4,
    marginTop: 6,
  },
  ringQuestion: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginTop: 18,
    marginBottom: 26,
    textAlign: 'center',
  },
  ringButton: {
    minWidth: 200,
  },
  heading: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.textPrimary,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  // The first-completion congrats sits close to its sub line, not button-spaced.
  firstHeading: {
    marginBottom: 12,
  },
  buttons: {
    alignItems: 'center',
    gap: 14,
  },
  // The two-option "How are you feeling now?" cards.
  optionList: {
    width: 300,
    gap: 14,
    marginTop: 4,
  },
  optionCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 26,
    borderCurve: 'continuous',
  },
  optionGreat: {
    backgroundColor: 'rgba(64, 104, 150, 0.26)',
  },
  optionSecondary: {
    backgroundColor: 'rgba(124, 74, 176, 0.28)',
  },
  optionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  optionSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.62)',
    marginTop: 4,
  },
  reflectFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    minWidth: 200,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: 'rgba(255, 255, 255, 0.30)',
  },
  btnPrimaryText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  btnText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.3,
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
