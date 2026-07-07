// Frosted-glass card for the V3 onboarding. The glass read comes from layered
// translucent gradients over the dark background (a light diagonal sheen plus a
// bright top edge), so it needs no native blur dependency and works over Fast
// Refresh. `shine` adds a slow highlight that sweeps across on a loop; reduced
// motion holds it still.

import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export function GlassCard({
  children,
  style,
  shine = false,
  radius = 16,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  shine?: boolean;
  radius?: number;
}) {
  const [width, setWidth] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => alive && setReduce(r));
    return () => {
      alive = false;
    };
  }, []);

  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce || !shine) return;
    x.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [reduce, shine, x]);
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -140 + x.value * (width + 280) }, { rotate: '18deg' }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.card, { borderRadius: radius }, style]}
    >
      {/* Diagonal glass sheen: brighter top-left, fading to bottom-right. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.012)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Soft top glow, the body of the glass lip. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topEdge}
        pointerEvents="none"
      />
      {/* Crisp specular hairline right on the top lip, the iOS glass highlight. */}
      <View style={styles.specular} pointerEvents="none" />
      {/* Faint reflection catching along the bottom. */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bottomEdge}
        pointerEvents="none"
      />
      {shine && !reduce && width > 0 && (
        <Animated.View pointerEvents="none" style={[styles.shineBand, shineStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  bottomEdge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
  },
  shineBand: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    width: 130,
  },
});
