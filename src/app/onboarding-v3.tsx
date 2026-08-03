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
import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  AccessibilityInfo,
  Image,
  type ImageSourcePropType,
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
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  getPmsPrefs,
  setPmsPrefs,
} from '@/store/pms-prefs';
import {
  getOnboardingV3Progress,
  setOnboardingV3Progress,
} from '@/store/onboarding-v3-progress';
import { setPeriodHistory, latestStart } from '@/store/period-history';
import { addPmsRead, getPmsReads } from '@/store/pms-reads';
import { setOnboardingComplete } from '@/store/onboarding-complete';
import { ensureNotificationPermission, scheduleDailyReminder } from '@/lib/notifications';
import { setReminder } from '@/store/reminder-prefs';
import { syncPmsReminders } from '@/lib/pms-reminders';
import { READINESS_CHECK_CONTENT, type ReadinessCheckId } from '@/store/pms-readiness';
import { ChapterCard } from '@/components/chapter-card';
import { CHAPTERS } from '@/v3/game-content';
import { DEFAULT_TRAINING } from '@/store/training-v3';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { recommend } from '@/models/recommend';
import { CardScene } from '@/components/CardScene';

import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { fontScale } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
import { radius, spacing, pageGutter } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';
import {
  COPING_ITEMS,
  DEFAULT_ANSWERS,
  EMPTY_ANSWERS,
  FACTOR_SCIENCE,
  IMPAIRMENT_ITEMS,
  LEVER_ITEMS,
  PRESENCE_ITEMS,
  compareReads,
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

// The cycle starts logged so far, tolerant of the older single-date shape.
function cycleStarts(cycle: V3Answers['cycle']): string[] {
  return cycle.starts ?? (cycle.lastPeriod ? [cycle.lastPeriod] : []);
}

// Add / remove a period start on the answers. Shared by the two period sheets
// (the Hormones step and the Plan step) so their logic can never drift.
function addPeriodStartToAnswers(update: UpdateFn, date: Date): void {
  const ymd = toYmd(date);
  update((a) => {
    const next = Array.from(new Set([ymd, ...cycleStarts(a.cycle)]));
    return {
      cycle: {
        ...a.cycle,
        starts: next,
        lastPeriod: latestStart(next),
        length: a.cycle.length ?? DEFAULT_CYCLE_LENGTH,
        unsure: false,
      },
    };
  });
}

function removePeriodStartFromAnswers(update: UpdateFn, startYmd: string): void {
  update((a) => {
    const next = cycleStarts(a.cycle).filter((s) => s !== startYmd);
    return { cycle: { ...a.cycle, starts: next, lastPeriod: latestStart(next) } };
  });
}

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
  | 'goal'
  | 'moon_intro' // "Meet Moon": what the in-the-moment AI is, before she can open it
  | 'reminder' // after the plan: opt into one gentle daily nudge (first-run only)
  | 'pick' // after the plan: choose the first experience (Grow leads with it)
  | 'compare'; // retake mode only: her level then vs. now

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
  'goal', // pick-up: her goal + how Niyora will help
  'moon_intro', // meet Moon: what the in-the-moment AI is, right before she lands home
  'reminder', // opt into one gentle daily nudge, folded in from the old onboarding
  // The "pick" (4-card "where do you want to start?") step was removed; the flow
  // now ends on the reminder and lands on home.
];

