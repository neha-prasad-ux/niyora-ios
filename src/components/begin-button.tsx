// Primary action button per DESIGN.md: purple gradient capsule, anchored to
// the bottom safe area, with press feedback (spring to scale 0.96, opacity 0.92)
// and a soft impact haptic.
//
// On press it releases a short burst of violet particles from the button,
// radiating outward and fading. Ported from the Mac begin-button particle
// system (which emits on hover); on touch there is no hover, so we fire one
// burst on press. onPress is held back briefly so the burst is actually seen
// before the screen changes. Respects reduce motion.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type BeginButtonProps = {
  label?: string;
  onPress: () => void;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
};

const BURST_COUNT = 18;
const BURST_DELAY_MS = 360;

export function BeginButton({ label = 'Begin', onPress }: BeginButtonProps) {
  const pressed = useSharedValue(0);
  const [particles, setParticles] = useState<Burst[]>([]);
  const idRef = useRef(0);
  const [reduceMotion, setReduceMotion] = useState(false);

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

  // Advance the burst one frame at a time: drift outward, slow, fade, cull.
  useEffect(() => {
    if (particles.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.95,
            vy: p.vy * 0.95,
            opacity: p.opacity - 0.022,
          }))
          .filter((p) => p.opacity > 0),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressed.value * 0.04;
    const opacity = 1 - pressed.value * 0.08;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  function handlePressIn() {
    pressed.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.8 });
  }
  function handlePressOut() {
    pressed.value = withSpring(0, { damping: 20, stiffness: 400, mass: 0.8 });
  }

  const fireBurst = useCallback(() => {
    const next: Burst[] = [];
    for (let i = 0; i < BURST_COUNT; i++) {
      // Even spread around the circle, jittered so it never looks mechanical.
      const angle = (i / BURST_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 3;
      next.push({
        id: idRef.current++,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        opacity: 0.65 + Math.random() * 0.3,
      });
    }
    setParticles((prev) => [...prev, ...next]);
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    if (reduceMotion) {
      onPress();
      return;
    }
    fireBurst();
    // Let the burst breathe for a moment before the screen changes.
    setTimeout(onPress, BURST_DELAY_MS);
  }, [reduceMotion, fireBurst, onPress]);

  return (
    <View style={styles.shadowWrap}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Animated.View style={animatedStyle}>
          <LinearGradient
            colors={[colors.beginStart, colors.beginEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={[typography.beginLabel, styles.label]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>

      <View style={styles.burstLayer} pointerEvents="none">
        {particles.map((p) => (
          <View
            key={p.id}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: 'rgba(196, 178, 255, 1)',
              opacity: p.opacity,
              transform: [
                { translateX: p.x - p.size / 2 },
                { translateY: p.y - p.size / 2 },
              ],
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    alignSelf: 'center',
    shadowColor: colors.beginGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.beginBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textPrimary,
  },
  // Particles radiate from the button centre; this layer never blocks touches.
  burstLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
