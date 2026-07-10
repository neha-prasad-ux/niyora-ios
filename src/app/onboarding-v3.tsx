// Niyora V3 PMS-mode onboarding (preview flow).
//
// A NEW flow that lives alongside the existing breath-facts onboarding
// (src/app/onboarding.tsx) and does not touch it. Reachable for preview by
// navigating to /onboarding-v3 (see the "V3" entry the dev build exposes, or
// push the route directly).
//
// Scope, per the spec: splash -> questions -> four fact screens -> result
// reveal. Copy, graph shapes, gamification, and the three decisions (Dubol
// citation, level banding, remission + cycle) are carried from the spec exactly.
// Only the visual skin conforms to the app's design system (near-black indigo
// background, Poppins, the calm orb, the Begin button), not the plum register.
//
// Voice is quiet and specific. No em dashes. Every reassurance carries a fact,
// every blame-lift carries agency. Medical numbers carry a source line marked to
// confirm against the research bank.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PeriodSheet } from '@/components/period-sheet';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH, setPmsPrefs } from '@/store/pms-prefs';
import {
  getOnboardingV3Progress,
  setOnboardingV3Progress,
} from '@/store/onboarding-v3-progress';
import { addPeriodStart } from '@/store/period-history';
import { ACTIVITIES } from '@/models/activities';
import {
  READINESS_CHECK_CONTENT,
  READINESS_CHECK_IDS,
  READINESS_WHY,
} from '@/store/pms-readiness';

import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import {
  COPING_ITEMS,
  EMPTY_ANSWERS,
  FACTOR_SCIENCE,
  IMPAIRMENT_ITEMS,
  LEVER_ITEMS,
  PRESENCE_ITEMS,
  deriveFactorBoard,
  deriveLevel,
  levelActivation,
  levelSpectrumPosition,
  nextWindowPhrase,
  remissionLine,
  type PresenceItem,
  type V3Answers,
} from '@/v3/v3-content';
import {
  BrainIcon,
  DivergingBars,
  HormoneCurve,
  SpectrumBar,
  TriggerFork,
  waveTint,
} from '@/v3/v3-graphics';

type UpdateFn = (patch: (a: V3Answers) => Partial<V3Answers>) => void;

type StepId =
  | 'splash'
  | 'privacy' // "You are safe" reassurance, reused from the old onboarding
  | 'fact_spectrum' // "PMS runs on a spectrum" fact (no progress bar)
  | 'symptoms' // the symptom question
  | 'fact_hormones'
  | 'impairment'
  | 'remission'
  | 'levers'
  | 'fact_levers'
  | 'coping'
  | 'fact_trainable'
  | 'loading'
  | 'result'
  | 'goal';

const SEQUENCE: StepId[] = [
  'splash',
  'privacy', // reused privacy reassurance
  'fact_spectrum', // fact: PMS runs on a spectrum
  'symptoms', // Q: in the week before, what do you notice
  'remission', // Q: do these ease off once your period starts
  'impairment', // Q: how much do your symptoms affect your life
  'fact_hormones', // hormone-drop fact, now also hosts the cycle-details sheet
  'levers',
  'fact_levers',
  'coping',
  'fact_trainable', // final fact: your response is trainable
  'loading',
  'result',
  'goal', // pick-up: her goal + how Niyora will help, then home
];

// The flow groups into five sections. The soul earns a ring when each section's
// last step is completed; five rings means the read is ready. This is the whole
// reward for continuing (no points, no score) and doubles as the progress
// meter: she can always see how many rings remain.
const SECTION_END_STEPS: StepId[] = [
  'symptoms', // 1. What you notice
  'remission', // 2. When it eases
  'fact_hormones', // 3. Why it happens
  'fact_levers', // 4. Your triggers
  'fact_trainable', // 5. Your response
];
const TOTAL_RINGS = SECTION_END_STEPS.length;

// Per-ring hues, innermost first: the soul deepens pink -> violet -> blue as it
// grows. Cool band only, no reds, so it never reads as alarming.
const SOUL_RING_HUES = [330, 292, 262, 228, 198] as const;

// Rings earned so far: how many section-end steps she has already moved past.
function ringsEarned(stepIndex: number): number {
  return SECTION_END_STEPS.filter((s) => SEQUENCE.indexOf(s) < stepIndex).length;
}

// The bar fills smoothly across every step (no segments), reaching full at the
// loading beat where the moon is complete.
const LOADING_INDEX = SEQUENCE.indexOf('loading');