// Retake ("measure your progress", entered from My Soul with mode=retake): just
// the five question steps, then a then-vs-now compare instead of the result +
// plan. No facts (she has seen them), no cycle re-ask, no plan hand-off, and
// nothing written to pms-prefs or the resume progress — only a new entry in the
// pms-reads history once the compare shows.
const RETAKE_SEQUENCE: StepId[] = [
  'symptoms',
  'remission',
  'impairment',
  'levers',
  'coping',
  'loading',
  'compare',
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

// In the retake flow every question is its own section, so the moon still
// earns all five rings on the way to the compare.
const RETAKE_SECTION_ENDS: StepId[] = ['symptoms', 'remission', 'impairment', 'levers', 'coping'];

// Rings earned so far: how many section-end steps she has already moved past,
// looked up in whichever sequence is running.
function ringsEarned(sectionEnds: StepId[], sequence: StepId[], stepIndex: number): number {
  return sectionEnds.filter((s) => {
    const i = sequence.indexOf(s);
    return i >= 0 && i < stepIndex;
  }).length;
}


// Local YYYY-MM-DD (calendar day only), matching lib/pms-window's day math.
function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function OnboardingV3Screen() {
  // Retake mode (entered from My Soul with ?mode=retake): question steps only,
  // ending in a then-vs-now compare against her last recorded read.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const retake = mode === 'retake';
  const sequence = retake ? RETAKE_SEQUENCE : SEQUENCE;
  const sectionEnds = retake ? RETAKE_SECTION_ENDS : SECTION_END_STEPS;
  const loadingIndex = sequence.indexOf('loading');

  const [stepIndex, setStepIndex] = useState(0);
  // First-time onboarding opens with the common answers pre-selected (fewer
  // forced decisions -> fewer drop-offs). A retake must NOT inherit these generic
  // defaults: it starts empty and is then seeded from her last read below, so the
  // then-vs-now compare stays honest.
  const [answers, setAnswers] = useState<V3Answers>(retake ? EMPTY_ANSWERS : DEFAULT_ANSWERS);
  const advancing = useRef(false);
  const step = sequence[stepIndex];

  // Whether per-step persistence may run: 'pending' until the saved progress is
  // read, then 'on' — unless the read came back done. A finished read must never
  // be downgraded to done:false by a later partial re-entry (dev preview, or a
  // future redo): her plan already exists, so quitting a redo partway should
  // not resurrect the home setup card. complete() still overwrites regardless.
  // Retakes never persist: they are a fresh measurement, not setup progress,
  // and abandoning one partway should leave no trace.
  const persistMode = useRef<'pending' | 'on' | 'off'>(retake ? 'off' : 'pending');

  // Retake baseline: her previous answers, to compare the new ones against.
  // Prefer the last recorded read; fall back to the finished onboarding's saved
  // answers for anyone who completed before the reads history existed.
  const [baseline, setBaseline] = useState<V3Answers | null>(null);
  useEffect(() => {
    if (!retake) return;
    let alive = true;
    getPmsReads()
      .then(async (reads) => {
        if (reads.length > 0) return reads[reads.length - 1].answers;
        const p = await getOnboardingV3Progress();
        return p?.done ? p.answers : null;
      })
      .then((a) => {
        if (!alive || !a) return;
        setBaseline(a);
        // Pre-fill the retake from her last read so she adjusts from where she was
        // rather than starting blank. Compare-safe: baseline is captured separately.
        setAnswers(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [retake]);

  // Resume: on mount, pick up saved progress (step + answers) if she left partway
  // and has not finished. Async, so this never sets state synchronously in the
  // effect body. Retakes always start fresh.
  useEffect(() => {
    if (retake) return;
    let alive = true;
    getOnboardingV3Progress()
      .then((p) => {
        if (!alive) return;
        persistMode.current = p?.done ? 'off' : 'on';
        if (!p || p.done || p.stepIndex <= 0) return;
        setStepIndex(p.stepIndex);
        setAnswers(p.answers);
      })
      .catch(() => {
        if (alive) persistMode.current = 'on';
      });
    return () => {
      alive = false;
    };
  }, [retake]);

  // Persist progress as she moves, so the home "finish setting up" card can send
  // her back to the right step. Skips step 0 (nothing to resume to) and holds
  // off until the saved progress has been read (see persistMode); the terminal
  // done-write is handled in complete().
  useEffect(() => {
    if (stepIndex === 0 || persistMode.current !== 'on') return;
    setOnboardingV3Progress({ stepIndex, answers, done: false }).catch(() => {});
  }, [stepIndex, answers]);

  const rings = ringsEarned(sectionEnds, sequence, stepIndex);
  const fill = Math.min(1, stepIndex / loadingIndex);

  const advance = useCallback(() => {
    if (advancing.current) return;
    advancing.current = true;
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => Math.min(i + 1, sequence.length - 1));
    setTimeout(() => {
      advancing.current = false;
    }, 250);
  }, [sequence]);

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

  // She chose to skip / step out before finishing (first-run only). Save where
  // she is, satisfy the launch gate so she lands on Now instead of being bounced
  // straight back into onboarding, and go there — the home's "finish setting up"
  // card is her way back in. getOnboardingComplete gates ONLY the launch redirect
  // (index.tsx), so setting it here is safe; `done` stays false so the card and
  // her saved step both survive. Force-save even at step 0 so progress is never
  // null (the home shows no card for null progress).
  const deferAndExit = useCallback(async () => {
    Haptics.selectionAsync().catch(() => {});
    await setOnboardingV3Progress({ stepIndex, answers, done: false }).catch(() => {});
    await setOnboardingComplete().catch(() => {});
    router.replace('/now' as Href);
  }, [stepIndex, answers]);

  // The plan hand-off: write her cycle into the app's real PMS prefs (so home,
  // the luteal card, reminders, and the game all read it), remember the period in
  // the additive history, mark onboarding done. Does NOT navigate — the pick step
  // that follows chooses where she lands. Guarded by a ref so backing into the
  // plan and re-committing cannot record a duplicate baseline read.
  const committed = useRef(false);
  const persistPlan = useCallback(async () => {
    if (committed.current) return;
    committed.current = true;
    const c = answers.cycle;
    const starts = cycleStarts(c);
    const hasDate = !c.unsure && starts.length > 0;
    // Persist every logged period into the additive history, and the most recent
    // one into pms-prefs (which the prediction reads).
    if (hasDate) await setPeriodHistory(starts).catch(() => {});
    await setPmsPrefs({
      pmsMode: true,
      lastPeriodStart: hasDate ? latestStart(starts) : null,
      cycleLength: c.length ?? DEFAULT_CYCLE_LENGTH,
      periodLength: c.periodLength ?? DEFAULT_PERIOD_LENGTH,
    }).catch(() => {});
    // Close the per-step autosave gate BEFORE writing the done flag: advancing to
    // the pick step next is a step change the autosave effect reacts to, and it
    // would otherwise overwrite done:true back to done:false and resurrect the
    // home "finish setting up" card. The plan is committed now; nothing after
    // this should downgrade it.
    persistMode.current = 'off';
    await setOnboardingV3Progress({ stepIndex, answers, done: true }).catch(() => {});
    // V3 is now the first-run flow, so committing the plan is what finishes
    // onboarding: mark it complete so the launch gate stops sending her back here
    // (even if she leaves before the reminder/pick steps).
    await setOnboardingComplete().catch(() => {});
    // Record the finished read as her baseline, so My Soul can show where she
    // stands and a later retake has something to compare against.
    await addPmsRead({ at: toYmd(new Date()), answers }).catch(() => {});
  }, [answers, stepIndex]);

  // "I commit": lock the plan in, then move to the pick step so she chooses her
  // first experience instead of dropping straight onto the dashboard.
  const commitPlan = useCallback(async () => {
    await persistPlan();
    advance();
  }, [persistPlan, advance]);

  // Her first move: remember which pillar she chose (so Grow leads with it) and
  // open it. pmsMode/cycle are already written by persistPlan; we only add the
  // choice on top of whatever is stored, then land inside the chosen experience.
  const startWith = useCallback(async (choice: StartChoice) => {
    const prev = await getPmsPrefs().catch(() => null);
    await setPmsPrefs({
      pmsMode: true,
      lastPeriodStart: prev?.lastPeriodStart ?? null,
      cycleLength: prev?.cycleLength ?? DEFAULT_CYCLE_LENGTH,
      startedWith: choice.key,
    }).catch(() => {});
    router.replace(choice.dest);
  }, []);

  // Progress bar + moon show on the question steps and the loading beat, then
  // hand off to the full orb on the result. Hidden on the fact screens: those
  // are educational reveals, not steps, so they should not read as a stepped
  // flow.
  const showHud =
    step !== 'splash' &&
    step !== 'privacy' &&
    step !== 'result' &&
    step !== 'goal' &&
    step !== 'reminder' &&
    step !== 'pick' &&
    step !== 'compare' &&
    !step.startsWith('fact_');

  const onBack = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setStepIndex((i) => {
      // From the compare there is nothing to step back to: the read is already
      // recorded, and backing into 'loading' would auto-advance right back here
      // and record it again. Back means done.
      if (sequence[i] === 'compare') {
        finish();
        return i;
      }
      // First screen: don't trap her. First-run backing out defers onboarding
      // and drops her on the home with a way back in; retake returns to My Soul.
      if (i === 0) {
        if (retake) finish();
        else deferAndExit();
        return i;
      }
      return Math.max(0, i - 1);
    });
  }, [finish, sequence, retake, deferAndExit]);

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
            baseline={baseline}
            update={update}
            advance={advance}
            finish={finish}
            deferAndExit={deferAndExit}
            commitPlan={commitPlan}
            startWith={startWith}
            onBack={onBack}
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
  baseline,
  update,
  advance,
  finish,
  deferAndExit,
  commitPlan,
  startWith,
  onBack,
}: {
  step: StepId;
  answers: V3Answers;
  baseline: V3Answers | null;
  update: UpdateFn;
  advance: () => void;
  finish: () => void;
  deferAndExit: () => void;
  commitPlan: () => void;
  startWith: (choice: StartChoice) => void;
  onBack: () => void;
}) {
  switch (step) {
    case 'splash':
      return <Splash onNext={advance} />;
    case 'privacy':
      return <Privacy onNext={advance} />;
    case 'fact_spectrum':
      // "I'll try later" now genuinely exits: deferAndExit satisfies the launch
      // gate and lands her on the home with the "finish setting up" card, instead
      // of the old behaviour where skip just advanced into the test.
      return <FactSpectrum onNext={advance} onSkip={deferAndExit} />;
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
      // The plan hand-off: persist her cycle + mark done, then move to the pick.
      return <Plan answers={answers} update={update} onDone={commitPlan} />;
    case 'moon_intro':
      // Meet Moon: what the in-the-moment AI is, before she can ever open it.
      return <MoonIntro onNext={advance} />;
    case 'reminder':
      // The last step now (the 4-card pick page was removed): land on home.
      return <ReminderStep onDone={() => router.replace('/now' as Href)} />;
    case 'pick':
      // "Where do you want to start?" — routes into the chosen pillar.
      return <Pick onPick={startWith} onBack={onBack} />;
    case 'compare':
      // Retake only: record the new read, show then vs. now, return to My Soul.
      return <Compare baseline={baseline} answers={answers} onDone={finish} />;
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

// Meet Moon AI: the first time the flow says what the in-the-moment AI is,
// before she can ever open it. Redesigned 2026-08-02 (Neha) from a 4-paragraph
// wall to a title + two points over a real Home-style glass card, the moon
// glowing through from behind. Mixed case for hierarchy. A plain sequence step
// with no skip link, so it can't be tapped past.
const MEET_MOON_POINTS: string[] = [
  'Not a doctor, not a therapist or a friend',
  'An AI who protects your personal info and helps you regulate emotions',
];

function MoonIntro({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.screen}>
      {/* The moon, big and blooming, sits behind and above the glass so it glows
          through the frosted top edge — the Home composition. */}
      <View style={styles.moonIntroHero}>
        <Orb size={196} />
      </View>
      <Animated.View
        entering={FadeInDown.delay(200).duration(600)}
        style={styles.moonIntroCard}
      >
        {/* The SAME frosted glass as Home (now.tsx): blur + light frost + a
            top-left gloss sheen, so it reads as one product. */}
        <BlurView intensity={30} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.moonIntroGlassTint} />
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'transparent']}
          locations={[0, 0.28, 0.62]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.moonIntroInner}>
          <Text style={styles.moonIntroTitle}>Meet Moon AI</Text>
          <View style={styles.moonIntroPoints}>
            {MEET_MOON_POINTS.map((text, i) => (
              <Animated.View
                key={text}
                entering={FadeInDown.delay(360 + i * 140).duration(500)}
                style={styles.moonIntroPoint}
              >
                <View style={styles.moonIntroBullet} />
                <Text style={styles.moonIntroPointText}>{text}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      </Animated.View>
      <View style={styles.footer}>
        <BeginButton fullWidth label="Continue" onPress={onNext} />
      </View>
    </View>
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

// The hormone-drop fact hosts the cycle-details ask: the production PeriodSheet,
// where she can log one OR several past periods (each sharpens the prediction).
// Saving adds a period and keeps the sheet open; tapping a logged period removes
// it. The screen's button becomes "Continue" once at least one is logged; a skip
// keeps the whole thing optional.
function FactHormones({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const c = answers.cycle;
  const [sheetOpen, setSheetOpen] = useState(false);
  const periodLength = c.periodLength ?? DEFAULT_PERIOD_LENGTH;
  const cycleLength = c.length ?? DEFAULT_CYCLE_LENGTH;
  const starts = cycleStarts(c);
  const hasAny = starts.length > 0;

  const openSheet = () => {
    Haptics.selectionAsync().catch(() => {});
    setSheetOpen(true);
  };

  // Add a start (keeps the sheet open for more). lastPeriod tracks the newest.
  const addPeriod = (date: Date) => addPeriodStartToAnswers(update, date);
  const removePeriod = (startYmd: string) => removePeriodStartFromAnswers(update, startYmd);

  const skip = () => {
    update((a) => ({ cycle: { ...a.cycle, starts: [], lastPeriod: null, unsure: true } }));
    onNext();
  };

  return (
    <StepLayout
      title="PMS comes from a brain sensitive to the drop"
      footer={
        <>
          <Text style={styles.footerLine}>
            {hasAny
              ? `${starts.length} period${starts.length > 1 ? 's' : ''} logged. More past periods sharpen the prediction.`
              : 'Period date helps us know cycle health better'}
          </Text>
          <BeginButton
            fullWidth
            label={hasAny ? 'Continue' : 'Add your cycle details'}
            onPress={hasAny ? onNext : openSheet}
          />
          {hasAny ? (
            <Pressable onPress={openSheet} style={styles.skipBtn} accessibilityRole="button">
              <Text style={styles.addPeriodLabel}>+ Add another period</Text>
            </Pressable>
          ) : (
            <Pressable onPress={skip} style={styles.skipBtn} accessibilityRole="button">
              <Text style={styles.skipLabel}>Not sure, I&apos;ll add it later in My Soul</Text>
            </Pressable>
          )}
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
        onConfirm={addPeriod}
        onRemove={removePeriod}
        onPeriodLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, periodLength: len } }))}
        onCycleLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, length: len } }))}
        markedDates={starts}
        periodLength={periodLength}
        cycleLength={cycleLength}
        title="When did your periods start?"
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
        Thanks for answering honestly
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

