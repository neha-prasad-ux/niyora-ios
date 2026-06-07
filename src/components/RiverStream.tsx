/**
 * RiverStream
 *
 * Soft vertical "stream channel" for Let It Drift (river motion). Mirrors the
 * Mac river's flowing water lines, but rotated for portrait: a faint central
 * band with a few gently wavy vertical guide lines running top-to-bottom, so
 * the field reads as a stream the leaf floats down. Brand green, low contrast,
 * sits behind the leaf and prompt.
 *
 * The lines drift downward by one wave period on a loop (seamless, since the
 * wave is periodic), giving a slow current without per-frame path math.
 * Respects reduce-motion (holds still).
 */

import { useEffect } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const WAVELENGTH = 150; // px per wave period (also the loop travel distance)
const AMP = 9; // horizontal sway of each line
const FLOW_MS = 5200; // time to travel one period downstream

// One wavy vertical line as an SVG path, drawn from above the top to below the
// bottom (plus a period of headroom so the downward loop never shows a seam).
function wavyLine(x: number, h: number, phase: number): string {
  let d = '';
  for (let y = -WAVELENGTH; y <= h + WAVELENGTH; y += 12) {
    const px = x + Math.sin((y / WAVELENGTH) * Math.PI * 2 + phase) * AMP;
    d += `${y === -WAVELENGTH ? 'M' : 'L'} ${px.toFixed(1)},${y} `;
  }
  return d;
}

export function RiverStream() {
  const { width, height } = Dimensions.get('window');
  const flow = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      flow.value = withRepeat(
        withTiming(WAVELENGTH, { duration: FLOW_MS, easing: Easing.linear }),
        -1,
        false,
      );
    });
    return () => {
      cancelled = true;
      cancelAnimation(flow);
    };
  }, [flow]);

  const flowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: flow.value }],
  }));

  // A handful of lines spread across a centred channel (~55% of the width).
  const channel = width * 0.55;
  const left = (width - channel) / 2;
  const lines = [0, 1, 2, 3, 4].map((i) => ({
    x: left + (channel / 4) * i,
    phase: i * 1.1,
    opacity: i === 2 ? 0.1 : 0.06,
  }));

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="streamBand" x1="0" y1="0" x2={`${width}`} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="hsl(150, 40%, 55%)" stopOpacity="0" />
            <Stop offset="0.5" stopColor="hsl(150, 40%, 55%)" stopOpacity="0.06" />
            <Stop offset="1" stopColor="hsl(150, 40%, 55%)" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#streamBand)" />
      </Svg>

      <Animated.View style={[styles.fill, flowStyle]}>
        <Svg width={width} height={height} style={styles.fill}>
          {lines.map((l, i) => (
            <Path
              key={i}
              d={wavyLine(l.x, height, l.phase)}
              stroke="hsl(150, 45%, 72%)"
              strokeWidth={1.5}
              strokeOpacity={l.opacity}
              fill="none"
            />
          ))}
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
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