// Local YYYY-MM-DD (calendar day only), matching lib/pms-window's day math.
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function OnboardingV3Screen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<V3Answers>(EMPTY_ANSWERS);
  const advancing = useRef(false);
  const step = SEQUENCE[stepIndex];

  // Resume: on mount, pick up saved progress (step + answers) if she left partway
  // and has not finished. Async, so this never sets state synchronously in the
  // effect body.
  useEffect(() => {
    let alive = true;
    getOnboardingV3Progress().then((p) => {
      if (!alive || !p || p.done || p.stepIndex <= 0) return;
      setStepIndex(p.stepIndex);
      setAnswers(p.answers);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist progress as she moves, so the home "finish setting up" card can send
  // her back to the right step. Skips step 0 (nothing to resume to); the terminal
  // done-write is handled in complete().
  useEffect(() => {
    if (stepIndex === 0) return;
    setOnboardingV3Progress({ stepIndex, answers, done: false }).catch(() => {});
  }, [stepIndex, answers]);

  const rings = ringsEarned(stepIndex);
  const fill = Math.min(1, stepIndex / LOADING_INDEX);

  const advance = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => Math.min(i + 1, SEQUENCE.length - 1));
    setTimeout(() => {
      advancing.current = false;
    }, 250);
  }, []);

  const update: UpdateFn = useCallback(
    (patch) => setAnswers((a) => ({ ...a, ...patch(a) })),
    [],
  );

  const finish = useCallback(() => {
    // Preview flow: return to wherever the user came from. Does not set the
    // onboarding-complete flag (that belongs to the real onboarding).
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  // The plan hand-off: write her cycle into the app's real PMS prefs (so home,
  // the luteal card, reminders, and the game all read it), remember the period in
  // the additive history, mark onboarding done, then land on the dashboard.
  const complete = useCallback(async () => {
    const c = answers.cycle;
    const hasDate = !c.unsure && !!c.lastPeriod;
    if (hasDate && c.lastPeriod) await addPeriodStart(c.lastPeriod).catch(() => {});
    await setPmsPrefs({
      pmsMode: true,
      lastPeriodStart: hasDate ? c.lastPeriod : null,
      cycleLength: c.length ?? DEFAULT_CYCLE_LENGTH,
    }).catch(() => {});
    await setOnboardingV3Progress({ stepIndex, answers, done: true }).catch(() => {});
    router.replace('/home-v3' as Href);
  }, [answers, stepIndex]);

  // Progress bar + moon show on the question steps and the loading beat, then
  // hand off to the full orb on the result. Hidden on the fact screens: those
  // are educational reveals, not steps, so they should not read as a stepped
  // flow.
  const showHud =
    step !== 'splash' &&
    step !== 'privacy' &&
    step !== 'result' &&
    step !== 'goal' &&
    !step.startsWith('fact_');

  const onBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => {
      if (i === 0) {
        finish();
        return i;
      }
      return Math.max(0, i - 1);
    });
  }, [finish]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
          {showHud ? (
            <ProgressBar fill={fill} rings={rings} />
          ) : (
            <View style={styles.hudSpacer} />
          )}
        </View>

        <Animated.View key={step} entering={FadeInDown.duration(450)} style={styles.stage}>
          <RenderStep
            step={step}
            answers={answers}
            update={update}
            advance={advance}
            finish={finish}
            complete={complete}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// --- Progress bar ------------------------------------------------------

// A single continuous bar (no segments) that fills as she moves through the
// flow, its end touching the moon (soul) at the right. The moon grows a ring at
// each section, so it's both the destination and the reward. Sits next to the
// back button; the caption ("N rings to report") is rendered below by the
// parent, aligned left.
function ProgressBar({ fill, rings }: { fill: number; rings: number }) {
  // Five segments (one per section). Each fills as the flow crosses its slice, so
  // the empty segments show how many steps remain without any caption.
  return (
    <View style={styles.progressRow}>
      <View style={styles.segTrack} accessibilityRole="progressbar">
        {Array.from({ length: TOTAL_RINGS }).map((_, i) => (
          <Segment key={i} target={Math.max(0, Math.min(1, fill * TOTAL_RINGS - i))} />
        ))}
      </View>
      <View style={styles.barMoon}>
        <Orb
          size={24}
          tierRingCount={rings}
          ringHues={SOUL_RING_HUES}
          accumulate
          still
          revealKey={rings}
        />
      </View>
    </View>
  );
}

// One progress segment; its fill (0..1) animates as the flow advances.
function Segment({ target }: { target: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      w.value = reduce ? target : withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      alive = false;
    };
  }, [target, w]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={styles.seg}>
      <Animated.View style={[styles.segFill, fillStyle]} />
    </View>
  );
}

// --- Screen router -----------------------------------------------------

function RenderStep({
  step,
  answers,
  update,
  advance,
  finish,
  complete,
}: {
  step: StepId;
  answers: V3Answers;
  update: UpdateFn;
  advance: () => void;
  finish: () => void;
  complete: () => void;
}) {
  switch (step) {
    case 'splash':
      return <Splash onNext={advance} />;
    case 'privacy':
      return <Privacy onNext={advance} />;
    case 'fact_spectrum':
      return <FactSpectrum onNext={advance} onSkip={finish} />;
    case 'symptoms':
      return <Symptoms answers={answers} update={update} onNext={advance} />;
    case 'fact_hormones':
      return <FactHormones answers={answers} update={update} onNext={advance} />;
    case 'impairment':
      return <Impairment answers={answers} update={update} onNext={advance} />;
    case 'remission':
      return <Remission answers={answers} update={update} onNext={advance} />;
    // (cycle merged into fact_hormones)
    case 'levers':
      return <Levers answers={answers} update={update} onNext={advance} />;
    case 'fact_levers':
      return <FactLevers onNext={advance} />;
    case 'coping':
      return <Coping answers={answers} update={update} onNext={advance} />;
    case 'fact_trainable':
      return <FactTrainable onNext={advance} />;
    case 'loading':
      return <Loading onDone={advance} />;
    case 'result':
      return <Result answers={answers} onNext={advance} />;
    case 'goal':
      // The plan hand-off: persist her cycle + finish, then land on the dashboard.
      return <Plan onDone={complete} />;
  }
}

// --- Shared layout -----------------------------------------------------

