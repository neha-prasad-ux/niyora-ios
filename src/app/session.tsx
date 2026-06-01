// Session screen. Particles + breath cadence + phase label, ported from the
// Mac BreathingSession.tsx canvas at a v1-appropriate level of detail.
//
// Differs from the Mac:
// - Swipe-down to dismiss via react-native-gesture-handler pan gesture.
// - No pause overlay yet (tap to pause is on the roadmap).
// - No round dots / progress ring yet.

import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { BreathingParticles } from '@/components/BreathingParticles';
import { PhaseLabel } from '@/components/phase-label';
import { SessionBackground } from '@/components/session-background';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import {
  type BreathingTechnique,
  getTechnique,
  isBreathing,
} from '@/models/techniques';
import { appendSession } from '@/store/session-history';
import { colors } from '@/theme/colors';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const technique = id ? getTechnique(id) : undefined;
  const breathing = technique && isBreathing(technique) ? technique : null;

  // Mindfulness sessions land in a later PR. Bounce back home so the user
  // never sees a half-rendered screen.
  useEffect(() => {
    if (!breathing) {
      router.back();
    }
  }, [breathing]);

  if (!breathing) return null;
  return <BreathingSession technique={breathing} />;
}

function BreathingSession({ technique }: { technique: BreathingTechnique }) {
  const cycle = useBreathCycle(technique.phases, technique.rounds);
  const { width, height } = Dimensions.get('window');

  // Pick the HSL triple that matches the current phase type.
  const phaseHsl =
    cycle.phase.type === 'inhale'
      ? technique.colors.inhale
      : cycle.phase.type === 'exhale'
        ? technique.colors.exhale
        : technique.colors.hold;

  // Particle hue brightens slightly on inhale, settles on exhale.
  const particleHue = phaseHsl[0];

  useEffect(() => {
    if (cycle.done) {
      appendSession(technique.id).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const t = setTimeout(() => router.back(), 1200);
      return () => clearTimeout(t);
    }
  }, [cycle.done, technique.id]);

  const labelText = useMemo(() => {
    if (cycle.done) return 'well done';
    return cycle.phase.label;
  }, [cycle.done, cycle.phase.label]);

  const translateY = useSharedValue(0);

  function exitSession() {
    Haptics.selectionAsync();
    router.back();
  }

  // Swipe-down to dismiss: drag threshold 80pt or velocity 800pt/s.
  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-30, 30])
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 800) {
        runOnJS(exitSession)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.root, animatedStyle]}>
        <SessionBackground targetColor={[...phaseHsl] as [number, number, number]} />
        {/* The session visual IS the particle field, exactly like the Mac
            BreathingSession canvas: no resting sphere, the particles converge
            and disperse with the breath over the center bloom. */}
        <BreathingParticles
          motion={technique.motion}
          phase={cycle.phase.type}
          phaseT={cycle.phaseT}
          roundProgress={cycle.sessionT}
          active
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
        />

        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.dragHandleWrap} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.topRow}>
            <Pressable
              onPress={exitSession}
              hitSlop={20}
              accessibilityRole="button"
              accessibilityLabel="End session"
              accessibilityHint="Swipe down to dismiss"
            >
              <SymbolView
                name="chevron.down"
                tintColor={colors.textPrimary}
                size={28}
                weight="medium"
              />
            </Pressable>
          </View>

          <View style={styles.bottomBlock}>
            <PhaseLabel label={labelText} />
            <Text style={styles.instructions}>
              {cycle.done ? 'take this calm with you' : technique.instructions}
            </Text>
          </View>
        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  bottomBlock: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  instructions: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
