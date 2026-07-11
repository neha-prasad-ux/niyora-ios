// The daily ring around the Now tab's moon. Deliberately NOT part of the Orb:
// the orb's Saturn rings are earned identity (tiers), while this ring is task
// state that resets every midnight — layering it here keeps orb.tsx untouched.
// A faint track plus a soft lavender arc that eases to the day's progress,
// starting from 12 o'clock.

import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  diameter: number; // outer diameter of the ring circle
  progress: number; // 0..1, clamped
  strokeWidth?: number;
};

export function ProgressRing({ diameter, progress, strokeWidth = 3.5 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const r = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const anim = useSharedValue(clamped);
  useEffect(() => {
    anim.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [clamped, anim]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  const center = diameter / 2;
  return (
    <Svg
      width={diameter}
      height={diameter}
      // Start the arc at 12 o'clock instead of SVG's default 3 o'clock.
      style={{ transform: [{ rotate: '-90deg' }] }}
      pointerEvents="none"
    >
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke="rgba(255, 255, 255, 0.10)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={center}
        cy={center}
        r={r}
        stroke="rgba(190, 160, 245, 0.9)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        animatedProps={arcProps}
        fill="none"
      />
    </Svg>
  );
}
