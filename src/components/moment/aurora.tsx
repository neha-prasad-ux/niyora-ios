// A slow aurora for the moment flow.
//
// Three soft ribbons of light drifting across the sky, each on its own long,
// out-of-phase cycle so the pattern never visibly repeats. Deliberately built
// the cheap way: every ribbon is one LinearGradient inside an Animated.View,
// and only TRANSFORMS are animated. Those run on the UI thread and composite on
// the GPU, so nothing here re-renders per frame and nothing walks the JS bridge.
// That matters because this can be on screen for a twenty minute hold, next to
// a ~2.6GB model, on a phone she is holding.
//
// SPEED IS THE DESIGN. The cycles are 50 to 90 seconds. For someone
// dysregulated, slow drifting light settles and anything that pulses does the
// opposite, so this should read as almost still: noticed only if she looks for
// it. Nothing here is fast enough to catch the eye while she is reading.
//
// Under reduce-motion the ribbons render in place and never move.
//
// COLOUR: violet and blue are the app's own hues (v3.accent, v3.regulated) with
// the saturation pulled well down, because at full strength they read as
// coloured bars rather than light. The one new hue is the green, which an
// aurora needs to read as an aurora and which the palette has nothing close
// to. It is the palest of the three, so it tints rather than colours.

import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ShootingStar } from '@/components/ShootingStar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * Softened from the palette, but not washed out. Fully desaturated they read as
 * grey haze and the colour cannot be seen at all; at full palette saturation
 * they read as coloured bars rather than light. These sit between.
 */
const VIOLET = 'hsl(275, 52%, 64%)'; // v3.accent, softened
const BLUE = 'hsl(200, 48%, 60%)'; // v3.regulated, shifted toward teal
/** The one hue outside the palette: an aurora with no green reads as a
 *  gradient. Palest of the three, so it tints rather than colours. */
const GREEN = 'hsl(155, 45%, 56%)';

/** Same hue at partial alpha, for the intermediate gradient stops. */
function soft(hsl: string, alpha: number): string {
  return hsl.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
}

type Ribbon = {
  /** transparent -> half -> full -> half -> transparent, for a soft falloff */
  colors: [string, string, string, string, string];
  /** Fraction of screen height where the band sits. */
  top: number;
  height: number;
  rotate: string;
  /** Seconds for one drift. Long and mutually prime-ish, so they never sync. */
  seconds: number;
  travel: number;
  /** Brightest this band gets. */
  opacity: number;
  /**
   * Seconds for one fade. Deliberately unrelated to `seconds`, so a band's
   * brightness and its position never come back into step — which is what
   * stops the sky looking like a loop.
   */
  fadeSeconds: number;
  /** Faintest it gets, as a fraction of `opacity`. */
  fadeTo: number;
};

const RIBBONS: Ribbon[] = [
  {
    colors: ['rgba(0,0,0,0)', soft(VIOLET, 0.6), VIOLET, soft(VIOLET, 0.6), 'rgba(0,0,0,0)'],
    top: -0.02,
    height: 0.34,
    rotate: '-16deg',
    seconds: 62,
    travel: 40,
    opacity: 0.62,
    fadeSeconds: 44,
    fadeTo: 0.6,
  },
  {
    colors: ['rgba(0,0,0,0)', soft(GREEN, 0.6), GREEN, soft(GREEN, 0.6), 'rgba(0,0,0,0)'],
    top: 0.16,
    height: 0.26,
    rotate: '11deg',
    seconds: 87,
    travel: -50,
    opacity: 0.34,
    fadeSeconds: 71,
    fadeTo: 0.5,
  },
  {
    colors: ['rgba(0,0,0,0)', soft(BLUE, 0.6), BLUE, soft(BLUE, 0.6), 'rgba(0,0,0,0)'],
    top: 0.3,
    height: 0.3,
    rotate: '-6deg',
    seconds: 51,
    travel: 34,
    opacity: 0.5,
    fadeSeconds: 96,
    fadeTo: 0.55,
  },
];

