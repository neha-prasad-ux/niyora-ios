// Animated SVG graphics for the V3 fact screens, re-implemented in
// react-native-svg + react-native-reanimated (the prototype used framer-motion,
// which does not run in RN). Every graph animates on entrance: paths draw in via
// strokeDashoffset, bars grow from the center baseline, brains scale and pulse,
// and the spectrum dot slides to position. Reduced motion is read once with
// AccessibilityInfo and snaps every graph to its end state.
//
// Colors come from v3-theme (the app's real palette), not the plum register.

import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
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

export function HormoneCurve({ width = 320, height = 150 }: { width?: number; height?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = height;
  const oestrogen =
    'M 8 118 C 60 112, 78 40, 120 40 C 150 40, 150 96, 180 92 C 210 88, 214 58, 240 62 C 270 66, 286 118, 312 128';
  const progesterone =
    'M 8 128 C 90 128, 120 126, 150 120 C 180 114, 196 44, 224 44 C 252 44, 260 118, 312 130';

  const band = useSharedValue(reduce ? 0.12 : 0);
  useEffect(() => {
    if (reduce) {
      band.value = 0.12;
      return;
    }
    band.value = withDelay(1100, withTiming(0.12, { duration: 900 }));
    return () => cancelAnimation(band);
  }, [reduce, band]);
  const bandProps = useAnimatedProps(() => ({ opacity: band.value }));

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Line x1={8} y1={H - 12} x2={W - 8} y2={H - 12} stroke={v3.line} strokeWidth={1} />
      <AnimatedRect
        x={248}
        y={8}
        width={56}
        height={H - 20}
        rx={6}
        fill={v3.activated}
        animatedProps={bandProps}
      />
      <DrawPath d={oestrogen} stroke={v3.accent} length={520} reduce={reduce} duration={1500} />
      <DrawPath
        d={progesterone}
        stroke={v3.regulated}
        length={520}
        reduce={reduce}
        duration={1500}
        delay={reduce ? 0 : 300}
      />
      <SvgText x={276} y={H - 2} textAnchor="middle" fill={v3.activated} fontSize={9} fontFamily={MONO}>
        the drop
      </SvgText>
      <SvgText x={8} y={H - 2} fill={v3.accent} fontSize={9} fontFamily={MONO}>
        oestrogen
      </SvgText>
      <SvgText x={120} y={H - 2} fill={v3.regulated} fontSize={9} fontFamily={MONO}>
        progesterone
      </SvgText>
    </Svg>
  );
}

// --- The two brains (Just hormones screen) ----------------------------
// One regulated (cool blue, still), one activated (amber, gently pulsing).

export function BrainPair() {
  const reduce = useReduceMotion();
  return (
    <View style={styles.brains}>
      <BrainCard
        tint={v3.regulated}
        title="Without PMS"
        caption="No brain sensitivity to the drop."
        pulse={false}
        reduce={reduce}
      />
      <BrainCard
        tint={v3.activated}
        title="With PMS"
        caption="The brain is more sensitive to the drop."
        pulse={!reduce}
        reduce={reduce}
      />
    </View>
  );
}

