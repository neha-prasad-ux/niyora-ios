// Home + session orb. Ported from the Mac CSS recipe in
// niyora/app/src/App.css (.stress-ball + scoreToBallGradient at calm score).
//
// Mac reveal-orb (resting state):
//   background: radial-gradient(circle at 35% 30%,
//     hsla(280,82%,86%,.96) 0%,
//     hsla(280,65%,56%,.86) 42%,
//     hsla(265,55%,30%,.92) 100%);
//   box-shadow: 0 0 40px 12px hsla(280,65%,55%,.46), /* violet halo */
//     0 24px 50px rgba(0,0,0,0.4),
//     inset -22px -18px 36px rgba(0,0,0,0.34),
//     inset 14px 10px 26px rgba(255,255,255,0.10);
//   ::after { radial-gradient(circle at 28% 22%,
//     rgba(255,255,255,0.45) 0%,
//     rgba(255,255,255,0.18) 14%,
//     transparent 42%); }
//
// RN has no radial gradients or inset box-shadows. We rebuild it with
// react-native-svg: the halo, the sphere body, the inset shading, the inset
// highlight, and the crescent rim each become their own radial gradient,
// layered in the same order as the Mac CSS. Drop shadow stays a View shadow.
//
// Pulse: normalised to ~6px absolute radius change per breath so smaller orbs
// breathe as clearly as the home orb. Formula: 1 + 12/size (≈1.055 at 220px,
// ≈1.11 at 110px). 5.5s ease-in-out. Respects reduce motion.

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

type OrbProps = {
  size?: number;
  /**
   * Number of Saturn-style rings to draw at the equator.
   * 0 = none (home orb stays ring-free); 1 = Glow, 2 = Shine,
   * 3 = Radiance, 4 = Brilliance. Matches Mac tierRingCount().
   */
  tierRingCount?: number;
  /**
   * HSL hue used to tint the rings (matches tier.hue from tiers.ts).
   * Only used when tierRingCount > 0.
   */
  tierHue?: number;
};

export function Orb({ size = 220, tierRingCount = 0, tierHue = 335 }: OrbProps) {
  const scale = useSharedValue(1);
  // Normalise amplitude so both 220px and 110px orbs have ~6px radius travel.
  const scaleMax = 1 + 12 / size;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      scale.value = withRepeat(
        withTiming(scaleMax, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    });
    return () => {
      cancelled = true;
    };
  }, [scale, scaleMax]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Canvas is 1.8x the sphere so the outer halo has room to fade.
  const canvas = size * 1.8;
  const sphereRadius = size / 2;
  const center = canvas / 2;

  // Ring geometry — matches Mac tierRingCount() proportions.
  // rx wider than sphere so arcs peek out on each side (Saturn effect).
  // Sphere body circles drawn on top occlude the ring centres.
  const ringRx = sphereRadius * 1.45;
  const ringRy = sphereRadius * 0.20;
  const ringSpacing = size * 0.07;
  const ringColor = `hsl(${tierHue}, 70%, 75%)`;

  return (
    <View
      style={{
        width: canvas,
        height: canvas,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: canvas,
            height: canvas,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 24 },
            shadowOpacity: 0.4,
            shadowRadius: 25,
          },
        ]}
      >
        <Svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`}>
          <Defs>
            {/* Outer halo. Mirrors the violet glow on the Mac reveal-orb. */}
            <RadialGradient
              id="halo"
              cx={center}
              cy={center}
              r={sphereRadius * 1.7}
              fx={center}
              fy={center}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.55" stopColor="hsl(280, 65%, 55%)" stopOpacity="0" />
              <Stop offset="0.62" stopColor="hsl(280, 65%, 55%)" stopOpacity="0.46" />
              <Stop offset="0.72" stopColor="hsl(280, 65%, 55%)" stopOpacity="0.22" />
              <Stop offset="1" stopColor="hsl(280, 65%, 55%)" stopOpacity="0" />
            </RadialGradient>

            {/* Sphere body. radial-gradient circle at 35% 30%, three stops. */}
            <RadialGradient
              id="body"
              cx={center - sphereRadius * 0.30}
              cy={center - sphereRadius * 0.40}
              r={sphereRadius * 1.3}
              fx={center - sphereRadius * 0.30}
              fy={center - sphereRadius * 0.40}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="hsl(280, 82%, 86%)" stopOpacity="0.96" />
              <Stop offset="0.42" stopColor="hsl(280, 65%, 56%)" stopOpacity="0.86" />
              <Stop offset="1" stopColor="hsl(265, 55%, 30%)" stopOpacity="0.92" />
            </RadialGradient>

            {/* Inset darkening from bottom-right. Replaces
                `inset -22px -18px 36px rgba(0,0,0,0.34)`. */}
            <RadialGradient
              id="insetDark"
              cx={center + sphereRadius * 0.55}
              cy={center + sphereRadius * 0.45}
              r={sphereRadius * 1.05}
              fx={center + sphereRadius * 0.55}
              fy={center + sphereRadius * 0.45}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="rgb(0, 0, 0)" stopOpacity="0.34" />
              <Stop offset="0.75" stopColor="rgb(0, 0, 0)" stopOpacity="0" />
            </RadialGradient>

            {/* Inset highlight from top-left. Replaces
                `inset 14px 10px 26px rgba(255,255,255,0.10)`. */}
            <RadialGradient
              id="insetLight"
              cx={center - sphereRadius * 0.5}
              cy={center - sphereRadius * 0.55}
              r={sphereRadius * 0.9}
              fx={center - sphereRadius * 0.5}
              fy={center - sphereRadius * 0.55}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="rgb(255, 255, 255)" stopOpacity="0.10" />
              <Stop offset="0.8" stopColor="rgb(255, 255, 255)" stopOpacity="0" />
            </RadialGradient>

            {/* Crescent rim highlight at 28% 22%. Three stops, falls off at
                42% of its own radius — matches the Mac ::after layer. */}
            <RadialGradient
              id="crescent"
              cx={center - sphereRadius * 0.44}
              cy={center - sphereRadius * 0.56}
              r={sphereRadius * 0.95}
              fx={center - sphereRadius * 0.44}
              fy={center - sphereRadius * 0.56}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="rgb(255, 255, 255)" stopOpacity="0.45" />
              <Stop offset="0.14" stopColor="rgb(255, 255, 255)" stopOpacity="0.18" />
              <Stop offset="0.42" stopColor="rgb(255, 255, 255)" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Halo (sits beneath everything) */}
          <Circle cx={center} cy={center} r={sphereRadius * 1.7} fill="url(#halo)" />

          {/* Tier rings — drawn before sphere body so the body circles cover
              the ring centres, leaving only the outer arcs visible (Saturn). */}
          {tierRingCount > 0 &&
            Array.from({ length: tierRingCount }).map((_, i) => {
              const totalSpan = (tierRingCount - 1) * ringSpacing;
              const yOff = i * ringSpacing - totalSpan / 2;
              return (
                <Ellipse
                  key={i}
                  cx={center}
                  cy={center + yOff}
                  rx={ringRx}
                  ry={ringRy}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={1.5}
                  strokeOpacity={0.72}
                />
              );
            })}

          {/* Sphere body */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#body)" />

          {/* Inset shading + highlight, clipped naturally because we draw
              circles of the same sphere radius on top. */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#insetDark)" />
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#insetLight)" />

          {/* Crescent rim highlight on top */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#crescent)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
