// The Now tab's icon is the actual moon: its lit portion is the persisted
// brightness (moon-reward-spec.md — full by default, waning only while a
// lesson is fading) and its tint is the lifetime material, so the reward state
// travels with her to every tab. It listens to the moon store and pulses — a
// small swell plus a material-coloured flash — whenever the moon brightens or
// a light mote (light-motes.tsx) lands on it. The selection glow and scale
// live in the tab bar button, not here; this component only knows how to be a
// moon.

import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import { moteArrived } from '@/lib/light-bus';
import { FULLNESS_MAX, type MoonMaterial } from '@/lib/moon-light';
import { getMoonState, subscribeMoonState } from '@/store/moon-state';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Icon slot the tab bar reserves; the canvas is larger so the flash halo can
// breathe past it (iOS leaves overflow visible).
const SLOT = 28;
const CANVAS = 48;
const C = CANVAS / 2;
const R = 10.5; // moon radius

// One look per material, in the orb's soft register: a highlight-to-edge body
// gradient plus the flash colour. Moonstone is the orb's cool blue-white; the
// ladder warms to gold, goes iridescent at opal, and ends near-white.
const MATERIAL_LOOK: Record<
  MoonMaterial,
  { hi: string; body: string; edge: string; flash: string }
> = {
  moonstone: {
    hi: 'rgb(255, 255, 255)',
    body: 'hsl(222, 30%, 88%)',
    edge: 'hsl(221, 42%, 74%)',
    flash: 'hsl(220, 62%, 76%)',
  },
  gold: {
    hi: 'hsl(48, 100%, 94%)',
    body: 'hsl(46, 78%, 79%)',
    edge: 'hsl(41, 62%, 62%)',
    flash: 'hsl(45, 88%, 66%)',
  },
  opal: {
    hi: 'rgb(255, 255, 255)',
    body: 'hsl(310, 48%, 88%)',
    edge: 'hsl(262, 52%, 74%)',
    flash: 'hsl(288, 72%, 78%)',
  },
  diamond: {
    hi: 'rgb(255, 255, 255)',
    body: 'hsl(200, 48%, 95%)',
    edge: 'hsl(204, 58%, 81%)',
    flash: 'hsl(202, 92%, 84%)',
  },
};

/**
 * The lit region of a moon at fullness `f` (0..1, right-lit waxing): the right
 * semicircle plus a terminator that is a half-ellipse bulging right while a
 * crescent (f < 0.5) and left once gibbous. f = 1 closes into the full disc.
 */
function phasePath(c: number, r: number, f: number): string {
  const clamped = Math.max(0, Math.min(1, f));
  const rx = Math.abs(1 - 2 * clamped) * r;
  const sweep = clamped >= 0.5 ? 1 : 0;
  return (
    `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r}` +
    ` A ${rx} ${r} 0 0 ${sweep} ${c} ${c - r} Z`
  );
}

type MoonVisual = { fullness: number; material: MoonMaterial };

export function TabMoon({ focused }: { focused: boolean }) {
  const [moon, setMoon] = useState<MoonVisual>({
    fullness: FULLNESS_MAX,
    material: 'moonstone',
  });
  const prevFullness = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  // 0 at rest, driven to 1 and back for the wax/arrival pulse.
  const pulse = useSharedValue(0);
  const ping = useCallback(() => {
    if (reduceMotion) return;
    pulse.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 850, easing: Easing.out(Easing.quad) }),
    );
  }, [pulse, reduceMotion]);

  useEffect(() => {
    let alive = true;
    getMoonState()
      .then((s) => {
        if (!alive) return;
        prevFullness.current = s.fullness;
        setMoon({ fullness: s.fullness, material: s.material });
      })
      .catch(() => {});
    const unsubscribeMoon = subscribeMoonState((s) => {
      if (!alive) return;
      const prev = prevFullness.current;
      prevFullness.current = s.fullness;
      setMoon({ fullness: s.fullness, material: s.material });
      // Waxing pulses; waning (the settle on a return) changes shape silently.
      if (prev != null && s.fullness > prev + 1e-6) ping();
    });
    const unsubscribeMote = moteArrived.subscribe(() => ping());
    return () => {
      alive = false;
      unsubscribeMoon();
      unsubscribeMote();
    };
  }, [ping]);

  const look = MATERIAL_LOOK[moon.material];

  const swellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.14 * pulse.value }],
  }));
  const flashProps = useAnimatedProps(() => ({
    opacity: 0.9 * pulse.value,
  }));

  return (
    <View
      style={{ width: SLOT, height: SLOT }}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          swellStyle,
          {
            position: 'absolute',
            top: (SLOT - CANVAS) / 2,
            left: (SLOT - CANVAS) / 2,
            width: CANVAS,
            height: CANVAS,
          },
        ]}
      >
        <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
          <Defs>
            {/* Mini orb body: highlight up-left, material edge down-right. */}
            <RadialGradient
              id="tabMoonBody"
              cx={C - R * 0.35}
              cy={C - R * 0.4}
              r={R * 1.6}
              fx={C - R * 0.35}
              fy={C - R * 0.4}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={look.hi} stopOpacity="0.98" />
              <Stop offset="0.55" stopColor={look.body} stopOpacity="0.97" />
              <Stop offset="1" stopColor={look.edge} stopOpacity="1" />
            </RadialGradient>
            <RadialGradient
              id="tabMoonFlash"
              cx={C}
              cy={C}
              r={C}
              fx={C}
              fy={C}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0.4" stopColor={look.flash} stopOpacity="0.55" />
              <Stop offset="0.75" stopColor={look.flash} stopOpacity="0.2" />
              <Stop offset="1" stopColor={look.flash} stopOpacity="0" />
            </RadialGradient>
            {/* The ring's own pale-to-deep sweep, in the moon's live material so
                it warms and shifts with the reward state. */}
            <LinearGradient
              id="tabMoonRing"
              x1={C - 17}
              y1={C}
              x2={C + 17}
              y2={C}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={look.edge} />
              <Stop offset="0.5" stopColor={look.hi} />
              <Stop offset="1" stopColor={look.edge} />
            </LinearGradient>
          </Defs>

          {/* The flash halo lives under the moon and only exists mid-pulse. */}
          <AnimatedCircle cx={C} cy={C} r={C} fill="url(#tabMoonFlash)" animatedProps={flashProps} />

          <G opacity={focused ? 1 : 0.72}>
            {/* The ring's far arc, behind the body (its middle is hidden by the moon). */}
            <G rotation={-20} origin={`${C}, ${C}`}>
              <Path
                d={`M ${C - 17} ${C} A 17 5.5 0 1 1 ${C + 17} ${C} A 17 5.5 0 1 1 ${C - 17} ${C} Z`}
                fill="none"
                stroke="url(#tabMoonRing)"
                strokeWidth={2.4}
                opacity={0.85}
              />
            </G>
            {/* The dark side: barely-there disc so a sliver still reads as a moon. */}
            <Circle cx={C} cy={C} r={R} fill="rgba(255, 255, 255, 0.07)" />
            <Path d={phasePath(C, R, moon.fullness)} fill="url(#tabMoonBody)" />
            {/* The ring's near arc, crossing in front of the body at the bottom. */}
            <G rotation={-20} origin={`${C}, ${C}`}>
              <Path
                d={`M ${C - 17} ${C} A 17 5.5 0 0 0 ${C + 17} ${C}`}
                fill="none"
                stroke="url(#tabMoonRing)"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </G>
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
