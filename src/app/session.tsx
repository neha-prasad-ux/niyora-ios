// Session screen. Particles + breath cadence + phase label, ported from the
// Mac BreathingSession.tsx canvas at a v1-appropriate level of detail.
//
// Differs from the Mac:
// - Native iOS pull-down dismiss (full-screen sheet).
// - No pause overlay yet (tap to pause is on the roadmap).
// - No round dots / progress ring yet.
// - Single "converge" particle motion regardless of technique.motion;
//   per-technique motion comes back when we port the full Mac engine.

import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  return (
    <View style={styles.root}>
      <SessionBackground targetColor={[...phaseHsl] as [number, number, number]} />
      <BreathingParticles
        motion="converge"
        phase={cycle.phase.type}
        phaseT={cycle.phaseT}
        roundProgress={cycle.sessionT}
        active
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="End session"
          >
            <SymbolView
              name="xmark"
              tintColor={colors.iconChrome}
              size={20}
              weight="regular"
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
    </View>
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
