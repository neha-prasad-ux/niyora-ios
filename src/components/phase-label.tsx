// Cross-fading phase label. When the label string changes, the old text
// fades out while the new one fades in, both shifted by a soft text shadow
// so the active cue feels "lit" (mirrors the Mac canvas shadowBlur on text).

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type PhaseLabelProps = {
  label: string;
};

const FADE_MS = 280;

export function PhaseLabel({ label }: PhaseLabelProps) {
  const [shown, setShown] = useState(label);
  const [prev, setPrev] = useState<string | null>(null);
  const shownOpacity = useSharedValue(1);
  const prevOpacity = useSharedValue(0);
  const lastLabelRef = useRef(label);

  useEffect(() => {
    if (label === lastLabelRef.current) return;
    setPrev(lastLabelRef.current);
    setShown(label);
    lastLabelRef.current = label;
    shownOpacity.value = 0;
    prevOpacity.value = 1;
    shownOpacity.value = withTiming(1, { duration: FADE_MS });
    prevOpacity.value = withTiming(0, { duration: FADE_MS });
  }, [label, prevOpacity, shownOpacity]);

  const shownStyle = useAnimatedStyle(() => ({ opacity: shownOpacity.value }));
  const prevStyle = useAnimatedStyle(() => ({ opacity: prevOpacity.value }));

  return (
    <View style={styles.wrap}>
      {prev !== null && (
        <Animated.View style={[styles.absolute, prevStyle]}>
          <Text style={styles.text}>{prev}</Text>
        </Animated.View>
      )}
      <Animated.View style={shownStyle}>
        <Text style={styles.text}>{shown}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255, 245, 235, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
});
