// Elevation — the shadow language the app was missing. The audit found 14
// hand-rolled shadow treatments with no shared scale; even the two sibling CTAs
// (Begin and Pill) used different glows. These are the three sanctioned levels.
//
// Spread as a style object: <View style={[styles.card, elevation.level2]} />.
// iOS-only values (shadow*). `elevation` (Android) is included so the language
// survives a future Android build.

import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

// The soft violet glow under the primary CTA. Begin and Pill both use THIS now,
// so the brand's one glowing thing glows one way.
export const glow: ViewStyle = {
  shadowColor: colors.beginGlow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.6,
  shadowRadius: 18,
  ...Platform.select({ android: { elevation: 12 } }),
};

// Level 1 · a chip or small pill lifting just off the surface (soft clay).
export const level1: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.22,
  shadowRadius: 5,
  ...Platform.select({ android: { elevation: 3 } }),
};

// Level 2 · a card or sheet sitting clearly above the background.
export const level2: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 16,
  ...Platform.select({ android: { elevation: 8 } }),
};

export const elevation = { glow, level1, level2 } as const;
