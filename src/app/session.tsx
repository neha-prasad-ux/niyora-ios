// Session screen. Particles + breath cadence + phase label, ported from the
// Mac BreathingSession.tsx canvas at a v1-appropriate level of detail.
//
// Differs from the Mac:
// - Swipe-down to dismiss via react-native-gesture-handler pan gesture.
// - Tap anywhere to pause/resume (pause.fill overlay when frozen).

import * as Haptics from 'expo-haptics';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathingParticles } from '@/components/BreathingParticles';
import { Orb } from '@/components/orb';
import { MindfulnessSession } from '@/components/mindfulness-session';
import { PhaseLabel } from '@/components/phase-label';
import { PostSessionMood } from '@/components/PostSessionMood';
import { SessionBackground } from '@/components/session-background';
import { SessionDoneBackdrop } from '@/components/SessionDoneBackdrop';
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

// Matches the onboarding breath orb so the Soul-orb techniques feel continuous
// with the intro.
const SESSION_ORB_SIZE = 220;

const TRACK_OPTIONS: { id: MusicTrack; label: string; icon: SFSymbol }[] = [
  { id: 'serene', label: 'Serene', icon: 'music.note' },
  { id: 'ocean', label: 'Ocean', icon: 'waveform' },
  { id: 'forest', label: 'Forest', icon: 'leaf' },
  { id: 'mute', label: 'Mute', icon: 'speaker.slash' },
];

export default function SessionScreen() {
  const { id, rounds, feeling } = useLocalSearchParams<{
    id: string;
    rounds?: string;
    feeling?: string;
  }>();
  const technique = id ? getTechnique(id) : undefined;

  // Unknown id: bounce home rather than render a blank screen.
  useEffect(() => {
    if (!technique) {
      router.back();
    }
  }, [technique]);

  // Optional rounds override from the "recommend by feeling" duration step.
  // Only the breathing path honours it; falls back to the authored rounds.
  const parsed = rounds != null ? Number.parseInt(rounds, 10) : NaN;
  const roundsOverride =
    Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

  if (!technique) return null;
  // key on the technique id so "try another" (a router.replace to the same
  // /session route with a new id) remounts the session fresh instead of reusing
  // the finished instance with its stale post-session overlay and breath state.
  if (isBreathing(technique))
    return (
      <BreathingSession
        key={technique.id}
        technique={technique}
        roundsOverride={roundsOverride}
        feeling={feeling}
      />
    );
  return <MindfulnessSession key={technique.id} technique={technique} feeling={feeling} />;
}

