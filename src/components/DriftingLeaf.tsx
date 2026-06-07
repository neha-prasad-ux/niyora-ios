/**
 * DriftingLeaf
 *
 * Let It Drift (river motion): a leaf placed on the stream that floats down the
 * current and out the bottom of the screen, the way the Mac leaf floats off the
 * (horizontal) river. On portrait mobile the stream runs vertically, so the
 * leaf enters near the top on the "place the thought on a leaf" prompt, floats
 * downstream as the prompts progress, sways and rocks on the water, and is
 * carried out the bottom — fading as it goes.
 *
 * `progress` (0 = just placed, 1 = carried away) drives the vertical position;
 * `visible` fades it in. Deliberately much bigger than the Mac's ~14x8px leaf.
 * Respects reduce-motion (no sway/rock).
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

const LEAF_SIZE = 80;
const SWAY_MS = 3000;

interface DriftingLeafProps {
  visible: boolean;
  /** 0 = just placed (upstream/top), 1 = carried away (off the bottom). */
  progress: number;
}

export function DriftingLeaf({ visible, progress }: DriftingLeafProps) {
  const { height } = Dimensions.get('window');
  // Offsets are relative to screen centre (the container centres the leaf).
  const startY = -height * 0.32; // upper third, where it's "placed"
  const endY = height * 0.62; // past the bottom edge, "carried away"

  const driftY = useSharedValue(startY);
  const sway = useSharedValue(0.5);
  const appear = useSharedValue(0);
  const fade = useSharedValue(1);

  // Continuous gentle side-to-side rocking on the water.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      sway.value = withRepeat(
        withTiming(1, { duration: SWAY_MS, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    });
    return () => {
      cancelled = true;
      cancelAnimation(sway);
    };
  }, [sway]);

  // Float to the downstream position this prompt should reach, at a slow river
  // pace, and fade out over the final stretch as it leaves the screen.
  useEffect(() => {
    driftY.value = withTiming(startY + (endY - startY) * progress, {
      duration: 4200,
      easing: Easing.inOut(Easing.ease),
    });
    const exit = progress < 0.6 ? 1 : Math.max(0, 1 - (progress - 0.6) / 0.4);
    fade.value = withTiming(exit, { duration: 1200 });
  }, [progress, driftY, fade, startY, endY]);

  useEffect(() => {
    appear.value = withTiming(visible ? 1 : 0, { duration: visible ? 1400 : 900 });
  }, [visible, appear]);

  const leafStyle = useAnimatedStyle(() => {
    const swing = sway.value - 0.5; // -0.5..0.5
    return {
      opacity: appear.value * fade.value,
      transform: [
        { translateX: swing * 46 },
        { translateY: driftY.value },
        { rotate: `${swing * 16}deg` },
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