// Shared step layout. The title sits in a fixed zone pinned to the top so it
// lands on the same line on every screen (easy to read while tapping through).
// The interactive content centers in the space below, and the action button is
// pinned to the bottom for easy thumb reach. Mirrors the production onboarding.
function StepLayout({
  title,
  subtitle,
  children,
  footer,
  topAlign,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  topAlign?: boolean;
}) {
  return (
    <View style={styles.screen}>
      {title ? (
        <View style={styles.titleZone}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.hint}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, topAlign && styles.scrollContentTop]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

// Enabled-button nudge: instead of disabling Continue, keep it active and, on a
// tap before the question is answered, give feedback (a warning haptic, a helper
// line, and a shake of the options) rather than silence. The hint clears itself
// once the question becomes valid.
function useAnswerNudge(valid: boolean) {
  const [nudged, setNudged] = useState(false);
  const shake = useSharedValue(0);
  // Derived: the hint shows only while nudged and still invalid, so it clears
  // itself once answered without a state-updating effect.
  const showHint = nudged && !valid;
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const onContinue = useCallback(
    (advance: () => void) => {
      if (valid) {
        advance();
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setNudged(true);
      shake.value = withSequence(
        withTiming(-6, { duration: 45 }),
        withTiming(6, { duration: 45 }),
        withTiming(-4, { duration: 45 }),
        withTiming(4, { duration: 45 }),
        withTiming(0, { duration: 45 }),
      );
    },
    [valid, shake],
  );
  return { showHint, shakeStyle, onContinue };
}

// A footer that pairs the Continue button with the nudge helper line above it.
function ContinueFooter({
  hint,
  showHint,
  label = 'Continue',
  onPress,
}: {
  hint: string;
  showHint: boolean;
  label?: string;
  onPress: () => void;
}) {
  return (
    <>
      {showHint ? (
        <Animated.Text entering={FadeIn.duration(220)} style={styles.nudgeHint}>
          {hint}
        </Animated.Text>
      ) : null}
      <BeginButton fullWidth label={label} onPress={onPress} />
    </>
  );
}

// --- Screens -----------------------------------------------------------

// How far above its resting spot the orb starts before dropping in on launch.
// Ported from the production onboarding hook (src/app/onboarding.tsx).
const ORB_DROP_DISTANCE = 320;

function Splash({ onNext }: { onNext: () => void }) {
  // Launch entrance: the orb drops in from above and settles once (1 = up high,
  // 0 = landed).
  const orbDrop = useSharedValue(1);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      orbDrop.value = reduce
        ? 0
        : withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      cancelled = true;
    };
  }, [orbDrop]);
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -orbDrop.value * ORB_DROP_DISTANCE }],
    opacity: 1 - orbDrop.value,
  }));

  return (
    <View style={styles.screen}>
      {/* Brand block pinned to the top: wordmark, eyebrow, bold lede. */}
      <View style={styles.splashHead}>
        <Animated.Text entering={FadeInDown.delay(300).duration(600)} style={styles.wordmark}>
          NIYORA
        </Animated.Text>
        {/* Eyebrow kicker over the lede: violet so it reads distinct from the
            muted NIYORA wordmark, tucked tight to "PMS care" so they group. */}
        <Animated.Text entering={FadeInDown.delay(500).duration(600)} style={styles.scienceKicker}>
          SCIENCE-BACKED
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(650).duration(600)} style={styles.lede}>
          PMS care
        </Animated.Text>
      </View>
      {/* Orb hero drops into the space below the brand block. */}
      <View style={styles.orbArea}>
        <Animated.View style={orbStyle}>
          <Orb size={220} />
        </Animated.View>
      </View>
      <View style={styles.footer}>
        <BeginButton fullWidth label="Begin" onPress={onNext} />
      </View>
    </View>
  );
}

// Privacy reassurance, reused from the old onboarding: the shielded orb plus the
// three on-device promises, before any questions are asked.
const PRIVACY_PROMISES: string[] = [
  'No account',
  'No data leaves your phone',
  'No wearables',
];

