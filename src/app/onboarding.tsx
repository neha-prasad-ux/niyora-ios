// First-launch onboarding, PMS-first. A single orb stays mounted the whole way
// through and transforms per step. See DESIGN.md "Onboarding".
//
// Flow: Hook -> Privacy -> First breath (one ~20s guided cycle + a science
// reveal) -> My Soul -> Daily nudge -> Smart PMS mode (opt-in) -> [Cycle setup]
// -> You're set. The cycle-setup screen is only reached if she activates PMS
// mode; declining skips straight to the closer. PMS framing never leads: the
// hook speaks to everyone, and the period-specific offer comes near the end so
// non-PMS users are never shown the door. Skip (top-right) finishes from any
// step. Everything is on-device.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';

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
import {
  setPmsPrefs,
  DEFAULT_CYCLE_LENGTH,
  MIN_CYCLE_LENGTH,
  MAX_CYCLE_LENGTH,
} from '@/store/pms-prefs';
import { isInPmsWindow } from '@/lib/pms-window';
import { syncPmsReminders } from '@/lib/pms-reminders';
import {
  setPmsFactors,
  DEFAULT_PMS_FACTORS,
  PMS_FACTOR_IDS,
  PMS_FACTOR_CONTENT,
  type PmsFactorId,
  type PmsFactors,
} from '@/store/pms-factors';
import {
  setPmsSymptoms,
  DEFAULT_PMS_SYMPTOMS,
  PMS_SYMPTOM_IDS,
  PMS_SYMPTOM_LABELS,
  type PmsSymptomId,
  type PmsSymptoms,
} from '@/store/pms-symptoms';

const ORB_SIZE = 220;
// On the PMS offer the orb is the hero: it fills the top of the screen and
// carries the opening stat inside it (Neha's design).
const PMS_ORB_SIZE = 300;
// On the PMS reveal and factor pages the orb steps back so the words (reveal)
// and the cards (factors) lead, but it stays present as the calm anchor.
const PMS_REVEAL_ORB_SIZE = 150;
const PMS_FACTORS_ORB_SIZE = 104;

// The reveal: a single Normal-vs-sensitive contrast that carries the genetics
// "not your fault" line, the highest-value education moment. Same hormones,
// different volume. No "imbalance", concrete factor names, no em dashes; the
// science link is omitted until the research appendix exists.
// The two mini "moons" inside the reveal cards: a calm one and a warmer,
// slightly larger PMS one that reads as reacting more (rose, never alarm-red).
const REVEAL_CARD_ORB = 46;
const REVEAL_CARD_ORB_PMS = 52;
const REVEAL_PMS_HUE = 345; // soft rose

// PMS offer orb behaviour: the orb drifts through soft cool shades (the moods of
// the week) and settles back to calm, never landing on an alarming colour, so
// the motion reinforces "feel safe" instead of agitating. Hues stay in the
// blue/violet/magenta band on purpose, no reds.
const CALM_HUE = 220;
const PMS_HUE_KEYFRAMES = [220, 275, 320, 250, 220];
const PMS_DRIFT_MS = 7000;

// The "reading your cycle" beat on the closer (PMS path only). Long enough to
// register as the app doing something personal, short enough not to drag, with
// the orb pulsing and the line + message cross-fading so nothing snaps.
const CLOSER_LOADING_MS = 2200;

// The dotted spine: hook, privacy, breath, soul, nudge, PMS, done. The
// cycle-setup screen is part of the PMS beat, so it shares the PMS dot rather
// than adding its own.
const STEP = {
  hook: 0,
  privacy: 1,
  breath: 2,
  soul: 3,
  nudge: 4,
  pms: 5,
  done: 6,
} as const;
// Cycle setup (date + length) is done in sheets over the PMS screen, so the
// steps map 1:1 to the dotted spine.
const TOTAL_DOTS = 7;
function dotIndex(step: number): number {
  return step;
}

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
  { label: '9pm', hour: 21 },
  { label: '10pm', hour: 22 },
  { label: '11pm', hour: 23 },
];