// Then vs. now — the retake's result. Records the new read once on arrival
// (she has answered everything by now; quitting on this screen keeps it), then
// the ladder: level hero → what moved since last time → one caption. Done
// returns to My Soul.
function Compare({
  baseline,
  answers,
  onDone,
}: {
  baseline: V3Answers | null;
  answers: V3Answers;
  onDone: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    addPmsRead({ at: toYmd(new Date()), answers }).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [answers]);

  const level = deriveLevel(answers);
  const levelColor = waveTint(levelActivation(level));
  const fillWidth = Math.min(screenW - 72, 368);
  const cmp = baseline ? compareReads(baseline, answers) : null;

  return (
    <StepLayout footer={<BeginButton fullWidth label="Done" onPress={onDone} />}>
      <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.cardAnim}>
        <Panel accent={levelColor}>
          <Text style={styles.cardHeadingText}>Your PMS now reads as</Text>
          <Text style={[styles.resultLevel, { color: levelColor }]}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Text>
          <View style={styles.graphFill}>
            <SpectrumBar
              position={levelSpectrumPosition(level)}
              width={fillWidth}
              height={Math.round((fillWidth * 88) / 320)}
            />
          </View>
        </Panel>
      </Animated.View>

      {cmp && (
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.cardAnim}>
          <Panel>
            <Text style={styles.cardHeadingText}>Since your last read</Text>
            <Text style={styles.cardBody}>{cmp.headline}</Text>
            {cmp.moved.map((line) => (
              <Text key={line} style={styles.cardBody}>
                {'· '}
                {line}
              </Text>
            ))}
            {cmp.moved.length === 0 && (
              <Text style={styles.cardBody}>{'· '}Everything you reported is holding steady.</Text>
            )}
          </Panel>
        </Animated.View>
      )}

      <Animated.Text entering={FadeInDown.delay(650).duration(600)} style={styles.strong}>
        PMS shifts cycle to cycle. Retake after your next period for the truest read.
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