function Privacy({ onNext }: { onNext: () => void }) {
  return (
    <StepLayout
      title="You are safe"
      footer={<BeginButton fullWidth label="Continue" onPress={onNext} />}
    >
      <Orb size={160} shield still />
      <View style={styles.privacyRows}>
        {PRIVACY_PROMISES.map((label, i) => (
          <Animated.View key={label} entering={FadeInDown.delay(200 + i * 160).duration(500)}>
            <View style={styles.privacyRow}>
              <SymbolView name="checkmark" tintColor={v3.accent} size={15} weight="semibold" />
              <Text style={styles.privacyRowLabel}>{label}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </StepLayout>
  );
}

// Section 1 opener, as its own fact screen (no progress bar): PMS sits on a
// spectrum. Three anchored zones (title top, graphic middle, tee-up line +
// button bottom) so the screen reads full and calm, not empty. The graphic and
// body stagger in.
function FactSpectrum({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { width: screenW } = useWindowDimensions();
  const sw = screenW - 40; // full content width, colours run edge to edge
  const steps = [
    'Backed by real science',
    'Under a minute, promise',
    "A read that's just yours",
    'Shapes your whole app',
  ];
  return (
    <StepLayout
      title="How strong is your PMS?"
      subtitle="It runs from mild to PMDD, worth knowing where you land"
      footer={
        <>
          <Text style={styles.footerLine}>Answer honestly, it stays on your phone</Text>
          <Pressable onPress={onSkip} style={styles.skipBtnTop} accessibilityRole="button">
            <Text style={styles.skipLabel}>I&apos;ll try later</Text>
          </Pressable>
          <BeginButton fullWidth label="Find my level" onPress={onNext} />
        </>
      }
    >
      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.spectrumWrap}>
        <SpectrumBar width={sw} height={Math.round((sw * 88) / 320)} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.testCardWrap}>
        <Panel>
          <Text style={styles.testHeading}>The quick test</Text>
          <View style={styles.expectList}>
            {steps.map((label, i) => (
              <View key={label} style={styles.expectRow}>
                <View style={styles.expectNum}>
                  <Text style={styles.expectNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.expectLine}>{label}</Text>
              </View>
            ))}
          </View>
        </Panel>
      </Animated.View>
    </StepLayout>
  );
}

// Section 1 question: what she notices in the premenstrual week. Split into
// Emotional and Body groups (driven off each item's `kind`) so it scans as two
// sets and quietly teaches that PMS is both mind and body.
function Symptoms({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    const has = answers.presence.includes(id);
    update((a) => ({
      presence: has ? a.presence.filter((x) => x !== id) : [...a.presence, id],
    }));
  };

  const groups: { label: string; kind: PresenceItem['kind'] }[] = [
    { label: 'Emotional', kind: 'emotional' },
    { label: 'Body', kind: 'physical' },
  ];

  const valid = answers.presence.length > 0;
  const { showHint, shakeStyle, onContinue } = useAnswerNudge(valid);

  return (
    <StepLayout
      topAlign
      title="Before your period, what do you notice?"
      subtitle="Pick any that fit, there are no wrong answers"
      footer={
        <ContinueFooter hint="Pick at least one" showHint={showHint} onPress={() => onContinue(onNext)} />
      }
    >
      <Animated.View style={[styles.shakeFill, shakeStyle]}>
        {groups.map((group, gi) => (
          <Animated.View
            key={group.kind}
            entering={FadeInDown.delay(120 + gi * 120).duration(450)}
            style={styles.symptomGroup}
          >
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.symptomChips}>
              {PRESENCE_ITEMS.filter((i) => i.kind === group.kind).map((item) => (
                <ChipToggle
                  key={item.id}
                  label={item.label}
                  on={answers.presence.includes(item.id)}
                  onPress={() => toggle(item.id)}
                />
              ))}
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    </StepLayout>
  );
}

// The hormone-drop fact also hosts the cycle-details ask: a button that opens the
// production PeriodSheet (date + period length + cycle length). Required here:
// confirming the date is the only way forward, so there is no skip.
function FactHormones({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const c = answers.cycle;
  const [sheetOpen, setSheetOpen] = useState(false);
  const periodLength = c.periodLength ?? DEFAULT_PERIOD_LENGTH;
  const cycleLength = c.length ?? DEFAULT_CYCLE_LENGTH;

  const confirm = (date: Date) => {
    update((a) => ({
      cycle: { ...a.cycle, lastPeriod: toYmd(date), length: a.cycle.length ?? DEFAULT_CYCLE_LENGTH, unsure: false },
    }));
    setSheetOpen(false);
    onNext();
  };

  const skip = () => {
    update((a) => ({ cycle: { ...a.cycle, lastPeriod: null, unsure: true } }));
    onNext();
  };

  return (
    <StepLayout
      title="PMS comes from a brain sensitive to the drop"
      footer={
        <>
          <Text style={styles.footerLine}>Period date helps us know cycle health better</Text>
          <BeginButton
            fullWidth
            label="Add your cycle details"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSheetOpen(true);
            }}
          />
          <Pressable onPress={skip} style={styles.skipBtn} accessibilityRole="button">
            <Text style={styles.skipLabel}>Not sure, I&apos;ll add it later in My Soul</Text>
          </Pressable>
        </>
      }
    >
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.graph}>
        <HormoneCurve />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(360).duration(500)} style={styles.hormoneCardWrap}>
        <Panel style={styles.hormoneCard}>
          <Text style={styles.factLine}>
            Everyone&apos;s hormones drop, but the ones with a{' '}
            <Text style={styles.factEmph}>more sensitive brain</Text> get PMS
          </Text>
          <Text style={styles.strong}>That can change, and we&apos;ll show you how</Text>
        </Panel>
      </Animated.View>

      <PeriodSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={confirm}
        onPeriodLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, periodLength: len } }))}
        onCycleLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, length: len } }))}
        markedDates={c.lastPeriod ? [c.lastPeriod] : []}
        periodLength={periodLength}
        cycleLength={cycleLength}
        title="When was your last period?"
        confirmExisting
      />
    </StepLayout>
  );
}

