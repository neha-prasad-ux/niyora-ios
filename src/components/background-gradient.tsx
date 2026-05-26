// Edge-to-edge background gradient per DESIGN.md. Lives behind everything;
// content above respects safe area.

import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme/colors';

export function BackgroundGradient() {
  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundMid, colors.backgroundBottom]}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}
