// Scrub-to-fill colouring — the in-app calm activity (Rung 1 of the hold).
//
// The soothing is in the STROKE: rhythmic back-and-forth, colour building up
// where she rubs, like a crayon. And it IS a crayon now, not a marker: each
// stroke is drawn twice through a DiscretePathEffect (a waxy, jittered edge)
// at different seeds and widths, so the deposit is rough and uneven the way wax
// catches on paper tooth, not a flat even fill. Three curated colours so it is
// always pretty and never a decision, plus an eraser. The whole white page is
// paintable (Neha, 2026-07-28) — free colouring, with a big penguin outline
// drawn on top as a guide her colour shows straight through.
//
// Illustration is her supplied SVG (art/penguin), built into a Skia path. It
// is FILLED (the ink), not stroked like the old flower, and needs evenOdd fill.
// Swap in new SVGs by adding art files; nothing here is penguin-specific.

import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  Paint,
  FillType,
  Path,
  Rect,
  Skia,
  Text as SkText,
  useCanvasRef,
  useFont,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { PENGUIN } from '@/components/moment/art/penguin';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

// A softened VIBGYOR: the full rainbow so a card can be as bright as she likes,
// but eased off pure saturation so the page still reads calm, not neon. Ordered
// red -> violet so the row itself looks like a rainbow.
const SWATCHES = [
  '#E5726E', // red
  '#EDA35C', // orange
  '#EFC964', // yellow
  '#8CBE86', // green
  '#7BB0DE', // blue
  '#8A8FD6', // indigo
  '#B487CE', // violet
];
const PAPER = '#FFFFFF';
const OUTLINE = '#2B2632';
// The card is a Polaroid: white space around the drawing and a thicker white band
// underneath for the handwritten caption, so the words sit BELOW the drawing and
// never over it. PAD is the photo's inset from the card edges; BAND is the caption
// border. The thin FRAME line is drawn ONLY when sharing (Neha 2026-07-29): while
// she colours the page is clean and frameless, the box appears on the keepsake.
const PAD = 22;
const BAND = 74;
const FRAME = '#E7E4EC';
// A cute handwritten caption font — Patrick Hand, already bundled and loaded in
// _layout (it is the app's journaling hand), so it renders the same everywhere
// and needs no rebuild. `apply-poppins` honours an explicit fontFamily, so this
// survives the global Poppins enforcement.
const HAND_FONT = 'PatrickHand';
// The one brush: a clean, bold paint stroke (crayon was removed 2026-07-29 at
// Neha's call — the paint brush alone is enough). The chosen size multiplies
// the base width, and the result is stored ON each stroke so past strokes keep
// the size they were drawn at.
const BRUSH_WIDTH = 24;
const BRUSH_ALPHA = 0.85;
// The eraser is a solid paper-white stroke, wider than the brush — it must cover
// cleanly. On a white page painting paper-white reads as erasing; the flower
// outline is drawn after all strokes, so it can never be rubbed away.
const ERASER_WIDTH = 40;
// Three sizes for the brush and the eraser: small, medium (1x), large.
const SIZE_FACTORS = [0.55, 1, 1.7];
const PRESS_SPRING = { stiffness: 320, damping: 26, mass: 1 } as const;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Pt = { x: number; y: number };
type Stroke = { path: SkPath; color: string; erase: boolean; width: number };

/** The width a new stroke gets, from the active tool and chosen size. */
function widthFor(erase: boolean, sizeIdx: number): number {
  return (erase ? ERASER_WIDTH : BRUSH_WIDTH) * SIZE_FACTORS[sizeIdx];
}

/** The caption drawn into the picture at capture time: centered near the bottom,
 *  in the handwritten face, with a white outline so it stays legible over any
 *  colour underneath. */
function BakedCaption({ text, font, w, y }: { text: string; font: SkFont; w: number; y: number }) {
  const tw = font.measureText(text).width;
  const x = (w - tw) / 2;
  return (
    <Group>
      <SkText x={x} y={y} text={text} font={font}>
        <Paint color="#FFFFFF" style="stroke" strokeWidth={7} strokeJoin="round" />
      </SkText>
      <SkText x={x} y={y} text={text} font={font} color="#3E3947" />
    </Group>
  );
}

/** A committed or in-progress stroke: a clean paper cover if erasing, a clean
 *  bold paint line otherwise. */
function InkStroke({
  path,
  color,
  erase,
  width,
}: {
  path: SkPath;
  color: string;
  erase: boolean;
  width: number;
}) {
  return (
    <Path
      path={path}
      color={erase ? PAPER : color}
      style="stroke"
      strokeWidth={width}
      strokeCap="round"
      strokeJoin="round"
      opacity={erase ? 1 : BRUSH_ALPHA}
    />
  );
}

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