// A preview of exactly how she'll use the app, and when. Each section renders the
// REAL feature component (the chapter cards, the readiness checklist, the activity
// cards) so it looks identical to the live app and stays recognisable. The
// timeframe labels adapt to whether she gave her cycle date.

// Chapters ordered for the plan's stacked deck: the featured chapter (mood
// swings) sits fully in front, the rest peek as slivers behind it.
const PLAN_DECK = [
  ...CHAPTERS.filter((c) => c.id !== 'mood-swings'),
  ...CHAPTERS.filter((c) => c.id === 'mood-swings'),
];

// The calm cards for the power-move shelf, straight from the real recommend
// pipeline: feeling "stressed" (anxious / overwhelmed) reaching for "calm". These
// are the exact app cards, rendered with their real CardScene backgrounds.
const POWER_MOVE_CARDS = (() => {
  const r = recommend(['anxious', 'overwhelmed'], ['calm']);
  return r ? [r.hero, ...r.list] : [];
})();

// Readiness checks ordered so the featured card (calcium, the strongest one)
// sits in front and the rest peek behind it.
const PREP_DECK: ReadinessCheckId[] = [
  'micronutrient',
  'steady',
  'antiInflammatory',
  'sleep',
  'move',
  'calcium',
];

// Couples cards, mirroring the live "Us vs. the PMS" shelf (gradient + heart
// backdrop). Replicated rather than imported so this does not depend on the
// couples WIP; the featured card ("Is it PMS or real?") sits in front.
type CoupleItem = { tag: string; title: string; sub: string; gradient: readonly [string, string, string] };
const PLAN_COUPLE_DECK: CoupleItem[] = [
  {
    tag: 'Words',
    title: 'Texts you can share',
    sub: 'The right words, in your own tone',
    // Pink.
    gradient: ['hsl(330, 50%, 33%)', 'hsl(338, 48%, 34%)', 'hsl(346, 46%, 35%)'],
  },
  {
    tag: 'Repair',
    title: 'How to reconnect',
    sub: 'Repair after a rough patch',
    // A different, more magenta pink.
    gradient: ['hsl(308, 46%, 32%)', 'hsl(318, 44%, 33%)', 'hsl(328, 42%, 34%)'],
  },
  {
    tag: 'Reflect',
    title: 'Is it PMS or real?',
    sub: 'Reflect on a fight, together or solo',
    // Darkish pinkish red (the featured card carries the most weight).
    gradient: ['hsl(348, 54%, 27%)', 'hsl(354, 52%, 28%)', 'hsl(360, 48%, 29%)'],
  },
];

function Plan({
  answers,
  update,
  onDone,
}: {
  answers: V3Answers;
  update: UpdateFn;
  onDone: () => void;
}) {
  const c = answers.cycle;
  const starts = cycleStarts(c);
  const hasDate = !c.unsure && starts.length > 0;
  const [sheetOpen, setSheetOpen] = useState(false);

  const whenTrain = hasDate ? 'Next 3 days' : 'Before your period';

  // Add a past period (keeps the sheet open for more); flips the plan to the
  // date-aware variant. lastPeriod tracks the newest logged start.
  const addPeriod = (date: Date) => addPeriodStartToAnswers(update, date);
  const removePeriod = (startYmd: string) => removePeriodStartFromAnswers(update, startYmd);

  return (
    <StepLayout
      topAlign
      footer={
        <>
          {!hasDate && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSheetOpen(true);
              }}
              style={styles.addPeriodBtn}
              accessibilityRole="button"
            >
              <Text style={styles.addPeriodLabel}>+ Add your period to sharpen the plan</Text>
            </Pressable>
          )}
          <BeginButton fullWidth label="I commit" onPress={onDone} />
        </>
      }
    >
      <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.planHead}>
        <Text style={styles.planTitle}>Your plan</Text>
        <View style={styles.goalPill}>
          <Text style={styles.goalPillText}>Goal: keep you calm and safe in PMS</Text>
        </View>
      </Animated.View>

      {/* Moon: the in-the-moment AI, teased here and introduced in full on the
          next step. One flat card (not a deck) so it doesn't add to the stack. */}
      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.planSection}>
        <PlanSectionHead
          when="In the moment"
          title="Talk to Moon"
          sub="Think it through together, and pick what actually helps"
        />
        <Panel accent={v3.accent} style={styles.moonPlanCard}>
          <Orb size={46} still />
          <View style={styles.planItemText}>
            <Text style={styles.moonPlanTitle}>One tap from your home screen</Text>
            <Text style={styles.planItemSub}>For anger, tears, spiraling, or nothing at all.</Text>
          </View>
        </Panel>
      </Animated.View>

      {/* 1 — Train your mind: one representative chapter card. (Was a negative-
          margin stacked deck; collapsed to a single card so nothing's buried and
          the fragile fixed-height overlap is gone. Neha 2026-08-02.) */}
      <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.planSection}>
        <PlanSectionHead
          when={whenTrain}
          title="Train your mind"
          sub="Gamified, science-backed ways to master emotions"
        />
        <ChapterCard
          chapter={PLAN_DECK[PLAN_DECK.length - 1]}
          training={DEFAULT_TRAINING}
          onOpen={() => {}}
          peek
        />
      </Animated.View>

      {/* 2 — Couples: the "Us vs. the PMS" cards, stacked (featured in front). */}
      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.planSection}>
        <PlanSectionHead
          when="Before PMS"
          title="Us vs. the PMS"
          sub="Keep the two of you on the same side"
        />
        <PlanCoupleCard item={PLAN_COUPLE_DECK[PLAN_COUPLE_DECK.length - 1]} />
      </Animated.View>

      {/* 3 — PMS prep checklist: real checklist items stacked, calcium in front. */}
      <Animated.View entering={FadeInDown.delay(420).duration(500)} style={styles.planSection}>
        <PlanSectionHead
          when="During PMS"
          title="PMS prep checklist"
          sub="Simple, science-backed ways to ease the week"
        />
        <PrepCard id={PREP_DECK[PREP_DECK.length - 1]} />
      </Animated.View>

      {/* 4 — Explore your power move: the real calm cards (CardScene), horizontal. */}
      <Animated.View entering={FadeInDown.delay(540).duration(500)} style={styles.planSection}>
        <PlanSectionHead
          when="Whenever you need"
          title="Explore your power move"
          sub="30+ ways to calm in a minute"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calmStrip}
        >
          {POWER_MOVE_CARDS.slice(0, 8).map((card) => (
            <View key={card.id} style={styles.calmCard}>
              <View style={StyleSheet.absoluteFill}>
                <CardScene card={card} active={false} />
              </View>
              <View style={styles.calmFooter}>
                <Text style={styles.calmTitle} numberOfLines={2}>
                  {card.title}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      <PeriodSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onConfirm={addPeriod}
        onRemove={removePeriod}
        onPeriodLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, periodLength: len } }))}
        onCycleLengthChange={(len) => update((a) => ({ cycle: { ...a.cycle, length: len } }))}
        markedDates={starts}
        periodLength={c.periodLength ?? DEFAULT_PERIOD_LENGTH}
        cycleLength={c.length ?? DEFAULT_CYCLE_LENGTH}
        title="When did your periods start?"
      />
    </StepLayout>
  );
}

