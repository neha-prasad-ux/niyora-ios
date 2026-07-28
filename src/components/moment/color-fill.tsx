// Scrub-to-fill colouring — the in-app calm activity (Rung 1 of the hold).
//
// The soothing is in the STROKE: rhythmic back-and-forth, colour building up
// where she rubs, like a crayon. Three curated colours so it is always pretty
// and never a decision. The whole white page is paintable (Neha, 2026-07-28) —
// free colouring, with two big flower outlines drawn on top as a guide her
// colour shows straight through. Structured-enough colouring, the calm kind.
//
// Illustration is her supplied SVG (art/flower), built into a Skia path. Swap
// in new SVGs by adding art files; nothing here is flower-specific.

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FLOWER } from '@/components/moment/art/flower';

const SWATCHES = ['#E9A6B6', '#F2D08A', '#A9C6A6'];
const PAPER = '#FFFFFF';
const OUTLINE = '#2B2632';
const BRUSH_ALPHA = 0.5;
const BRUSH_WIDTH = 34;
const PRESS_SPRING = { stiffness: 320, damping: 26, mass: 1 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Pt = { x: number; y: number };
type Stroke = { path: SkPath; color: string };

/** A smooth path through the points: quadratics through the mid-points, so the
 *  stroke curves instead of showing the straight segments between samples. */
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

function Swatch({ color, on, onPress }: { color: string; on: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.08 }] }));
  return (
    <AnimatedPressable
      onPressIn={() => {
        press.value = withSpring(1, PRESS_SPRING);
      }}
      onPressOut={() => {
        press.value = withSpring(0, PRESS_SPRING);
      }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.swatchRing, on && { borderColor: color }, style]}
      accessibilityRole="button"
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </AnimatedPressable>
  );
}

export function ColorFill() {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 16, 460);
  const h = w * 1.28;

  const flower = useMemo(() => Skia.Path.MakeFromSVGString(FLOWER.d), []);

  // Two big flowers, offset on a diagonal so they overlap a touch.
  const placements = useMemo(() => {
    const s = (w * 0.62) / FLOWER.vb;
    return [
      { s, tx: w * 0.34 - FLOWER.cx * s, ty: h * 0.3 - FLOWER.cy * s },
      { s, tx: w * 0.66 - FLOWER.cx * s, ty: h * 0.72 - FLOWER.cy * s },
    ];
  }, [w, h]);

  const [sel, setSel] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [pts, setPts] = useState<Pt[] | null>(null);

  const begin = (x: number, y: number) => {
    Haptics.selectionAsync().catch(() => {});
    setPts([{ x, y }]);
  };
  const move = (x: number, y: number) => setPts((prev) => (prev ? [...prev, { x, y }] : prev));
  const end = () => {
    setPts((prev) => {
      if (prev && prev.length) {
        setStrokes((s) => [...s, { path: smoothPath(prev), color: SWATCHES[sel] }]);
      }
      return null;
    });
  };

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(begin)(e.x, e.y))
    .onUpdate((e) => runOnJS(move)(e.x, e.y))
    .onEnd(() => runOnJS(end)());

  const current = pts ? smoothPath(pts) : null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Colour it in, however you like.</Text>
      <GestureDetector gesture={pan}>
        <View style={{ width: w, height: h }}>
          <Canvas style={{ width: w, height: h }}>
            <Fill color={PAPER} />
            {/* Her strokes — the whole page paintable, no clipping. */}
            {strokes.map((st, i) => (
              <Path
                key={i}
                path={st.path}
                color={st.color}
                style="stroke"
                strokeWidth={BRUSH_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                opacity={BRUSH_ALPHA}
              />
            ))}
            {current && (
              <Path
                path={current}
                color={SWATCHES[sel]}
                style="stroke"
                strokeWidth={BRUSH_WIDTH}
                strokeCap="round"
                strokeJoin="round"
                opacity={BRUSH_ALPHA}
              />
            )}
            {/* The two flower guides on top, stroked so colour shows through. */}
            {flower &&
              placements.map((p, i) => (
                <Group key={i} transform={[{ translateX: p.tx }, { translateY: p.ty }, { scale: p.s }]}>
                  <Path
                    path={flower}
                    color={OUTLINE}
                    style="stroke"
                    strokeWidth={2.6 / p.s}
                    strokeJoin="round"
                  />
                </Group>
              ))}
          </Canvas>
        </View>
      </GestureDetector>

      <View style={styles.swatches}>
        {SWATCHES.map((c, i) => (
          <Swatch key={c} color={c} on={sel === i} onPress={() => setSel(i)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 24 },
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 23,
    color: '#6B6570',
    textAlign: 'center',
  },
  swatches: { flexDirection: 'row', gap: 20 },
  swatchRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  swatch: { width: 40, height: 40, borderRadius: 20 },
});
