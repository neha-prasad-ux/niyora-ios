// Soft ambient light for the card pages (Train, Soul), sitting between the
// CosmicBackground and the scrolling content. Its whole job is to give the glass
// cards something to FROST: over pure black a glass card refracts nothing and
// goes flat grey, so a few big, low, desaturated glows bleed across the screen
// and the cards lens them as they scroll, that shimmer is what reads as glass.
//
// Kept muted and cool (barely-there violet/blue), so it never becomes colour on
// a card, only a faint light the frost catches. Pointer-safe; behind everything.

import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export function AmbientGlow() {
  const { width: W, height: H } = useWindowDimensions();
  const r = W * 0.85;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H}>
        <Defs>
          {/* Cool violet, upper third. */}
          <RadialGradient id="glowA" cx={W * 0.28} cy={H * 0.3} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="hsl(258, 42%, 52%)" stopOpacity="0.3" />
            <Stop offset="0.55" stopColor="hsl(258, 42%, 52%)" stopOpacity="0.05" />
            <Stop offset="1" stopColor="hsl(258, 42%, 52%)" stopOpacity="0" />
          </RadialGradient>
          {/* Cool blue, lower right. */}
          <RadialGradient id="glowB" cx={W * 0.78} cy={H * 0.72} r={r} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="hsl(220, 46%, 50%)" stopOpacity="0.26" />
            <Stop offset="0.55" stopColor="hsl(220, 46%, 50%)" stopOpacity="0.05" />
            <Stop offset="1" stopColor="hsl(220, 46%, 50%)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#glowA)" />
        <Rect x={0} y={0} width={W} height={H} fill="url(#glowB)" />
      </Svg>
    </View>
  );
}
