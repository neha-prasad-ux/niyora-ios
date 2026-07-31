// A scratch card. The prize sits underneath as ordinary views; a foil layer
// covers it, and she rubs the foil away to reveal what she earned.
//
// The reveal is real, not a fade: the foil is a Skia layer and each scratch
// stroke is a `blendMode="clear"` path, so it punches actual transparency and
// the views behind show through the hole. The soothing is the same as the
// colouring page — a rhythmic rub — but here it uncovers instead of fills.
//
// Reusable: pass the prize as children, a size, and an onReveal callback that
// fires once she has cleared enough of it.

import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Paint,
  Path,
  RoundedRect,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeOut, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius } from '@/theme/spacing';

type Pt = { x: number; y: number };

/** The width of the scratched track. Wide, so a single pass clears a real
 *  band and the reveal feels generous rather than like colouring in a line. */
const SCRATCH_WIDTH = 46;

/** How much of the card must actually be uncovered before we lift the rest of
 *  the foil. Measured as real COVERAGE (a coarse grid of cleared cells), not
 *  travel: rubbing the same spot piles up distance without clearing anything, so
 *  a travel proxy popped the reveal while most of the card was still foil (M26).
 *  0.65 leaves only the corners for the auto-lift. */
const REVEAL_COVERAGE = 0.65;

/** Grid cell size for the coverage estimate, near the scratch width so one pass
 *  clears about one row of cells. */
const CELL = 40;

/** The foil, in brand colours: a diagonal violet-to-periwinkle wash with a hint
 *  of moonstone pink, so it reads as a holographic scratch panel rather than a
 *  flat block. */
const FOIL_COLORS = ['#8A6BE0', '#A98BEE', '#7E8BE8', '#B98AD8'];

/** Fixed sparkle positions (fractions of the card), so the foil catches light
 *  without a per-frame random. They sit under the clear strokes, so scratching
 *  rubs them off with everything else. */
const SPARKLES = [
  { x: 0.18, y: 0.26, r: 2.2 },
  { x: 0.44, y: 0.16, r: 1.5 },
  { x: 0.72, y: 0.32, r: 2.6 },
  { x: 0.86, y: 0.6, r: 1.8 },
  { x: 0.3, y: 0.68, r: 2.0 },
  { x: 0.6, y: 0.8, r: 1.5 },
  { x: 0.12, y: 0.52, r: 1.4 },
];

/** A soft rounded track through the points. Quadratics through the mid-points,
 *  so the rub curves instead of showing straight segments between samples. */
function smoothPath(points: Pt[]): SkPath {
  const p = Skia.Path.Make();
  if (points.length === 0) return p;
  p.moveTo(points[0].x, points[0].y);
  if (points.length < 3) {
    for (let i = 1; i < points.length; i++) p.lineTo(points[i].x, points[i].y);
    return p;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    p.quadTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  p.lineTo(last.x, last.y);
  return p;
}

export function ScratchCard({
  width,
  height,
  hint,
  onReveal,
  children,
}: {
  width: number;
  height: number;
  hint: string;
  /** Fires once, when she has cleared enough of the foil. */
  onReveal: () => void;
  children: React.ReactNode;
}) {
  const [strokes, setStrokes] = useState<SkPath[]>([]);
  const [pts, setPts] = useState<Pt[] | null>(null);
  // Once true, the foil fades off entirely, leaving the prize clear.
  const [gone, setGone] = useState(false);
  // Whether any rub has landed yet, so the "scratch to reveal" hint can clear.
  const [touched, setTouched] = useState(false);
  const cleared = useRef(false);
  // Coverage grid: the set of cleared cell indices, and the total to hit.
  const cols = Math.max(1, Math.ceil(width / CELL));
  const rows = Math.max(1, Math.ceil(height / CELL));
  const totalCells = cols * rows;
  const covered = useRef<Set<number>>(new Set());

  // Mark every grid cell the brush footprint (a SCRATCH_WIDTH box at the point)
  // touches, so overlapping passes never double-count.
  const markCovered = (x: number, y: number) => {
    const half = SCRATCH_WIDTH / 2;
    const c0 = Math.max(0, Math.floor((x - half) / CELL));
    const c1 = Math.min(cols - 1, Math.floor((x + half) / CELL));
    const r0 = Math.max(0, Math.floor((y - half) / CELL));
    const r1 = Math.min(rows - 1, Math.floor((y + half) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) covered.current.add(r * cols + c);
  };

  const begin = (x: number, y: number) => {
    if (gone) return;
    setTouched(true);
    markCovered(x, y);
    setPts([{ x, y }]);
    Haptics.selectionAsync().catch(() => {});
  };

  const move = (x: number, y: number) => {
    if (gone) return;
    markCovered(x, y);
    setPts((cur) => {
      if (!cur) return [{ x, y }];
      return [...cur, { x, y }];
    });
    if (!cleared.current && covered.current.size >= totalCells * REVEAL_COVERAGE) {
      cleared.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      onReveal();
      // Let the last stroke land, then lift the whole foil so nothing is left
      // half-covered.
      setTimeout(() => setGone(true), 260);
    }
  };

  const end = () => {
    setPts((cur) => {
      if (cur && cur.length > 1) setStrokes((s) => [...s, smoothPath(cur)]);
      return null;
    });
  };

  const scratch = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => runOnJS(begin)(e.x, e.y))
    .onUpdate((e) => runOnJS(move)(e.x, e.y))
    .onEnd(() => runOnJS(end)())
    .onFinalize(() => runOnJS(end)());

  return (
    <View style={{ width, height, borderRadius: radius.card, overflow: 'hidden' }}>
      {/* The prize, plain views, sitting under the foil. */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {!gone && (
        <Animated.View
          style={StyleSheet.absoluteFill}
          exiting={FadeOut.duration(420)}
        >
          <GestureDetector gesture={scratch}>
            <Canvas style={{ width, height }}>
              {/* The foil, and the holes she rubs in it, together in one layer
                  so `clear` erases the foil rather than the prize behind it. */}
              <Group layer={<Paint />}>
                <RoundedRect x={0} y={0} width={width} height={height} r={22}>
                  <LinearGradient
                    start={vec(0, 0)}
                    end={vec(width, height)}
                    colors={FOIL_COLORS}
                  />
                </RoundedRect>
                {SPARKLES.map((s, i) => (
                  <Circle
                    key={`sp${i}`}
                    cx={s.x * width}
                    cy={s.y * height}
                    r={s.r}
                    color="rgba(255,255,255,0.55)"
                  />
                ))}
                {strokes.map((p, i) => (
                  <Path
                    key={i}
                    path={p}
                    blendMode="clear"
                    style="stroke"
                    strokeWidth={SCRATCH_WIDTH}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                ))}
                {pts && (
                  <Path
                    path={smoothPath(pts)}
                    blendMode="clear"
                    style="stroke"
                    strokeWidth={SCRATCH_WIDTH}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                )}
              </Group>
            </Canvas>
          </GestureDetector>

          {!touched && (
            <View style={styles.hintWrap} pointerEvents="none">
              <Text style={styles.hint}>{hint}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hintWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    letterSpacing: 0.4,
    color: colors.textOnDark.primary,
  },
});
