// Edge-to-edge background gradient per DESIGN.md. Lives behind everything;
// content above respects safe area.
//
// Two violet ambient radials sit over the dark base, matching the Mac hero-shot.

import { LinearGradient } from 'expo-linear-gradient';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';
import { LUTEAL_BLOB_TOP, LUTEAL_BLOB_BOTTOM } from '@/theme/luteal-palette';

// Default ambient blob colours (the everyday violet + blue-violet).
const BLOB_TOP = 'hsl(270, 50%, 28%)';
const BLOB_BOTTOM = 'hsl(220, 50%, 18%)';

// `luteal` warms the two ambient blobs during the premenstrual window. The base
// gradient is unchanged; only the soft radials shift. Defaults to the everyday
// look, so every existing caller is untouched.
export function BackgroundGradient({ luteal = false }: { luteal?: boolean }) {
  const { width, height } = useWindowDimensions();
  // Radius chosen so each blob fades out at ~60% of the screen's max dimension.
  const blobR = Math.max(width, height) * 0.85;
  const blobTop = luteal ? LUTEAL_BLOB_TOP : BLOB_TOP;
  const blobBottom = luteal ? LUTEAL_BLOB_BOTTOM : BLOB_BOTTOM;

  return (
    <>
      <LinearGradient
        colors={[colors.backgroundTop, colors.backgroundMid, colors.backgroundBottom]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
        pointerEvents="none"
      >
        <Svg width={width} height={height}>
          <Defs>
            {/* Top-left blob -> transparent at 60% (warms during luteal) */}
            <RadialGradient
              id="amb1"
              cx={width * 0.30}
              cy={height * 0.15}
              r={blobR}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={blobTop} stopOpacity="0.7" />
              <Stop offset="0.6" stopColor={blobTop} stopOpacity="0" />
              <Stop offset="1" stopColor={blobTop} stopOpacity="0" />
            </RadialGradient>
            {/* Bottom-right blob -> transparent at 60% (warms during luteal) */}
            <RadialGradient
              id="amb2"
              cx={width * 0.70}
              cy={height * 0.85}
              r={blobR}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={blobBottom} stopOpacity="0.7" />
              <Stop offset="0.6" stopColor={blobBottom} stopOpacity="0" />
              <Stop offset="1" stopColor={blobBottom} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={width} height={height} fill="url(#amb1)" />
          <Rect x={0} y={0} width={width} height={height} fill="url(#amb2)" />
        </Svg>
      </View>
    </>
  );
}
