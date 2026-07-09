/**
 * RingCelebration
 *
 * The bright counter-moment to the usual calm, dark session close. When a
 * session earns a new ring, light floods out from the Soul: a white-hot bloom
 * blooms from the orb, a sunburst flares, sparks fly outward in the ring's
 * colour, and the whole screen lifts from dark to lit — then settles into a
 * warm residual glow instead of snapping back to black.
 *
 * Rendered full-screen, beneath the orb + copy. Respects reduce motion: a
 * single soft bright fade, no sparks or rays.
 */

import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  /** Tier hue (matches tier.hue): tints the bloom, rays, and sparks. */
  hue: number;
  /** Vertical position of the burst origin, as a fraction of screen height. */
  originYFraction?: number;
};

const SPARK_COUNT = 28;
const BLOOM_R = 130;
const RAY_R = 240;

export function RingCelebration({ hue, originYFraction = 0.42 }: Props) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => active && setReduceMotion(r))
      .catch(() => active && setReduceMotion(false));
    return () => {
      active = false;
    };
  }, []);

  const originX = width * 0.5;
  const originY = height * originYFraction;

  const flash = useSharedValue(0);
  const bloomScale = useSharedValue(0.2);
  const bloomOpacity = useSharedValue(0);
  const raysScale = useSharedValue(0.3);
  const raysOpacity = useSharedValue(0);
  const raysSpin = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion === null) return;

    if (reduceMotion) {
      // Gentle: lift the screen out of the dark to a soft, steady glow.
      flash.value = withTiming(0.22, { duration: 700, easing: Easing.out(Easing.cubic) });
      bloomOpacity.value = withTiming(0.5, { duration: 700, easing: Easing.out(Easing.cubic) });
      bloomScale.value = withTiming(1.6, { duration: 900, easing: Easing.out(Easing.cubic) });
      return;
    }

    // Bright burst, then settle to a warm residual glow (never back to black).
    flash.value = withTiming(0.62, { duration: 170, easing: Easing.out(Easing.quad) });
    flash.value = withDelay(
      170,
      withTiming(0.16, { duration: 1500, easing: Easing.out(Easing.cubic) }),
    );

    bloomOpacity.value = withTiming(0.95, { duration: 220, easing: Easing.out(Easing.quad) });
    bloomOpacity.value = withDelay(
      220,
      withTiming(0, { duration: 1300, easing: Easing.out(Easing.cubic) }),
    );
    bloomScale.value = withTiming(3.1, { duration: 1450, easing: Easing.out(Easing.cubic) });

    raysOpacity.value = withTiming(0.55, { duration: 260, easing: Easing.out(Easing.quad) });
    raysOpacity.value = withDelay(
      260,
      withTiming(0, { duration: 1400, easing: Easing.out(Easing.cubic) }),
    );
    raysScale.value = withTiming(2.2, { duration: 1500, easing: Easing.out(Easing.cubic) });
    raysSpin.value = withTiming(22, { duration: 1600, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const bloomStyle = useAnimatedStyle(() => ({
    opacity: bloomOpacity.value,
    transform: [{ scale: bloomScale.value }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysOpacity.value,
    transform: [{ scale: raysScale.value }, { rotate: `${raysSpin.value}deg` }],
  }));

  // Stable spark seeds so each spark keeps its trajectory across re-renders.
  const sparks = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, (_, i) => ({
        key: i,
        angle: (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35,
        dist: 90 + Math.random() * 190,
        size: 4 + Math.random() * 6,
        delay: Math.random() * 130,
        dur: 900 + Math.random() * 650,
        light: 64 + Math.random() * 22,
        white: i % 4 === 0,
      })),
    [],
  );

  if (reduceMotion === null) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Screen lift: dark → lit, settling to a warm residual glow. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: `hsl(${hue}, 80%, 64%)` }, flashStyle]}
      />

      {/* Sunburst rays behind the bloom. */}
      {!reduceMotion && (
        <Animated.View
          style={[
            styles.centered,
            { left: originX - RAY_R, top: originY - RAY_R, width: RAY_R * 2, height: RAY_R * 2 },
            raysStyle,
          ]}
        >
          <Svg width={RAY_R * 2} height={RAY_R * 2}>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i / 16) * Math.PI * 2;
              const x2 = RAY_R + Math.cos(a) * RAY_R;
              const y2 = RAY_R + Math.sin(a) * RAY_R;
              return (
                <Line
                  key={i}
                  x1={RAY_R}
                  y1={RAY_R}
                  x2={x2}
                  y2={y2}
                  stroke={`hsl(${hue}, 90%, 82%)`}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>
        </Animated.View>
      )}

      {/* White-hot bloom from the orb. */}
      <Animated.View
        style={[
          styles.centered,
          { left: originX - BLOOM_R, top: originY - BLOOM_R, width: BLOOM_R * 2, height: BLOOM_R * 2 },
          bloomStyle,
        ]}
      >
        <Svg width={BLOOM_R * 2} height={BLOOM_R * 2}>
          <Defs>
            <RadialGradient id="bloom" cx={BLOOM_R} cy={BLOOM_R} r={BLOOM_R} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
              <Stop offset="0.32" stopColor={`hsl(${hue}, 95%, 82%)`} stopOpacity="0.9" />
              <Stop offset="0.7" stopColor={`hsl(${hue}, 85%, 60%)`} stopOpacity="0.25" />
              <Stop offset="1" stopColor={`hsl(${hue}, 80%, 55%)`} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={BLOOM_R} cy={BLOOM_R} r={BLOOM_R} fill="url(#bloom)" />
        </Svg>
      </Animated.View>

      {/* Sparks flying outward in the ring's colour. */}
      {!reduceMotion && (
        <View style={{ position: 'absolute', left: originX, top: originY }}>
          {sparks.map(({ key, ...s }) => (
            <Spark key={key} hue={hue} {...s} />
          ))}
        </View>
      )}
    </View>
  );
}

function Spark({
  hue,
  angle,
  dist,
  size,
  delay,
  dur,
  light,
  white,
}: {
  hue: number;
  angle: number;
  dist: number;
  size: number;
  delay: number;
  dur: number;
  light: number;
  white: boolean;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    const tx = Math.cos(angle) * dist * t;
    // A touch of gravity so the sparks arc as they fly.
    const ty = Math.sin(angle) * dist * t + t * t * 46;
    const opacity = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.2);
    return {
      opacity,
      transform: [{ translateX: tx }, { translateY: ty }, { scale: 1 - t * 0.6 }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: white ? '#ffffff' : `hsl(${hue}, 95%, ${light}%)`,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    position: 'absolute',
  },
});
