// Typography from DESIGN.md home screen anatomy. Sizes/weights/letter
// spacing match the spec exactly. Poppins is loaded in _layout.tsx via
// expo-font; fontFamily strings here must match the keys passed to useFonts.

import type { TextStyle } from 'react-native';

export const typography = {
  wordmark: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } satisfies TextStyle,

  tagline: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
  } satisfies TextStyle,

  techniqueName: {
    // Technique names are weight 600 per DESIGN.md (emphasis), not Light.
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    letterSpacing: 0.3,
  } satisfies TextStyle,

  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
  } satisfies TextStyle,

  tertiaryAction: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
  } satisfies TextStyle,

  beginLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    letterSpacing: 0.5,
  } satisfies TextStyle,
} as const;
