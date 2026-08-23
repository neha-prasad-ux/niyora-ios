// One frosted-glass surface for the whole app, so "glassmorphism" means the
// same thing everywhere and degrades the same way. It prefers Apple's liquid
// glass (iOS 26 + expo-glass-effect), falls back to an expo-blur frost, and
// finally to a plain translucent wash when the dev client was built without
// expo-blur, so a glass panel is never a red "Unimplemented component" box
// (the trap the raw BlurView in the You-tab empty states used to hit). The night
// tab bar already ships this exact ladder inline; this is the shared version for
// cards and empty states.
//
// Fills its parent by default (pass `style` to override) and is non-interactive,
// so taps pass through to whatever it sits over.

import { requireOptionalNativeModule } from 'expo';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

// Probed once at module load. `isLiquidGlassAvailable` needs iOS 26 + an Xcode
// 26 build; the blur probe catches a dev client built before expo-blur landed.
export const liquidGlassAvailable = isLiquidGlassAvailable();
export const blurAvailable = requireOptionalNativeModule('ExpoBlur') != null;

type GlassSurfaceProps = {
  style?: StyleProp<ViewStyle>;
  /** expo-blur intensity (0..100). Ignored by liquid glass and the wash. */
  intensity?: number;
  /** Tint for the liquid-glass material. */
  tint?: string;
  /** The fallback wash colour when neither glass nor blur is available. */
  washColor?: string;
};

export function GlassSurface({
  style,
  intensity = 24,
  tint = 'rgba(10, 8, 16, 0.45)',
  washColor = 'rgba(16, 13, 23, 0.62)',
}: GlassSurfaceProps) {
  if (liquidGlassAvailable) {
    return (
      <GlassView
        pointerEvents="none"
        style={[styles.fill, style]}
        glassEffectStyle="regular"
        colorScheme="dark"
        tintColor={tint}
      />
    );
  }
  if (blurAvailable) {
    return <BlurView pointerEvents="none" style={[styles.fill, style]} tint="dark" intensity={intensity} />;
  }
  return <View pointerEvents="none" style={[styles.fill, { backgroundColor: washColor }, style]} />;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
