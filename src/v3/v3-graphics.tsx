// Animated SVG graphics for the V3 fact screens, re-implemented in
// react-native-svg + react-native-reanimated (the prototype used framer-motion,
// which does not run in RN). Every graph animates on entrance: paths draw in via
// strokeDashoffset, bars grow from the center baseline, brains scale and pulse,
// and the spectrum dot slides to position. Reduced motion is read once with
// AccessibilityInfo and snaps every graph to its end state.
//
// Colors come from v3-theme (the app's real palette), not the plum register.

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { BRAIN_PATH } from './brain-path';
import { v3 } from './v3-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

const MONO = 'Poppins-Light';
const LABEL = 'Poppins-Medium';

// Shared hook: returns whether reduced motion is on (null while unknown).
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (alive) setReduce(r);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (r) =>
      setReduce(r),
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

// A path that draws itself in on mount. `length` is an over-estimate of the
// path length used for the dash trick; anything >= the true length works.
function DrawPath({
  d,
  stroke,
  length,
  delay = 0,
  duration = 1400,
  reduce,
  strokeWidth = 2.4,
  opacity = 1,
}: {
  d: string;
  stroke: string;
  length: number;
  delay?: number;
  duration?: number;
  reduce: boolean;
  strokeWidth?: number;
  opacity?: number;
}) {
  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.inOut(Easing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [reduce, delay, duration, progress]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
    opacity: progress.value === 0 ? 0 : opacity,
  }));
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={length}
      animatedProps={animatedProps}
    />
  );
}

// --- Shared hormone curve (Just hormones screen) ----------------------
// Oestrogen and progesterone across one cycle, with the pre-period drop
// emphasised. The curve is identical for everyone; the brain response is not.

export function HormoneCurve({ width = 320, height = 190 }: { width?: number; height?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = 190;
  const baseline = H - 14;
  // One hormone line: a rounded rise, then the steep pre-period drop lands in the
  // same right-hand lane as the two brains.
  const curve =
    'M 8 132 C 52 128, 84 56, 146 54 C 196 52, 214 56, 240 72 C 262 86, 277 152, 300 170';
  const DROP_X = 272; // the shared lane: the fall and both brains sit here.

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Line x1={8} y1={baseline} x2={W - 8} y2={baseline} stroke={v3.line} strokeWidth={1} />
      {/* Faint band down the drop lane. */}
      <Rect x={DROP_X - 36} y={8} width={72} height={H - 26} rx={8} fill={v3.activated} opacity={0.08} />
      <DrawPath d={curve} stroke={v3.accent} length={420} reduce={reduce} duration={1500} />
      {/* Two stacked brains in the drop lane: blue calm on top, red reacting below. */}
      <BrainGlyph cx={DROP_X} cy={46} size={60} tint={v3.regulated} pulse={false} reduce={reduce} />
      <BrainGlyph cx={DROP_X} cy={118} size={60} tint={BRAIN_REACTS} pulse={!reduce} reduce={reduce} />
      <SvgText x={DROP_X} y={H - 2} textAnchor="middle" fill={v3.activated} fontSize={9} fontFamily={MONO}>
        the drop
      </SvgText>
      <SvgText x={8} y={H - 2} fill={v3.accent} fontSize={9} fontFamily={MONO}>
        hormones
      </SvgText>
    </Svg>
  );
}

// The reacting (PMS) brain's colour: a soft red, distinct from the cool blue of
// the calm brain.
const BRAIN_REACTS = '#FF6B6B';

