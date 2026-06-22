// Nudge experience: the what-to-do, the benefit, an optional "the science", and
// either a gentle countdown (for timed nudges) or a soft Done (for instant
// ones like cave mode). Calm, one screen.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from './ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = { activity: Activity; onComplete: () => void };

export function NudgeView({ activity, onComplete }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [running, setRunning] = useState(false);
  const timed = activity.timeSeconds > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.body}>
        <Text style={styles.title}>{activity.title}</Text>
        {activity.how ? <Text style={styles.how}>{activity.how}</Text> : null}
        <Text style={styles.benefit}>{activity.benefit}</Text>

        <Pressable
          onPress={() => setShowWhy((s) => !s)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="The science"
        >
          <Text style={styles.science}>the science {showWhy ? '–' : '+'}</Text>
        </Pressable>
        {showWhy ? <Text style={styles.why}>{activity.why}</Text> : null}
      </View>

      <View style={styles.actions}>
        {running ? (
          <Countdown seconds={activity.timeSeconds} onFinish={onComplete} />
        ) : null}
        {timed && !running ? (
          <Pill label="Start" onPress={() => setRunning(true)} />
        ) : null}
        <Pill
          label={running ? "I'm done" : timed ? 'Skip' : 'Done'}
          variant={running || timed ? 'ghost' : 'primary'}
          onPress={onComplete}
        />
      </View>
    </View>
  );
}

const RING = 96;
const STROKE = 4;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

function Countdown({ seconds, onFinish }: { seconds: number; onFinish: () => void }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0); // 0 -> 1 over the duration
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!reduced) {
      progress.value = withTiming(1, { duration: seconds * 1000, easing: Easing.linear });
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onFinish();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // run once for this countdown
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: C * progress.value,
  }));

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const label = mm > 0 ? `${mm}:${ss.toString().padStart(2, '0')}` : `${ss}`;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING} height={RING}>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="rgba(196, 178, 255, 0.9)"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          animatedProps={ringProps}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <Text style={styles.ringText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'space-between', paddingBottom: 8 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  how: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginTop: 18,
  },
  benefit: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 16,
  },
  science: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(196, 178, 255, 0.85)',
    textAlign: 'center',
    marginTop: 26,
    letterSpacing: 0.5,
  },
  why: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 6,
  },
  actions: { alignItems: 'center', gap: 14 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringText: {
    position: 'absolute',
    fontFamily: 'Poppins-Light',
    fontSize: 26,
    color: colors.textPrimary,
  },
});
