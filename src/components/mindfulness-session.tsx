// Mindfulness session screen — the breathing screen's sibling. Same particle
// field + gradient background, but instead of a breath cadence it shows a
// sequence of guided prompts that fade in and out. Ported from the Mac
// BreathingSession mindfulness branch (prompt timing, fade, background shift).

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BreathingParticles } from '@/components/BreathingParticles';
import { DriftingLeaf } from '@/components/DriftingLeaf';
import { GoldenFocalPoint } from '@/components/GoldenFocalPoint';
import { RiverStream } from '@/components/RiverStream';
import { PostSessionMood } from '@/components/PostSessionMood';
import { SessionDoneBackdrop } from '@/components/SessionDoneBackdrop';
import { SessionBackground } from '@/components/session-background';
import { useSessionMusic } from '@/hooks/use-session-music';
import type { MindfulnessTechnique } from '@/models/techniques';
import { appendSession } from '@/store/session-history';
import type { MusicTrack } from '@/store/music-prefs';
import { colors } from '@/theme/colors';
import { NiyoraSync } from 'niyora-sync';

// Same track set and picker behaviour as the breathing session screen.
const TRACK_OPTIONS: { id: MusicTrack; label: string; icon: SFSymbol }[] = [
  { id: 'serene', label: 'Serene', icon: 'music.note' },
  { id: 'ocean', label: 'Ocean', icon: 'waveform' },
  { id: 'forest', label: 'Forest', icon: 'leaf' },
  { id: 'mute', label: 'Mute', icon: 'speaker.slash' },
];

type HSL = [number, number, number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Shortest-arc hue interpolation, matching the Mac lerpHSL.
function lerpHSL(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): HSL {
  let dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [(a[0] + dh * t + 360) % 360, lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

const PROMPT_FADE_IN_MS = 1200;
const PROMPT_FADE_OUT_MS = 900;
// Gentle synthetic breath cadence (seconds) so the particle field keeps
// drifting softly through the session, with no breath phases of its own.
const CADENCE_SEC = 10;

export function MindfulnessSession({
  technique,
}: {
  technique: MindfulnessTechnique;
}) {
  const { width, height } = Dimensions.get('window');
  const { track, changeTrack, fadeOut } = useSessionMusic();

  const [promptIndex, setPromptIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [cadence, setCadence] = useState<{
    phase: 'inhale' | 'exhale';
    phaseT: number;
  }>({ phase: 'inhale', phaseT: 0 });

  const promptOpacity = useSharedValue(0);
  // Bottom progress bar: fills from 0 to 1 across the prompts, reaching 100%
  // as the final prompt plays out. trackWidth matches the safe-area content.
  const progress = useSharedValue(0);
  const trackWidth = width - 48;

  // A soft cue that the session has begun.
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // Background tint shifts inhale -> exhale across the prompts (Mac behaviour).
  const denom = Math.max(1, technique.prompts.length - 1);
  const bgColor = lerpHSL(
    technique.colors.inhale,
    technique.colors.exhale,
    promptIndex / denom,
  );

  // Synthetic slow breath to keep the particle field alive.
  const elapsedRef = useRef(0);
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      elapsedRef.current += 0.05;
      const pos = (elapsedRef.current % CADENCE_SEC) / CADENCE_SEC;
      const inhaling = pos < 0.5;
      setCadence({
        phase: inhaling ? 'inhale' : 'exhale',
        phaseT: inhaling ? pos * 2 : (pos - 0.5) * 2,
      });
    }, 50);
    return () => clearInterval(id);
  }, [done]);

  // Walk the prompts: fade each in, hold, fade out, advance — or finish.
  useEffect(() => {
    if (done) return;
    const prompt = technique.prompts[promptIndex];
    const durMs = prompt.duration * 1000;

    promptOpacity.value = 0;
    promptOpacity.value = withTiming(0.9, { duration: PROMPT_FADE_IN_MS });

    const fadeAt = Math.max(PROMPT_FADE_IN_MS, durMs - PROMPT_FADE_OUT_MS);
    const fadeTimer = setTimeout(() => {
      promptOpacity.value = withTiming(0, { duration: PROMPT_FADE_OUT_MS });
    }, fadeAt);

    // Advance the bar to the fraction reached once this prompt has played out.
    const total = technique.prompts.length;
    progress.value = withTiming((promptIndex + 1) / total, { duration: durMs });

    const nextTimer = setTimeout(() => {
      if (promptIndex + 1 >= technique.prompts.length) {
        setDone(true);
      } else {
        setPromptIndex((i) => i + 1);
      }
    }, durMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(nextTimer);
    };
  }, [promptIndex, done, technique.prompts, promptOpacity, progress]);

  // On completion: record the session, report to a paired Mac, then show mood.
  useEffect(() => {
    if (!done) return;
    appendSession(technique.id).catch(() => {});
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
    const t = setTimeout(() => setShowMood(true), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fadeOut is stable; run once when done flips true
  }, [done, technique.id]);

  function exitSession() {
    Haptics.selectionAsync();
    fadeOut();
    router.back();
  }

  const musicLabel = track === 'mute' ? 'Music, muted' : `Music, ${track}`;

  const promptStyle = useAnimatedStyle(() => ({ opacity: promptOpacity.value }));
  const barFillStyle = useAnimatedStyle(() => ({
    width: progress.value * trackWidth,
  }));

  // Let It Drift (river): the leaf appears on the "place ... on a leaf" prompt
  // and drifts downstream across the prompts that follow.
  const leafStart = technique.prompts.findIndex((p) => p.text.includes('leaf'));
  const showLeaf = technique.motion === 'river' && leafStart >= 0;
  const leafProgress = showLeaf
    ? (promptIndex - leafStart) /
      Math.max(1, technique.prompts.length - 1 - leafStart)
    : 0;

  return (
    <View style={styles.root}>
      <SessionBackground targetColor={bgColor} />
      <BreathingParticles
        motion={technique.motion}
        phase={cadence.phase}
        phaseT={cadence.phaseT}
        phaseColor={bgColor}
        active={!done}
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
      />

      {/* Soft Gaze (orbit motion): a steady golden Trataka anchor to gaze at. */}
      {technique.motion === 'orbit' && <GoldenFocalPoint visible={!done} />}

      {/* Let It Drift (river): a vertical stream channel the leaf floats down. */}
      {showLeaf && !done && <RiverStream />}

      {showLeaf && (
        <DriftingLeaf
          visible={!done && promptIndex >= leafStart}
          progress={Math.max(0, Math.min(1, leafProgress))}
        />
      )}

      {done && <SessionDoneBackdrop />}

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
                    track === opt.id ? colors.textPrimary : colors.textSubtitle
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
          <View style={styles.center} pointerEvents="none">
            {done ? (
              <Text style={styles.prompt}>well done</Text>
            ) : (
              <Animated.View style={promptStyle}>
                <Text style={styles.prompt} accessibilityLiveRegion="polite">
                  {technique.prompts[promptIndex].text}
                </Text>
              </Animated.View>
            )}
          </View>
        )}
      </SafeAreaView>

      {!done && (
        <View style={styles.progressArea} pointerEvents="none">
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, barFillStyle]} />
          </View>
        </View>
      )}

      {showMood && (
        <PostSessionMood techniqueId={technique.id} onDone={() => router.back()} />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255, 245, 235, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    paddingHorizontal: 12,
  },
  progressArea: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    alignItems: 'center',
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