// Local YYYY-MM-DD for the chosen period start. Calendar-day only, no clock, so
// it lines up with the day math in lib/pms-window.
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

  // A one-line tip under the phase label so a first-timer understands why the
  // long exhale matters (the in/out contrast). Plain text, no icon.
  const tip =
    cycle.phase.type === 'inhale'
      ? 'Tip: Breathing in wakes you a little.'
      : cycle.phase.type === 'exhale'
        ? 'Tip: The longer you exhale, the calmer your body gets.'
        : null;
  return (
    <View style={styles.breathLabelWrap}>
      <PhaseLabel label={cycle.phase.label} />
      {/* Fixed two-line slot so the layout never jumps when the tip switches
          between a one-line (inhale) and two-line (exhale) message. */}
      <View style={styles.breathTipSlot}>
        {tip ? (
          <Text style={styles.breathTip} numberOfLines={2}>
            {tip}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// The closer's "reading your cycle" line, gently pulsing so the brief pause
// reads as the app working. The orb above is the visual; no separate dots.
function CloserReading() {
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[styles.closerLoadingText, style]}>Reading your cycle</Animated.Text>;
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);

  // First-breath state.
  const [breathPhase, setBreathPhase] = useState<BreathPhase | undefined>(undefined);
  const [breathDone, setBreathDone] = useState(false);
  const [factIndex, setFactIndex] = useState(0);

  // Reminder selection.
  const [presetIndex, setPresetIndex] = useState(1); // default 10pm

  // Smart PMS mode selection. cycleDate starts empty on purpose: pre-filling
  // today would silently corrupt the prediction if she taps Continue without
  // changing it, so Continue stays disabled until she picks a real day.
  const [pmsActivated, setPmsActivated] = useState(false);
  const [cycleDate, setCycleDate] = useState<Date | null>(null);
  const [cycleSheet, setCycleSheet] = useState<'closed' | 'date' | 'length'>('closed');
  const [cycleLength, setCycleLength] = useState(DEFAULT_CYCLE_LENGTH);

  // PMS-path sub-flow that sits inside STEP.pms (so it shares the PMS dot and
  // never changes the general flow): the offer, then the reveal beats, then the
  // factor cards, then the existing cycle-setup sheets. Only ever meaningful
  // while step === STEP.pms; 'offer' is the inert default everyone else stays on.
  const [pmsSubPhase, setPmsSubPhase] = useState<'offer' | 'symptoms' | 'reveal' | 'factors'>(
    'offer',
  );
  // What she feels before her period (opt-in, none pre-selected). Seeds relief
  // later; committed with the cycle in confirmLength.
  const [symptoms, setSymptoms] = useState<PmsSymptoms>(DEFAULT_PMS_SYMPTOMS);
  // The factors she lets Niyora help with. All pre-selected; she taps to remove.
  // Held locally and committed alongside the cycle in confirmLength, so backing
  // out of setup commits nothing.
  const [factors, setFactors] = useState<PmsFactors>(DEFAULT_PMS_FACTORS);
  const today = useMemo(() => new Date(), []);
  const basePickerStyles = useDefaultStyles('dark');
  const pickerStyles = useMemo(
    () => ({
      ...basePickerStyles,
      // No marker on today: the outline read as a pre-selection and confused
      // people about what was chosen.
      today: { borderWidth: 0, backgroundColor: 'transparent' },
      // The chosen day is a small glowing moon (a full moon, echoing the orb),
      // not a flat square.
      selected: {
        backgroundColor: 'rgba(228, 233, 255, 0.96)',
        borderRadius: 999,
        shadowColor: 'rgb(206, 214, 255)',
        shadowOpacity: 0.9,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 0 },
      },
      selected_label: { color: '#1b1430', fontWeight: '600' as const },
    }),
    [basePickerStyles],
  );

  // PMS offer beat: the orb drifts through the week's shades and settles to
  // calm. One pass when the screen appears; reduce-motion holds it at calm.
  const [pmsHue, setPmsHue] = useState(CALM_HUE);
  const lastHueRef = useRef(CALM_HUE);
  useEffect(() => {
    if (step !== STEP.pms) {
      // Off the PMS step the orb uses the calm default hue (pmsHue is unread),
      // so no reset is needed here; the drift restarts from calm on re-entry.
      lastHueRef.current = CALM_HUE;
      return;
    }
    let raf = 0;
    let start: number | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        setPmsHue(CALM_HUE);
        return;
      }
      const seg = PMS_DRIFT_MS / (PMS_HUE_KEYFRAMES.length - 1);
      const tick = (t: number) => {
        if (cancelled) return;
        if (start === null) start = t;
        const elapsed = t - start;
        if (elapsed >= PMS_DRIFT_MS) {
          setPmsHue(CALM_HUE);
          return;
        }
        const i = Math.min(PMS_HUE_KEYFRAMES.length - 2, Math.floor(elapsed / seg));
        const localT = (elapsed - i * seg) / seg;
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * localT); // smooth in/out
        const h = PMS_HUE_KEYFRAMES[i] + (PMS_HUE_KEYFRAMES[i + 1] - PMS_HUE_KEYFRAMES[i]) * eased;
        // Throttle re-renders: only push a visibly different hue.
        if (Math.abs(h - lastHueRef.current) > 1.5) {
          lastHueRef.current = h;
          setPmsHue(h);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [step]);

  // Closer beat (PMS path): a short loading pause "reads" her cycle, then the
  // tailored line fades in. We only claim where she is in her cycle (an
  // estimate), never how she feels. Declined path skips this, nothing to read.
  const [closerReady, setCloserReady] = useState(false);
  useEffect(() => {
    if (step !== STEP.done || !pmsActivated) return;
    // closerReady is reset to false in confirmLength before we land here, so the
    // loading beat always plays; here we just reveal the message after it.
    const t = setTimeout(() => setCloserReady(true), CLOSER_LOADING_MS);
    return () => clearTimeout(t);
  }, [step, pmsActivated]);
  const inPmsNow = useMemo(
    () => (cycleDate ? isInPmsWindow(toYmd(cycleDate), cycleLength, new Date()) : false),
    [cycleDate, cycleLength],
  );

  // Gentle orb breath during the closer's reading beat, so the wait feels alive
  // rather than frozen. Settles back to rest once the message appears.
  const closerPulse = useSharedValue(1);
  useEffect(() => {
    if (step === STEP.done && pmsActivated && !closerReady) {
      closerPulse.value = withRepeat(
        withTiming(1.05, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      closerPulse.value = withTiming(1, { duration: 300 });
    }
  }, [step, pmsActivated, closerReady, closerPulse]);
  const closerPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: closerPulse.value }] }));

  // My Soul beat: the orb accumulates rings to show the soul growing with
  // practice (1 -> 2 -> 3 -> 4, then holds, never resetting). Illustrative, not
  // the real count.
  const [soulRingCount, setSoulRingCount] = useState(1);
  useEffect(() => {
    if (step !== STEP.soul) return;
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
  // on first mount (the hook beat). 1 = up high, 0 = landed.
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
  // the guided cycle. From the closer, if PMS mode was declined, the cycle-setup
  // screen was skipped, so back lands on the PMS offer instead.
  const goBack = useCallback(() => {
    Haptics.selectionAsync();
    // Walk the PMS sub-flow back before changing step: factors -> reveal ->
    // symptoms -> the offer. These all live under STEP.pms.
    if (step === STEP.pms) {
      if (pmsSubPhase === 'factors') {
        setPmsSubPhase('reveal');
        return;
      }
      if (pmsSubPhase === 'reveal') {
        setPmsSubPhase('symptoms');
        return;
      }
      if (pmsSubPhase === 'symptoms') {
        setPmsSubPhase('offer');
        return;
      }
    }
    setBreathPhase(undefined);
    setBreathDone(false);
    setStep((s) => {
      if (s === STEP.done && !pmsActivated) return STEP.pms;
      return Math.max(0, s - 1);
    });
  }, [step, pmsSubPhase, pmsActivated]);

  // After the nudge beat, on to the Smart PMS mode offer.
  const afterNudge = useCallback(() => {
    setStep(STEP.pms);
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
    afterNudge();
  }, [presetIndex, afterNudge]);

  // Activating opens the symptom step first (then reveal, factors, cycle
  // setup), all under STEP.pms. The cycle sheets open later, from the factors.
  const activatePms = useCallback(() => {
    Haptics.selectionAsync();
    setPmsSubPhase('symptoms');
  }, []);

  // Symptom rows are opt-in: tap to add what she feels.
  const toggleSymptom = useCallback((id: PmsSymptomId) => {
    Haptics.selectionAsync();
    setSymptoms((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  // "None of these" clears the lot; it reads as selected when nothing else is.
  const clearSymptoms = useCallback(() => {
    Haptics.selectionAsync();
    setSymptoms(DEFAULT_PMS_SYMPTOMS);
  }, []);
  const noneSelected = PMS_SYMPTOM_IDS.every((id) => !symptoms[id]);

  // Symptoms -> the reveal. She can continue without choosing any; we never
  // trap her on this step.
  const continueFromSymptoms = useCallback(() => {
    Haptics.selectionAsync();
    setPmsSubPhase('reveal');
  }, []);

  // Reveal (a single screen) -> the factor cards.
  const advanceReveal = useCallback(() => {
    Haptics.selectionAsync();
    setPmsSubPhase('factors');
  }, []);

  // Factor cards are default-in: tapping one removes it (opt-out).
  const toggleFactor = useCallback((id: PmsFactorId) => {
    Haptics.selectionAsync();
    setFactors((f) => ({ ...f, [id]: !f[id] }));
  }, []);

  // From the factor page on into the existing cycle-setup sheets. The selection
  // is committed later, in confirmLength, so nothing persists if she backs out.
  const confirmFactors = useCallback(() => {
    Haptics.selectionAsync();
    setCycleSheet('date');
  }, []);

  // Backing out of the sheets leaves her on the PMS offer, not activated.
  const cancelCycleSheet = useCallback(() => {
    setCycleSheet('closed');
  }, []);

  // Date sheet -> length sheet (both over the PMS screen).
  const goToLengthSheet = useCallback(() => {
    Haptics.selectionAsync();
    setCycleSheet('length');
  }, []);

  const declinePms = useCallback(async () => {
    Haptics.selectionAsync();
    setPmsActivated(false);
    try {
      await setPmsPrefs({
        pmsMode: false,
        lastPeriodStart: null,
        cycleLength: DEFAULT_CYCLE_LENGTH,
      });
    } catch {
      // Storage can throw; never trap the user. Defaults are general mode anyway.
    }
    setStep(STEP.done);
  }, []);

  const adjustLength = useCallback((delta: number) => {
    Haptics.selectionAsync();
    setCycleLength((v) => Math.min(MAX_CYCLE_LENGTH, Math.max(MIN_CYCLE_LENGTH, v + delta)));
  }, []);

  const confirmLength = useCallback(async () => {
    Haptics.selectionAsync();
    try {
      await setPmsPrefs({
        pmsMode: true,
        lastPeriodStart: cycleDate ? toYmd(cycleDate) : null,
        cycleLength,
      });
      // Commit the factor + symptom selections in the same beat as the cycle,
      // so PMS activation is all-or-nothing: backing out persists none of it.
      await setPmsFactors(factors);
      await setPmsSymptoms(symptoms);
      // The heads-up reminders are this feature's only notification, so ask now
      // (no-op if she already granted it on the reminder step) and schedule the
      // first window. PMS framing still works in-app if she declines.
      await ensureNotificationPermission().catch(() => false);
      await syncPmsReminders();
    } catch {
      // Storage/scheduling can throw; never trap the user.
    }
    setCycleSheet('closed');
    setPmsSubPhase('offer'); // reset the sub-flow now setup is done and committed
    setCloserReady(false); // restart the loading beat each time she reaches the closer
    setPmsActivated(true);
    setStep(STEP.done);
  }, [cycleDate, cycleLength, factors, symptoms]);

  // Orb props per step: breathing on the breath step, Spark rings on My Soul,
  // calm everywhere else. The orb shrinks aside on the cycle-setup screen to
  // make room for the calendar. The orb instance itself never unmounts.
  const isBreathStep = step === STEP.breath;
  const isSoulStep = step === STEP.soul;
  const isPmsStep = step === STEP.pms;
  // The orb is the hero on the offer, then steps back for the reveal and the
  // factor cards so the content leads.
  const pmsOrbSize =
    pmsSubPhase === 'offer'
      ? PMS_ORB_SIZE
      : pmsSubPhase === 'factors'
        ? PMS_FACTORS_ORB_SIZE
        : PMS_REVEAL_ORB_SIZE; // reveal + symptoms share the stepped-back size

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
              {Array.from({ length: TOTAL_DOTS }, (_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === dotIndex(step) && styles.dotActive]}
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

        <View
          style={[
            styles.orbArea,
            isPmsStep && pmsSubPhase === 'offer' && styles.orbAreaPms,
            isPmsStep && (pmsSubPhase === 'symptoms' || pmsSubPhase === 'factors') &&
              styles.orbAreaPmsCompact,
            isPmsStep && pmsSubPhase === 'reveal' && styles.orbAreaReveal,
          ]}
        >
          <Animated.View style={orbDropStyle}>
            <Animated.View style={closerPulseStyle}>
            <Orb
              size={isPmsStep ? pmsOrbSize : ORB_SIZE}
              hue={isPmsStep ? pmsHue : undefined}
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
              shield={step === STEP.privacy}
            />
            </Animated.View>
          </Animated.View>
          {isPmsStep && pmsSubPhase === 'offer' && (
            <View style={styles.pmsStatOverlay} pointerEvents="none">
              <Text style={styles.pmsStat}>2/3 women get PMS{'\n'}mood swings</Text>
            </View>
          )}
          {isBreathStep && !breathDone && (
            <BreathDriver onPhase={handlePhase} onDone={handleBreathDone} />
          )}
        </View>

        <Animated.View
          key={`${step}-${breathDone}-${pmsSubPhase}`}
          entering={FadeIn.duration(450)}
          style={[styles.content, isPmsStep && styles.contentCycle]}
        >
          {step === STEP.hook && (
            <View style={styles.centerBlock}>
              <Animated.Text entering={FadeInDown.delay(900).duration(550)} style={styles.wordmark}>
                NIYORA
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(1150).duration(550)} style={styles.hero}>
                Calm in 60 seconds.
              </Animated.Text>
            </View>
          )}

          {step === STEP.privacy && (
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

          {step === STEP.breath && !breathDone && (
            <View style={styles.centerBlock}>
              <Text style={styles.sub}>Follow the orb.</Text>
            </View>
          )}

          {step === STEP.breath && breathDone && (
            <View style={styles.centerBlock}>
              <Text style={styles.fact}>{pickFact(factIndex).fact}</Text>
              <Text style={styles.factYou}>{pickFact(factIndex).you}</Text>
            </View>
          )}

          {step === STEP.soul && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>This is your Soul.</Text>
              <Text style={styles.sub}>It grows every time you practice.</Text>
            </View>
          )}

          {step === STEP.nudge && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>A minute a day keeps you steady.</Text>
              <Text style={styles.sub}>Want a gentle daily reminder?</Text>
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

          {isPmsStep && pmsSubPhase === 'offer' && (
            <View style={styles.pmsBlock}>
              <Text style={styles.pmsTitle}>Feel safe through PMS</Text>
              <View style={styles.pmsList}>
                {[
                  'Get a heads up before PMS hits',
                  'Understand why',
                  'Activity to help you feel better',
                ].map((point, i) => (
                  <Animated.View
                    key={point}
                    entering={FadeInDown.delay(150 + i * 180).duration(500)}
                    style={styles.pmsPointRow}
                  >
                    <View style={styles.pmsCheckBadge}>
                      <SymbolView
                        name="checkmark"
                        tintColor={colors.textPrimary}
                        size={12}
                        weight="bold"
                      />
                    </View>
                    <Text style={styles.pmsPointText}>{point}</Text>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}

          {isPmsStep && pmsSubPhase === 'symptoms' && (
            <View style={styles.symptomBlock}>
              <Text style={styles.symptomHeader}>How do you feel in the days before your period?</Text>
              <View style={styles.symptomList}>
                {PMS_SYMPTOM_IDS.map((id) => {
                  const selected = symptoms[id];
                  return (
                    <Pressable
                      key={id}
                      onPress={() => toggleSymptom(id)}
                      style={styles.symptomRow}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={PMS_SYMPTOM_LABELS[id]}
                    >
                      <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                        {selected && (
                          <SymbolView name="checkmark" tintColor={colors.textPrimary} size={12} weight="bold" />
                        )}
                      </View>
                      <Text style={styles.symptomRowText}>{PMS_SYMPTOM_LABELS[id]}</Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={clearSymptoms}
                  style={styles.symptomRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: noneSelected }}
                  accessibilityLabel="None of these"
                >
                  <View style={[styles.checkbox, noneSelected && styles.checkboxOn]}>
                    {noneSelected && (
                      <SymbolView name="checkmark" tintColor={colors.textPrimary} size={12} weight="bold" />
                    )}
                  </View>
                  <Text style={styles.symptomRowText}>None of these</Text>
                </Pressable>
              </View>
            </View>
          )}

          {isPmsStep && pmsSubPhase === 'reveal' && (
            <ScrollView
              style={styles.factorScroll}
              contentContainerStyle={styles.revealContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.revealTitle}>Why PMS hits some of us harder</Text>
              <View style={styles.flowRow}>
                <View style={styles.flowCard}>
                  <View style={styles.flowOrb}>
                    <Orb size={REVEAL_CARD_ORB} hue={CALM_HUE} still />
                  </View>
                  <Text style={styles.flowCardTitle}>A calm cycle</Text>
                  <Text style={styles.flowStep}>Hormones dip before your period</Text>
                  <Text style={styles.flowArrow}>↓</Text>
                  <Text style={styles.flowStep}>Feel-good hormones dip</Text>
                  <Text style={styles.flowArrow}>↓</Text>
                  <Text style={styles.flowOutcome}>You feel a little low</Text>
                </View>

                <View style={[styles.flowCard, styles.flowCardPms]}>
                  <View style={styles.flowOrb}>
                    <Orb size={REVEAL_CARD_ORB_PMS} hue={REVEAL_PMS_HUE} still />
                  </View>
                  <Text style={styles.flowCardTitleHi}>A PMS cycle</Text>
                  <Text style={styles.flowStep}>Hormones dip before your period</Text>
                  <Text style={styles.flowArrow}>↓</Text>
                  <View style={styles.flowHighlight}>
                    <Text style={styles.flowHighlightText}>Genetic brain sensitivity</Text>
                  </View>
                  <Text style={styles.flowArrow}>↓</Text>
                  <Text style={styles.flowStep}>Feel-good hormones dip too</Text>
                  <Text style={styles.flowArrow}>↓</Text>
                  <Text style={styles.flowOutcomeHi}>You feel much lower</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {isPmsStep && pmsSubPhase === 'factors' && (
            <ScrollView
              style={styles.factorScroll}
              contentContainerStyle={styles.factorScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.factorHeader}>Here&apos;s what can help</Text>
              {PMS_FACTOR_IDS.map((id) => {
                const c = PMS_FACTOR_CONTENT[id];
                const selected = factors[id];
                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleFactor(id)}
                    style={[styles.factorCard, !selected && styles.factorCardOff]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={c.label}
                  >
                    <View style={styles.factorCardText}>
                      <Text style={[styles.factorLabel, !selected && styles.factorTextOff]}>
                        {c.label}
                      </Text>
                      <Text style={[styles.factorWhy, !selected && styles.factorTextOff]}>
                        {c.why}
                      </Text>
                    </View>
                    <View style={[styles.factorCheck, !selected && styles.factorCheckOff]}>
                      {selected && (
                        <SymbolView
                          name="checkmark"
                          tintColor={colors.textPrimary}
                          size={13}
                          weight="bold"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {step === STEP.done && !pmsActivated && (
            <View style={styles.centerBlock}>
              <Text style={styles.hero}>You&apos;re set.</Text>
              <Text style={styles.sub}>Calm is one tap away.</Text>
            </View>
          )}
          {step === STEP.done && pmsActivated && !closerReady && (
            <Animated.View
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(400)}
              style={styles.centerBlock}
            >
              <CloserReading />
            </Animated.View>
          )}
          {step === STEP.done && pmsActivated && closerReady && (
            <Animated.View entering={FadeIn.duration(450)} style={styles.centerBlock}>
              <Text style={styles.hero}>
                {inPmsNow ? "Looks like you're going through PMS right now." : 'Got it.'}
              </Text>
              <Text style={styles.sub}>
                {inPmsNow ? "We've got you. Let's start." : "We'll ping you when you need care."}
              </Text>
            </Animated.View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          {step === STEP.hook && <BeginButton label="Continue" onPress={goNext} />}
          {step === STEP.privacy && <BeginButton label="Continue" onPress={goNext} />}
          {step === STEP.breath && breathDone && <BeginButton label="Continue" onPress={goNext} />}
          {step === STEP.soul && <BeginButton label="Continue" onPress={goNext} />}
          {step === STEP.nudge && (
            <>
              <BeginButton label="Yes, remind me" onPress={enableReminders} />
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  afterNudge();
                }}
                hitSlop={12}
                style={styles.notNow}
                accessibilityRole="button"
                accessibilityLabel="Not now"
              >
                <Text style={styles.notNowText}>Not now</Text>
              </Pressable>
            </>
          )}
          {step === STEP.pms && pmsSubPhase === 'offer' && (
            <>
              <BeginButton label="Activate Smart PMS mode" onPress={activatePms} />
              <Pressable
                onPress={declinePms}
                hitSlop={12}
                style={styles.notNow}
                accessibilityRole="button"
                accessibilityLabel="No, not for me"
              >
                <Text style={styles.notNowText}>No, not for me</Text>
              </Pressable>
            </>
          )}
          {step === STEP.pms && pmsSubPhase === 'symptoms' && (
            <BeginButton label="Continue" onPress={continueFromSymptoms} />
          )}
          {step === STEP.pms && pmsSubPhase === 'reveal' && (
            <BeginButton label="See what helps" onPress={advanceReveal} />
          )}
          {step === STEP.pms && pmsSubPhase === 'factors' && (
            <BeginButton label="Continue" onPress={confirmFactors} />
          )}
          {step === STEP.done && (!pmsActivated || closerReady) && (
            <BeginButton label="Begin" onPress={finish} />
          )}
        </View>
      </SafeAreaView>

      {/* Cycle setup: bottom sheets that slide up over the (dimmed) PMS screen,
          first the date, then the cycle length. Backing out (backdrop tap)
          leaves her on the offer, not activated. */}
      <Modal
        visible={cycleSheet !== 'closed'}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={cancelCycleSheet}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={cancelCycleSheet}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <LinearGradient
              colors={['#2b2142', '#181226', '#0e0b14']}
              locations={[0, 0.6, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.sheetHandle} />
            {cycleSheet === 'length' ? (
              <>
                <Text style={styles.sheetTitle}>How long is your cycle, usually?</Text>
                <Text style={styles.cycleHint}>An estimate is fine. You can change it later.</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => adjustLength(-1)}
                    hitSlop={10}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Shorter cycle"
                  >
                    <SymbolView name="minus" tintColor={colors.textPrimary} size={16} weight="medium" />
                  </Pressable>
                  <Text style={styles.stepperValue}>{cycleLength} days</Text>
                  <Pressable
                    onPress={() => adjustLength(1)}
                    hitSlop={10}
                    style={styles.stepperBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Longer cycle"
                  >
                    <SymbolView name="plus" tintColor={colors.textPrimary} size={16} weight="medium" />
                  </Pressable>
                </View>
                <View style={styles.sheetFooter}>
                  <BeginButton label="Continue" onPress={confirmLength} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>When did your last period start?</Text>
                <View style={styles.calendarWrap}>
                  <DateTimePicker
                    mode="single"
                    date={cycleDate ?? undefined}
                    maxDate={today}
                    onChange={({ date }) => {
                      if (date) {
                        setCycleDate(new Date(date as string | number | Date));
                        Haptics.selectionAsync();
                      }
                    }}
                    styles={pickerStyles}
                  />
                </View>
                <Text style={styles.cycleNote}>
                  Stays on your phone. It&apos;s just how we know when to show up.
                </Text>
                <View style={styles.sheetFooter}>
                  <BeginButton label="Continue" onPress={goToLengthSheet} disabled={!cycleDate} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  orbAreaCompact: {
    flex: 0,
    height: 96,
    marginTop: 4,
  },
  orbAreaPms: {
    // The orb fills the top of the screen on the PMS offer; it shares the
    // vertical space with the title + checklist below it.
    flex: 1,
    marginTop: 0,
  },
  orbAreaReveal: {
    // The reveal carries its own two mini-moons inside the cards, so the shared
    // top orb is collapsed away here.
    flex: 0,
    height: 0,
    marginTop: 0,
    overflow: 'hidden',
  },
  orbAreaPmsCompact: {
    // The reveal and factor pages give the words and cards the room; the orb
    // sits small at the top.
    flex: 0,
    height: 168,
    marginTop: 4,
  },
  // The opening stat sits inside the orb, centred over the bright sphere.
  pmsStatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pmsStat: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: 'hsl(258, 48%, 22%)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  contentCycle: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 0,
    width: '100%',
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
  // Onboarding type scale: one title size (hero, 26), one body size (sub, 15),
  // one caption size (13). Screen titles all use hero; captions all use 13/19.
  hero: {
    // Screen titles render at a consistent Medium weight across the app, not a
    // thin Light (titles were a Light/Medium mix; this aligns them).
    fontFamily: 'Poppins-Medium',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 12,
  },
  breathLabelWrap: {
    alignItems: 'center',
  },
  breathTipSlot: {
    height: 40, // two lines at lineHeight 19, kept constant so nothing jumps
    marginTop: 10,
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
  },
  breathTip: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 28,
    letterSpacing: 0.3,
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
  // PMS offer body: left-aligned title + checklist, sat below the hero orb.
  pmsBlock: {
    alignSelf: 'stretch',
    paddingHorizontal: 4,
  },
  pmsTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 30,
    lineHeight: 38,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  pmsList: {
    alignSelf: 'stretch',
    gap: 20,
  },
  pmsPointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pmsCheckBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pmsPointText: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  // Symptom select: opt-in checkbox rows, none pre-selected.
  symptomBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  symptomHeader: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 22,
  },
  symptomList: {
    alignSelf: 'stretch',
    gap: 10,
  },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.45)',
  },
  symptomRowText: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  // The reveal: two step-flow cards (a calm cycle vs a PMS cycle), the PMS one
  // carrying the extra "genetic brain sensitivity" step and a warmer moon.
  revealContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  revealTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 22,
    paddingHorizontal: 2,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 11,
    alignItems: 'stretch',
  },
  flowCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  flowCardPms: {
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.2)',
  },
  flowOrb: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  flowCardTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  flowCardTitleHi: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 14,
  },
  flowStep: {
    fontFamily: 'Poppins-Light',
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  flowArrow: {
    fontSize: 12,
    color: colors.textTagline,
    marginVertical: 6,
  },
  flowHighlight: {
    backgroundColor: 'rgba(214, 150, 200, 0.3)',
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  flowHighlightText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#f0ddff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  flowOutcome: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  flowOutcomeHi: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    lineHeight: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
  // Factor cards: all pre-selected, tap to remove (opt-out).
  factorScroll: {
    flex: 1,
    width: '100%',
  },
  factorScrollContent: {
    paddingBottom: 16,
  },
  factorHeader: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.22)',
  },
  factorCardOff: {
    // Removed cards stay readable so she can add them back, just dimmed.
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  factorCardText: {
    flex: 1,
  },
  factorLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  factorWhy: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 4,
  },
  factorTextOff: {
    color: colors.textTertiary,
  },
  factorCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beginBorder,
  },
  factorCheckOff: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  closerLoadingText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  cycleHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textTagline,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 10,
  },
  calendarWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: 12,
  },
  // Period-date bottom sheet (over the dimmed PMS screen).
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden', // clip the gradient to the rounded top corners
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  sheetFooter: {
    marginTop: 18,
    alignItems: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 28,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    color: colors.textPrimary,
    minWidth: 96,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cycleNote: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textTagline,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 20,
    paddingHorizontal: 16,
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
