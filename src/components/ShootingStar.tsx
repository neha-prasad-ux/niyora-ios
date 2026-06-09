// An occasional shooting star that streaks across the home "sky". A single
// reusable streak: it fires, arcs down across the upper portion of the screen
// over ~0.85s leaving a fading tail, then waits a random 7-20s and fires again
// from a new position/angle. Purely ambient — pointer-events off, and disabled
// when the OS reduce-motion setting is on.

import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Visual length of the streak (head + tail), in px.
const TAIL = 96;

export function ShootingStar() {
  const { width, height } = useWindowDimensions();

  // Path is set per-fire on the JS thread (Math.random not allowed in worklets)
  // and read by the animated style below.
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // dir = -1 → moves right-to-left (starts on the right); +1 → left-to-right.
    const runStreak = (dir: -1 | 1) => {
      const startX =
        dir < 0 ? width * (0.55 + Math.random() * 0.4) : width * (0.05 + Math.random() * 0.4);
      const startY = height * (0.06 + Math.random() * 0.24);
      const down = ((28 + Math.random() * 30) * Math.PI) / 180; // 28-58° below horizontal
      const dist = Math.hypot(width, height) * (0.3 + Math.random() * 0.22);
      const travelX = Math.cos(down) * dist * dir;
      const travelY = Math.sin(down) * dist;

      sx.value = startX;
      sy.value = startY;
      tx.value = travelX;
      ty.value = travelY;
      rot.value = Math.atan2(travelY, travelX);

      progress.value = 0;
      progress.value = withTiming(1, { duration: 850, easing: Easing.in(Easing.quad) });
      opacity.value = withSequence(
        withTiming(0.95, { duration: 120, easing: Easing.out(Easing.quad) }),
        withDelay(360, withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) })),
      );
    };

    // Scripted intro then alternating: #1 right→left at ~2s, #2 left→right at
    // ~6s, then keep swapping direction on a random quiet gap.
    let count = 0;
    const tick = () => {
      if (cancelled) return;
      runStreak(count % 2 === 0 ? -1 : 1);
      count += 1;
      const nextDelay = count === 1 ? 4000 : 7000 + Math.random() * 9000;
      timer = setTimeout(tick, nextDelay);
    };

    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (cancelled || rm) return;
      timer = setTimeout(tick, 2000); // first streak at ~2s
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimation(progress);
      cancelAnimation(opacity);
    };
  }, [width, height]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: sx.value + progress.value * tx.value },
      { translateY: sy.value + progress.value * ty.value },
      { rotateZ: `${rot.value}rad` },
    ],
  }));

  return (
    <Animated.View style={[styles.star, style]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.tail}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Soft white glow around the streak.
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  tail: {
    width: TAIL,
    height: 2.5,
    borderRadius: 2,
  },
});
