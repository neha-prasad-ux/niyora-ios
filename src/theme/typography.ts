// Typography from DESIGN.md home screen anatomy. Sizes/weights/letter
// spacing match the spec exactly. System font (SF Pro on iOS) so Dynamic
// Type works.

import type { TextStyle } from 'react-native';

export const typography = {
  wordmark: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 3,
    textTransform: 'uppercase',
  } satisfies TextStyle,

  tagline: {
    fontSize: 11,
    fontWeight: '300',
  } satisfies TextStyle,

  techniqueName: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
  } satisfies TextStyle,

  subtitle: {
    fontSize: 13,
    fontWeight: '300',
  } satisfies TextStyle,

  tertiaryAction: {
    fontSize: 13,
    fontWeight: '300',
  } satisfies TextStyle,

  beginLabel: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  } satisfies TextStyle,
} as const;
