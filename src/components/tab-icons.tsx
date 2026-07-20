// Niyora's tab icons as a celestial set alongside the live moon (tab-moon.tsx):
// Train is the sun (the bright, high-drive middle of the phase), Soul is a star
// (your own point of light). Both are drawn at the moon's size on an oversized
// canvas so they can overflow the slot the way it does.
//
// Resting, each icon is a flat neutral silhouette; on focus it crossfades to its
// full colour — the sun a warm glow, the star gold. Only Today's moon carries a
// ring and stays live when resting; the sun and star are ringless and grey out.

import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// The flat resting silhouette, in the bar's neutral register.
const GRAY = 'rgba(228, 230, 238, 0.42)';

// Draw canvas larger than the nominal slot so the bodies read at the moon's size
// and can overflow it (iOS leaves overflow visible).
const CANVAS = 34;

type TabIconProps = { focused: boolean; size?: number };

// Crossfade the grey silhouette out and the colour form in as the tab takes
// focus (and back), on one shared progress value.
function Crossfade({
  focused,
  size,
  grey,
  colour,
}: {
  focused: boolean;
  size: number;
  grey: ReactNode;
  colour: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    t.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 240 });
  }, [focused, reduceMotion, t]);

  const greyStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const colourStyle = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: CANVAS, height: CANVAS, position: 'absolute' }}>
        <Animated.View style={[StyleSheet.absoluteFill, greyStyle]}>{grey}</Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, colourStyle]}>{colour}</Animated.View>
      </View>
    </View>
  );
}

// --- Train: a sun -------------------------------------------------------------
const SUN_R = 7.6;

function SunColour({ fill }: { fill: string }) {
  return (
    <Svg width={CANVAS} height={CANVAS} viewBox="0 0 24 24">
      <Defs>
        <RadialGradient
          id="sunBody"
          cx={12 - SUN_R * 0.4}
          cy={12 - SUN_R * 0.42}
          r={SUN_R * 1.7}
          fx={12 - SUN_R * 0.4}
          fy={12 - SUN_R * 0.42}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#fff3cf" />
          <Stop offset="0.5" stopColor="#f6a94b" />
          <Stop offset="1" stopColor="#d9622b" />
        </RadialGradient>
      </Defs>
      <Circle cx={12} cy={12} r={SUN_R} fill={fill === 'colour' ? 'url(#sunBody)' : fill} />
    </Svg>
  );
}

export function SunIcon({ focused, size = 24 }: TabIconProps) {
  return (
    <Crossfade
      focused={focused}
      size={size}
      grey={<SunColour fill={GRAY} />}
      colour={<SunColour fill="colour" />}
    />
  );
}

// --- Soul: a star -------------------------------------------------------------
const STAR =
  'M12 4 L14.06 9.17 L19.61 9.53 L15.33 13.08 L16.7 18.47 L12 15.5 L7.3 18.47 L8.67 13.08 L4.39 9.53 L9.94 9.17 Z';

function StarColour({ fill }: { fill: string }) {
  return (
    <Svg width={CANVAS} height={CANVAS} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="starBody" x1={7} y1={4} x2={17} y2={19} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ffe8a3" />
          <Stop offset="1" stopColor="#e0a11f" />
        </LinearGradient>
      </Defs>
      <Path d={STAR} fill={fill === 'colour' ? 'url(#starBody)' : fill} />
    </Svg>
  );
}

export function StarIcon({ focused, size = 24 }: TabIconProps) {
  return (
    <Crossfade
      focused={focused}
      size={size}
      grey={<StarColour fill={GRAY} />}
      colour={<StarColour fill="colour" />}
    />
  );
}
