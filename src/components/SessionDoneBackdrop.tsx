/**
 * SessionDoneBackdrop
 *
 * The closing moment shown over the frozen breath/mindfulness field when a
 * session completes. A dark-blue gradient settles over the frozen particles,
 * and white celebration particles fall from the top.
 *
 * Rendered beneath the SafeAreaView chrome (so the back chevron stays tappable)
 * and beneath PostSessionMood. Shared by the breathing and mindfulness screens.
 */

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CelebrationParticles } from '@/components/CelebrationParticles';

// Deep, calming blue. Translucent at the top so the frozen field still reads
// through, denser toward the bottom to seat the closing copy and mood dots.
const GRADIENT_COLORS = [
  'rgba(12, 22, 54, 0.45)',
  'rgba(8, 15, 40, 0.80)',
  'rgba(5, 9, 26, 0.94)',
] as const;

export function SessionDoneBackdrop() {
  return (
    <Animated.View
      style={styles.fill}
      pointerEvents="none"
      entering={FadeIn.duration(700)}
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.fill}
      />
      <View style={styles.fill}>
        <CelebrationParticles style={styles.fill} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
