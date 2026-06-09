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
//
// Halo swell: an animated SVG Circle carries an `opacity` prop (0.7→1.0) that
// swells in sync with the scale, giving a gentle glow-on-inhale quality.
//
// Session mode: when `phase` + `phaseDuration` are supplied, the orb drives
// from the breath cadence via withTiming instead of the continuous home loop.
// inhale → scale expands + halo brightens, exhale → scale contracts + halo
// dims, hold → animation is cancelled and the orb holds its current state.

import { useEffect } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Half-ellipse arc paths around (cx, cy). SVG y is down, so sweep-flag 0 traces
// the top (the ring's far side, drawn behind the sphere) and sweep-flag 1 the
// bottom (the near side, drawn in front) — the Saturn front-over/back-behind cue.
function backArc(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx},${cy} A ${rx},${ry} 0 0 0 ${cx + rx},${cy}`;
}
function frontArc(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx},${cy} A ${rx},${ry} 0 0 1 ${cx + rx},${cy}`;
}

// Half the Ramanujan ellipse perimeter — the length of one (top or bottom) arc.
function halfArcLength(rx: number, ry: number): number {
  const p = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  return p / 2;
}

// One ring arc that "draws on" via strokeDashoffset as `reveal` advances.
// `lead` delays the front halves so the band closes around the front last.
function RingArc({
  d,
  length,
  reveal,
  lead,
  stroke,
  strokeWidth,
  opacity,
}: {
  d: string;
  length: number;
  reveal: SharedValue<number>;
  lead: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}) {
  const dashProps = useAnimatedProps(() => {
    const p = Math.max(0, Math.min(1, reveal.value * 1.7 - lead));
    return { strokeDashoffset: length * (1 - p) };
  });
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      opacity={opacity}
      strokeDasharray={length}
      animatedProps={dashProps}
    />
  );
}

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
  /**
   * Current breath phase. When supplied the animation is driven by the
   * breath cadence rather than the continuous home loop.
   */
  phase?: 'inhale' | 'hold' | 'exhale';
  /**
   * Duration of the current phase in seconds. Sizes the withTiming call
   * when phase changes in session mode.
   */
  phaseDuration?: number;
  /**
   * Increment this value to replay the ring reveal sweep (e.g. on orb tap).
   * Has no effect when tierRingCount === 0.
   */
  revealKey?: number;
  /**
   * Draw two diagonal "protection" rings that wrap the orb in 3D (back-half
   * behind the sphere, front-half over it) and draw on once on mount. Used by
   * the onboarding privacy beat.
   */
  shield?: boolean;
};