function BrainCard({
  tint,
  title,
  caption,
  pulse,
  reduce,
}: {
  tint: string;
  title: string;
  caption: string;
  pulse: boolean;
  reduce: boolean;
}) {
  const glow = useSharedValue(0.06);
  useEffect(() => {
    if (!pulse) return;
    glow.value = withRepeat(
      withTiming(0.16, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [pulse, glow]);
  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }));

  return (
    <View style={styles.brainCard}>
      <Svg viewBox="0 0 64 60" width={64} height={60}>
        {pulse && <AnimatedCircle cx={32} cy={30} r={24} fill={tint} animatedProps={glowProps} />}
        <G fill="none" stroke={tint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M32 8c-7 0-11 5-11 10 0 2-4 2-5 6-1 4 2 6 3 8-1 4 3 8 7 8 1 3 4 5 6 5" />
          <Path d="M32 8c7 0 11 5 11 10 0 2 4 2 5 6 1 4-2 6-3 8 1 4-3 8-7 8-1 3-4 5-6 5" />
          <Path d="M32 12v40" opacity={0.5} />
          <Path d="M26 22c3 1 3 4 0 5M38 22c-3 1-3 4 0 5" opacity={0.7} />
          <Path d="M26 36c3 1 3 4 0 5M38 36c-3 1-3 4 0 5" opacity={0.7} />
        </G>
      </Svg>
      <Text style={[styles.brainTitle, { color: tint }]}>{title}</Text>
      <Text style={styles.brainCaption}>{caption}</Text>
    </View>
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

export function DivergingBars({ width = 320, height = 200 }: { width?: number; height?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = height;
  const mid = H / 2;
  const maxBar = mid - 34;
  const slot = W / (LEVER_BARS.length + 1);
  const barW = 42;
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
            <SvgText x={cx} textAnchor="middle" fill={color} fontSize={8} fontFamily={MONO} y={up ? mid + 28 : mid - 20}>
              {b.tag}
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

export function TrainableFork({ width = 320, height = 120 }: { width?: number; height?: number }) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = 120;
  const labels = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      labels.value = 1;
      return;
    }
    labels.value = withDelay(1100, withTiming(1, { duration: 400 }));
    return () => cancelAnimation(labels);
  }, [reduce, labels]);
  const labelProps = useAnimatedProps(() => ({ opacity: labels.value }));

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Circle cx={30} cy={H / 2} r={7} fill={v3.accent} />
      <SvgText x={30} y={H / 2 + 26} textAnchor="middle" fill={v3.textSoft} fontSize={9} fontFamily={MONO}>
        same trigger
      </SvgText>
      <DrawPath
        d={`M 37 ${H / 2} C 120 ${H / 2}, 150 26, 250 26`}
        stroke={v3.activated}
        length={280}
        strokeWidth={2.2}
        reduce={reduce}
        duration={900}
        delay={reduce ? 0 : 300}
      />
      <DrawPath
        d={`M 37 ${H / 2} C 120 ${H / 2}, 150 94, 250 94`}
        stroke={v3.regulated}
        length={280}
        strokeWidth={2.2}
        reduce={reduce}
        duration={900}
        delay={reduce ? 0 : 300}
      />
      <AnimatedG animatedProps={labelProps}>
        <SvgText x={256} y={24} fill={v3.activated} fontSize={10} fontFamily={LABEL}>
          No practice
        </SvgText>
        <SvgText x={256} y={36} fill={v3.textSoft} fontSize={9} fontFamily={MONO}>
          reacts. hard day.
        </SvgText>
        <SvgText x={256} y={92} fill={v3.regulated} fontSize={10} fontFamily={LABEL}>
          Practice
        </SvgText>
        <SvgText x={256} y={104} fill={v3.textSoft} fontSize={9} fontFamily={MONO}>
          trained. just a day.
        </SvgText>
      </AnimatedG>
    </Svg>
  );
}

// --- The bookend spectrum bar -----------------------------------------
// The intro shows it empty (mild -> PMDD). The result drops the dot on the SAME
// bar and slides it to position.

export function SpectrumBar({
  position,
  width = 320,
  height = 54,
}: {
  position?: number;
  width?: number;
  height?: number;
}) {
  const reduce = useReduceMotion();
  const W = 320;
  const H = 54;
  const trackY = 22;
  const x0 = 14;
  const x1 = W - 14;
  const dotX = position != null ? x0 + position * (x1 - x0) : null;

  const slide = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (dotX == null) return;
    if (reduce) {
      slide.value = 1;
      return;
    }
    slide.value = withDelay(300, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) }));
    return () => cancelAnimation(slide);
  }, [dotX, reduce, slide]);
  // Animate cx directly on the circles: the dot slides from the mild end (x0) to
  // its banded position, and fades in as it lands.
  const cx = useDerivedValue(() => (dotX == null ? x0 : x0 + (dotX - x0) * slide.value));
  const dotOuterProps = useAnimatedProps(() => ({ cx: cx.value, opacity: slide.value }));
  const dotInnerProps = useAnimatedProps(() => ({ cx: cx.value, opacity: slide.value }));
  const labelProps = useAnimatedProps(() => ({ x: cx.value, opacity: slide.value }));

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width={width} height={height}>
      <Defs>
        <LinearGradient id="v3-spectrum" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={v3.spectrumStops[0]} />
          <Stop offset="0.55" stopColor={v3.spectrumStops[1]} />
          <Stop offset="1" stopColor={v3.spectrumStops[2]} />
        </LinearGradient>
      </Defs>
      <Rect x={x0} y={trackY - 4} width={x1 - x0} height={8} rx={4} fill="url(#v3-spectrum)" opacity={0.85} />
      <SvgText x={x0} y={trackY + 22} fill={v3.textSoft} fontSize={10} fontFamily={MONO}>
        mild
      </SvgText>
      <SvgText x={x1} y={trackY + 22} textAnchor="end" fill={v3.textSoft} fontSize={10} fontFamily={MONO}>
        PMDD
      </SvgText>
      {dotX != null && (
        <>
          <AnimatedCircle cy={trackY} r={9} fill={v3.text} animatedProps={dotOuterProps} />
          <AnimatedCircle cy={trackY} r={5} fill={v3.accent} animatedProps={dotInnerProps} />
          <AnimatedSvgText y={trackY - 14} textAnchor="middle" fill={v3.text} fontSize={9} fontFamily={MONO} animatedProps={labelProps}>
            you
          </AnimatedSvgText>
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  brains: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  brainCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    alignItems: 'center',
    gap: 5,
  },
  brainTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  brainCaption: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    lineHeight: 15,
    color: v3.textSoft,
    textAlign: 'center',
  },
});
