// Primary action button per DESIGN.md: purple gradient capsule, anchored to
// the bottom safe area, with press feedback (scale 0.97, opacity 0.92 over
// 150ms) and a soft impact haptic.

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

type BeginButtonProps = {
  label?: string;
  onPress: () => void;
};

export function BeginButton({ label = 'Begin', onPress }: BeginButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressed.value * 0.03;
    const opacity = 1 - pressed.value * 0.08;
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  function handlePressIn() {
    pressed.value = withTiming(1, { duration: 150 });
  }
  function handlePressOut() {
    pressed.value = withTiming(0, { duration: 150 });
  }
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    onPress();
  }

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
});
