// Session-screen backdrop: deep, near-black gradient tinted by the current
// breath phase's HSL color (matches the Mac `visual.colors[phase]` triples).

import { LinearGradient } from 'expo-linear-gradient';

type SessionBackgroundProps = {
  /** HSL hue 0-360, saturation 0-100, lightness 0-100 (per Mac data) */
  hsl: readonly [number, number, number];
};

export function SessionBackground({ hsl }: SessionBackgroundProps) {
  const [h, s, l] = hsl;
  const topColor = `hsl(${h}, ${s}%, ${Math.max(0, l - 4)}%)`;
  const midColor = `hsl(${h}, ${Math.max(0, s - 10)}%, ${Math.max(0, l - 7)}%)`;
  const bottomColor = `hsl(${h}, ${Math.max(0, s - 20)}%, 2%)`;

  return (
    <LinearGradient
      colors={[topColor, midColor, bottomColor]}
      locations={[0, 0.55, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}
