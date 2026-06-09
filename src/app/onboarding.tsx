// First-launch onboarding. Six beats, narrated around a single orb that stays
// mounted the whole way through and transforms per step (calm -> breathing ->
// Spark-tier rings -> calm). See DESIGN.md "Onboarding".
//
// Flow: Welcome -> Privacy -> First breath (one ~20s guided cycle + a science
// reveal) -> My Soul -> Reminders (reuses the daily-reminder infra) -> Mac
// (placeholder slot). Skip (top-right) finishes immediately from any step.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { PhaseLabel } from '@/components/phase-label';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import type { BreathPhase } from '@/models/techniques';
import { TIERS } from '@/models/tiers';
import {
  ensureNotificationPermission,
  scheduleDailyReminder,
} from '@/lib/notifications';
import { setReminder } from '@/store/reminder-prefs';
import { setOnboardingComplete } from '@/store/onboarding-complete';
import { BREATH_FACTS, pickFact } from '@/lib/onboarding-facts';

const ORB_SIZE = 220;
const STEP_COUNT = 6;
const SPARK_HUE = TIERS[0].hue; // 30, the first-tier warm orange
// How far above its resting spot the orb starts before dropping in on launch.
const ORB_DROP_DISTANCE = 340;

// One short guided cycle for the first breath: exhale longer than inhale, the
// move the science reveal is about. Two rounds of 4-in / 6-out = 20s.
const ONBOARDING_BREATH: readonly BreathPhase[] = [
  { type: 'inhale', label: 'breathe in', duration: 4 },
  { type: 'exhale', label: 'breathe out', duration: 6 },
];
const ONBOARDING_BREATH_ROUNDS = 2;
// Dramatic breath amplitude for the first-breath beat: big on inhale, small on
// exhale, so the swell is unmistakable and invites the user to follow along.
const ONBOARDING_BREATH_RANGE = { min: 0.7, max: 1.35 };
// Each accumulating soul ring keeps its own colour, in tier order: rose,
// violet, blue, cool blue (skips Spark, which has no ring).
const SOUL_RING_HUES = TIERS.slice(1).map((t) => t.hue);

// Reminder time presets so onboarding stays one tap, not a full picker. Values
// feed the existing daily-reminder schedule (hour, minute 0).
const TIME_PRESETS: readonly { label: string; hour: number }[] = [
  { label: 'Morning', hour: 9 },
  { label: 'Midday', hour: 13 },
  { label: 'Evening', hour: 20 },
];