function Band({ ribbon, w, h }: { ribbon: Ribbon; w: number; h: number }) {
  const reduceMotion = useReducedMotion();
  const t = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withTiming(1, {
        duration: ribbon.seconds * 1000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    // Brightness on its own clock. This is what makes the COLOUR change: the
    // three bands rise and fall against each other, so the mix on screen drifts
    // violet, then blue, then green-tinged, without any hue ever animating.
    // Animating gradient stops would mean re-rendering; opacity composites on
    // the GPU and costs nothing.
    fade.value = withRepeat(
      withTiming(ribbon.fadeTo, {
        duration: ribbon.fadeSeconds * 1000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [fade, reduceMotion, ribbon.fadeSeconds, ribbon.fadeTo, ribbon.seconds, t]);

  const style = useAnimatedStyle(() => ({
    opacity: ribbon.opacity * fade.value,
    transform: [
      { translateX: t.value * ribbon.travel },
      { translateY: t.value * (ribbon.travel * 0.35) },
      { rotate: ribbon.rotate },
      // A touch of stretch, so it breathes rather than only slides.
      { scaleY: 1 + t.value * 0.12 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.band,
        {
          top: h * ribbon.top,
          height: h * ribbon.height,
          // Wider than the screen so the drift never exposes an edge.
          width: w * 1.7,
          left: -w * 0.35,
        },
        style,
      ]}
      pointerEvents="none"
    >
      {/* Fades across the band's SHORT axis, so its top and bottom edges are
          the transparent ends of the gradient and never a visible line. The
          extra stops ease the falloff, which is what makes it read as light
          rather than a painted stripe. */}
      <LinearGradient
        colors={ribbon.colors}
        locations={[0, 0.28, 0.5, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/**
 * The stars.
 *
 * Three groups rather than one per star: each group twinkles as a unit on its
 * own slow cycle, so sixty stars cost three animations instead of sixty. They
 * are placed once, on mount, and never move — the sky drifts, the stars do not.
 */
function Stars({ w, h }: { w: number; h: number }) {
  const reduceMotion = useReducedMotion();
  const [groups] = useState(() =>
    Array.from({ length: 3 }, (_, g) =>
      Array.from({ length: 20 }, () => ({
        x: Math.random() * w,
        // Upper two thirds only: below that the card covers them.
        y: Math.random() * h * 0.66,
        size: 1 + Math.random() * 1.6,
        alpha: 0.25 + Math.random() * 0.5,
        key: `${g}-${Math.random()}`,
      })),
    ),
  );

  return (
    <>
      {groups.map((stars, g) => (
        <StarGroup key={g} stars={stars} index={g} reduceMotion={reduceMotion} />
      ))}
    </>
  );
}

function StarGroup({
  stars,
  index,
  reduceMotion,
}: {
  stars: { x: number; y: number; size: number; alpha: number; key: string }[];
  index: number;
  reduceMotion: boolean;
}) {
  const twinkle = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    // 9, 13, 17 seconds: prime-ish, so the three groups never blink together.
    twinkle.value = withRepeat(
      withTiming(0.45, {
        duration: (9 + index * 4) * 1000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [index, reduceMotion, twinkle]);

  const style = useAnimatedStyle(() => ({ opacity: twinkle.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: `rgba(255,255,255,${s.alpha})`,
          }}
        />
      ))}
    </Animated.View>
  );
}

export function Aurora() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Stars w={width} h={height} />
      {RIBBONS.map((r, i) => (
        <Band key={i} ribbon={r} w={width} h={height} />
      ))}
      {/* Already in the repo, already self-managing: fires, arcs, then waits a
          random 7-20 seconds. Rare enough to be a small event rather than
          decoration, and it disables itself under reduce-motion. */}
      <ShootingStar />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  band: { position: 'absolute' },
});
