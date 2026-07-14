// The 20-minute break, from the Steady-yourself flow. A stressed body needs
// about twenty minutes for the flood of stress chemicals to clear, so the whole
// point is to step away — this screen just holds the time and calls her back.
// It reuses the app's calm language (gradient, breathing Orb, Poppins) rather
// than a clinical timer face, and schedules a one-off notification so leaving
// the app still brings her back. Returning to the flow resumes at the reflect
// step, whether the time ran out or she came back early.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CloseButton } from '@/components/CloseButton';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import {
  cancelBreakOver,
  ensureNotificationPermission,
  scheduleBreakOver,
} from '@/lib/notifications';
import { BREAK_PING_LINE, BREAK_TASK_LINE } from '@/v3/steady-yourself-content';

// The moon paces the same calm 4:6 breath as the home screen while she waits.
const BREATH_IN = 4;
const BREATH_OUT = 6;

const DEFAULT_MINUTES = 20;

function clockText(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

export default function SteadyBreakScreen() {
  const { minutes } = useLocalSearchParams<{ minutes?: string }>();
  const parsed = minutes != null ? Number.parseInt(minutes, 10) : NaN;
  const totalMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MINUTES;

  // Wall-clock based, not a tick counter: the whole point is that she puts the
  // phone down (backgrounding the app), and JS timers are suspended in the
  // background. So we fix the end moment once and always derive the remaining
  // time from the real clock — the countdown stays honest across backgrounding.
  const [endAt] = useState(() => Date.now() + totalMinutes * 60 * 1000);
  const remaining = () => Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState(remaining);
  const done = secondsLeft <= 0;

  // A gentle breath loop for the Orb, so the wait has a rhythm to rest on.
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');

  // Schedule the "your time is up" nudge once, so she can leave the app and
  // still be called back. Cancel it if this screen unmounts (came back early or
  // moved on) — a stale nudge after she's already returned would be noise.
  useEffect(() => {
    let alive = true;
    ensureNotificationPermission()
      .then((granted) => {
        if (alive && granted) return scheduleBreakOver(totalMinutes * 60);
      })
      .catch(() => {});
    return () => {
      alive = false;
      cancelBreakOver().catch(() => {});
    };
  }, [totalMinutes]);

  // The display tick, recomputed from the real clock each second.
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSecondsLeft(remaining()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remaining reads endAt (stable) + the live clock
  }, [done]);

  // Coming back from the background (she stepped away): snap to the real elapsed
  // time immediately, so a full 20 minutes away lands on "your twenty are up".
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setSecondsLeft(remaining());
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remaining reads endAt (stable) + the live clock
  }, []);

  useEffect(() => {
    if (done) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [done]);

  // Drive the breath phase on a 4:6 loop.
  useEffect(() => {
    if (done) return;
    const secs = phase === 'inhale' ? BREATH_IN : BREATH_OUT;
    const id = setTimeout(() => setPhase((p) => (p === 'inhale' ? 'exhale' : 'inhale')), secs * 1000);
    return () => clearTimeout(id);
  }, [phase, done]);

  const leave = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, []);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topBar}>
          <CloseButton onPress={leave} />
        </View>

        <View style={styles.center}>
          <View style={styles.orbWrap} pointerEvents="none">
            <Orb
              size={168}
              phase={phase}
              phaseDuration={phase === 'inhale' ? BREATH_IN : BREATH_OUT}
              breathRange={{ min: 0.8, max: 1.12 }}
            />
          </View>

          {!done ? (
            <>
              <Text style={styles.clock}>{clockText(secondsLeft)}</Text>
              <Text style={styles.caption}>{BREAK_TASK_LINE}</Text>
              <Text style={styles.captionSub}>{BREAK_PING_LINE}</Text>
            </>
          ) : (
            <Animated.View entering={FadeIn.duration(500)} style={styles.doneBlock}>
              <Text style={styles.doneLead}>Your twenty are up.</Text>
              <Text style={styles.caption}>The flood has had time to clear. Ready to start fresh?</Text>
            </Animated.View>
          )}
        </View>

        <View style={styles.footer}>
          {done ? (
            <BeginButton label="Start fresh" onPress={leave} fullWidth />
          ) : (
            <Pressable onPress={leave} hitSlop={10} accessibilityRole="button">
              <Text style={styles.early}>I am back early</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  orbWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  clock: {
    fontFamily: 'Poppins-Light',
    fontSize: 64,
    lineHeight: 72,
    color: colors.textPrimary,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 300,
  },
  captionSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textTagline,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 300,
    marginTop: 12,
  },
  doneBlock: { alignItems: 'center', gap: 10 },
  doneLead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footer: { paddingBottom: 12, alignItems: 'center', minHeight: 64, justifyContent: 'center' },
  early: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textTagline,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
    paddingVertical: 10,
  },
});
