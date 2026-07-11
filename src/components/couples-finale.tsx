// The shared closing page for every couples activity: a big, polished red heart
// breathing like the home moon, one warm line, and a way out.
//
// The heart is built the same way the Orb builds the moon: layered radial
// gradients clipped to one heart path -- a light-to-deep body (top-left lit,
// bottom-right in shade), a soft inset shade, and a gentle glossy highlight -- so
// the sheen lives inside the shape instead of reading as a separate heart. A red
// halo glows around it (a View shadow on the transparent SVG follows the
// silhouette). It breathes on the moon's slow 4s-in / 6s-out pulse.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { BeginButton } from '@/components/begin-button';
import { colors } from '@/theme/colors';

const SIZE = 200;
// A full, solid heart silhouette in a 24x24 box.
const HEART =
  'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

export function CouplesFinale({ line, onDone }: { line: string; onDone: () => void }) {
  // Breathe like the moon: grow on a 4s inhale, settle on a longer 6s exhale.
  const b = useSharedValue(0);
  useEffect(() => {
    b.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [b]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.9 + b.value * 0.16 }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Animated.View style={[styles.glow, heartStyle]}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24">
            <Defs>
              {/* Body: lit at the top-left, deep red toward the bottom-right. */}
              <RadialGradient id="heartBody" cx="0.35" cy="0.28" r="0.85">
                <Stop offset="0" stopColor="hsl(350, 92%, 78%)" />
                <Stop offset="0.45" stopColor="hsl(348, 84%, 60%)" />
                <Stop offset="1" stopColor="hsl(348, 72%, 42%)" />
              </RadialGradient>
              {/* Inset shade: deepens the lower-right for roundness. */}
              <RadialGradient id="heartShade" cx="0.72" cy="0.8" r="0.62">
                <Stop offset="0" stopColor="rgba(50, 0, 12, 0.5)" />
                <Stop offset="1" stopColor="rgba(50, 0, 12, 0)" />
              </RadialGradient>
              {/* Gloss: a soft highlight up top, fading out (no hard edge). */}
              <RadialGradient id="heartGloss" cx="0.34" cy="0.22" r="0.42">
                <Stop offset="0" stopColor="rgba(255, 255, 255, 0.65)" />
                <Stop offset="0.5" stopColor="rgba(255, 255, 255, 0.14)" />
                <Stop offset="1" stopColor="rgba(255, 255, 255, 0)" />
              </RadialGradient>
            </Defs>
            <Path d={HEART} fill="url(#heartBody)" />
            <Path d={HEART} fill="url(#heartShade)" />
            <Path d={HEART} fill="url(#heartGloss)" />
          </Svg>
        </Animated.View>
        <Text style={styles.line}>{line}</Text>
      </View>
      <BeginButton fullWidth label="Close" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 34 },
  // Red halo, like the moon's glow. The View shadow follows the SVG silhouette.
  glow: {
    shadowColor: 'hsl(348, 88%, 56%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
  },
  line: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
