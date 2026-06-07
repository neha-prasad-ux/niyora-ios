/**
 * GoldenFocalPoint
 *
 * Trataka gaze anchor for Soft Gaze (orbit motion): soft concentric warm
 * halos around a bright golden core, with a slow breathing pulse. Centred over
 * the particle field, big enough to be the clear thing to rest your eyes on.
 *
 * Ported from the Mac BreathingSession focal point (gated to motion === 'orbit'):
 *   pulse = 0.5 + sin(t*0.6)*0.15
 *   outer  r130 hsla(40,50%,55%, pulse*0.12)
 *   mid    r64  hsla(38,55%,60%, pulse*0.35)
 *   core   r18+pulse*5 hsla(38,60%,65%, pulse*0.9)
 *   inner  r7  hsla(40,40%,85%, pulse*0.85)
 *
 * Fades out when `visible` flips false (session completion). Respects
 * reduce-motion by holding a steady mid pulse instead of breathing.
 */

import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Canvas a touch larger than the Mac's so the anchor reads big on phone.
const CANVAS = 320;
const C = CANVAS / 2;

// One slow breath in/out. sin(t*0.6) has a ~10.5s period; half-cycle ~5.25s.
const PULSE_MS = 5250;

// Map the 0..1 pulse driver onto the Mac's 0.35..0.65 range.
function level(pulse: number): number {
  'worklet';
  return 0.35 + pulse * 0.3;
}

interface GoldenFocalPointProps {
  visible: boolean;
}

export function GoldenFocalPoint({ visible }: GoldenFocalPointProps) {
  const pulse = useSharedValue(0.5);
  const appear = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        pulse.value = 0.5;
      } else {
        pulse.value = withRepeat(
          withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        );
      }
    });
    return () => {
      cancelled = true;
      cancelAnimation(pulse);
    };
  }, [pulse]);

  useEffect(() => {
    appear.value = withTiming(visible ? 1 : 0, { duration: visible ? 1400 : 800 });
  }, [visible, appear]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: appear.value }));

  const outerProps = useAnimatedProps(() => ({ fillOpacity: level(pulse.value) * 0.16 }));
  const midProps = useAnimatedProps(() => ({ fillOpacity: level(pulse.value) * 0.42 }));
  const coreProps = useAnimatedProps(() => ({
    fillOpacity: level(pulse.value) * 0.9,
    r: 44 + pulse.value * 12,
  }));
  const innerProps = useAnimatedProps(() => ({ fillOpacity: level(pulse.value) * 0.88 }));

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={wrapStyle}>
        <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
          <Defs>
            <RadialGradient id="focalOuter" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="hsl(40, 50%, 55%)" stopOpacity={1} />
              <Stop offset="100%" stopColor="hsl(40, 50%, 55%)" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="focalMid" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="hsl(38, 55%, 60%)" stopOpacity={1} />
              <Stop offset="100%" stopColor="hsl(38, 55%, 60%)" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="focalCore" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="hsl(38, 62%, 70%)" stopOpacity={1} />
              <Stop offset="70%" stopColor="hsl(38, 60%, 65%)" stopOpacity={1} />
              <Stop offset="100%" stopColor="hsl(38, 60%, 65%)" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="focalInner" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="hsl(42, 60%, 92%)" stopOpacity={1} />
              <Stop offset="100%" stopColor="hsl(40, 45%, 85%)" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          <AnimatedCircle cx={C} cy={C} r={150} fill="url(#focalOuter)" animatedProps={outerProps} />
          <AnimatedCircle cx={C} cy={C} r={82} fill="url(#focalMid)" animatedProps={midProps} />
          <AnimatedCircle cx={C} cy={C} fill="url(#focalCore)" animatedProps={coreProps} />
          <AnimatedCircle cx={C} cy={C} r={16} fill="url(#focalInner)" animatedProps={innerProps} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