export function Orb({ size = 220, tierRingCount = 0, tierHue = 335, phase, phaseDuration, revealKey, shield = false }: OrbProps) {
  const scale = useSharedValue(1);
  const haloOpacity = useSharedValue(0.6);
  // Ring reveal: sweeps the band in from the back and closes it around the
  // front. 0 = hidden, 1 = fully drawn. Replays whenever the tier changes.
  const reveal = useSharedValue(0);
  // Protection-ring draw-on: 0 = hidden, 1 = fully wrapped.
  const shieldReveal = useSharedValue(0);
  // Normalise so the breath is a clearly visible ~10px radius travel at any size
  // (the Mac stress-ball breathes ~scale 1.04; we read it a touch larger so the
  // motion is obvious on a phone, not a near-still orb).
  const scaleMax = 1 + 20 / size;
  const sessionMode = phase !== undefined;

  // Home mode: continuous ease-in-out breath (scale + halo swell together) at a
  // calm ~4.2s cadence so it reads as breathing, not static.
  useEffect(() => {
    if (sessionMode) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      scale.value = withRepeat(
        withTiming(scaleMax, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      haloOpacity.value = withRepeat(
        withTiming(1.0, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    });
    return () => {
      cancelled = true;
    };
  }, [sessionMode, scale, scaleMax, haloOpacity]);

  // Session mode: trigger a UI-thread withTiming whenever the phase changes so
  // the orb visually inhales and exhales with the guidance at 60fps.
  useEffect(() => {
    if (!sessionMode) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const dur = (phaseDuration ?? 4) * 1000;
      if (phase === 'inhale') {
        scale.value = withTiming(scaleMax, { duration: dur, easing: Easing.out(Easing.sin) });
        haloOpacity.value = withTiming(1.0, { duration: dur, easing: Easing.out(Easing.sin) });
      } else if (phase === 'exhale') {
        scale.value = withTiming(1, { duration: dur, easing: Easing.in(Easing.sin) });
        haloOpacity.value = withTiming(0.7, { duration: dur, easing: Easing.in(Easing.sin) });
      } else {
        // Hold: cancel any in-progress tween so the orb rests at its current value.
        cancelAnimation(scale);
        cancelAnimation(haloOpacity);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase, phaseDuration, sessionMode, scale, scaleMax, haloOpacity]);

  // Reveal sweep on mount (e.g. opening My Soul) and whenever the tier ring
  // count changes. Reduce-motion shows the rings already closed.
  useEffect(() => {
    if (tierRingCount <= 0) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        reveal.value = 1;
      } else {
        reveal.value = 0;
        reveal.value = withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.cubic) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tierRingCount, revealKey, reveal]);

  // Shield reveal sweep on mount when shield turns on. Reduce-motion shows it
  // already wrapped.
  useEffect(() => {
    if (!shield) return;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        shieldReveal.value = 1;
      } else {
        shieldReveal.value = 0;
        shieldReveal.value = withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shield, shieldReveal]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloAnimProps = useAnimatedProps(() => ({
    opacity: haloOpacity.value,
  }));

  // Canvas is 1.8x the sphere so the outer halo has room to fade.
  const canvas = size * 1.8;
  const sphereRadius = size / 2;
  const center = canvas / 2;

  // Ring geometry — a tilted Saturn band. Each tier adds a concentric ring,
  // so the band visibly widens with the tier. rx reaches past the sphere so the
  // arcs peek out on each side; the back/front halves are drawn either side of
  // the sphere body for a 3D wrap.
  const baseRx = sphereRadius * 1.3;
  const baseRy = sphereRadius * 0.34;
  const bandStroke = Math.max(2.5, size * 0.035);
  const rings = Array.from({ length: Math.max(0, tierRingCount) }, (_, i) => {
    const factor = 1 + i * 0.17;
    return { rx: baseRx * factor, ry: baseRy * factor, i };
  });

  // Protection rings: a flattened ellipse, drawn twice on opposing diagonals so
  // the two cross over the orb like a shield. Same back/front split as the tier
  // band so the sphere occludes whatever passes behind it.
  const shieldRx = sphereRadius * 1.18;
  const shieldRy = sphereRadius * 0.5;
  const shieldLen = halfArcLength(shieldRx, shieldRy);
  const shieldBackD = backArc(center, center, shieldRx, shieldRy);
  const shieldFrontD = frontArc(center, center, shieldRx, shieldRy);
  const shieldStroke = 'hsl(208, 78%, 84%)';
  const shieldStrokeWidth = Math.max(2.5, size * 0.022);
  const shieldAngles = [40];

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
            {/* Outer halo. Mirrors the cool blue glow on the Mac calm-state orb (score >= 80). */}
            <RadialGradient
              id="halo"
              cx={center}
              cy={center}
              r={sphereRadius * 1.7}
              fx={center}
              fy={center}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.5" stopColor="hsl(220, 58%, 80%)" stopOpacity="0" />
              <Stop offset="0.585" stopColor="hsl(220, 58%, 80%)" stopOpacity="0.6" />
              <Stop offset="0.72" stopColor="hsl(220, 52%, 72%)" stopOpacity="0.24" />
              <Stop offset="1" stopColor="hsl(220, 50%, 70%)" stopOpacity="0" />
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
              <Stop offset="0" stopColor="rgb(255, 255, 255)" stopOpacity="0.97" />
              <Stop offset="0.42" stopColor="hsl(220, 25%, 92%)" stopOpacity="0.96" />
              <Stop offset="0.92" stopColor="hsl(220, 38%, 78%)" stopOpacity="1" />
              <Stop offset="1" stopColor="hsl(220, 42%, 74%)" stopOpacity="1" />
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

            {/* Tier ring band gradient: bright through the middle, fading at the
                tips, tinted by the tier hue. Spans the widest ring. */}
            {rings.length > 0 && (
              <LinearGradient
                id="ringGrad"
                x1={center - rings[rings.length - 1].rx}
                y1={center}
                x2={center + rings[rings.length - 1].rx}
                y2={center}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={`hsl(${tierHue}, 72%, 58%)`} stopOpacity="0.28" />
                <Stop offset="0.5" stopColor={`hsl(${tierHue}, 80%, 66%)`} stopOpacity="0.97" />
                <Stop offset="1" stopColor={`hsl(${tierHue}, 72%, 58%)`} stopOpacity="0.28" />
              </LinearGradient>
            )}
          </Defs>

          {/* Halo with animated opacity swell (sits beneath everything) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={sphereRadius * 1.7}
            fill="url(#halo)"
            animatedProps={haloAnimProps}
          />

          {/* Ring band — back halves (far side). Drawn before the sphere so the
              body occludes their centres, leaving the arcs wrapping behind. */}
          {rings.map(({ rx, ry, i }) => (
            <RingArc
              key={`back-${i}`}
              d={backArc(center, center, rx, ry)}
              length={halfArcLength(rx, ry)}
              reveal={reveal}
              lead={0}
              stroke="url(#ringGrad)"
              strokeWidth={bandStroke}
              opacity={0.55 - i * 0.08}
            />
          ))}

          {/* Protection rings — back halves (behind the sphere). */}
          {shield &&
            shieldAngles.map((ang, i) => (
              <G key={`shield-back-${i}`} transform={`rotate(${ang} ${center} ${center})`}>
                <RingArc
                  d={shieldBackD}
                  length={shieldLen}
                  reveal={shieldReveal}
                  lead={i * 0.2}
                  stroke={shieldStroke}
                  strokeWidth={shieldStrokeWidth}
                  opacity={0.45}
                />
              </G>
            ))}

          {/* Sphere body */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#body)" />

          {/* Inset shading + highlight, clipped naturally because we draw
              circles of the same sphere radius on top. */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#insetDark)" />
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#insetLight)" />

          {/* Crescent rim highlight on top */}
          <Circle cx={center} cy={center} r={sphereRadius} fill="url(#crescent)" />

          {/* Ring band — front halves (near side). Drawn on top of the sphere so
              they pass in front, completing the 3D wrap. Brighter than the back. */}
          {rings.map(({ rx, ry, i }) => (
            <RingArc
              key={`front-${i}`}
              d={frontArc(center, center, rx, ry)}
              length={halfArcLength(rx, ry)}
              reveal={reveal}
              lead={0.7}
              stroke="url(#ringGrad)"
              strokeWidth={bandStroke}
              opacity={0.92 - i * 0.1}
            />
          ))}

          {/* Protection rings — front halves (over the sphere), completing the
              3D wrap. Brighter than the back. */}
          {shield &&
            shieldAngles.map((ang, i) => (
              <G key={`shield-front-${i}`} transform={`rotate(${ang} ${center} ${center})`}>
                <RingArc
                  d={shieldFrontD}
                  length={shieldLen}
                  reveal={shieldReveal}
                  lead={0.5 + i * 0.2}
                  stroke={shieldStroke}
                  strokeWidth={shieldStrokeWidth}
                  opacity={0.9}
                />
              </G>
            ))}
        </Svg>
      </Animated.View>
    </View>
  );
}
