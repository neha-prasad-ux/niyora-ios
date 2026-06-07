/**
 * DriftingLeaf
 *
 * Let It Drift (river motion): a leaf that fades in when the guidance asks you
 * to "place the thought on a leaf", bobs gently, and drifts downstream (to the
 * right) as the prompts progress, fading out at the end.
 *
 * Ported in spirit from the Mac BreathingSession leaf (prompt-driven drift +
 * bob + rotation + soft glow), but deliberately much bigger than the Mac's
 * ~14x8px leaf so it reads on a phone.
 *
 * `progress` (0..1) drives the downstream position; `visible` fades it in/out.
 * Respects reduce-motion by holding still instead of bobbing.
 */

import { useEffect } from 'react';
import { AccessibilityInfo, Dimensions, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

const LEAF_SIZE = 76;
const BOB_MS = 2600;

interface DriftingLeafProps {
  visible: boolean;
  /** 0 = just placed (upstream), 1 = carried away (downstream). */
  progress: number;
}

export function DriftingLeaf({ visible, progress }: DriftingLeafProps) {
  const { width } = Dimensions.get('window');
  const startX = -width * 0.2;
  const endX = width * 0.3;

  const driftX = useSharedValue(startX);
  const bob = useSharedValue(0.5);
  const appear = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      bob.value = withRepeat(
        withTiming(1, { duration: BOB_MS, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    });
    return () => {
      cancelled = true;
      cancelAnimation(bob);
    };
  }, [bob]);

  useEffect(() => {
    // Glide to the position this prompt should sit at, over a slow river pace.
    driftX.value = withTiming(startX + (endX - startX) * progress, {
      duration: 3600,
      easing: Easing.inOut(Easing.ease),
    });
  }, [progress, driftX, startX, endX]);

  useEffect(() => {
    appear.value = withTiming(visible ? 1 : 0, { duration: visible ? 1400 : 900 });
  }, [visible, appear]);

  const leafStyle = useAnimatedStyle(() => {
    const swing = bob.value - 0.5; // -0.5..0.5
    return {
      opacity: appear.value,
      transform: [
        { translateX: driftX.value },
        { translateY: swing * 18 },
        { rotate: `${swing * 14 + progress * 12}deg` },
      ],
    };
  });

  return (
    <View
      style={styles.container}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[styles.leaf, leafStyle]}>
        <SymbolView
          name="leaf.fill"
          tintColor="rgba(170, 212, 148, 0.95)"
          size={LEAF_SIZE}
          weight="regular"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    shadowColor: 'rgba(150, 210, 140, 0.9)',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
});
