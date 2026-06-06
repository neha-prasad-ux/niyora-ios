// Session screen. Particles + breath cadence + phase label, ported from the
// Mac BreathingSession.tsx canvas at a v1-appropriate level of detail.
//
// Differs from the Mac:
// - Swipe-down to dismiss via react-native-gesture-handler pan gesture.
// - No pause overlay yet (tap to pause is on the roadmap).

import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathingParticles } from '@/components/BreathingParticles';
import { CelebrationParticles } from '@/components/CelebrationParticles';
import { PhaseLabel } from '@/components/phase-label';
import { PostSessionMood } from '@/components/PostSessionMood';
import { SessionBackground } from '@/components/session-background';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import { useSessionMusic } from '@/hooks/use-session-music';
import {
  type BreathingTechnique,
  getTechnique,
  isBreathing,
} from '@/models/techniques';
import { NiyoraSync } from 'niyora-sync';

import { appendSession } from '@/store/session-history';
import type { MusicTrack } from '@/store/music-prefs';
import { colors } from '@/theme/colors';

const TRACK_OPTIONS: { id: MusicTrack; label: string; icon: SFSymbol }[] = [
  { id: 'serene', label: 'Serene', icon: 'music.note' },
  { id: 'ocean', label: 'Ocean', icon: 'waveform' },
  { id: 'forest', label: 'Forest', icon: 'leaf' },
  { id: 'mute', label: 'Mute', icon: 'speaker.slash' },
];

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
  const { track, changeTrack, fadeOut } = useSessionMusic();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showMood, setShowMood] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: cycle.sessionT,
      duration: 50,
      useNativeDriver: false,
    }).start();
  }, [cycle.sessionT, progressAnim]);

  const completedRounds = cycle.done ? technique.rounds : cycle.round - 1;

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
      // Report to the paired Mac (no-op when not paired).
      NiyoraSync.recordSession({
        techniqueName: technique.name,
        techniqueKind: technique.category,
        durationSec: technique.durationSeconds,
        intendedDurationSec: technique.durationSeconds,
        completed: true,
        recordedAt: new Date().toISOString(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      fadeOut();
      // Give the "well done" label a moment to appear before the mood overlay fades in
      const t = setTimeout(() => setShowMood(true), 500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fadeOut is stable; omitting avoids double-fire on track change
  }, [cycle.done, technique.id]);

  const labelText = useMemo(() => {
    if (cycle.done) return 'well done';
    return cycle.phase.label;
  }, [cycle.done, cycle.phase.label]);

  function exitSession() {
    Haptics.selectionAsync();
    fadeOut();
    router.back();
  }

  const musicLabel =
    track === 'mute' ? 'Music, muted' : `Music, ${track}`;

  return (
    <View style={styles.root}>
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

        {cycle.done && (
          <CelebrationParticles
            style={{ position: 'absolute', top: 0, left: 0, width, height }}
          />
        )}

        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.topRow}>
            <Pressable
              onPress={exitSession}
              hitSlop={20}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <SymbolView
                name="chevron.left"
                tintColor={colors.textPrimary}
                size={28}
                weight="medium"
              />
            </Pressable>

            <Pressable
              onPress={() => setPickerVisible((v) => !v)}
              hitSlop={20}
              accessibilityRole="button"
              accessibilityLabel={musicLabel}
            >
              <SymbolView
                name="music.note"
                tintColor={pickerVisible ? colors.textPrimary : colors.textSubtitle}
                size={22}
                weight="medium"
              />
            </Pressable>
          </View>

          {pickerVisible && (
            <View style={styles.pickerCard}>
              {TRACK_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={styles.pickerRow}
                  onPress={() => {
                    changeTrack(opt.id);
                    setPickerVisible(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityState={{ selected: track === opt.id }}
                >
                  <SymbolView
                    name={opt.icon}
                    tintColor={
                      track === opt.id
                        ? colors.textPrimary
                        : colors.textSubtitle
                    }
                    size={16}
                    weight="medium"
                  />
                  <Text
                    style={[
                      styles.pickerLabel,
                      track === opt.id && styles.pickerLabelActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {!showMood && (
            <>
              <View style={styles.bottomBlock}>
                <PhaseLabel label={labelText} />
                {!cycle.done && (
                  <Text style={styles.instructions}>{technique.instructions}</Text>
                )}
              </View>

              <View style={styles.progressArea}>
                <View
                  style={styles.dotsRow}
                  accessibilityLabel={`Round ${cycle.round} of ${technique.rounds}`}
                >
                  {Array.from({ length: technique.rounds }, (_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i < completedRounds && styles.dotFilled]}
                    />
                  ))}
                </View>
                <View style={styles.barTrack}>
                  <Animated.View
                    style={[
                      styles.barFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          )}
        </SafeAreaView>

        {showMood && (
          <PostSessionMood
            techniqueId={technique.id}
            onDone={() => router.back()}
          />
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  pickerCard: {
    position: 'absolute',
    top: 52,
    right: 0,
    backgroundColor: 'rgba(18, 14, 26, 0.94)',
    borderRadius: 14,
    paddingVertical: 4,
    minWidth: 130,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  pickerLabelActive: {
    color: colors.textPrimary,
    fontWeight: '500',
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
  progressArea: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dotFilled: {
    backgroundColor: 'rgba(160, 120, 220, 0.80)',
  },
  barTrack: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1,
    backgroundColor: 'rgba(150, 110, 210, 0.72)',
  },
});
