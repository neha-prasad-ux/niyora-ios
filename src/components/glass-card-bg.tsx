// The one glass backdrop for every card, so "glass" means the same thing app-wide.
// Drop it as the FIRST child of a card container that uses the shared glass token
// (theme/glass: `glass.border`, `overflow: 'hidden'`, no solid background); the
// card's content then renders on top.
//
// Neutral by design, no colour. Liquid Glass supplies the frost; over the app's
// near-black canvas it needs light behind it to look like glass, so the card
// pages sit a soft AmbientGlow behind their content and `glass.fill` is only a
// light legibility dim over the frost. On the blur/wash fallback (no built-in
// edge lighting) a faint top rim is added.
//
// Each layer self-clips to `radius` (matching the card's own borderRadius +
// continuous curve), so the frost never leaves a square corner poking out from
// under the rounded border, relying on the parent's overflow alone left an
// artifact at the corners on iOS.
//
// It still accepts `gradient`/`tintColor` props so existing callers need no edit,
// but ignores them, the glass is one neutral look everywhere.

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassSurface, liquidGlassAvailable } from '@/components/glass-surface';
import { glass } from '@/theme/glass';
import { radius as radii } from '@/theme/spacing';

export function GlassCardBg({
  radius = radii.card,
}: {
  gradient?: readonly [string, string, string];
  tintColor?: string;
  /** Match the card's own borderRadius so the glass corners clip cleanly. */
  radius?: number;
} = {}) {
  const rounded = { borderRadius: radius, borderCurve: 'continuous' as const, overflow: 'hidden' as const };
  return (
    <>
      <GlassSurface intensity={30} style={rounded} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, rounded, { backgroundColor: glass.fill }]}
      />
      {!liquidGlassAvailable && (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)', 'transparent']}
          locations={[0, 0.12, 0.32]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, rounded]}
        />
      )}
    </>
  );
}