// --- Pick: choose your first experience --------------------------------------
// The step after the plan. Four image-forward cards in a 2x2 grid; each previews
// a real pillar and, on tap, routes straight into it while recording the choice
// so the Grow tab leads with it. Story ships as a teaser ("Soon") until its
// player screen lands — the other three are live.

type StartKey = 'emotion' | 'workplace' | 'partner' | 'story';
type StartChoice = { key: StartKey; dest: Href };

type StartCard = {
  key: StartKey;
  tag: string; // format label: Game / Quiz / Story
  title: string;
  dest: Href;
  accent: string; // tag colour
  image?: ImageSourcePropType; // real card art (story); otherwise a live mini-render
  previewKind?: 'emotion' | 'workplace' | 'partner'; // faithful in-card rebuild of the real screen
  soon?: boolean; // not yet playable — shown dimmed with a "Soon" pill
};

// Each card previews its pillar with a faithful in-card mini-render (CardPreview)
// rebuilt from the real screen's own colours/shapes — no screenshot, no drift.
// Story already has scene art, so it shows the real image while its player is
// pending on this branch.
const START_CARDS: StartCard[] = [
  {
    key: 'emotion',
    tag: 'Game',
    title: 'Feel steadier when it spikes',
    dest: '/train' as Href,
    accent: 'hsl(220, 55%, 74%)',
    previewKind: 'emotion',
  },
  {
    key: 'workplace',
    tag: 'Game',
    title: 'Hold your ground at work',
    dest: '/train?track=workplace' as Href,
    accent: 'hsl(35, 75%, 66%)',
    previewKind: 'workplace',
  },
  {
    key: 'partner',
    tag: 'Quiz',
    title: 'Words for your partner',
    dest: '/couples-prep' as Href,
    accent: 'hsl(8, 72%, 70%)',
    previewKind: 'partner',
  },
  {
    key: 'story',
    tag: 'Story',
    // The reader (`/pms-story`) now lives on this branch, so the story is live:
    // this card opens Story 1, "Neha moves across the world".
    title: 'Neha, far from home',
    dest: '/pms-story?chapter=story-1' as Href,
    accent: 'hsl(275, 55%, 76%)',
    image: require('../../assets/images/stories/story-1/scene-1.png'),
  },
];

// One-tap reminder time presets, so onboarding stays a tap, not a full picker.
// Ported from the old onboarding's daily-nudge step.
const REMINDER_PRESETS: readonly { label: string; hour: number }[] = [
  { label: '9pm', hour: 21 },
  { label: '10pm', hour: 22 },
  { label: '11pm', hour: 23 },
];

