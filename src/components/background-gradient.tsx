// Edge-to-edge app background. Lives behind everything; content above respects
// safe area.
//
// The vertical gradient and the cool-blue ambient glow were dropped app-wide:
// the canvas is now a single flat dark base (colors.backgroundBottom), so every
// screen reads on the same clean ground and text never fights a gradient.

import { View } from 'react-native';

import { colors } from '@/theme/colors';

export function BackgroundGradient() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.backgroundBottom,
      }}
    />
  );
}
