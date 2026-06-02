/**
 * CelebrationParticles
 *
 * Gentle falling snow/bubble effect shown on the well-done screen.
 * 32 particles drift down from the top, fade in near the top edge and fade
 * out near the bottom. Uses the same Reanimated useFrameCallback / UI-thread
 * worklet approach as BreathingParticles but with simple gravity physics
 * (no motions.ts dependency).
 *
 * Respects accessibilityReduceMotion and AppState background/foreground.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

const N = 32;

interface FallParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  hue: number;
  driftPhase: number;
  seedX: number;
}

function createParticles(w: number, h: number): FallParticle[] {
  const out: FallParticle[] = [];
  for (let i = 0; i < N; i++) {
    // Stagger initial y so they don't all enter at once
    const startY = -20 - Math.random() * h;
    out.push({
      x: Math.random() * w,
      y: startY,
      vy: 0.7 + Math.random() * 0.9,
      size: 3 + Math.random() * 5,
      opacity: 0,
      baseOpacity: 0.35 + Math.random() * 0.35,
      hue: 250 + Math.random() * 50,
      driftPhase: Math.random() * Math.PI * 2,
      seedX: Math.random(),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// One Animated.View per particle
// ---------------------------------------------------------------------------

const ParticleView = memo(function ParticleView({
  index,
  hue,
  all,
}: {
  index: number;
  hue: number;
  all: SharedValue<FallParticle[]>;
}) {
  const wrapStyle = useAnimatedStyle(() => {
    const ps = all.value;
    if (index >= ps.length) return { opacity: 0 };
    const p = ps[index];
    const s = p.size;
    return {
      transform: [
        { translateX: p.x - s * 0.5 },
        { translateY: p.y - s * 0.5 },
      ],
      width: s,
      height: s,
      borderRadius: s * 0.5,
      opacity: Math.max(0, Math.min(1, p.opacity)),
      shadowRadius: s * 1.4,
    };
  });

  const lightTop  = `hsl(${hue}, 65%, 72%)`;
  const deepBot   = `hsl(${hue}, 58%, 54%)`;
  const haloColor = `hsl(${hue}, 68%, 60%)`;

  return (
    <Animated.View
      style={[
        particleBase,
        { shadowColor: haloColor, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 } },
        wrapStyle,
      ]}
    >
      <LinearGradient
        colors={[lightTop, deepBot]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1, borderRadius: 9999 }}
      />
    </Animated.View>
  );
});

const particleBase = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0 },
}).root;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CelebrationParticlesProps {
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// CelebrationParticles
// ---------------------------------------------------------------------------

export function CelebrationParticles({ style }: CelebrationParticlesProps) {
  const [hasLayout, setHasLayout] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const all  = useSharedValue<FallParticle[]>([]);
  const hues = useRef<number[]>([]);
  const wSV  = useSharedValue(0);
  const hSV  = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (!cancelled) setReduceMotion(rm);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!width || !height) return;
    wSV.value = width;
    hSV.value = height;
    const ps = createParticles(width, height);
    all.value  = ps;
    hues.current = ps.map((p) => p.hue);
    setHasLayout(true);
  }, []);

  const fc = useFrameCallback((info) => {
    'worklet';
    const current = all.value;
    if (!current.length) return;

    const dt = Math.min((info.timeSincePreviousFrame ?? 16.67) / 1000, 0.05);
    const t  = info.timestamp / 1000;
    const w  = wSV.value;
    const h  = hSV.value;
    const fadeInDist  = 80;
    const fadeOutDist = 100;

    const next: FallParticle[] = [];
    for (let i = 0; i < current.length; i++) {
      const p = current[i];

      const ny = p.y + p.vy;
      const nx = p.x + Math.sin(t * 0.55 + p.driftPhase) * 0.22;

      // Reset when particle leaves the bottom
      if (ny > h + p.size) {
        const newX = Math.abs(Math.sin(p.seedX * 127.1 + t * 0.017)) * w;
        next[i] = {
          x: newX,
          y: -p.size,
          vy: p.vy,
          size: p.size,
          opacity: 0,
          baseOpacity: p.baseOpacity,
          hue: p.hue,
          driftPhase: p.driftPhase,
          seedX: p.seedX,
        };
        continue;
      }

      // Fade in near the top, fade out near the bottom
      let fadeIn  = ny < fadeInDist  ? ny / fadeInDist  : 1;
      let fadeOut = ny > h - fadeOutDist ? (h - ny) / fadeOutDist : 1;
      if (fadeIn  < 0) fadeIn  = 0;
      if (fadeOut < 0) fadeOut = 0;
      const op = p.baseOpacity * fadeIn * fadeOut;

      next[i] = {
        x: nx,
        y: ny,
        vy: p.vy,
        size: p.size,
        opacity: op,
        baseOpacity: p.baseOpacity,
        hue: p.hue,
        driftPhase: p.driftPhase,
        seedX: p.seedX,
      };
    }

    all.value = next;
  }, true);

  useEffect(() => {
    fc.setActive(!reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      fc.setActive(nextState === 'active' && !reduceMotion);
    });
    return () => sub.remove();
  }, [reduceMotion]);

  useEffect(() => {
    return () => {
      fc.setActive(false);
    };
  }, []);

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {hasLayout &&
        Array.from({ length: N }, (_, i) => (
          <ParticleView
            key={i}
            index={i}
            hue={hues.current[i] ?? 265}
            all={all}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