// The gentle daily nudge, folded in from the old onboarding so nothing is lost
// now that V3 is the only first-run flow. Opt-in: turning it on asks permission
// and schedules the chosen time; "Not now" simply moves on. Either way advances.
function ReminderStep({ onDone }: { onDone: () => void }) {
  const [presetIndex, setPresetIndex] = useState(1); // default 10pm

  const enable = useCallback(async () => {
    const hour = REMINDER_PRESETS[presetIndex].hour;
    const granted = await ensureNotificationPermission().catch(() => false);
    if (granted) {
      await setReminder({ enabled: true, hour, minute: 0 }).catch(() => {});
      await scheduleDailyReminder(hour, 0).catch(() => {});
      await syncPmsReminders().catch(() => {});
    }
    onDone();
  }, [presetIndex, onDone]);

  return (
    <StepLayout
      title="A gentle daily nudge"
      subtitle="One quiet reminder to take a moment for yourself"
      footer={
        <View style={styles.reminderFooter}>
          <BeginButton fullWidth label="Turn on reminders" onPress={enable} />
          <Pressable
            onPress={onDone}
            style={styles.reminderSkip}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.reminderSkipText}>Not now</Text>
          </Pressable>
        </View>
      }
    >
      <Orb size={140} still />
      <View style={styles.reminderChips}>
        {REMINDER_PRESETS.map((p, i) => {
          const on = i === presetIndex;
          return (
            <Pressable
              key={p.label}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setPresetIndex(i);
              }}
              style={[styles.reminderChip, on && styles.reminderChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={p.label}
            >
              <Text style={[styles.reminderChipText, on && styles.reminderChipTextOn]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </StepLayout>
  );
}

function Pick({
  onPick,
  onBack,
}: {
  onPick: (choice: StartChoice) => void;
  onBack: () => void;
}) {
  // Preselect the first card so there is always a clear default to play.
  const [selected, setSelected] = useState(0);

  const skip = useCallback(() => {
    // The plan is already committed by now, so skipping just lands on the
    // dashboard.
    Haptics.selectionAsync().catch(() => {});
    router.replace('/now');
  }, []);

  const play = useCallback(() => {
    const card = START_CARDS[selected];
    Haptics.selectionAsync().catch(() => {});
    onPick({ key: card.key, dest: card.dest });
  }, [selected, onPick]);

  return (
    <StepLayout
      topAlign
      footer={
        <View style={styles.pickFooter}>
          <BeginButton fullWidth label="Let's play a short one" onPress={play} />
          <Pressable
            onPress={skip}
            style={styles.pickSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip for now"
          >
            <Text style={styles.pickSkipText}>Skip for now</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.pickTopRow}>
        <Pressable onPress={onBack} hitSlop={14} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.pickBack}>‹</Text>
        </Pressable>
      </View>
      <Animated.View entering={FadeInDown.delay(60).duration(500)} style={styles.pickHead}>
        <Text style={styles.pickTitle}>Knowing your body is halfway to better PMS.</Text>
        <Text style={styles.pickSub}>Pick one to try now. The rest stay in Grow.</Text>
      </Animated.View>
      <View style={styles.pickGrid}>
        {START_CARDS.map((card, i) => (
          <PickCard
            key={card.key}
            card={card}
            index={i}
            selected={i === selected}
            onSelect={() => setSelected(i)}
          />
        ))}
      </View>
    </StepLayout>
  );
}

function PickCard({
  card,
  index,
  selected,
  onSelect,
}: {
  card: StartCard;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const disabled = card.soon === true;
  return (
    <Animated.View
      entering={FadeInDown.delay(140 + index * 90).duration(500)}
      style={styles.pickCellWrap}
    >
      <Pressable
        style={[
          styles.pickCard,
          selected && styles.pickCardSelected,
          disabled && styles.pickCardSoon,
        ]}
        disabled={disabled}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onSelect();
        }}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={`${card.title}. ${card.tag}${disabled ? '. Coming soon' : ''}.`}
      >
        {card.image ? (
          <Image source={card.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <CardPreview kind={card.previewKind} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.86)']}
          style={styles.pickScrim}
          pointerEvents="none"
        />
        <View style={styles.pickLabel}>
          <Text style={[styles.pickTag, { color: card.accent }]}>{card.tag}</Text>
          <Text style={styles.pickCardTitle} numberOfLines={2}>
            {card.title}
          </Text>
        </View>
        {card.soon ? (
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>Soon</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// Live, faithful mini-renders of each pillar's real screen, rebuilt from that
// screen's own colours + shapes (game-v3, couples-quiz). No screenshot, so they
// stay crisp at any size and never drift from the source. Values mirror:
// - emotion: the L1 Truth/Myth hero pair (TRUTH_BLUE calm-blue -8deg over
//   MYTH_PINK +7deg), on the game's indigo.
// - workplace: the L5 routing deck (violet situation card + two peeks, the
//   basics/small/big gate colours as a chip row).
// - partner: the couples "PMS or real?" coral heart over faint drifting hearts.
function CardPreview({ kind }: { kind?: StartCard['previewKind'] }) {
  if (kind === 'emotion') {
    return (
      <View style={[styles.pvFill, styles.pvBgEmotion, styles.pvRow]}>
        <View style={[styles.pvHero, styles.pvHeroTruth]}>
          <Text style={styles.pvHeroText}>Truth</Text>
        </View>
        <View style={[styles.pvHero, styles.pvHeroMyth]}>
          <Text style={styles.pvHeroText}>Myth</Text>
        </View>
      </View>
    );
  }
  if (kind === 'workplace') {
    return (
      <View style={[styles.pvFill, styles.pvBgWork]}>
        <View style={styles.pvDeck}>
          <View style={[styles.pvPeek, styles.pvPeekLeft]} />
          <View style={[styles.pvPeek, styles.pvPeekRight]} />
          <View style={styles.pvDeckFront}>
            <View style={styles.pvGateRow}>
              <View style={[styles.pvGateDot, { backgroundColor: 'hsl(42, 68%, 60%)' }]} />
              <View style={[styles.pvGateDot, { backgroundColor: 'hsl(330, 68%, 74%)' }]} />
              <View style={[styles.pvGateDot, { backgroundColor: 'hsl(8, 72%, 68%)' }]} />
            </View>
          </View>
        </View>
      </View>
    );
  }
  if (kind === 'partner') {
    return (
      <View style={[styles.pvFill, styles.pvBgPartner]}>
        <SymbolView
          name="heart.fill"
          tintColor="rgba(255, 255, 255, 0.08)"
          size={70}
          style={styles.pvHeartFaint1}
        />
        <SymbolView
          name="heart.fill"
          tintColor="rgba(255, 255, 255, 0.07)"
          size={44}
          style={styles.pvHeartFaint2}
        />
        <SymbolView name="heart.fill" tintColor="hsl(8, 72%, 68%)" size={46} weight="semibold" />
      </View>
    );
  }
  return <View style={[styles.pvFill, styles.pvBgEmotion]} />;
}

// A section header: the "when" line, the feature title, and a one-line sub.
function PlanSectionHead({ when, title, sub }: { when: string; title: string; sub: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.planWhen}>{when}</Text>
      <Text style={styles.planSectionTitle}>{title}</Text>
      <Text style={styles.planSectionSub}>{sub}</Text>
    </View>
  );
}

// One readiness item as a card, for the stacked prep deck.
function PrepCard({ id }: { id: ReadinessCheckId }) {
  const item = READINESS_CHECK_CONTENT[id];
  return (
    <View style={styles.prepCard}>
      <View style={styles.prepCheck}>
        <SymbolView name="checkmark" tintColor={v3.accent} size={12} weight="bold" />
      </View>
      <View style={styles.planItemText}>
        <Text style={styles.prepTitle}>{item.title}</Text>
        <Text style={styles.planItemSub} numberOfLines={1}>
          {item.examples}
        </Text>
      </View>
    </View>
  );
}

// A couples card, mirroring the live "Us vs. the PMS" shelf card (gradient field
// + heart backdrop). Tagless so it stacks cleanly in the deck.
function PlanCoupleCard({ item }: { item: CoupleItem }) {
  return (
    <View style={styles.coupleGradCard}>
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.coupleBackdrop}>
        <SymbolView
          name="heart.fill"
          tintColor="rgba(255, 255, 255, 0.15)"
          size={104}
          weight="semibold"
          style={styles.coupleHeartTR}
        />
        <SymbolView
          name="heart.fill"
          tintColor="rgba(255, 255, 255, 0.1)"
          size={58}
          weight="semibold"
          style={styles.coupleHeartBL}
        />
      </View>
      {/* No chevron: this is a preview card in the plan montage, not a button. */}
      <View style={styles.coupleGradRow}>
        <View style={styles.planItemText}>
          <Text style={styles.coupleGradTitle}>{item.title}</Text>
          <Text style={styles.coupleGradSub}>{item.sub}</Text>
        </View>
      </View>
    </View>
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
  safe: { flex: 1, paddingHorizontal: pageGutter, paddingBottom: spacing.sm },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 34,
  },
  hudSpacer: { flex: 1 },
  stage: { flex: 1 },
  // Fixed title zone: reserves two title lines so the interactive content below
  // starts at the same place on every screen, whether the title is one line or
  // two (no vertical jump while tapping through).
  titleZone: {
    minHeight: 84,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
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
    paddingTop: spacing.xxl,
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
    gap: spacing.xs,
  },
  seg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.fill.strong,
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

  // Pick step: the "where do you want to start?" 2x2 grid of image cards.
  pickHead: { alignSelf: 'stretch', paddingTop: spacing.xs, paddingBottom: spacing.lg },
  pickTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.technique,
    lineHeight: 29,
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  pickSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: spacing.sm,
  },
  pickGrid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  pickCellWrap: { width: '48%' },
  pickCard: {
    width: '100%',
    aspectRatio: 0.95,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.backgroundTop,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  pickCardSoon: { opacity: 0.6 },
  pickCardSelected: {
    borderWidth: 2,
    borderColor: v3.accent,
  },
  pickTopRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  pickBack: {
    fontFamily: fonts.light,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    color: colors.textSubtitle,
  },
  pickFooter: {
    width: '100%',
    gap: spacing.sm,
  },
  pickSkip: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pickSkipText: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  // Card mini-render previews (CardPreview): faithful rebuilds of each screen.
  pvFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxxl,
  },
  pvRow: { flexDirection: 'row' },
  pvBgEmotion: { backgroundColor: '#141024' },
  pvBgWork: { backgroundColor: '#1a1330' },
  pvBgPartner: { backgroundColor: '#241019' },
  // emotion: the L1 Truth/Myth hero pair.
  pvHero: {
    width: 54,
    height: 54,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pvHeroTruth: {
    backgroundColor: 'hsla(220, 55%, 75%, 0.92)',
    transform: [{ rotate: '-8deg' }],
    marginRight: -10,
    zIndex: 2,
  },
  pvHeroMyth: {
    backgroundColor: 'hsla(330, 68%, 72%, 0.88)',
    transform: [{ rotate: '7deg' }],
  },
  pvHeroText: { fontFamily: fonts.medium, fontSize: fontScale.caption, color: '#1a1526' },
  // workplace: the L5 routing deck (front situation card + two peeks + gates).
  pvDeck: { width: 82, height: 100, alignItems: 'center', justifyContent: 'center' },
  pvPeek: {
    position: 'absolute',
    width: 82,
    height: 100,
    borderRadius: radius.control,
    backgroundColor: 'hsl(266, 34%, 19%)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  pvPeekLeft: { transform: [{ rotate: '-7deg' }, { translateX: -5 }] },
  pvPeekRight: { transform: [{ rotate: '7deg' }, { translateX: 5 }] },
  pvDeckFront: {
    width: 82,
    height: 100,
    borderRadius: radius.control,
    backgroundColor: 'hsl(266, 42%, 24%)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
    zIndex: 2,
  },
  pvGateRow: { flexDirection: 'row', gap: spacing.sm },
  pvGateDot: { width: 12, height: 12, borderRadius: 6 },
  // partner: the couples coral heart over faint drifting hearts.
  pvHeartFaint1: { position: 'absolute', top: 10, right: 14, transform: [{ rotate: '12deg' }] },
  pvHeartFaint2: { position: 'absolute', bottom: 20, left: 12, transform: [{ rotate: '-10deg' }] },
  pickScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  pickLabel: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.xl },
  pickTag: {
    fontFamily: fonts.medium,
    fontSize: fontScale.tagline,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  pickCardTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.body,
    lineHeight: 18,
    letterSpacing: 0.1,
    color: colors.textOnDark.primary,
  },
  soonPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
  },
  soonText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.tagline,
    letterSpacing: 0.8,
    color: colors.textOnDark.secondary,
  },
  pickFootnote: {
    fontFamily: fonts.light,
    fontSize: fontScale.tagline,
    lineHeight: 17,
    color: colors.textTagline,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },

  // Type
  title: {
    fontFamily: fonts.medium,
    fontSize: fontScale.technique,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  wordmark: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    letterSpacing: 4,
    color: colors.textWordmark,
    marginBottom: spacing.lg,
  },
  lede: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 34,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Splash: eyebrow kicker over the "PMS care" lede. Violet accent + tighter
  // letter-spacing than the NIYORA wordmark so the two never read as twins.
  scienceKicker: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 2,
    color: v3.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  // Privacy: three promises as icon + label rows in faint cards, so the page
  // reads as deliberate guarantees rather than floating text.
  privacyRows: {
    marginTop: spacing.xxl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  privacyRowLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  // Meet Moon AI: the moon hero above a Home-style glass card holding the title
  // and two points. Hero justifies to the bottom so the moon's base tucks under
  // the card's frosted top edge and glows through.
  moonIntroHero: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.sm },
  moonIntroCard: {
    marginTop: -48,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  moonIntroGlassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,26,38,0.20)',
  },
  moonIntroInner: { padding: spacing.xl, gap: spacing.lg },
  moonIntroTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  moonIntroPoints: { gap: spacing.md },
  moonIntroPoint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  moonIntroBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: v3.accent,
    marginTop: 8,
  },
  moonIntroPointText: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 25,
    letterSpacing: 0.2,
    color: colors.textPrimary,
  },
  // Plan: the Moon teaser card (orb + line), a single flat panel.
  moonPlanCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  moonPlanTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  reminderChips: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xxxl,
  },
  reminderChip: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  reminderChipOn: {
    borderColor: v3.accent,
    backgroundColor: 'rgba(150, 110, 205, 0.22)',
  },
  reminderChipText: {
    fontFamily: fonts.regular,
    fontSize: fontScale.bodyLg,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  reminderChipTextOn: {
    color: colors.textPrimary,
  },
  reminderFooter: {
    width: '100%',
    gap: spacing.sm,
  },
  reminderSkip: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  reminderSkipText: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  hint: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  strong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  // A fact-screen story line: the key phrase emphasised, the rest lighter.
  factLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  factEmph: {
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  graph: { width: '100%', maxWidth: 360, alignItems: 'center', marginVertical: spacing.sm },
  // Hormone fact: the story lines highlighted in a Panel under the graph.
  hormoneCardWrap: { width: '100%', alignItems: 'center', marginTop: spacing.sm },
  hormoneCard: { alignItems: 'center' },
  // The spectrum field renders near full-width to fill the vertical space.
  spectrumWrap: { alignItems: 'center', marginVertical: spacing.sm },
  // The test steps live in their own Panel, set apart from the description.
  testCardWrap: { width: '100%', alignItems: 'center', marginTop: spacing.lg },
  testHeading: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  // The numbered test steps: a left-aligned list with violet number badges, key
  // phrase emphasised for scanning.
  expectList: { width: '100%', gap: spacing.md },
  expectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
    fontFamily: fonts.medium,
    fontSize: fontScale.tagline,
    color: colors.textPrimary,
  },
  expectLine: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  // "I'll try later" escape under the primary CTA.
  skipBtn: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  // Same escape, placed above the CTA (so the tap-through position is the CTA).
  skipBtnTop: { alignSelf: 'center', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  skipLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },
  graphWide: { width: '100%', maxWidth: 440, alignItems: 'center', marginVertical: spacing.sm },

  // Trainable comparison: fork on top, then Untrained vs Trained columns.
  trainWrap: { width: '100%', alignItems: 'center', marginTop: spacing.xs },
  trainCols: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'stretch',
    marginTop: spacing.sm,
  },
  trainCol: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  trainColCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  trainHead: { fontFamily: fonts.medium, fontSize: fontScale.bodyLg, color: colors.textPrimary },
  trainHeadRule: {
    width: 44,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  trainBrain: { marginBottom: spacing.sm },
  trainLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  trainRule: {
    width: '78%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.fill.strong,
    marginVertical: spacing.sm,
  },
  trainOutcome: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Chips
  checklist: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  // Symptom question: Emotional / Body groups, each a left label over left-aligned chips.
  symptomGroup: { width: '100%', maxWidth: 420, alignSelf: 'center', marginBottom: spacing.xl },
  groupLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: spacing.md,
  },
  symptomChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44, // one-handed: comfortable right-thumb tap target
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.base,
  },
  chipOn: {
    backgroundColor: colors.selectedFill,
    borderColor: colors.beginBorder,
  },
  chipLabel: { fontFamily: fonts.light, fontSize: fontScale.body, color: colors.textPrimary },
  chipLabelOn: { fontFamily: fonts.medium, color: colors.textPrimary },

  // Sliders
  // Degree pickers: a stacked list of rows, each a labeled segmented control.
  sliders: { width: '100%', maxWidth: 360, gap: spacing.xxl, marginVertical: spacing.sm },
  choice: { alignItems: 'flex-start' },
  choiceLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  choiceEmph: {
    fontFamily: fonts.medium,
    color: v3.accent,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: colors.selectedFill,
    borderColor: colors.beginBorder,
  },
  segmentLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  segmentLabelOn: {
    fontFamily: fonts.medium,
  },

  // Radio
  radioCol: { width: '100%', maxWidth: 360, gap: spacing.sm, marginVertical: spacing.sm },
  radio: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  radioOn: {
    borderColor: colors.beginBorder,
    backgroundColor: colors.selectedFill,
  },
  radioLabel: { fontFamily: fonts.light, fontSize: fontScale.bodyLg, color: colors.textPrimary },



  // Result / shared card surface.
  // The one panel recipe, used everywhere via <Panel>.
  panel: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  // Wrapper that carries the entrance animation + inter-card spacing so the
  // Panel itself stays layout-only.
  cardAnim: { width: '100%', marginVertical: spacing.xs },
  // Result hero: the level, big and colour-coded.
  resultLevel: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.hero,
    lineHeight: 40,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  cardBody: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: spacing.xs,
  },
  // Result card heading: an uppercase, muted label per card.
  cardHeadingText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    marginBottom: spacing.sm,
  },
  // A graph/meter that fills the card's inner width.
  graphFill: { alignSelf: 'stretch', alignItems: 'center', marginVertical: spacing.sm },
  // Next-window card: the "1 week away" phrase, big and calm.
  windowPhrase: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },

  // Evidence leaderboard: bars of descending height, tallest = strongest.
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', height: 116, justifyContent: 'flex-end' },
  bar: {
    width: '100%',
    minHeight: 30,
    borderTopLeftRadius: radius.control,
    borderTopRightRadius: radius.control,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  // Muted bar (a general factor); violet bar for the ones her answers flagged.
  barMuted: { backgroundColor: colors.fill.base },
  barYours: { backgroundColor: v3.meterTo },
  barRank: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.caption,
    color: colors.textPrimary,
  },
  barLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 16,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  barLabelYours: { fontFamily: fonts.medium, color: colors.textPrimary },
  scienceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  scienceToggleText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: v3.accent,
    letterSpacing: 0.2,
  },
  scienceBox: {
    marginTop: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(150, 120, 235, 0.4)',
  },
  scienceText: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  // Plan hand-off.
  planHead: { alignItems: 'center', marginBottom: spacing.lg },
  planTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  goalPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(150, 120, 235, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 120, 235, 0.3)',
  },
  goalPillText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  planSection: { width: '100%', marginBottom: spacing.xxl },
  sectionHead: { marginBottom: spacing.md },
  planWhen: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: v3.accent,
    marginBottom: spacing.xs,
  },
  planSectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  planSectionSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textSubtitle,
    marginTop: spacing.xs,
  },
  // A step label inside a card (e.g. "PMS day prep").
  planStep: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  planItemText: { flex: 1 },
  planItemSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textSubtitle,
    marginTop: spacing.xs,
  },
  prepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 74,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.surfaceRaised,
  },
  prepCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 120, 235, 0.4)',
    backgroundColor: 'rgba(150, 120, 235, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepTitle: { fontFamily: fonts.medium, fontSize: fontScale.bodyLg, color: colors.textPrimary },

  // Power-move shelf: the real calm cards (CardScene) as horizontal posters.
  calmStrip: { gap: spacing.sm, paddingVertical: spacing.xs, paddingRight: spacing.sm },
  calmCard: {
    width: 118,
    height: 166,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    justifyContent: 'flex-end',
    backgroundColor: v3.panel,
  },
  calmFooter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(12, 10, 20, 0.42)',
  },
  calmTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    lineHeight: 17,
    color: colors.textOnDark.primary,
    letterSpacing: 0.1,
  },

  // Couples deck: gradient cards mirroring the live "Us vs. the PMS" shelf.
  coupleGradCard: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  coupleBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  coupleHeartTR: { position: 'absolute', top: -18, right: -12, transform: [{ rotate: '16deg' }] },
  coupleHeartBL: { position: 'absolute', bottom: -16, left: -12, transform: [{ rotate: '-12deg' }] },
  coupleGradRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  coupleGradTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 25,
    color: colors.textOnDark.primary,
    letterSpacing: 0.15,
  },
  coupleGradSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textOnDark.secondary,
    marginTop: spacing.xs,
  },
  addPeriodBtn: { alignSelf: 'center', paddingVertical: spacing.md, marginBottom: spacing.xs },
  addPeriodLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: v3.accent,
    letterSpacing: 0.2,
  },

  // Completion / congrats beat
  congratsOrb: { marginBottom: spacing.xxl },
  orbBurstWrap: { alignItems: 'center', justifyContent: 'center' },
  congratsTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    lineHeight: 28,
    letterSpacing: 0.2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },

  footer: { alignItems: 'stretch', paddingTop: spacing.lg, paddingBottom: spacing.xs },
  // Nudge helper line above the button when Continue is tapped unanswered.
  nudgeHint: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    letterSpacing: 0.2,
    color: v3.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  // Full-width shake wrapper so children keep their width and wrap correctly.
  shakeFill: { width: '100%' },
  // A short line pinned right above the footer button (e.g. the spectrum tee-up).
  footerLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
