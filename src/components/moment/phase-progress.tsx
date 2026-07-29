// The three-state map: Reflect · Regulate · React, with a gift at the end.
//
// Orientation, not a counter. It tells her which of the three she is in and
// that two more shapes follow, so a guided flow with no visible end does not
// read as endless. It never counts steps: the flow branches, a step count would
// lie, and a "2 left" number pressures exactly the person this flow is for.
//
// Each state has its own colour and fills as she reaches it; a gift sits past
// the end as the promise that this goes somewhere (the actual reward is the
// deferred light/badge system — this is only the pull toward it). Thick bars,
// a clear gap below, so it reads as progress, not a hairline.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import type { Phase } from '@/v3/moment-flow';

const ORDER: Phase[] = ['reflect', 'regulate', 'react'];
const LABEL: Record<Phase, string> = {
  reflect: 'Reflect',
  regulate: 'Regulate',
  react: 'React',
};
// One calm hue per state — distinct enough to read as different chapters, muted
// enough not to alarm someone already dysregulated. The HSL triplet is shared
// so the progress and the selected-option accent are the SAME colour on any
// given screen: one accent per state, not a violet fighting a blue.
const HSL: Record<Phase, string> = {
  reflect: '215, 58%, 68%',
  regulate: '165, 44%, 58%',
  react: '280, 55%, 72%',
};
const HUE: Record<Phase, string> = {
  reflect: `hsl(${HSL.reflect})`,
  regulate: `hsl(${HSL.regulate})`,
  react: `hsl(${HSL.react})`,
};

/** The selected-control tint for a state: a translucent fill of its own colour,
 *  with the solid colour as the edge. Keeps colour concentrated in one accent
 *  per screen. */
export function phaseTint(phase: Phase): { backgroundColor: string; borderColor: string } {
  return { backgroundColor: `hsla(${HSL[phase]}, 0.22)`, borderColor: `hsl(${HSL[phase]})` };
}

/** The reward at the end: bigger, and it gives a little shake now and then — a
 *  gentle "there's something here" tug, not a nag. Still under reduce-motion. */
function Gift({ lit }: { lit: boolean }) {
  const reduce = useReducedMotion();
  const rot = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    const wiggle = () => {
      rot.value = withSequence(
        withTiming(-0.15, { duration: 60 }),
        withTiming(0.15, { duration: 100 }),
        withTiming(-0.1, { duration: 100 }),
        withTiming(0.1, { duration: 100 }),
        withTiming(0, { duration: 70 }),
      );
    };
    const id = setInterval(wiggle, 6500);
    return () => clearInterval(id);
  }, [reduce, rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}rad` }] }));
  return (
    <Animated.View style={style}>
      <SymbolView name="gift.fill" size={22} tintColor={lit ? HUE.react : colors.textTagline} />
    </Animated.View>
  );
}

export function PhaseProgress({ current, fill = 0 }: { current: Phase; fill?: number }) {
  const idx = ORDER.indexOf(current);
  // The gift lights only when she has actually finished — the current state
  // fully filled on the last segment, not merely reached.
  const arrived = idx >= ORDER.length - 1 && fill >= 1;
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={`${LABEL[current]}, state ${idx + 1} of 3`}
    >
      <View style={styles.track}>
        {ORDER.map((p, i) => {
          // Done states are full; the one she is in fills as she moves through
          // its beats; the ones ahead are empty. Progress grows within the
          // segment rather than snapping the whole thing on at once.
          const w = i < idx ? 1 : i === idx ? Math.min(1, Math.max(0, fill)) : 0;
          return (
            <View key={p} style={styles.segTrack}>
              <View
                style={[
                  styles.segFill,
                  { width: `${w * 100}%`, backgroundColor: HUE[p], opacity: i < idx ? 0.7 : 1 },
                ]}
              />
            </View>
          );
        })}
        <View style={styles.giftCell}>
          <Gift lit={arrived} />
        </View>
      </View>
      <View style={styles.labels}>
        {ORDER.map((p, i) => (
          <Text
            key={p}
            style={[styles.label, i === idx ? { color: HUE[p] } : styles.labelDim]}
          >
            {LABEL[p]}
          </Text>
        ))}
        <View style={styles.giftCell} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  track: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // The empty track, and the fill that grows inside it.
  segTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: v3.panelBorder,
    overflow: 'hidden',
  },
  segFill: { height: '100%', borderRadius: 5 },
  // A fixed cell so the gift sits just past the last bar and the labels below
  // still line up under their own segments.
  giftCell: { width: 28, alignItems: 'center', justifyContent: 'center' },
  labels: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  labelDim: { color: colors.textTagline },
});