/** A tool in the row beside the colours: the two brushes and the eraser. Same
 *  ring as a swatch so it reads as part of the set; the ring lights up in ink
 *  when it is the active tool. */
function ToolButton({
  icon,
  on,
  onPress,
  label,
}: {
  icon: SymbolViewProps['name'];
  on: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.toolRing, on && styles.toolRingOn]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
    >
      <View style={[styles.toolFace, on && styles.toolFaceOn]}>
        <SymbolView name={icon} tintColor={OUTLINE} size={26} />
      </View>
    </Pressable>
  );
}

/** One of three brush/eraser sizes: a filled dot whose diameter previews the
 *  size. Applies to whichever tool is active. */
function SizeDot({ diameter, on, onPress }: { diameter: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={styles.sizeHit}
      accessibilityRole="button"
      accessibilityLabel="Brush size"
      accessibilityState={{ selected: on }}
    >
      <View
        style={[
          styles.sizeDot,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          on && styles.sizeDotOn,
        ]}
      />
    </Pressable>
  );
}

export type ColorFillHandle = {
  /** Snapshot the card and open the iOS share sheet. Resolves once she has
   *  shared or dismissed it. */
  share: () => Promise<void>;
};

export const ColorFill = forwardRef<ColorFillHandle>(function ColorFill(_props, ref) {
  const { width } = useWindowDimensions();
  // The whole Polaroid card is `w` wide × `cardH` tall; the photo (the drawing)
  // is inset by PAD on three sides with the caption BAND below it.
  const w = Math.min(width, 460);
  const photoW = w - PAD * 2;
  // The card fills the space left between the title and the tools; the photo takes
  // whatever height remains after the caption band, so the drawing is as big as
  // possible (Neha 2026-07-29). Measured from the flex container below.
  const [measuredH, setMeasuredH] = useState(0);
  const cardH = measuredH > 0 ? measuredH : photoW + PAD + BAND;
  const photoH = cardH - PAD - BAND;

  const canvasRef = useCanvasRef();
  // The caption drawn INTO the snapshot (Patrick Hand as a Skia typeface), so the
  // message is baked into the shared picture, not just sent as text beside it. It
  // is only drawn during the capture (see `capturing`), so it never doubles with
  // the editable field on screen.
  const skFont = useFont(require('../../../assets/fonts/PatrickHand-Regular.ttf'), 30);
  // Filled, not stroked: the penguin is the black ink of the drawing, so it is
  // drawn as a fill on top of her colour. Its fill type MUST be evenOdd or the
  // holes (eyes, gaps) flood solid.
  const penguin = useMemo(() => {
    const p = Skia.Path.MakeFromSVGString(PENGUIN.d);
    p?.setFillType(FillType.EvenOdd);
    return p;
  }, []);

  // One penguin, centred and scaled to fit the photo with a margin. In photo-
  // local coordinates (0..photoW, 0..photoH); the whole photo group is shifted
  // by PAD.
  const placements = useMemo(() => {
    const s = Math.min((photoW * 0.86) / PENGUIN.vbW, (photoH * 0.86) / PENGUIN.vbH);
    return [{ s, tx: photoW * 0.5 - PENGUIN.cx * s, ty: photoH * 0.5 - PENGUIN.cy * s }];
  }, [photoW, photoH]);

  const [sel, setSel] = useState(0);
  const [erasing, setErasing] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(1);
  // The caption starts as this diagram's preset line and she can rewrite it.
  const [caption, setCaption] = useState<string>(PENGUIN.message);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  // Lifted strokes, so undo has somewhere to go and redo can put them back. A
  // new stroke clears it (you cannot redo past a fresh mark).
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [pts, setPts] = useState<Pt[] | null>(null);
  // True only for the instant we snapshot, so the baked caption is drawn then.
  const [capturing, setCapturing] = useState(false);

  const begin = (x: number, y: number) => {
    // Starting to draw puts the caption keyboard away, so the page is hers again.
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    setPts([{ x, y }]);
  };
  const move = (x: number, y: number) => setPts((prev) => (prev ? [...prev, { x, y }] : prev));
  const end = () => {
    setPts((prev) => {
      if (prev && prev.length) {
        setStrokes((s) => [
          ...s,
          {
            path: smoothPath(prev),
            color: erasing ? PAPER : SWATCHES[sel],
            erase: erasing,
            width: widthFor(erasing, sizeIdx),
          },
        ]);
        setRedo([]);
      }
      return null;
    });
  };

  // Go back / forward a stroke at a time.
  const undo = () => {
    if (!strokes.length) return;
    Haptics.selectionAsync().catch(() => {});
    setRedo((r) => [...r, strokes[strokes.length - 1]]);
    setStrokes((s) => s.slice(0, -1));
  };
  const redoStroke = () => {
    if (!redo.length) return;
    Haptics.selectionAsync().catch(() => {});
    setStrokes((s) => [...s, redo[redo.length - 1]]);
    setRedo((r) => r.slice(0, -1));
  };

  // Zoom + pan of the drawing, so she can work into the detail. The whole board
  // (her strokes and the outline) lives inside one transformed Group; the paper
  // fill stays put behind it. `scale`/`tx`/`ty` are the live transform.
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Two fingers: pinch to zoom, and moving the pinch pans, anchored on the point
  // between her fingers. Snaps back to fit when she zooms all the way out.
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = Math.min(4, Math.max(1, savedScale.value * e.scale));
      // Focal in photo space (the group is shifted by PAD from the card edge).
      const localX = e.focalX - PAD;
      const localY = e.focalY - PAD;
      const fx = (localX - savedTx.value) / savedScale.value;
      const fy = (localY - savedTy.value) / savedScale.value;
      scale.value = next;
      tx.value = localX - fx * next;
      ty.value = localY - fy * next;
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
      }
    });

  // One finger draws. The touch is in screen space, so it is mapped back through
  // the current zoom/pan into board space before it becomes a point.
  const draw = Gesture.Pan()
    .maxPointers(1)
    .onBegin((e) =>
      runOnJS(begin)((e.x - PAD - tx.value) / scale.value, (e.y - PAD - ty.value) / scale.value),
    )
    .onUpdate((e) =>
      runOnJS(move)((e.x - PAD - tx.value) / scale.value, (e.y - PAD - ty.value) / scale.value),
    )
    .onEnd(() => runOnJS(end)());

  const gesture = Gesture.Simultaneous(pinch, draw);

  const contentTransform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: scale.value },
  ]);

  const current = pts ? smoothPath(pts) : null;

  // Share the card: flatten the zoom so the whole board is captured, snapshot
  // the Skia canvas to a PNG, write it to a temp file, and hand it to the iOS
  // share sheet with the caption as the message. No native module beyond what is
  // already here (Skia snapshot + RN Share + expo-file-system).
  const share = async () => {
    Keyboard.dismiss();
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    // Draw the baked caption and let the reset transform settle before snapshot.
    setCapturing(true);
    await new Promise((r) => setTimeout(r, 90));
    const image = canvasRef.current?.makeImageSnapshot();
    setCapturing(false);
    if (!image) return;
    const base64 = image.encodeToBase64();
    const uri = `${FileSystem.cacheDirectory}niyora-card.png`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // No `message`: the caption is inside the picture now.
    await Share.share({ url: uri });
  };
  useImperativeHandle(ref, () => ({ share }), [caption]);

  return (
    <View style={styles.wrap}>
     <View
       style={{ width: w, flex: 1 }}
       onLayout={(e) => setMeasuredH(e.nativeEvent.layout.height)}
     >
      <GestureDetector gesture={gesture}>
        <View style={{ width: w, height: cardH }}>
          <Canvas ref={canvasRef} style={{ width: w, height: cardH }}>
            {/* The white Polaroid card. */}
            <Fill color={PAPER} />
            {/* The photo: the drawing, inset by PAD and clipped to its rect so a
                stroke never spills into the frame or the caption band. The outer
                group clips in card space; the inner group shifts into the photo;
                the innermost carries the zoom/pan. */}
            <Group clip={{ x: PAD, y: PAD, width: photoW, height: photoH }}>
              <Group transform={[{ translateX: PAD }, { translateY: PAD }]}>
                <Group transform={contentTransform}>
                  {strokes.map((st, i) => (
                    <InkStroke key={i} path={st.path} color={st.color} erase={st.erase} width={st.width} />
                  ))}
                  {current && (
                    <InkStroke
                      path={current}
                      color={erasing ? PAPER : SWATCHES[sel]}
                      erase={erasing}
                      width={widthFor(erasing, sizeIdx)}
                    />
                  )}
                  {/* The penguin guide, FILLED (it is the ink), drawn on top so
                      her colour shows through the white gaps and the lines can
                      never be rubbed away. */}
                  {penguin &&
                    placements.map((p, i) => (
                      <Group key={i} transform={[{ translateX: p.tx }, { translateY: p.ty }, { scale: p.s }]}>
                        <Path path={penguin} color={OUTLINE} style="fill" />
                      </Group>
                    ))}
                </Group>
              </Group>
            </Group>
            {/* The Polaroid frame line — only while sharing, so the colouring page
                stays clean and frameless but the shared keepsake reads as a boxed
                Polaroid. */}
            {capturing && (
              <Rect x={PAD} y={PAD} width={photoW} height={photoH} style="stroke" color={FRAME} strokeWidth={1} />
            )}
            {/* The caption, baked into the band ONLY while snapshotting, so the
                shared picture carries the message below the photo (no overlap). */}
            {capturing && skFont && caption.trim().length > 0 && (
              <BakedCaption text={caption} font={skFont} w={w} y={PAD + photoH + BAND * 0.62} />
            )}
          </Canvas>
        </View>
      </GestureDetector>
      {/* Undo / redo, over the top-left corner of the photo. box-none so only the
          two buttons catch touches; the rest of the corner still draws. */}
      <View style={[styles.history, { top: PAD + 6, left: PAD + 6 }]} pointerEvents="box-none">
        <Pressable
          onPress={undo}
          disabled={!strokes.length}
          hitSlop={6}
          style={[styles.round, !strokes.length && styles.roundOff]}
          accessibilityRole="button"
          accessibilityLabel="Undo"
        >
          <SymbolView name="arrow.uturn.backward" tintColor={OUTLINE} size={15} weight="semibold" />
        </Pressable>
        <Pressable
          onPress={redoStroke}
          disabled={!redo.length}
          hitSlop={6}
          style={[styles.round, !redo.length && styles.roundOff]}
          accessibilityRole="button"
          accessibilityLabel="Redo"
        >
          <SymbolView name="arrow.uturn.forward" tintColor={OUTLINE} size={15} weight="semibold" />
        </Pressable>
      </View>
      {/* The editable caption, overlaid on the white band under the photo. This is
          what she sees and edits; the baked Skia copy above is what the snapshot
          captures (RN overlays are not in a Skia snapshot). */}
      <View style={[styles.band, { top: PAD + photoH, height: BAND, width: w }]}>
        <TextInput
          style={styles.caption}
          value={caption}
          onChangeText={setCaption}
          multiline
          blurOnSubmit
          returnKeyType="done"
          maxLength={90}
          placeholder="Tap to write your message"
          placeholderTextColor="#C3BDCB"
          selectionColor="#8A8FD6"
          accessibilityLabel="Card message"
        />
      </View>
     </View>

      {/* Tools first (brushes + eraser on the left), then the size dots on the
          right; colours below them so the brushes sit up off the bottom edge. */}
      <View style={[styles.tools, { maxWidth: w }]}>
        <View style={styles.toolGroup}>
          <ToolButton
            icon="paintbrush.fill"
            label="Brush"
            on={!erasing}
            onPress={() => setErasing(false)}
          />
          <ToolButton
            icon="eraser.fill"
            label="Eraser"
            on={erasing}
            onPress={() => setErasing(true)}
          />
        </View>
        <View style={styles.sizeGroup}>
          {[9, 14, 19].map((d, i) => (
            <SizeDot key={d} diameter={d} on={sizeIdx === i} onPress={() => setSizeIdx(i)} />
          ))}
        </View>
      </View>

      <View style={[styles.swatches, { maxWidth: w }]}>
        {SWATCHES.map((c, i) => (
          <Swatch
            key={c}
            color={c}
            on={!erasing && sel === i}
            onPress={() => {
              setErasing(false);
              setSel(i);
            }}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', alignItems: 'center', gap: spacing.lg },
  history: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: spacing.sm },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  roundOff: { opacity: 0.3 },
  // The caption sits in the Polaroid's bottom band, centered in its white space.
  band: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // The message, in a handwritten hand and centered, so it reads like something
  // written on the card rather than a form field.
  caption: {
    fontFamily: HAND_FONT,
    fontSize: fontScale.title,
    lineHeight: 30,
    color: '#3E3947',
    textAlign: 'center',
    width: '100%',
  },
  // Seven colours wrap to a second row on a narrow phone rather than shrinking
  // below a comfortable tap target.
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  swatchRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  // Brushes on the left, size dots on the right, spread across the drawing width.
  tools: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toolGroup: { flexDirection: 'row', gap: spacing.lg },
  // Brush + eraser are the primary tools, so their buttons are bigger than a swatch.
  toolRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  sizeGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // Each size is a filled dot sized to preview the stroke; the active one is ink.
  sizeHit: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
  sizeDot: { backgroundColor: '#CDC8D4' },
  sizeDotOn: { backgroundColor: OUTLINE },
  // A tool's ring lights up in ink when active; the face darkens a touch too.
  toolRingOn: { borderColor: OUTLINE },
  toolFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0EEF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolFaceOn: { backgroundColor: '#E2DDE9' },
});
