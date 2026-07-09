// Nudge experience: the what-to-do, the benefit, an optional "the science", and
// either a gentle countdown (for timed nudges) or a soft Done (for instant
// ones like cave mode). Calm, one screen.

import { useEffect, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
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
import { Pill } from '@/components/Pill';
import { posesFor } from '@/components/activity/pose-images';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Activities that chant along to a looping voice clip while the timer runs.
const OM_SOURCE = require('../../../assets/audio/voice/om.m4a');

type Props = { activity: Activity; onComplete: () => void };

export function NudgeView({ activity, onComplete }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const [running, setRunning] = useState(false);
  const timed = activity.timeSeconds > 0;
  const poses = posesFor(activity.id);
  const chant = activity.id === 'om-chant';

  // End the practice: stop the timer (which silences the chant audio, since it
  // follows `running`) and close out.
  const finish = () => {
    setRunning(false);
    onComplete();
  };

  const Why = activity.why ? (
    <>
      <Pressable
        onPress={() => setShowWhy((s) => !s)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="The science"
      >
        <Text style={styles.science}>the science {showWhy ? '–' : '+'}</Text>
      </Pressable>
      {showWhy ? <Text style={styles.why}>{activity.why}</Text> : null}
    </>
  ) : null;

  return (
    <View style={styles.wrap}>
      {chant ? <ChantAudio active={running} /> : null}
      {poses ? (
        <View style={styles.poseBody}>
          <View style={styles.poseHead}>
            <Text style={styles.title}>{activity.title}</Text>
            {activity.how ? <Text style={styles.poseHow}>{activity.how}</Text> : null}
          </View>
          <PoseStrip poses={poses} />
          <View style={styles.poseFoot}>
            <Text style={styles.benefit}>{activity.benefit}</Text>
            {Why}
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.title}>{activity.title}</Text>
          {activity.how ? <Text style={styles.how}>{activity.how}</Text> : null}
          <Text style={styles.benefit}>{activity.benefit}</Text>
          {Why}
        </View>
      )}

      <View style={styles.actions}>
        {running ? (
          <Countdown seconds={activity.timeSeconds} onFinish={finish} />
        ) : null}
        {timed && !running ? (
          <Pill label="Start" onPress={() => setRunning(true)} />
        ) : null}
        <Pill
          label={running ? "I'm done" : timed ? 'Skip' : 'Done'}
          variant={running || timed ? 'ghost' : 'solid'}
          onPress={running ? finish : onComplete}
        />
      </View>
    </View>
  );
}

// Loops Neha's om clip while the chant timer runs, layered over silence (no
// other audio plays during an activity). Its own player, so there's no source
// swapping to race; pauses when the timer stops and releases on unmount.
function ChantAudio({ active }: { active: boolean }) {
  const player = useAudioPlayer(OM_SOURCE);
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
      () => {},
    );
  }, []);
  useEffect(() => {
    player.loop = true;
    player.volume = 1;
    if (active) {
      player.seekTo(0);
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);
  return null;
}

// The pose figures for a movement nudge. A single wide drawing (which carries
// both views) shows full width with no pager; multiple figures become a
// snap-scrolling strip with peeking neighbours and a dot to show there's more.
function PoseStrip({ poses }: { poses: ImageSourcePropType[] }) {
  const { width } = useWindowDimensions();
  const [active, setActive] = useState(0);
  const single = poses.length === 1;

  const avail = width - 48; // matches activity.tsx safe horizontal padding (24 each side)
  const cardW = single ? avail : Math.round(avail * 0.66);
  const cardH = single ? 210 : 320;
  const step = cardW + POSE_GAP;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / step);
    setActive(Math.max(0, Math.min(poses.length - 1, i)));
  };

  return (
    <View style={styles.stripWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={single ? undefined : step}
        decelerationRate="fast"
        scrollEnabled={!single}
        onMomentumScrollEnd={single ? undefined : onScroll}
        contentContainerStyle={styles.stripContent}
      >
        {poses.map((src, i) => (
          <View key={i} style={[styles.poseCard, { width: cardW, height: cardH }]}>
            <Image source={src} style={styles.poseImage} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>
      {single ? null : (
        <View style={styles.dots}>
          {poses.map((_, i) => (
            <View key={i} style={[styles.dot, i === active ? styles.dotOn : null]} />
          ))}
        </View>
      )}
    </View>
  );
}

const POSE_GAP = 12;

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
  poseBody: { flex: 1, justifyContent: 'space-between', paddingTop: 8 },
  poseHead: { alignItems: 'center', paddingHorizontal: 8 },
  poseHow: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    marginTop: 12,
  },
  poseFoot: { alignItems: 'center', paddingHorizontal: 8 },
  stripWrap: { alignItems: 'center', gap: 16 },
  stripContent: { paddingHorizontal: 4, gap: POSE_GAP },
  poseCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  poseImage: { width: '100%', height: '100%' },
  dots: { flexDirection: 'row', gap: 7 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotOn: { backgroundColor: 'rgba(196,178,255,0.9)' },
  actions: { alignItems: 'center', gap: 14 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringText: {
    position: 'absolute',
    fontFamily: 'Poppins-Light',
    fontSize: 26,
    color: colors.textPrimary,
  },
});
