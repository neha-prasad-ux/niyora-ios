// Niyora's own tab icons, so the bar reads as one celestial set instead of
// borrowing Apple's SF Symbols for two of three tabs. The Now tab is the live
// moon (tab-moon.tsx); these are its siblings for Grow and You, drawn in the
// same soft, rounded, moonlit line-work.
//
// Each icon crossfades between an OUTLINE (resting) and a FILLED, brighter form
// (selected) on a gentle timing curve — the "active / inactive" animation. The
// night tab bar additionally lifts and scales the icon on focus, so together the
// selected tab blooms: it lifts, brightens, and fills. Reduced-motion snaps
// straight to the end state.
//
// Grow is a sprout (skills you grow between cycles); You is a soul — a figure
// under a soft halo, the self the app is tending. Both live on a 24×24 grid.

import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Each icon carries its own hue, so the bar reads as a small constellation of
// colour rather than three greys: Train a soft sprout-green, Soul a warm rose
// (siblings to the Now moon's cool white). `off` is the muted resting outline,
// `on` the vivid filled state the tab blooms into on focus. Kept local so the
// icons own their colour whether or not the bar passes a tint (TabMoon ignores
// it too — the selection state, not the tint, is what these animate on).
const GROW = { on: '#7ED9A8', off: 'rgba(126, 217, 168, 0.6)' };
const SOUL = { on: '#EBA6C6', off: 'rgba(235, 166, 198, 0.6)' };
const STROKE = 1.9;

type TabIconProps = { focused: boolean; size?: number };

// Crossfade the resting outline out and the filled form in as the tab takes
// focus (and back), on one shared progress value.
function CrossfadeIcon({
  focused,
  size = 24,
  outline,
  filled,
}: {
  focused: boolean;
  size?: number;
  outline: ReactNode;
  filled: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    t.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: 240 });
  }, [focused, reduceMotion, t]);

  const outlineStyle = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const filledStyle = useAnimatedStyle(() => ({ opacity: t.value }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, outlineStyle]}>{outline}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, filledStyle]}>{filled}</Animated.View>
    </View>
  );
}

// --- Grow: a sprout ---------------------------------------------------------
const SPROUT_STEM = 'M12 21.5 L12 11.5';
const SPROUT_LEAF_L = 'M12 14.2 C7.8 14.2 5.6 11 6.2 7.7 C10.2 8.1 12 11 12 14.2 Z';
const SPROUT_LEAF_R = 'M12 12 C16.2 12 18.4 8.9 17.8 5.6 C13.8 6 12 8.9 12 12 Z';

function SproutSvg({ color, fill }: { color: string; fill: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24">
      <Path
        d={SPROUT_STEM}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={SPROUT_LEAF_L}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={fill ? color : 'none'}
        fillOpacity={fill ? 0.9 : 0}
      />
      <Path
        d={SPROUT_LEAF_R}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={fill ? color : 'none'}
        fillOpacity={fill ? 0.9 : 0}
      />
    </Svg>
  );
}

export function GrowIcon({ focused, size = 24 }: TabIconProps) {
  return (
    <CrossfadeIcon
      focused={focused}
      size={size}
      outline={<SproutSvg color={GROW.off} fill={false} />}
      filled={<SproutSvg color={GROW.on} fill />}
    />
  );
}

// --- You: a soul (figure under a halo) --------------------------------------
const SOUL_SHOULDERS = 'M5 20.5 C5 16.2 8.1 14 12 14 C15.9 14 19 16.2 19 20.5 Z';

function SoulSvg({ color, fill }: { color: string; fill: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 24 24">
      {/* The soft halo above the head: a faint crescent that brightens on focus. */}
      <Path
        d="M8.7 3.4 C9.7 2.6 11 2.2 12.3 2.3"
        stroke={color}
        strokeWidth={STROKE - 0.4}
        strokeLinecap="round"
        fill="none"
        opacity={fill ? 0.8 : 0.5}
      />
      <Circle
        cx={12}
        cy={8.2}
        r={3.6}
        stroke={color}
        strokeWidth={STROKE}
        fill={fill ? color : 'none'}
        fillOpacity={fill ? 0.9 : 0}
      />
      <Path
        d={SOUL_SHOULDERS}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinejoin="round"
        fill={fill ? color : 'none'}
        fillOpacity={fill ? 0.9 : 0}
      />
    </Svg>
  );
}

export function YouIcon({ focused, size = 24 }: TabIconProps) {
  return (
    <CrossfadeIcon
      focused={focused}
      size={size}
      outline={<SoulSvg color={SOUL.off} fill={false} />}
      filled={<SoulSvg color={SOUL.on} fill />}
    />
  );
}