function Impairment({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const set = (id: string, v: number) => {
    Haptics.selectionAsync().catch(() => {});
    update((a) => ({ impairment: { ...a.impairment, [id]: v } }));
  };
  const answered = IMPAIRMENT_ITEMS.every((i) => answers.impairment[i.id] !== undefined);
  const { showHint, shakeStyle, onContinue } = useAnswerNudge(answered);
  return (
    <StepLayout
      topAlign
      title="How much do your symptoms affect your life?"
      footer={
        <ContinueFooter hint="Answer both" showHint={showHint} onPress={() => onContinue(onNext)} />
      }
    >
      <Animated.View style={[styles.sliders, shakeStyle]}>
        {IMPAIRMENT_ITEMS.map((item) => (
          <DegreeChoice
            key={item.id}
            label={item.label}
            name={item.label}
            value={answers.impairment[item.id]}
            options={['Not at all', 'A little', 'A lot']}
            set={(v) => set(item.id, v)}
          />
        ))}
      </Animated.View>
    </StepLayout>
  );
}

function Remission({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const options: { id: 'yes' | 'no' | 'unsure'; label: string }[] = [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'unsure', label: 'Not sure' },
  ];
  const { showHint, shakeStyle, onContinue } = useAnswerNudge(answers.remission !== null);
  return (
    <StepLayout
      title="Do these feelings ease off once your period starts?"
      footer={
        <ContinueFooter hint="Pick one" showHint={showHint} onPress={() => onContinue(onNext)} />
      }
    >
      <Animated.View style={[styles.radioCol, shakeStyle]}>
        {options.map((o) => {
          const on = answers.remission === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                update(() => ({ remission: o.id }));
              }}
              style={[styles.radio, on && styles.radioOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={styles.radioLabel}>{o.label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </StepLayout>
  );
}

function Levers({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const set = (id: string, v: number) => {
    Haptics.selectionAsync().catch(() => {});
    update((a) => ({ levers: { ...a.levers, [id]: v } }));
  };
  const answered = LEVER_ITEMS.every((l) => answers.levers[l.id] !== undefined);
  const { showHint, shakeStyle, onContinue } = useAnswerNudge(answered);
  return (
    <StepLayout
      title="How true are these for you?"
      subtitle="In general, not only before your period"
      footer={
        <ContinueFooter hint="Answer all three" showHint={showHint} onPress={() => onContinue(onNext)} />
      }
    >
      <Animated.View style={[styles.sliders, shakeStyle]}>
        {LEVER_ITEMS.map((l) => (
          <DegreeChoice
            key={l.id}
            label={withEmphasis(l.statement, l.factor)}
            name={l.statement}
            value={answers.levers[l.id]}
            options={['Rarely', 'Sometimes', 'Usually']}
            set={(v) => set(l.id, v)}
          />
        ))}
      </Animated.View>
    </StepLayout>
  );
}

// Renders a statement with its key factor word emphasised (e.g. "I get a full
// night of *sleep*").
function withEmphasis(statement: string, factor: string): React.ReactNode {
  const idx = statement.toLowerCase().indexOf(factor.toLowerCase());
  if (idx < 0) return statement;
  return (
    <>
      {statement.slice(0, idx)}
      <Text style={styles.choiceEmph}>{statement.slice(idx, idx + factor.length)}</Text>
      {statement.slice(idx + factor.length)}
    </>
  );
}

function FactLevers({ onNext }: { onNext: () => void }) {
  const { width: screenW } = useWindowDimensions();
  const gw = Math.min(screenW - 20, 440);
  return (
    <StepLayout
      title="Your daily habits move PMS up or down"
      footer={<BeginButton fullWidth label="Got it" onPress={onNext} />}
    >
      <View style={styles.graphWide}>
        <DivergingBars width={gw} />
      </View>
      <Text style={styles.body}>
        High stress and poor sleep push symptoms up. Moving your body brings them down.
      </Text>
    </StepLayout>
  );
}

function Coping({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    const has = answers.coping.includes(id);
    update((a) => ({
      coping: has ? a.coping.filter((x) => x !== id) : [...a.coping, id],
    }));
  };
  const { showHint, shakeStyle, onContinue } = useAnswerNudge(answers.coping.length > 0);
  return (
    <StepLayout
      topAlign
      title="When you're upset, what do you usually do?"
      subtitle="Pick what sounds most like you"
      footer={
        <ContinueFooter hint="Pick at least one" showHint={showHint} onPress={() => onContinue(onNext)} />
      }
    >
      <Animated.View style={[styles.checklist, shakeStyle]}>
        {COPING_ITEMS.map((c) => (
          <ChipToggle key={c.id} label={c.label} on={answers.coping.includes(c.id)} onPress={() => toggle(c.id)} />
        ))}
      </Animated.View>
    </StepLayout>
  );
}

function FactTrainable({ onNext }: { onNext: () => void }) {
  return (
    <StepLayout
      title="Managing your emotions smooths out PMS"
      footer={<BeginButton fullWidth label="Got it, let me see my result" onPress={onNext} />}
    >
      <View style={styles.trainWrap}>
        <TriggerFork width={230} />
        <View style={styles.trainCols}>
          {/* Without Niyora */}
          <View style={styles.trainCol}>
            <Text style={styles.trainHead}>Without Niyora</Text>
            <View style={styles.trainHeadRule} />
            <View style={styles.trainBrain}>
              <BrainIcon size={56} tint={v3.activated} />
            </View>
            <Text style={styles.trainLine}>Brain reacts</Text>
            <View style={styles.trainRule} />
            <Text style={styles.trainLine}>Less control</Text>
            <View style={styles.trainRule} />
            <Text style={styles.trainOutcome}>It takes over</Text>
          </View>
          {/* With Niyora */}
          <View style={styles.trainColCard}>
            <Text style={styles.trainHead}>With Niyora</Text>
            <View style={styles.trainHeadRule} />
            <View style={styles.trainBrain}>
              <BrainIcon size={56} tint={v3.regulated} />
            </View>
            <Text style={styles.trainLine}>Brain responds</Text>
            <View style={styles.trainRule} />
            <Text style={styles.trainLine}>Better control</Text>
            <View style={styles.trainRule} />
            <Text style={styles.trainOutcome}>Just another day</Text>
          </View>
        </View>
      </View>
    </StepLayout>
  );
}

// The ring-gain celebration: a single radial burst of violet particles from the
// centre, reusing the BeginButton particle system. Fires once on mount.
type Burst = { id: number; x: number; y: number; vx: number; vy: number; size: number; opacity: number };

function RingBurst() {
  const [particles, setParticles] = useState<Burst[]>([]);
  const idRef = useRef(0);

  // Advance the burst one frame at a time: drift outward, slow, fade, cull.
  useEffect(() => {
    if (particles.length === 0) return;
    const frame = requestAnimationFrame(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vx: p.vx * 0.96,
            vy: p.vy * 0.96,
            opacity: p.opacity - 0.014,
          }))
          .filter((p) => p.opacity > 0),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [particles]);

  // Fire one burst on mount (skipped under reduced motion).
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive || reduce) return;
      const next: Burst[] = [];
      for (let i = 0; i < 26; i++) {
        const angle = (i / 26) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const speed = 3 + Math.random() * 5;
        next.push({
          id: idRef.current++,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 4 + Math.random() * 5,
          opacity: 0.7 + Math.random() * 0.3,
        });
      }
      setParticles(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p) => (
        <View
          key={p.id}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: 'rgba(196, 178, 255, 1)',
            opacity: p.opacity,
            transform: [{ translateX: p.x - p.size / 2 }, { translateY: p.y - p.size / 2 }],
          }}
        />
      ))}
    </View>
  );
}