// A single brain glyph placed at (cx, cy) in SVG user space, scaled to `size`.
// The reacting brain pulses a soft glow; the calm one stays still.
function BrainGlyph({
  cx,
  cy,
  size,
  tint,
  pulse,
  reduce,
}: {
  cx: number;
  cy: number;
  size: number;
  tint: string;
  pulse: boolean;
  reduce: boolean;
}) {
  const s = size / 512;
  // The reacting brain breathes a soft aura; the calm one is still.
  const glow = useSharedValue(0.08);
  useEffect(() => {
    if (!pulse || reduce) return;
    glow.value = withRepeat(
      withTiming(0.32, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [pulse, reduce, glow]);
  const auraProps = useAnimatedProps(() => ({ opacity: glow.value }));
  return (
    <G transform={`translate(${cx - 256 * s} ${cy - 256 * s}) scale(${s})`}>
      {pulse && <AnimatedCircle cx={256} cy={256} r={252} fill={tint} animatedProps={auraProps} />}
      <Path d={BRAIN_PATH} fill={tint} />
    </G>
  );
}

// --- Multi-hormone cycle chart (Brain shifts screen) ------------------
// Four measured signals across the cycle. Density reads as legitimacy.

export function CycleChart({ width = 320, height = 180 }: { width?: number; height?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = height;
  const curves = [
    { d: 'M 8 120 C 60 116, 76 44, 118 44 C 150 44, 150 92, 180 88 C 212 84, 214 60, 240 64 C 270 68, 286 118, 312 126', color: v3.accent, label: 'oestrogen' },
    { d: 'M 8 130 C 90 130, 120 128, 150 122 C 180 116, 196 48, 224 48 C 252 48, 260 120, 312 132', color: v3.regulated, label: 'progesterone' },
    { d: 'M 8 96 C 70 96, 100 92, 120 60 C 132 42, 150 42, 160 62 C 172 86, 220 96, 312 98', color: v3.textSoft, label: 'LH' },
    { d: 'M 8 108 C 80 108, 110 104, 124 84 C 134 70, 148 70, 158 86 C 172 106, 220 110, 312 110', color: v3.activated, label: 'FSH' },
  ];
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Line x1={8} y1={H - 20} x2={W - 8} y2={H - 20} stroke={v3.line} strokeWidth={1} />
      {curves.map((c, i) => (
        <DrawPath
          key={c.label}
          d={c.d}
          stroke={c.color}
          length={560}
          strokeWidth={2.2}
          reduce={reduce}
          duration={1400}
          delay={reduce ? 0 : i * 250}
          opacity={0.92}
        />
      ))}
      {curves.map((c, i) => (
        <SvgText key={c.label} x={8 + i * 74} y={H - 6} fill={c.color} fontSize={9} fontFamily={MONO}>
          {c.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// --- Diverging bar chart (The levers screen) --------------------------
// Baseline in the center. Bars up raise risk (amber), bars down lower it (cool
// blue). Each bar keeps its own real number. Grows from the baseline.

export interface LeverBar {
  label: string;
  value: string;
  magnitude: number; // 0..1 relative to the tallest bar
  dir: 'up' | 'down';
  tag: 'linked' | 'change it';
}

export const LEVER_BARS: LeverBar[] = [
  { label: 'Stress', value: '~5x odds', magnitude: 1.0, dir: 'up', tag: 'linked' },
  { label: 'Poor sleep', value: '~2x odds', magnitude: 0.45, dir: 'up', tag: 'linked' },
  { label: 'Exercise', value: 'large drop', magnitude: 0.85, dir: 'down', tag: 'change it' },
];

function GrowBar({
  cx,
  barW,
  mid,
  targetH,
  up,
  color,
  delay,
  reduce,
}: {
  cx: number;
  barW: number;
  mid: number;
  targetH: number;
  up: boolean;
  color: string;
  delay: number;
  reduce: boolean;
}) {
  const grow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      grow.value = 1;
      return;
    }
    grow.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(grow);
  }, [reduce, delay, grow]);
  const props = useAnimatedProps(() => {
    const h = targetH * grow.value;
    return { height: h, y: up ? mid - h : mid };
  });
  return (
    <AnimatedRect x={cx - barW / 2} width={barW} rx={6} fill={color} animatedProps={props} />
  );
}

export function DivergingBars({ width = 340 }: { width?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = 220; // fixed design height; render height derives from width to keep aspect
  const mid = H / 2;
  const maxBar = mid - 34;
  const slot = W / (LEVER_BARS.length + 1);
  const barW = 44;
  const height = (width * H) / W;
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Line x1={8} y1={mid} x2={W - 8} y2={mid} stroke={v3.textSoft} strokeWidth={1.4} strokeDasharray="3 3" />
      <SvgText x={10} y={mid - 6} fill={v3.textSoft} fontSize={9} fontFamily={MONO}>
        baseline
      </SvgText>
      {LEVER_BARS.map((b, i) => {
        const cx = slot * (i + 1);
        const h = b.magnitude * maxBar;
        const up = b.dir === 'up';
        const color = up ? v3.activated : v3.regulated;
        return (
          <G key={b.label}>
            <GrowBar
              cx={cx}
              barW={barW}
              mid={mid}
              targetH={h}
              up={up}
              color={color}
              delay={reduce ? 0 : 300 + i * 200}
              reduce={reduce}
            />
            <SvgText
              x={cx}
              textAnchor="middle"
              fill={v3.text}
              fontSize={11}
              fontFamily={LABEL}
              y={up ? mid - h - 8 : mid + h + 16}
            >
              {b.value}
            </SvgText>
            <SvgText x={cx} textAnchor="middle" fill={v3.textSoft} fontSize={10} fontFamily={MONO} y={up ? mid + 16 : mid - 8}>
              {b.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// --- The trainable fork (Trainable screen) ----------------------------
// One trigger splits into two responses. No practice -> reacts, hard day.
// Practice -> trained reflex, just another day.

// A standalone side-profile brain icon (fills its box), for the trainable
// comparison columns.
export function BrainIcon({ size, tint }: { size: number; tint: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path d={BRAIN_PATH} fill={tint} />
    </Svg>
  );
}

// The "Same trigger -> your response" fork that tops the trainable comparison.
export function TriggerFork({ width = 240 }: { width?: number }) {
  const W = 240;
  const H = 104;
  const height = (width * H) / W;
  const cx = W / 2;
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <SvgText x={cx} y={18} textAnchor="middle" fill={v3.text} fontSize={17} fontFamily={LABEL}>
        Same trigger
      </SvgText>
      <Line x1={cx} y1={30} x2={cx} y2={46} stroke={v3.text} strokeWidth={2} strokeLinecap="round" />
      {/* Label sits in the gap between the stem and the split, no lines over it. */}
      <SvgText x={cx} y={62} textAnchor="middle" fill={v3.textSoft} fontSize={11} fontFamily={MONO}>
        your response
      </SvgText>
      <Line x1={cx} y1={70} x2={54} y2={94} stroke={v3.text} strokeWidth={2} strokeLinecap="round" />
      <Line x1={cx} y1={70} x2={W - 54} y2={94} stroke={v3.text} strokeWidth={2} strokeLinecap="round" />
      <Path d="M48 90 L60 90 L54 100 Z" fill={v3.text} />
      <Path d={`M${W - 60} 90 L${W - 48} 90 L${W - 54} 100 Z`} fill={v3.text} />
    </Svg>
  );
}

// --- The bookend spectrum bar -----------------------------------------
// The intro shows it empty (mild -> PMDD). The result drops the dot on the SAME
// bar and slides it to position.

// The spectrum, redrawn as a thick flowing wave instead of a clinical bar: it
// ripples gently at the "mild" end and swings bigger toward "PMDD", so the shape
// itself carries the meaning (calm to turbulent). The wave drifts on a slow loop
// for life. When a `position` is passed (the result screen) a "you" marker
// slides in to the banded spot on the axis.
export function SpectrumBar({
  position,
  width = 320,
  height = 130,
}: {
  position?: number;
  width?: number;
  height?: number;
}) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = 88;
  const x0 = 24;
  const x1 = W - 24;
  const BAND = 30; // slim rainbow band
  const midY = 34;
  const bandY = midY - BAND / 2;
  const SHEEN = 100; // width of the gloss that sweeps across

  // The only motion: a soft gloss sweeps slowly back and forth across the band,
  // like light moving over the colours. The band and its colours stay put.
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [reduce, sweep]);
  const sheenProps = useAnimatedProps(() => ({
    x: x0 + sweep.value * (x1 - x0 - SHEEN),
  }));

  // Result marker: slide "you" in from the mild end to the banded position.
  const posX = position != null ? x0 + position * (x1 - x0) : null;
  const slide = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (posX == null) return;
    if (reduce) {
      slide.value = 1;
      return;
    }
    slide.value = withDelay(400, withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) }));
    return () => cancelAnimation(slide);
  }, [posX, reduce, slide]);
  const markX = useDerivedValue(() => (posX == null ? x0 : x0 + (posX - x0) * slide.value));
  const markProps = useAnimatedProps(() => ({ cx: markX.value, opacity: slide.value }));
  const markLabelProps = useAnimatedProps(() => ({ x: markX.value, opacity: slide.value }));

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Defs>
        {/* Full visible-light rainbow, red (mild) to violet (PMDD). */}
        <LinearGradient id="v3-spectrum" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FF3B30" />
          <Stop offset="0.17" stopColor="#FF9500" />
          <Stop offset="0.34" stopColor="#FFD60A" />
          <Stop offset="0.5" stopColor="#34C759" />
          <Stop offset="0.66" stopColor="#32ADE6" />
          <Stop offset="0.83" stopColor="#0A84FF" />
          <Stop offset="1" stopColor="#8E5BFF" />
        </LinearGradient>
        {/* Gloss: soft white in the middle, transparent at the edges. */}
        <LinearGradient id="v3-sheen" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Soft halo behind the band for depth. */}
      <Rect
        x={x0 - 4}
        y={bandY - 8}
        width={x1 - x0 + 8}
        height={BAND + 16}
        rx={14}
        fill="url(#v3-spectrum)"
        opacity={0.12}
      />
      {/* The thick rainbow band. */}
      <Rect x={x0} y={bandY} width={x1 - x0} height={BAND} rx={10} fill="url(#v3-spectrum)" />
      {/* The gloss that sweeps across it. */}
      <AnimatedRect
        animatedProps={sheenProps}
        y={bandY}
        width={SHEEN}
        height={BAND}
        rx={10}
        fill="url(#v3-sheen)"
      />
      <SvgText x={x0} y={H - 8} fill={v3.textSoft} fontSize={11} fontFamily={MONO}>
        mild
      </SvgText>
      <SvgText x={x1} y={H - 8} textAnchor="end" fill={v3.textSoft} fontSize={11} fontFamily={MONO}>
        PMDD
      </SvgText>
      {posX != null && (
        <>
          <AnimatedCircle cy={midY} r={11} fill={v3.text} animatedProps={markProps} />
          <AnimatedCircle cy={midY} r={6} fill={v3.accent} animatedProps={markProps} />
          <AnimatedSvgText y={midY - BAND / 2 - 8} textAnchor="middle" fill={v3.text} fontSize={10} fontFamily={MONO} animatedProps={markLabelProps}>
            you
          </AnimatedSvgText>
        </>
      )}
    </Svg>
  );
}

