// Home + session orb. Ported from the Mac CSS recipe in
// niyora/app/src/App.css (.stress-ball + scoreToBallGradient at calm score).
//
// Mac CSS (calm score >= 80):
//   background: radial-gradient(circle at 35% 30%,
//     rgba(255,255,255,0.97) 0%,
//     hsla(220,25%,92%,0.95) 45%,
//     hsla(220,40%,72%,0.9) 100%);
//   box-shadow:
//     0 0 28px 4px hsla(220,55%,75%,0.5),     /* tight outer halo */
//     0 0 64px 16px hsla(220,50%,70%,0.2),    /* wide soft haze */
//     0 24px 50px rgba(0,0,0,0.4),            /* drop shadow */
//     inset -22px -18px 36px rgba(0,0,0,0.32),/* bottom-right shading */
//     inset 14px 10px 26px rgba(255,255,255,0.10); /* top-left inner */
//   ::after { radial-gradient(circle at 28% 22%,
//     rgba(255,255,255,0.45) 0%,
//     rgba(255,255,255,0.18) 14%,
//     transparent 42%); }
//
// RN has no radial gradients or inset box-shadows. We rebuild it with
// react-native-svg: the halo, the sphere body, the inset shading, the inset
// highlight, and the crescent rim each become their own layer, painted in the
// same order as the Mac CSS. Drop shadow stays a View shadow.
//
// Halo uses two Gaussian-blurred circles (tight glow + wide haze) rather than
// a radial-gradient ring, matching the Mac box-shadow layers and removing the
// seam at the sphere edge that a ring gradient produces.
//
// Pulse: scale 1.0 -> 1.04 over 5.5s ease-in-out. Respects reduce motion.

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, FeGaussianBlur, Filter, RadialGradient, Stop } from 'react-native-svg';

type OrbProps = {
  size?: number;
};

export function Orb({ size = 220 }: OrbProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      scale.value = withRepeat(
        withTiming(1.04, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    });
    return () => {
      cancelled = true;
    };
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Canvas is 1.8x the sphere so the outer halo has room to fade.
  const canvas = size * 1.8;
  const sphereRadius = size / 2;
  const center = canvas / 2;

  // Blur stdDeviation values scaled from Mac box-shadow blur radii
  // (28px tight, 64px wide) on a 220px-diameter orb.
  const tightBlur = size * 0.064;
  const wideBlur = size * 0.145;

  // Halo circle radii scaled from Mac box-shadow spread values
  // (4px tight, 16px wide) on a 220px-diameter orb.
  const tightHaloR = sphereRadius + size * 0.018;
  const wideHaloR = sphereRadius + size * 0.073;

  return (
    <View
      style={{
        width: canvas,
        height: canvas,
        alignItems: 'center',
        justifyContent: 'center',
      }}
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
            {/* Tight halo filter — blur=28px on 220px orb. filterUnits=userSpaceOnUse
                with full-canvas bounds prevents the blur from being clipped. */}
            <Filter
              id="tightHalo"
              x={0}
              y={0}
              width={canvas}
              height={canvas}
              filterUnits="userSpaceOnUse"
            >
              <FeGaussianBlur stdDeviation={tightBlur} />
            </Filter>

            {/* Wide haze filter — blur=64px on 220px orb. */}
            <Filter
              id="wideHaze"
              x={0}
              y={0}
              width={canvas}
              height={canvas}
              filterUnits="userSpaceOnUse"
            >
              <FeGaussianBlur stdDeviation={wideBlur} />
            </Filter>

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
              <Stop offset="0" stopColor="rgb(255, 255, 255)" stopOpacity="0.97" />
              <Stop offset="0.45" stopColor="hsl(220, 25%, 92%)" stopOpacity="0.95" />
              <Stop offset="1" stopColor="hsl(220, 40%, 72%)" stopOpacity="0.9" />
            </RadialGradient>

            {/* Inset darkening from bottom-right. Replaces
                `inset -22px -18px 36px rgba(0,0,0,0.32)`. */}
            <RadialGradient
              id="insetDark"
              cx={center + sphereRadius * 0.55}
              cy={center + sphereRadius * 0.45}
              r={sphereRadius * 1.05}
              fx={center + sphereRadius * 0.55}
              fy={center + sphereRadius * 0.45}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="rgb(0, 0, 0)" stopOpacity="0.32" />
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

          {/* Wide soft haze — outermost glow, drawn first so tight halo sits on top */}
          <Circle
            cx={center}
            cy={center}
            r={wideHaloR}
            fill="hsl(220, 50%, 70%)"
            fillOpacity={0.22}
            filter="url(#wideHaze)"
          />

          {/* Tight outer halo — sits just above the wide haze */}
          <Circle
            cx={center}
            cy={center}
            r={tightHaloR}
            fill="hsl(220, 55%, 75%)"
            fillOpacity={0.5}
            filter="url(#tightHalo)"
          />

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
