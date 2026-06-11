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

import { alternate } from '@/models/recommend';
import { getSessionCount } from '@/store/session-history';
import { colors } from '@/theme/colors';

type Phase = 'first' | 'asking' | 'better' | 'another';

interface PostSessionMoodProps {
  techniqueId: string;
  feeling?: string;
  onDone: () => void;
}

export function PostSessionMood({ techniqueId, feeling, onDone }: PostSessionMoodProps) {
  const [phase, setPhase] = useState<Phase>('asking');
  const opacity = useSharedValue(0);
  // Track pending timers so a back-tap (unmount) during a hold cannot fire a
  // late navigation or onDone on a dead screen.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const wait = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 480 });
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
      {phase === 'first' && (
        <View style={styles.card}>
          <Text style={[styles.heading, styles.firstHeading]}>Congratulations.</Text>
          <Text style={styles.closing}>Your first breath with Niyora.</Text>
        </View>
      )}

      {phase === 'asking' && (
        <View style={styles.card}>
          <Text style={styles.heading}>Feel better?</Text>
          <View style={styles.buttons}>
            <Pressable
              onPress={handleBetter}
              hitSlop={8}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityRole="button"
              accessibilityLabel="Yes, I feel better"
            >
              <Text style={styles.btnPrimaryText}>Yes</Text>
            </Pressable>
            <Pressable
              onPress={handleAnother}
              hitSlop={8}
              style={styles.btn}
              accessibilityRole="button"
              accessibilityLabel="Try another"
            >
              <Text style={styles.btnText}>Wanna try another?</Text>
            </Pressable>
          </View>
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
  heading: {
    fontFamily: 'Poppins-Light',
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
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 26,
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