// Reports the breath cadence up to the parent (which owns the shared orb) and
// fires onDone once when the cycle completes. Mounted only during the breath
// step so its timer starts then and not on first launch.
function BreathDriver({
  onPhase,
  onDone,
}: {
  onPhase: (phase: BreathPhase) => void;
  onDone: () => void;
}) {
  const cycle = useBreathCycle(ONBOARDING_BREATH, ONBOARDING_BREATH_ROUNDS);
  const lastPhaseIndex = useRef(-1);
  const doneFired = useRef(false);

  useEffect(() => {
    if (cycle.phaseIndex !== lastPhaseIndex.current) {
      lastPhaseIndex.current = cycle.phaseIndex;
      onPhase(cycle.phase);
    }
  }, [cycle.phaseIndex, cycle.phase, onPhase]);

  useEffect(() => {
    if (cycle.done && !doneFired.current) {
      doneFired.current = true;
      onDone();
    }
  }, [cycle.done, onDone]);

  return <PhaseLabel label={cycle.phase.label} />;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  // First-breath state.
  const [breathPhase, setBreathPhase] = useState<BreathPhase | undefined>(undefined);
  const [breathDone, setBreathDone] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  // Reminder selection.
  const [presetIndex, setPresetIndex] = useState(2); // default Evening

  // My Soul beat: the orb accumulates rings to show the soul growing with
  // practice (1 -> 2 -> 3 -> 4, then holds, never resetting). Illustrative, not
  // the real count.
  const [soulRingCount, setSoulRingCount] = useState(1);
  useEffect(() => {
    if (step !== 3) return;
    const seq = [1, 2, 3, 4];
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      setSoulRingCount(seq[idx]);
      idx += 1;
      if (idx < seq.length) {
        timer = setTimeout(advance, 1300);
      }
    };
    timer = setTimeout(advance, 500);
    return () => clearTimeout(timer);
  }, [step]);

  // Launch entrance: the orb drops in from above and settles into place once,
  // on first mount (the welcome beat). 1 = up high, 0 = landed.
  const orbDrop = useSharedValue(1);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        orbDrop.value = 0;
        return;
      }
      orbDrop.value = withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      cancelled = true;
    };
  }, [orbDrop]);
  const orbDropStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -orbDrop.value * ORB_DROP_DISTANCE }],
    opacity: 1 - orbDrop.value,
  }));

  const handlePhase = useCallback((phase: BreathPhase) => setBreathPhase(phase), []);
  const handleBreathDone = useCallback(() => {
    setFactIndex(Math.floor(Math.random() * BREATH_FACTS.length));
    setBreathDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const finish = useCallback(() => {
    setOnboardingComplete().finally(() => router.replace('/'));
  }, []);

  const goNext = useCallback(() => {
    Haptics.selectionAsync();
    setStep((s) => s + 1);
  }, []);

  // Step back one beat. Resets the first-breath state so returning to it replays
  // the guided cycle rather than dropping straight into the reveal.
  const goBack = useCallback(() => {
    Haptics.selectionAsync();
    setBreathPhase(undefined);
    setBreathDone(false);
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const enableReminders = useCallback(async () => {
    Haptics.selectionAsync();
    const hour = TIME_PRESETS[presetIndex].hour;
    try {
      const granted = await ensureNotificationPermission();
      if (granted) {
        await setReminder({ enabled: true, hour, minute: 0 });
        await scheduleDailyReminder(hour, 0);
      }
    } catch {
      // Permission/scheduling can throw (e.g. the notifications native module
      // is absent in an older dev build). Never trap the user on this step.
    }
    setStep((s) => s + 1);
  }, [presetIndex]);

  // Orb props per step: breathing on the breath step, Spark rings on My Soul,
  // calm everywhere else. The orb instance itself never unmounts.
  const isBreathStep = step === 2;
  const isSoulStep = step === 3;

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            {step > 0 && (
              <Pressable
                onPress={goBack}
                hitSlop={12}
                style={styles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
              </Pressable>
            )}
            <View style={styles.dots}>
              {Array.from({ length: STEP_COUNT }, (_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === step && styles.dotActive]}
                />
              ))}
            </View>
          </View>
          <Pressable
            onPress={finish}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.orbArea}>
          <Animated.View style={orbDropStyle}>
          <Orb
            size={ORB_SIZE}
            phase={
              isBreathStep && breathPhase
                ? breathPhase.type === 'hold2'
                  ? 'hold'
                  : breathPhase.type
                : undefined
            }
            phaseDuration={isBreathStep ? breathPhase?.duration : undefined}
            breathRange={isBreathStep ? ONBOARDING_BREATH_RANGE : undefined}
            tierRingCount={isSoulStep ? soulRingCount : 0}
            tierHue={SPARK_HUE}
            ringHues={isSoulStep ? SOUL_RING_HUES : undefined}
            accumulate={isSoulStep}
            still={isSoulStep}
            shield={step === 1}
          />
          </Animated.View>
          {isBreathStep && !breathDone && (
            <BreathDriver onPhase={handlePhase} onDone={handleBreathDone} />
          )}
        </View>

        <Animated.View
          key={`${step}-${breathDone}`}
          entering={FadeIn.duration(450)}
          style={styles.content}
        >
          {step === 0 && (
            <View style={styles.centerBlock}>
              <Animated.Text entering={FadeInDown.delay(900).duration(550)} style={styles.wordmark}>
                NIYORA
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(1150).duration(550)} style={styles.hero}>
                Calm in 60 seconds.
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(1400).duration(550)} style={styles.sub}>
                Nothing leaves your phone.
              </Animated.Text>
            </View>
          )}

          {step === 1 && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>You are safe.</Text>
              <View style={styles.privacyLines}>
                <Animated.Text entering={FadeIn.delay(150).duration(500)} style={styles.privacyLine}>
                  No account.
                </Animated.Text>
                <Animated.Text entering={FadeIn.delay(450).duration(500)} style={styles.privacyLine}>
                  No data leaves your phone.
                </Animated.Text>
                <Animated.Text entering={FadeIn.delay(750).duration(500)} style={styles.privacyLine}>
                  No wearables.
                </Animated.Text>
              </View>
            </View>
          )}

          {step === 2 && !breathDone && (
            <View style={styles.centerBlock}>
              <Text style={styles.sub}>Follow the orb.</Text>
            </View>
          )}

          {step === 2 && breathDone && (
            <View style={styles.centerBlock}>
              <Text style={styles.fact}>{pickFact(factIndex).fact}</Text>
              <Text style={styles.factYou}>{pickFact(factIndex).you}</Text>
            </View>
          )}

          {step === 3 && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>This is your Soul.</Text>
              <Text style={styles.sub}>It grows every time you practice.</Text>
            </View>
          )}

          {step === 4 && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>A gentle nudge during your day.</Text>
              <Text style={styles.sub}>Never a nag.</Text>
              <View style={styles.presets}>
                {TIME_PRESETS.map((p, i) => (
                  <Pressable
                    key={p.label}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setPresetIndex(i);
                    }}
                    style={[styles.preset, i === presetIndex && styles.presetActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: i === presetIndex }}
                    accessibilityLabel={`${p.label} reminder`}
                  >
                    <Text style={[styles.presetText, i === presetIndex && styles.presetTextActive]}>
                      {p.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 5 && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>Niyora on your Mac, soon.</Text>
              <Text style={styles.sub}>One practice, every screen you sit at.</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          {step === 0 && <BeginButton label="Continue" onPress={goNext} />}
          {step === 1 && <BeginButton label="Continue" onPress={goNext} />}
          {step === 2 && breathDone && <BeginButton label="Continue" onPress={goNext} />}
          {step === 3 && <BeginButton label="Continue" onPress={goNext} />}
          {step === 4 && (
            <>
              <BeginButton label="Turn on reminders" onPress={enableReminders} />
              <Pressable
                onPress={goNext}
                hitSlop={12}
                style={styles.notNow}
                accessibilityRole="button"
                accessibilityLabel="Not now"
              >
                <Text style={styles.notNowText}>Not now</Text>
              </Pressable>
            </>
          )}
          {step === 5 && <BeginButton label="I’m in." onPress={finish} />}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  dotActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    width: 18,
  },
  skip: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },
  orbArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  centerBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  wordmark: {
    ...typography.wordmark,
    color: colors.textWordmark,
    marginBottom: 18,
  },
  hero: {
    fontFamily: 'Poppins-Light',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 12,
  },
  privacyLines: {
    marginTop: 28,
    alignItems: 'center',
    gap: 12,
  },
  privacyLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  fact: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    lineHeight: 29,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  factYou: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    lineHeight: 25,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  closer: {
    marginTop: 28,
    alignItems: 'center',
  },
  closerLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  preset: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  presetActive: {
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.25)',
  },
  presetText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  presetTextActive: {
    color: colors.textPrimary,
    fontFamily: 'Poppins-Medium',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  notNow: {
    marginTop: 16,
  },
  notNowText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
});