function BreathingSession({
  technique,
  roundsOverride,
  feeling,
}: {
  technique: BreathingTechnique;
  roundsOverride?: number;
  feeling?: string;
}) {
  const rounds = roundsOverride ?? technique.rounds;
  // Scale the reported duration to the actual rounds run, keeping per-round
  // cadence fixed so paired-device stats stay honest.
  const durationSec =
    technique.rounds > 0
      ? Math.round((technique.durationSeconds / technique.rounds) * rounds)
      : technique.durationSeconds;
  const [paused, setPaused] = useState(false);
  const cycle = useBreathCycle(technique.phases, rounds, paused);
  const { width, height } = Dimensions.get('window');
  const { track, changeTrack, fadeOut, pause: pauseMusic, resume: resumeMusic } = useSessionMusic();
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

  // A soft cue that the session has begun.
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  const completedRounds = cycle.done ? rounds : cycle.round - 1;

  // Pick the HSL triple that matches the current phase type.
  const phaseHsl =
    cycle.phase.type === 'inhale'
      ? technique.colors.inhale
      : cycle.phase.type === 'exhale'
        ? technique.colors.exhale
        : technique.colors.hold;

  useEffect(() => {
    if (cycle.done) {
      appendSession(technique.id).catch(() => {});
      // Report to the paired Mac (no-op when not paired).
      NiyoraSync.recordSession({
        techniqueName: technique.name,
        techniqueKind: technique.category,
        durationSec,
        intendedDurationSec: durationSec,
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

  // Pause the music with the breath: tapping to pause freezes the visuals, so
  // the soundtrack should stop too (and resume on the next tap). When the
  // session completes, fadeOut owns the audio, so skip resuming once done.
  useEffect(() => {
    if (cycle.done) return;
    if (paused) pauseMusic();
    else resumeMusic();
  }, [paused, cycle.done, pauseMusic, resumeMusic]);

  const labelText = useMemo(() => {
    if (cycle.done) return 'well done';
    return cycle.phase.label;
  }, [cycle.done, cycle.phase.label]);

  function exitSession() {
    Haptics.selectionAsync();
    fadeOut();
    router.back();
  }

  function handleSessionTap() {
    if (cycle.done) return;
    if (pickerVisible) {
      setPickerVisible(false);
      return;
    }
    setPaused((p) => !p);
    Haptics.selectionAsync();
  }

  const musicLabel =
    track === 'mute' ? 'Music, muted' : `Music, ${track}`;

  return (
    <Pressable
      style={styles.root}
      onPress={handleSessionTap}
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Resume session' : 'Pause session'}
    >
        <SessionBackground targetColor={[...phaseHsl] as [number, number, number]} />
        {/* Two breathing visuals. Techniques carrying a `breathRange` (just
            Quick Calm for now) wear the swelling Soul orb from onboarding so
            the fastest reset reads as a single bold breath. Everything else
            keeps the Mac-style particle field: the particles converge and
            disperse with the breath over the center bloom. */}
        {technique.breathRange ? (
          <View style={styles.orbWrap} pointerEvents="none">
            <Orb
              size={SESSION_ORB_SIZE}
              phase={cycle.phase.type === 'hold2' ? 'hold' : cycle.phase.type}
              phaseDuration={cycle.phase.duration}
              breathRange={technique.breathRange}
            />
          </View>
        ) : (
          <BreathingParticles
            motion={technique.motion}
            phase={cycle.phase.type}
            phaseT={cycle.phaseT}
            roundProgress={cycle.sessionT}
            phaseColor={phaseHsl}
            active
            style={{ position: 'absolute', top: 0, left: 0, width, height }}
          />
        )}

        {cycle.done && <SessionDoneBackdrop />}

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
                    Haptics.selectionAsync();
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
                  <>
                    <Text style={styles.techniqueName}>{technique.name}</Text>
                    <Text style={styles.techniqueBenefit}>{technique.subtitle}</Text>
                    {!!technique.context && (
                      <Text style={styles.techniqueContext}>{technique.context}</Text>
                    )}
                  </>
                )}
              </View>

              <View style={styles.progressArea}>
                <View
                  style={styles.dotsRow}
                  accessibilityLabel={`Round ${cycle.round} of ${rounds}`}
                >
                  {Array.from({ length: rounds }, (_, i) => (
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
            feeling={feeling}
            onDone={() => router.back()}
          />
        )}

        {paused && !cycle.done && (
          <View style={styles.pauseOverlay} pointerEvents="none">
            <SymbolView
              name="pause.fill"
              tintColor="rgba(255, 255, 255, 0.85)"
              size={52}
              weight="regular"
            />
          </View>
        )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  // Centres the breath orb in the upper field, clear of the phase label and
  // technique name that sit at ~62% of the screen.
  orbWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '28%',
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
    // Sits below the centre bloom rather than over it, so the cue stays legible
    // while particles converge and disperse at the middle of the screen.
    position: 'absolute',
    top: '62%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  // Exercise identity under the phase word — same info as the home list:
  // the technique name (title) and its one-line benefit (subtitle).
  techniqueName: {
    marginTop: 14,
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  techniqueBenefit: {
    marginTop: 4,
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  techniqueContext: {
    marginTop: 10,
    alignSelf: 'stretch',
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.6)',
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
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
