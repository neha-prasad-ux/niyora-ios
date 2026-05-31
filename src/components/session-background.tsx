import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

type HSL = [number, number, number];

const { width: W, height: H } = Dimensions.get('window');

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Shortest-arc hue interpolation matching the Mac lerpHSL implementation
function lerpHSL(a: HSL, b: HSL, t: number): HSL {
  let dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [(a[0] + dh * t + 360) % 360, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${s.toFixed(1)}%, ${l.toFixed(1)}%)`;
}

const INIT: HSL = [260, 15, 11];

interface Props {
  targetColor: HSL;
}

export function SessionBackground({ targetColor }: Props) {
  const bgRef = useRef<HSL>([...INIT]);
  const targetRef = useRef<HSL>(targetColor);
  const lastTsRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const reduceMotionRef = useRef(false);
  const [bgColor, setBgColor] = useState<HSL>([...INIT]);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (!cancelled) reduceMotionRef.current = rm;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (rm) => {
      reduceMotionRef.current = rm;
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    targetRef.current = targetColor;
  }, [targetColor]);

  useEffect(() => {
    function tick(ts: number) {
      const dt =
        lastTsRef.current !== null
          ? Math.min((ts - lastTsRef.current) / 1000, 0.1)
          : 0;
      lastTsRef.current = ts;

      const next: HSL = reduceMotionRef.current
        ? [...targetRef.current]
        : lerpHSL(bgRef.current, targetRef.current, dt * 1.2);
      bgRef.current = next;
      setBgColor([...next]);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const [h, s, l] = bgColor;
  const cx = W / 2;
  const bloomY = (H / 2) * 0.7;
  const bloomR = H * 0.5;

  const gradColors: [string, string, string] = [
    hsl(h, Math.min(s + 15, 45), l + 6),
    hsl(h, s, l),
    hsl(h, Math.max(s - 5, 5), Math.max(l - 3, 5)),
  ];

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient colors={gradColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} width={W} height={H}>
        <Defs>
          <RadialGradient
            id="bloom"
            cx={cx}
            cy={bloomY}
            r={bloomR}
            gradientUnits="userSpaceOnUse"
          >
            <Stop
              offset="0"
              stopColor={hsl(h, Math.min(s + 30, 60), l + 10)}
              stopOpacity={0.2}
            />
            <Stop
              offset="0.6"
              stopColor={hsl(h, Math.min(s + 15, 50), l + 4)}
              stopOpacity={0.06}
            />
            <Stop offset="1" stopColor={hsl(h, s, l)} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#bloom)" />
      </Svg>
    </View>
  );
}
