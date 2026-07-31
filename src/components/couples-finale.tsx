// The shared closing page for every couples activity: a puffy 3D pink heart,
// drawn in SVG (no image asset) so it stays crisp and breathes like the home moon
// -- a slow, exhale-biased 4s-in / 6s-out pulse.
//
// Lit like the Orb: layered radial gradients clipped to one heart path. A body
// lit from the upper-left and deepening to magenta at the edges and bottom, a
// soft crease shadow in the dip between the lobes, a bottom ambient-occlusion
// shade, and a BROAD, diffuse highlight up top (the key to the matte 3D look --
// a small hard highlight reads as a second floating heart). A pink halo glows
// behind it (a View shadow on the transparent SVG follows the silhouette).

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
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';

const SIZE = 220;
// A plump, rounded heart. Same silhouette as before, but the bottom tip is lifted
// and flattened (82 -> 80, controls pulled in) so it reads as a soft round rather
// than a sharp spike. Bounding box roughly x:[8,92] y:[8,80] in a 100x92 box.
const HEART =
  'M50 80 C 31 69, 8 50, 8 31 C 8 18, 18 8, 31 8 C 40 8, 47 13, 50 21 C 53 13, 60 8, 69 8 C 82 8, 92 18, 92 31 C 92 50, 69 69, 50 80 Z';

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
          <Svg width={SIZE} height={SIZE * 0.92} viewBox="0 0 100 92">
            <Defs>
              {/* Body: lit from the upper-left, deepening to magenta at the rim. */}
              <RadialGradient id="hBody" cx="0.36" cy="0.3" r="0.9">
                <Stop offset="0" stopColor="#eaa8c6" />
                <Stop offset="0.5" stopColor="#d873a0" />
                <Stop offset="1" stopColor="#b8437a" />
              </RadialGradient>
              {/* Inner shadows -- all a deep brand rose (never black) so the heart
                  reads as one soft clay object, shaded from several angles. */}
              {/* Bottom ambient occlusion: grounds the point. */}
              <RadialGradient id="hBottom" cx="0.5" cy="0.96" r="0.72">
                <Stop offset="0" stopColor="#7b244f" stopOpacity="0.5" />
                <Stop offset="1" stopColor="#7b244f" stopOpacity="0" />
              </RadialGradient>
              {/* Core shadow, lower-right: opposite the upper-left key light, so the
                  form turns away and gains clay-like volume. */}
              <RadialGradient id="hShadeBR" cx="0.76" cy="0.64" r="0.6">
                <Stop offset="0" stopColor="#7b244f" stopOpacity="0.34" />
                <Stop offset="0.7" stopColor="#7b244f" stopOpacity="0.12" />
                <Stop offset="1" stopColor="#7b244f" stopOpacity="0" />
              </RadialGradient>
              {/* Secondary shade, upper-right lobe: a second angle so it isn't flat. */}
              <RadialGradient id="hShadeTR" cx="0.82" cy="0.3" r="0.42">
                <Stop offset="0" stopColor="#7b244f" stopOpacity="0.2" />
                <Stop offset="1" stopColor="#7b244f" stopOpacity="0" />
              </RadialGradient>
              {/* Crease: a soft, rounded shadow in the dip between the two lobes.
                  A darker shade of the body pink (not black) so it reads as shading,
                  and broad + low-opacity so it blends instead of sitting as a dark spot. */}
              <RadialGradient id="hCrease" cx="0.5" cy="0.14" r="0.3">
                <Stop offset="0" stopColor="#7b244f" stopOpacity="0.22" />
                <Stop offset="0.6" stopColor="#7b244f" stopOpacity="0.1" />
                <Stop offset="1" stopColor="#7b244f" stopOpacity="0" />
              </RadialGradient>
              {/* Highlight: broad and diffuse (not a hard shape) for the matte sheen. */}
              <RadialGradient id="hGloss" cx="0.33" cy="0.26" r="0.52">
                <Stop offset="0" stopColor="#fff6fb" stopOpacity="0.42" />
                <Stop offset="0.5" stopColor="#fff6fb" stopOpacity="0.13" />
                <Stop offset="1" stopColor="#fff6fb" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Path d={HEART} fill="url(#hBody)" />
            <Path d={HEART} fill="url(#hBottom)" />
            <Path d={HEART} fill="url(#hShadeBR)" />
            <Path d={HEART} fill="url(#hShadeTR)" />
            <Path d={HEART} fill="url(#hCrease)" />
            <Path d={HEART} fill="url(#hGloss)" />
          </Svg>
        </Animated.View>
        <Text style={styles.line}>{line}</Text>
      </View>
      <BeginButton fullWidth label="Close" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingBottom: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxxl },
  // Soft pink halo, like the moon's glow. The View shadow follows the SVG alpha.
  glow: {
    shadowColor: 'hsl(330, 85%, 58%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  line: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