function Loading({ onDone }: { onDone: () => void }) {
  // The completion beat: the soul earns its final ring (reusing the ring-reveal
  // animation) with a thank-you for being honest, then hands off to the result.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      timer = setTimeout(onDone, reduce ? 1000 : 2600);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.centerScreen}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.congratsOrb}>
        <View style={styles.orbBurstWrap}>
          <Orb
            size={150}
            tierRingCount={TOTAL_RINGS}
            ringHues={SOUL_RING_HUES}
            accumulate
            revealKey={TOTAL_RINGS}
          />
          <RingBurst />
        </View>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(350).duration(500)} style={styles.congratsTitle}>
        Thank you for being honest with your body
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(650).duration(500)} style={styles.body}>
        Putting your read together
      </Animated.Text>
    </View>
  );
}

// --- Result ------------------------------------------------------------

function Result({ answers, onNext }: { answers: V3Answers; onNext: () => void }) {
  const { width: screenW } = useWindowDimensions();
  const level = deriveLevel(answers);
  const remLine = remissionLine(answers.remission);
  const windowPhrase = nextWindowPhrase(answers.cycle);
  const levelWord = level.charAt(0).toUpperCase() + level.slice(1);

  // Hero colour tracks severity, calm blue -> warm, reusing the wave tint.
  const levelColor = waveTint(levelActivation(level));
  // Fill the card's inner width (content ~ screenW-40, card padding 16 each side).
  const fillWidth = Math.min(screenW - 72, 368);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <StepLayout
      footer={<BeginButton fullWidth label="Let's set you a plan" onPress={onNext} />}
    >
      {/* Hero — severity on the mild -> PMDD spectrum. The only tinted card. */}
      <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.cardAnim}>
        <Panel accent={levelColor}>
          <Text style={styles.cardHeadingText}>Your PMS reads as</Text>
          <Text style={[styles.resultLevel, { color: levelColor }]}>{levelWord}</Text>
          <View style={styles.graphFill}>
            <SpectrumBar
              position={levelSpectrumPosition(level)}
              width={fillWidth}
              height={Math.round((fillWidth * 88) / 320)}
            />
          </View>
        </Panel>
      </Animated.View>

      {/* Leaderboard — the four levers as bars, tallest = strongest evidence. */}
      <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.cardAnim}>
        <Panel>
          <Text style={styles.cardHeadingText}>What moves your PMS most</Text>
          <FactorBoard answers={answers} />
        </Panel>
      </Animated.View>

      {/* Next window — framed as prep, not dread. */}
      {(windowPhrase || remLine) && (
        <Animated.View entering={FadeInDown.delay(650).duration(600)} style={styles.cardAnim}>
          <Panel>
            <Text style={styles.cardHeadingText}>Your next PMS window</Text>
            {windowPhrase && <Text style={styles.windowPhrase}>{windowPhrase}</Text>}
            <Text style={styles.cardBody}>
              {windowPhrase
                ? 'A good stretch to prep. Are you ready?'
                : "Add your cycle in My Soul and we'll flag it early."}
            </Text>
            {remLine && <Text style={styles.cardBody}>{remLine}</Text>}
          </Panel>
        </Animated.View>
      )}

      <Animated.Text entering={FadeInDown.delay(900).duration(600)} style={styles.strong}>
        These are all trainable, not a fixed trait.
      </Animated.Text>
    </StepLayout>
  );
}

// The evidence leaderboard: the four levers as bars, tallest = strongest
// evidence, the ones her answers flagged filled violet. One combined "See the
// science" line sits below (no per-bar detail, no link out).
function FactorBoard({ answers }: { answers: V3Answers }) {
  const board = deriveFactorBoard(answers);
  const [open, setOpen] = useState(false);
  const maxStrength = Math.max(...board.map((b) => b.factor.strength));
  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    setOpen((o) => !o);
  };
  return (
    <>
      <View style={styles.barRow}>
        {board.map(({ factor, yours }, i) => (
          <View key={factor.id} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  yours ? styles.barYours : styles.barMuted,
                  { height: `${Math.round((factor.strength / maxStrength) * 100)}%` },
                ]}
              >
                <Text style={styles.barRank}>{i + 1}</Text>
              </View>
            </View>
            <Text
              style={[styles.barLabel, yours && styles.barLabelYours]}
              numberOfLines={2}
            >
              {factor.label}
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={toggle}
        style={styles.scienceToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.scienceToggleText}>{open ? 'Hide the science' : 'See the science'}</Text>
        <SymbolView
          name={open ? 'chevron.up' : 'chevron.down'}
          tintColor={v3.accent}
          size={10}
          weight="semibold"
        />
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.scienceBox}>
          <Text style={styles.scienceText}>{FACTOR_SCIENCE}</Text>
        </Animated.View>
      )}
    </>
  );
}

// --- Plan (the hand-off before home) ----------------------------------

