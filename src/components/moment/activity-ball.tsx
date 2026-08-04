// The settling activities as "magic balls" (Neha 2026-08-02): each activity is a
// glowing glass orb, a sibling of the moon, not a trophy. Three states:
//   · cloudy  — dark violet orb, quiet, waiting (default).
//   · active  — ONE orb (the flagship) glows softly from the start, so the screen
//               reads magical and invites a first tap, without a seal.
//   · done    — the orb fills with its colour and a scatter of glitter, and a
//               check-seal springs in. No icon, no score — light, not a pictogram.
// Violet family (NOT the earlier teal/blue-green), to match the moon. Ball glow
// is native react-native-svg (RadialGradient + halo + glitter): her Variant4.svg
// Figma filter stack (noise + stacked inner shadows) does not render reliably in
// react-native-svg, so it is rebuilt here, robust and state-driven.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';

// A signature colour per activity, so the lit orbs read as a soft spectrum, not
// one flat fill. All violet-to-warm, no blue-green (Neha 2026-08-02).
export type BallKind = 'colour' | 'story' | 'move' | 'wind' | 'cold' | 'aurora' | 'sprout';
const ACCENT: Record<BallKind, string> = {
  colour: '#A99CF0', // violet
  story: '#F2A2C0', // rose
  move: '#EFB97A', // amber
  wind: '#8B7FE0', // indigo-violet
  cold: '#9FB4F0', // periwinkle (cool, not teal)
  aurora: '#C89FE0', // lilac
  sprout: '#F0A9C0', // pink-coral
};

function hexA(hex: string, a: number): string {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Fixed glitter positions (no randomness): many tiny specks so it reads as fine
// stardust settling in the orb, not a handful of dots (Neha 2026-08-02).
const GLITTER: { x: number; y: number; r: number }[] = [
  { x: 34, y: 46, r: 0.7 }, { x: 40, y: 38, r: 0.6 }, { x: 47, y: 33, r: 0.9 },
  { x: 55, y: 34, r: 0.6 }, { x: 62, y: 38, r: 0.8 }, { x: 67, y: 46, r: 0.6 },
  { x: 69, y: 54, r: 0.7 }, { x: 64, y: 62, r: 0.9 }, { x: 57, y: 67, r: 0.6 },
  { x: 49, y: 69, r: 0.8 }, { x: 41, y: 66, r: 0.6 }, { x: 35, y: 59, r: 0.7 },
  { x: 31, y: 52, r: 0.6 }, { x: 44, y: 48, r: 0.8 }, { x: 56, y: 50, r: 0.6 },
  { x: 52, y: 58, r: 0.7 }, { x: 45, y: 57, r: 0.5 }, { x: 60, y: 55, r: 0.6 },
  { x: 48, y: 42, r: 0.6 }, { x: 38, y: 52, r: 0.5 },
];
// A little 4-point sparkle, drawn at (cx,cy) with reach s.
function star(cx: number, cy: number, s: number): string {
  const q = s * 0.28;
  return `M${cx} ${cy - s} L${cx + q} ${cy - q} L${cx + s} ${cy} L${cx + q} ${cy + q} L${cx} ${cy + s} L${cx - q} ${cy + q} L${cx - s} ${cy} L${cx - q} ${cy - q} Z`;
}

function Ball({ id, accent, done, active }: { id: BallKind; accent: string; done: boolean; active: boolean }) {
  const gid = `mb-${id}`;
  // Gradient stops per state. Cloudy is a dark violet glass; active borrows a
  // little of the accent at the rim; done glows the full accent.
  const core = done ? '#2a2350' : active ? '#1c1638' : '#161029';
  const edge = done ? accent : active ? hexA(accent, 0.55) : '#2b2650';
  const rim = done ? hexA(accent, 0.75) : active ? hexA(accent, 0.45) : 'rgba(255,255,255,0.14)';
  return (
    <Svg viewBox="0 0 100 100" width="100%" height="100%">
      <Defs>
        <RadialGradient id={gid} cx="0.42" cy="0.38" r="0.72">
          <Stop offset="0" stopColor={core} />
          <Stop offset="1" stopColor={edge} />
        </RadialGradient>
      </Defs>
      {/* Outer halo: strong when done, a hint when active, none when cloudy. */}
      {(done || active) && <Circle cx={50} cy={52} r={43} fill={accent} opacity={done ? 0.16 : 0.07} />}
      <Circle cx={50} cy={52} r={34} fill={`url(#${gid})`} />
      <Circle cx={50} cy={52} r={34} fill="none" stroke={rim} strokeWidth={1} />
      {/* Glitter: a full scatter when done, a few faint specks when active. */}
      {(done || active) && (
        <G opacity={done ? 0.55 : 0.25}>
          {GLITTER.map((d, i) => (
            <Circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={done ? d.r : d.r * 0.7}
              fill={i % 3 === 0 ? accent : '#FFFFFF'}
              opacity={done ? 0.9 : 0.5}
            />
          ))}
          {done && (
            <G fill="#FFFFFF">
              <Path d={star(56, 44, 2)} opacity={0.9} />
              <Path d={star(43, 58, 1.6)} opacity={0.75} />
            </G>
          )}
        </G>
      )}
    </Svg>
  );
}

export function ActivityBall({
  kind,
  label,
  done = false,
  active = false,
  onPress,
  index,
}: {
  kind: BallKind;
  label: string;
  done?: boolean;
  /** One flagship orb glows from the start, so the grid opens magical. */
  active?: boolean;
  onPress: () => void;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const accent = ACCENT[kind];
  return (
    <Animated.View
      style={styles.cell}
      entering={index != null && !reduce ? FadeInUp.delay(120 + index * 60).duration(240) : undefined}
    >
      <Pressable
        style={[
          styles.tile,
          // No coloured tile fill (Neha 2026-08-02, "the purple background looks
          // weird") — every tile keeps the neutral dark surface; the orb's own
          // glow carries "done". A faint accent border is the only tile change.
          done && { borderColor: hexA(accent, 0.35) },
          !done && active && { borderColor: hexA(accent, 0.2) },
        ]}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={done ? `${label}, done` : label}
        accessibilityState={{ selected: done }}
      >
        <View style={styles.ball}>
          <Ball id={kind} accent={accent} done={done} active={active && !done} />
        </View>
        <Text style={[styles.label, (done || active) && styles.labelBright]} numberOfLines={2}>
          {label}
        </Text>
        {done && (
          <Animated.View
            style={styles.seal}
            pointerEvents="none"
            entering={reduce ? undefined : ZoomIn.springify().damping(14)}
          >
            <SymbolView name="checkmark.seal.fill" size={20} tintColor="#DCD3FF" />
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: { flexBasis: '47%', flexGrow: 1 },
  tile: {
    aspectRatio: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  ball: { width: '60%', aspectRatio: 1 },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  labelBright: { color: colors.textPrimary },
  seal: { position: 'absolute', top: spacing.sm, right: spacing.sm },
});