// The four ways the app works on her PMS, each a small glimpse of the real
// feature so the plan feels concrete, not a promise. Data comes from the same
// modules the live screens use, so nothing here is a mock.
function Plan({ onDone }: { onDone: () => void }) {
  return (
    <StepLayout
      topAlign
      title="Your plan"
      subtitle="Four ways Niyora works on your PMS"
      footer={<BeginButton fullWidth label="Start my plan" onPress={onDone} />}
    >
      {/* 1 — train your mind (the emotion game) */}
      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.cardAnim}>
        <Panel>
          <Text style={styles.planStep}>1 · Train your mind</Text>
          <View style={styles.planTrainRow}>
            <Orb size={54} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
            <View style={styles.planItemText}>
              <Text style={styles.planItemTitle}>Retrain what your brain reacts to</Text>
              <Text style={styles.planItemSub}>One emotion at a time</Text>
            </View>
          </View>
        </Panel>
      </Animated.View>

      {/* 2 — calming activities (from the real activities model) */}
      <Animated.View entering={FadeInDown.delay(260).duration(500)} style={styles.cardAnim}>
        <Panel>
          <Text style={styles.planStep}>2 · Practice a calming activity</Text>
          {ACTIVITIES.slice(0, 3).map((a) => (
            <View key={a.id} style={styles.planRow}>
              <View style={styles.planDot} />
              <Text style={styles.planItemTitle}>{a.title}</Text>
            </View>
          ))}
          <Text style={styles.planMore}>and more, matched to how you feel</Text>
        </Panel>
      </Animated.View>

      {/* 3 — the daily readiness checklist */}
      <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.cardAnim}>
        <Panel>
          <Text style={styles.planStep}>3 · Prep for your PMS window</Text>
          {READINESS_CHECK_IDS.slice(0, 3).map((id) => (
            <View key={id} style={styles.planCheckRow}>
              <View style={styles.planCheck}>
                <SymbolView name="checkmark" tintColor={v3.accent} size={11} weight="bold" />
              </View>
              <View style={styles.planItemText}>
                <Text style={styles.planItemTitle}>{READINESS_CHECK_CONTENT[id].title}</Text>
                <Text style={styles.planItemSub}>{READINESS_CHECK_CONTENT[id].examples}</Text>
              </View>
            </View>
          ))}
        </Panel>
      </Animated.View>

      {/* 4 — a real research snippet */}
      <Animated.View entering={FadeInDown.delay(540).duration(500)} style={styles.cardAnim}>
        <Panel>
          <Text style={styles.planStep}>4 · Stay up to date with science</Text>
          <Text style={styles.planItemTitle}>
            {READINESS_WHY.calcium.name} · {READINESS_WHY.calcium.teaser}
          </Text>
          <Text style={styles.planItemSub} numberOfLines={3}>
            {READINESS_WHY.calcium.why}
          </Text>
          <Text style={styles.planSource}>{READINESS_WHY.calcium.sourceLabel}</Text>
        </Panel>
      </Animated.View>
    </StepLayout>
  );
}

// --- Reusable pieces ---------------------------------------------------

// Turn a theme colour (hsl or rgba) into a translucent variant, so card borders
// and chips can pick up their accent hue softly.
function colorAlpha(color: string, alpha: number): string {
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

// Shared card surface for the whole flow: one place for the glass treatment so
// every panel stays identical. Pass `accent` to tint the border (the result
// hero); leave it off for the neutral default.
function Panel({
  accent,
  style,
  children,
}: {
  accent?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[styles.panel, accent ? { borderColor: colorAlpha(accent, 0.35) } : null, style]}
    >
      {children}
    </View>
  );
}

function ChipToggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

// A labeled degree picker: one button per option, each showing its own words
// (e.g. "Not at all" / "A little" / "A lot") so the choice is self-explanatory
// instead of abstract dots.
function DegreeChoice({
  label,
  name,
  value,
  options,
  set,
}: {
  label: React.ReactNode; // display label (may include emphasised spans)
  name: string; // plain text for accessibility
  value: number | undefined;
  options: readonly string[];
  set: (v: number) => void;
}) {
  return (
    <View style={styles.choice}>
      <Text style={styles.choiceLabel}>{label}</Text>
      <View style={styles.segmentRow} accessibilityRole="radiogroup">
        {options.map((opt, i) => {
          const on = value === i;
          return (
            <Pressable
              key={opt}
              onPress={() => set(i)}
              style={[styles.segment, on && styles.segmentOn]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, checked: on }}
              accessibilityLabel={`${name}: ${opt}`}
            >
              <Text style={[styles.segmentLabel, on && styles.segmentLabelOn]} numberOfLines={1}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 34,
  },
  hudSpacer: { flex: 1 },
  stage: { flex: 1 },
  // Fixed title zone: reserves two title lines so the interactive content below
  // starts at the same place on every screen, whether the title is one line or
  // two (no vertical jump while tapping through).
  titleZone: {
    minHeight: 84,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Top-aligned variant: content clusters under the title instead of centering
  // in the scroll area (used when there is enough content to fill the screen).
  scrollContentTop: {
    justifyContent: 'flex-start',
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Three-zone vertical layout, ported from the production onboarding so the
  // screen breathes: orb hero (flex:1) up top, text anchored low, button pinned.
  screen: { flex: 1 },
  orbArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Splash brand block, pinned at the top above the orb.
  splashHead: {
    alignItems: 'center',
    paddingTop: 24,
  },
  // Progress: one continuous bar filling toward the moon at its end (touching),
  // sat next to the back button. Caption below is left-aligned.
  progressRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segTrack: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  seg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  segFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: v3.meterTo,
  },
  // Negative margin pulls the moon so the bar's end tucks under its glow and
  // visually touches the sphere.
  barMoon: {
    marginLeft: -6,
  },

  // Type
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  wordmark: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    letterSpacing: 4,
    color: colors.textWordmark,
    marginBottom: 18,
  },
  lede: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Splash: eyebrow kicker over the "PMS care" lede. Violet accent + tighter
  // letter-spacing than the NIYORA wordmark so the two never read as twins.
  scienceKicker: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 2,
    color: v3.accent,
    textAlign: 'center',
    marginBottom: 8,
  },
  // Privacy: three promises as icon + label rows in faint cards, so the page
  // reads as deliberate guarantees rather than floating text.
  privacyRows: {
    marginTop: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'stretch',
    gap: 10,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  privacyRowLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  hint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  body: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: 8,
  },
  strong: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: 10,
  },
  // A fact-screen story line: the key phrase emphasised, the rest lighter.
  factLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: 12,
  },
  factEmph: {
    fontFamily: 'Poppins-SemiBold',
    color: colors.textPrimary,
  },
  graph: { width: '100%', maxWidth: 360, alignItems: 'center', marginVertical: 8 },
  // Hormone fact: the story lines highlighted in a Panel under the graph.
  hormoneCardWrap: { width: '100%', alignItems: 'center', marginTop: 6 },
  hormoneCard: { alignItems: 'center' },
  // The spectrum field renders near full-width to fill the vertical space.
  spectrumWrap: { alignItems: 'center', marginVertical: 6 },
  // The test steps live in their own Panel, set apart from the description.
  testCardWrap: { width: '100%', alignItems: 'center', marginTop: 18 },
  testHeading: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  // The numbered test steps: a left-aligned list with violet number badges, key
  // phrase emphasised for scanning.
  expectList: { width: '100%', gap: 12 },
  expectRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expectNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(150, 120, 235, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expectNumText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    color: colors.textPrimary,
  },
  expectLine: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  // "I'll try later" escape under the primary CTA.
  skipBtn: { alignSelf: 'center', paddingVertical: 10, marginTop: 2 },
  // Same escape, placed above the CTA (so the tap-through position is the CTA).
  skipBtnTop: { alignSelf: 'center', paddingVertical: 10, marginBottom: 6 },
  skipLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },
  graphWide: { width: '100%', maxWidth: 440, alignItems: 'center', marginVertical: 10 },

  // Trainable comparison: fork on top, then Untrained vs Trained columns.
  trainWrap: { width: '100%', alignItems: 'center', marginTop: 4 },
  trainCols: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'stretch',
    marginTop: 6,
  },
  trainCol: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  trainColCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  trainHead: { fontFamily: 'Poppins-Medium', fontSize: 15, color: colors.textPrimary },
  trainHeadRule: {
    width: 44,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: 4,
    marginBottom: 10,
  },
  trainBrain: { marginBottom: 10 },
  trainLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  trainRule: {
    width: '78%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 7,
  },
  trainOutcome: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Chips
  checklist: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
  },
  // Symptom question: Emotional / Body groups, each a left label over left-aligned chips.
  symptomGroup: { width: '100%', maxWidth: 420, alignSelf: 'center', marginBottom: 20 },
  groupLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: 12,
  },
  symptomChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipOn: {
    backgroundColor: 'rgba(150, 120, 235, 0.28)',
    borderColor: colors.beginBorder,
  },
  chipLabel: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textPrimary },
  chipLabelOn: { fontFamily: 'Poppins-Medium', color: colors.textPrimary },

  // Sliders
  // Degree pickers: a stacked list of rows, each a labeled segmented control.
  sliders: { width: '100%', maxWidth: 360, gap: 24, marginVertical: 10 },
  choice: { alignItems: 'flex-start' },
  choiceLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  choiceEmph: {
    fontFamily: 'Poppins-Medium',
    color: v3.accent,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: 'rgba(150, 120, 235, 0.28)',
    borderColor: colors.beginBorder,
  },
  segmentLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  segmentLabelOn: {
    fontFamily: 'Poppins-Medium',
  },

  // Radio
  radioCol: { width: '100%', maxWidth: 360, gap: 10, marginVertical: 10 },
  radio: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  radioOn: {
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(150, 120, 235, 0.18)',
  },
  radioLabel: { fontFamily: 'Poppins-Light', fontSize: 15, color: colors.textPrimary },



  // Result / shared card surface.
  // The one panel recipe, used everywhere via <Panel>.
  panel: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  // Wrapper that carries the entrance animation + inter-card spacing so the
  // Panel itself stays layout-only.
  cardAnim: { width: '100%', marginVertical: 5 },
  // Result hero: the level, big and colour-coded.
  resultLevel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  cardBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: 4,
  },
  // Result card heading: an uppercase, muted label per card.
  cardHeadingText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    marginBottom: 8,
  },
  // A graph/meter that fills the card's inner width.
  graphFill: { alignSelf: 'stretch', alignItems: 'center', marginVertical: 6 },
  // Next-window card: the "1 week away" phrase, big and calm.
  windowPhrase: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    marginBottom: 2,
  },

  // Evidence leaderboard: bars of descending height, tallest = strongest.
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 6,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', height: 116, justifyContent: 'flex-end' },
  bar: {
    width: '100%',
    minHeight: 30,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    paddingTop: 7,
  },
  // Muted bar (a general factor); violet bar for the ones her answers flagged.
  barMuted: { backgroundColor: 'rgba(255, 255, 255, 0.10)' },
  barYours: { backgroundColor: v3.meterTo },
  barRank: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  barLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 8,
  },
  barLabelYours: { fontFamily: 'Poppins-Medium', color: colors.textPrimary },
  scienceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 16,
  },
  scienceToggleText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: v3.accent,
    letterSpacing: 0.2,
  },
  scienceBox: {
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(150, 120, 235, 0.4)',
  },
  scienceText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  // Plan hand-off: four glimpse cards.
  planStep: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  planItemText: { flex: 1 },
  planItemTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  planItemSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    marginTop: 2,
  },
  planTrainRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  planDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: v3.accent },
  planMore: {
    fontFamily: 'Poppins-Light',
    fontSize: 12.5,
    color: colors.textTagline,
    marginTop: 2,
  },
  planCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  planCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 120, 235, 0.4)',
    backgroundColor: 'rgba(150, 120, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSource: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    lineHeight: 16,
    color: colors.textTagline,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Completion / congrats beat
  congratsOrb: { marginBottom: 26 },
  orbBurstWrap: { alignItems: 'center', justifyContent: 'center' },
  congratsTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 24,
  },

  footer: { alignItems: 'stretch', paddingTop: 16, paddingBottom: 4 },
  // Nudge helper line above the button when Continue is tapped unanswered.
  nudgeHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    letterSpacing: 0.2,
    color: v3.accent,
    textAlign: 'center',
    marginBottom: 10,
  },
  // Full-width shake wrapper so children keep their width and wrap correctly.
  shakeFill: { width: '100%' },
  // A short line pinned right above the footer button (e.g. the spectrum tee-up).
  footerLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginBottom: 14,
  },
});
