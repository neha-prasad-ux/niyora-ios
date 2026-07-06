// Niyora V3 PMS-mode onboarding (preview flow).
//
// A NEW flow that lives alongside the existing breath-facts onboarding
// (src/app/onboarding.tsx) and does not touch it. Reachable for preview by
// navigating to /onboarding-v3 (see the "V3" entry the dev build exposes, or
// push the route directly).
//
// Scope, per the spec: splash -> questions -> five fact screens -> result
// reveal. Copy, graph shapes, gamification, and the three decisions (Dubol
// citation, level banding, remission + cycle) are carried from the spec exactly.
// Only the visual skin conforms to the app's design system (near-black indigo
// background, Poppins, the calm orb, the Begin button), not the plum register.
//
// Voice is quiet and specific. No em dashes. Every reassurance carries a fact,
// every blame-lift carries agency. Medical numbers carry a source line marked to
// confirm against the research bank.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';

import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import {
  COPING_ITEMS,
  EMPTY_ANSWERS,
  IMPAIRMENT_ITEMS,
  IMPAIRMENT_MAX,
  LEVER_ITEMS,
  PRESENCE_ITEMS,
  SOURCES,
  copingStandingCopy,
  cycleLine,
  deriveCopingStanding,
  deriveLevel,
  deriveLevers,
  levelCopy,
  levelSpectrumPosition,
  remissionLine,
  type Source,
  type V3Answers,
} from '@/v3/v3-content';
import {
  BrainPair,
  CycleChart,
  DivergingBars,
  HormoneCurve,
  SpectrumBar,
  TrainableFork,
} from '@/v3/v3-graphics';
import { FACT_BONUS, POINTS_PER_STEP } from '@/v3/v3-points';

type UpdateFn = (patch: (a: V3Answers) => Partial<V3Answers>) => void;

type StepId =
  | 'splash'
  | 'spectrum'
  | 'presence'
  | 'fact_hormones'
  | 'fact_brain'
  | 'impairment'
  | 'cycle'
  | 'remission'
  | 'levers'
  | 'fact_levers'
  | 'coping'
  | 'fact_trainable'
  | 'loading'
  | 'result';

const SEQUENCE: StepId[] = [
  'splash',
  'spectrum',
  'presence',
  'fact_hormones',
  'fact_brain',
  'impairment',
  'cycle',
  'remission',
  'levers',
  'fact_levers',
  'coping',
  'fact_trainable',
  'loading',
  'result',
];

// Steps that count toward the progress meter (splash, loading, result do not).
const SCORED_STEPS: StepId[] = SEQUENCE.filter(
  (s) => s !== 'splash' && s !== 'loading' && s !== 'result',
);

// Points earned once every scored step up to (but not including) the given
// index is complete. Derived from position so rapid taps never double-award.
function pointsAtIndex(index: number): number {
  let pts = 0;
  for (let i = 0; i < index; i++) {
    const s = SEQUENCE[i];
    if (!SCORED_STEPS.includes(s)) continue;
    pts += POINTS_PER_STEP + (s.startsWith('fact_') ? FACT_BONUS : 0);
  }
  return pts;
}

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

  const scoredDone = SCORED_STEPS.filter((s) => SEQUENCE.indexOf(s) < stepIndex).length;
  const meterFill = scoredDone / SCORED_STEPS.length;
  const points = pointsAtIndex(stepIndex);
  const momentum = scoredDone;

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

  const showHud = step !== 'splash' && step !== 'result' && step !== 'loading';

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          {stepIndex > 0 ? (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setStepIndex((i) => Math.max(0, i - 1));
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          {showHud ? (
            <Hud fill={meterFill} points={points} momentum={momentum} />
          ) : (
            <View style={styles.hudSpacer} />
          )}
          <Pressable
            onPress={finish}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
          >
            <Text style={styles.skip}>Close</Text>
          </Pressable>
        </View>

        <Animated.View key={step} entering={FadeInDown.duration(450)} style={styles.stage}>
          <RenderStep step={step} answers={answers} update={update} advance={advance} points={points} finish={finish} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// --- HUD ---------------------------------------------------------------

function Hud({ fill, points, momentum }: { fill: number; points: number; momentum: number }) {
  const width = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      width.value = reduce ? fill : withTiming(fill, { duration: 600, easing: Easing.out(Easing.cubic) });
    });
    return () => {
      alive = false;
    };
  }, [fill, width]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={styles.hud}>
      <View style={styles.meter} accessibilityRole="progressbar">
        <Animated.View style={[styles.meterFill, fillStyle]} />
      </View>
      <View style={styles.hudStats}>
        <AnimatedPoints value={points} />
        {momentum >= 2 && (
          <Animated.Text key={momentum} entering={FadeIn.duration(300)} style={styles.momentum}>
            {momentum}x momentum
          </Animated.Text>
        )}
      </View>
    </View>
  );
}

function AnimatedPoints({ value }: { value: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive || reduce) return;
      scale.value = 1.4;
      scale.value = withTiming(1, { duration: 400 });
    });
    return () => {
      alive = false;
    };
  }, [value, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <View style={styles.pointsRow} accessibilityLabel={`${value} points`}>
      <Animated.Text style={[styles.pointsValue, style]}>{value}</Animated.Text>
      <Text style={styles.pointsLabel}>pts</Text>
    </View>
  );
}

// --- Screen router -----------------------------------------------------

function RenderStep({
  step,
  answers,
  update,
  advance,
  points,
  finish,
}: {
  step: StepId;
  answers: V3Answers;
  update: UpdateFn;
  advance: () => void;
  points: number;
  finish: () => void;
}) {
  switch (step) {
    case 'splash':
      return <Splash onNext={advance} />;
    case 'spectrum':
      return <SpectrumIntro onNext={advance} />;
    case 'presence':
      return <Presence answers={answers} update={update} onNext={advance} />;
    case 'fact_hormones':
      return <FactHormones onNext={advance} />;
    case 'fact_brain':
      return <FactBrain onNext={advance} />;
    case 'impairment':
      return <Impairment answers={answers} update={update} onNext={advance} />;
    case 'cycle':
      return <Cycle answers={answers} update={update} onNext={advance} />;
    case 'remission':
      return <Remission answers={answers} update={update} onNext={advance} />;
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
      return <Result answers={answers} points={points} onDone={finish} />;
  }
}

// --- Shared layout -----------------------------------------------------

function Scroller({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

// --- Screens -----------------------------------------------------------

function Splash({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.centerScreen}>
      <View style={styles.orbWrap}>
        <Orb size={150} />
      </View>
      <Animated.Text entering={FadeInDown.delay(300).duration(600)} style={styles.wordmark}>
        NIYORA
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(500).duration(600)} style={styles.lede}>
        Science-backed PMS care.
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(800).duration(600)} style={styles.sub}>
        No sign-in, no tracking, just care.
      </Animated.Text>
      <View style={styles.footer}>
        <BeginButton label="I'm ready" onPress={onNext} />
      </View>
    </View>
  );
}

function SpectrumIntro({ onNext }: { onNext: () => void }) {
  return (
    <Scroller>
      <Text style={styles.title}>Let&apos;s get to know your PMS.</Text>
      <Text style={styles.body}>PMS runs on a spectrum, from mild to the severe form, PMDD.</Text>
      <View style={styles.graph}>
        <SpectrumBar />
      </View>
      <Text style={styles.hint}>We&apos;ll find where yours sits. First, a few questions.</Text>
      <View style={styles.footer}>
        <BeginButton label="Show me the questions" onPress={onNext} />
      </View>
    </Scroller>
  );
}

function Presence({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    const has = answers.presence.includes(id);
    update((a) => ({
      presence: has ? a.presence.filter((x) => x !== id) : [...a.presence, id],
    }));
  };
  return (
    <Scroller>
      <Text style={styles.title}>In the week before your period, what do you notice?</Text>
      <Text style={styles.hint}>Pick any that fit. There are no wrong answers.</Text>
      <View style={styles.checklist}>
        {PRESENCE_ITEMS.map((item) => (
          <ChipToggle key={item.id} label={item.label} on={answers.presence.includes(item.id)} onPress={() => toggle(item.id)} />
        ))}
      </View>
      <View style={styles.footer}>
        <BeginButton label="See what's behind this" onPress={onNext} disabled={answers.presence.length === 0} />
      </View>
    </Scroller>
  );
}

function FactHormones({ onNext }: { onNext: () => void }) {
  return (
    <Scroller>
      <Text style={styles.title}>Same hormonal changes in every woman.</Text>
      <View style={styles.graph}>
        <HormoneCurve />
      </View>
      <Text style={styles.connector}>The difference is in the brain, not the hormones.</Text>
      <BrainPair />
      <Text style={styles.strong}>It&apos;s biology, not a failure. And biology can be trained.</Text>
      <View style={styles.footer}>
        <BeginButton label="So what can I do?" onPress={onNext} />
      </View>
    </Scroller>
  );
}

function FactBrain({ onNext }: { onNext: () => void }) {
  return (
    <Scroller>
      <Text style={styles.title}>Your brain shifts across the cycle.</Text>
      <View style={styles.graph}>
        <CycleChart />
      </View>
      <Text style={styles.body}>
        The change is real and measurable, which is why the feelings are too.
      </Text>
      <SourceLine source={SOURCES.brain} />
      <View style={styles.footer}>
        <BeginButton label="What actually moves it?" onPress={onNext} />
      </View>
    </Scroller>
  );
}

function Impairment({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const set = (id: string, v: number) => {
    Haptics.selectionAsync().catch(() => {});
    update((a) => ({ impairment: { ...a.impairment, [id]: v } }));
  };
  const answered = IMPAIRMENT_ITEMS.every((i) => answers.impairment[i.id] !== undefined);
  return (
    <Scroller>
      <Text style={styles.title}>When they show up, how much do they get in the way?</Text>
      <View style={styles.sliders}>
        {IMPAIRMENT_ITEMS.map((item) => (
          <DegreeSlider
            key={item.id}
            label={item.label}
            value={answers.impairment[item.id]}
            steps={IMPAIRMENT_MAX + 1}
            set={(v) => set(item.id, v)}
            lowLabel="not at all"
            highLabel="a lot"
          />
        ))}
      </View>
      <View style={styles.footer}>
        <BeginButton label="Show me why" onPress={onNext} disabled={!answered} />
      </View>
    </Scroller>
  );
}

function Cycle({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const c = answers.cycle;
  const today = useMemo(() => new Date(), []);
  const baseStyles = useDefaultStyles('dark');
  const pickerStyles = useMemo(
    () => ({
      ...baseStyles,
      today: { borderWidth: 0, backgroundColor: 'transparent' },
      selected: {
        backgroundColor: 'rgba(228, 233, 255, 0.96)',
        borderRadius: 999,
      },
      selected_label: { color: '#1b1430', fontWeight: '600' as const },
    }),
    [baseStyles],
  );
  const ready = c.unsure || (!!c.lastPeriod && !!c.length);
  const selectedDate = c.lastPeriod ? new Date(c.lastPeriod) : undefined;

  const adjustLength = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    update((a) => ({
      cycle: { ...a.cycle, length: Math.min(40, Math.max(20, (a.cycle.length ?? 28) + delta)) },
    }));
  };

  return (
    <Scroller>
      <Text style={styles.title}>When did your last period start?</Text>
      <Text style={styles.hint}>
        This is how we see your harder days coming, so you don&apos;t have to log them.
      </Text>

      {!c.unsure && (
        <View style={styles.calendarWrap}>
          <DateTimePicker
            mode="single"
            date={selectedDate}
            maxDate={today}
            onChange={({ date }) => {
              if (date) {
                Haptics.selectionAsync().catch(() => {});
                update((a) => ({
                  cycle: {
                    ...a.cycle,
                    lastPeriod: toYmd(new Date(date as string | number | Date)),
                    length: a.cycle.length ?? 28,
                  },
                }));
              }
            }}
            styles={pickerStyles}
          />
          <View style={styles.lengthRow}>
            <Text style={styles.lengthLabel}>Typical cycle length</Text>
            <View style={styles.stepper}>
              <Pressable onPress={() => adjustLength(-1)} hitSlop={10} style={styles.stepBtn} accessibilityLabel="Shorter cycle">
                <SymbolView name="minus" tintColor={colors.textPrimary} size={14} weight="medium" />
              </Pressable>
              <Text style={styles.stepValue}>{c.length ?? 28} days</Text>
              <Pressable onPress={() => adjustLength(1)} hitSlop={10} style={styles.stepBtn} accessibilityLabel="Longer cycle">
                <SymbolView name="plus" tintColor={colors.textPrimary} size={14} weight="medium" />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          update((a) => ({ cycle: { ...a.cycle, unsure: !a.cycle.unsure } }));
        }}
        style={[styles.textBtn, c.unsure && styles.textBtnOn]}
        accessibilityRole="button"
      >
        <Text style={[styles.textBtnLabel, c.unsure && styles.textBtnLabelOn]}>Not sure</Text>
      </Pressable>

      <View style={styles.footer}>
        <BeginButton label="Next" onPress={onNext} disabled={!ready} />
      </View>
    </Scroller>
  );
}

function Remission({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const options: { id: 'yes' | 'no' | 'unsure'; label: string }[] = [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
    { id: 'unsure', label: 'Not sure' },
  ];
  return (
    <Scroller>
      <Text style={styles.title}>Do these feelings ease off once your period starts?</Text>
      <View style={styles.radioCol}>
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
      </View>
      <View style={styles.footer}>
        <BeginButton label="Next" onPress={onNext} disabled={answers.remission === null} />
      </View>
    </Scroller>
  );
}

function Levers({ answers, update, onNext }: { answers: V3Answers; update: UpdateFn; onNext: () => void }) {
  const set = (id: string, v: number) => {
    Haptics.selectionAsync().catch(() => {});
    update((a) => ({ levers: { ...a.levers, [id]: v } }));
  };
  const answered = LEVER_ITEMS.every((l) => answers.levers[l.id] !== undefined);
  return (
    <Scroller>
      <Text style={styles.title}>Which of these hits you before your period?</Text>
      <View style={styles.sliders}>
        {LEVER_ITEMS.map((l) => (
          <DegreeSlider
            key={l.id}
            label={l.question}
            value={answers.levers[l.id]}
            steps={4}
            set={(v) => set(l.id, v)}
            lowLabel="never"
            highLabel="always"
          />
        ))}
      </View>
      <View style={styles.footer}>
        <BeginButton label="Show me what these do" onPress={onNext} disabled={!answered} />
      </View>
    </Scroller>
  );
}

function FactLevers({ onNext }: { onNext: () => void }) {
  return (
    <Scroller>
      <Text style={styles.title}>Some things raise it. Some lower it.</Text>
      <View style={styles.graph}>
        <DivergingBars />
      </View>
      <View style={styles.sources}>
        <SourceLine source={SOURCES.stress} />
        <SourceLine source={SOURCES.sleep} />
        <SourceLine source={SOURCES.exercise} />
      </View>
      <Text style={styles.hint}>
        Linked means it travels with PMS. Change it means moving it helps.
      </Text>
      <View style={styles.footer}>
        <BeginButton label="Can I change my response?" onPress={onNext} />
      </View>
    </Scroller>
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
  return (
    <Scroller>
      <Text style={styles.title}>When the feelings hit, what do you usually do?</Text>
      <Text style={styles.hint}>Pick what sounds most like you.</Text>
      <View style={styles.checklist}>
        {COPING_ITEMS.map((c) => (
          <ChipToggle key={c.id} label={c.label} on={answers.coping.includes(c.id)} onPress={() => toggle(c.id)} />
        ))}
      </View>
      <View style={styles.footer}>
        <BeginButton label="What does that mean for me?" onPress={onNext} disabled={answers.coping.length === 0} />
      </View>
    </Scroller>
  );
}

function FactTrainable({ onNext }: { onNext: () => void }) {
  return (
    <Scroller>
      <Text style={styles.title}>Same trigger. Two ways it can go.</Text>
      <View style={styles.graph}>
        <TrainableFork />
      </View>
      <Text style={styles.body}>
        How you handle the feelings shapes how hard the days get. That part is trainable, and it&apos;s what we&apos;ll work on.
      </Text>
      <View style={styles.footer}>
        <BeginButton label="Let me see my result" onPress={onNext} />
      </View>
    </Scroller>
  );
}

function Loading({ onDone }: { onDone: () => void }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (!reduce) {
        spin.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
      }
      timer = setTimeout(onDone, reduce ? 700 : 1600);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      cancelAnimation(spin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <View style={styles.centerScreen}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Text style={styles.body}>Putting your read together.</Text>
    </View>
  );
}

// --- Result ------------------------------------------------------------

function Result({ answers, points, onDone }: { answers: V3Answers; points: number; onDone: () => void }) {
  const level = deriveLevel(answers);
  const levers = deriveLevers(answers);
  const standing = deriveCopingStanding(answers);
  const standingCopy = copingStandingCopy(standing);
  const foodFlagged = levers.some((l) => l.id === 'food');
  const remLine = remissionLine(answers.remission);
  const cycLine = cycleLine(answers.cycle);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <Scroller>
      <Animated.View entering={FadeIn.duration(600)} style={styles.reward}>
        <Text style={styles.rewardPoints}>{points} pts</Text>
        <Text style={styles.rewardLabel}>setup complete</Text>
      </Animated.View>

      <Text style={styles.title}>Your read.</Text>

      <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
        <Text style={styles.cardHead}>{levelCopy(level)}</Text>
        <View style={styles.graph}>
          <SpectrumBar position={levelSpectrumPosition(level)} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(550).duration(600)} style={styles.card}>
        <Text style={styles.cardHead}>
          {levers.length > 0
            ? `Yours to move: ${levers.map((l) => l.label).join(', ')}.`
            : "No clear levers flagged yet. We'll keep watching."}
        </Text>
        {foodFlagged && (
          <>
            <Text style={styles.cardBody}>{SOURCES.calcium.claim}</Text>
            <SourceLine source={SOURCES.calcium} />
          </>
        )}
      </Animated.View>

      {standingCopy && (
        <Animated.View entering={FadeInDown.delay(900).duration(600)} style={styles.card}>
          <Text style={styles.cardHead}>{standingCopy.line}</Text>
          <Text style={styles.cardBody}>{standingCopy.tail}</Text>
        </Animated.View>
      )}

      {(remLine || cycLine) && (
        <Animated.View entering={FadeInDown.delay(1150).duration(600)} style={styles.card}>
          {remLine && <Text style={styles.cardBody}>{remLine}</Text>}
          {cycLine && <Text style={styles.cardBodyStrong}>{cycLine}</Text>}
        </Animated.View>
      )}

      <Animated.Text entering={FadeInDown.delay(1400).duration(600)} style={styles.strong}>
        Managing hard emotions isn&apos;t a fixed trait. It&apos;s a skill, and skills get stronger every time you use them.
      </Animated.Text>

      <View style={styles.footer}>
        <BeginButton label="Start" onPress={onDone} />
      </View>
    </Scroller>
  );
}

// --- Reusable pieces ---------------------------------------------------

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

function DegreeSlider({
  label,
  value,
  steps,
  set,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | undefined;
  steps: number;
  set: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <View style={styles.slider}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <View style={styles.sliderTrack}>
        {Array.from({ length: steps }, (_, s) => {
          const filled = value !== undefined && value >= s && value > 0;
          const active = value === s;
          return (
            <Pressable
              key={s}
              onPress={() => set(s)}
              style={[styles.dot, filled && styles.dotFilled, active && styles.dotActive]}
              accessibilityRole="button"
              accessibilityLabel={`${label}: level ${s}`}
            />
          );
        })}
      </View>
      <View style={styles.sliderEnds}>
        <Text style={styles.sliderEndLabel}>{lowLabel}</Text>
        <Text style={styles.sliderEndLabel}>{highLabel}</Text>
      </View>
    </View>
  );
}

function SourceLine({ source }: { source: Source }) {
  return (
    <Text style={styles.source}>
      {source.citation} · <Text style={styles.sourceConfirm}>{source.confirm}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 40,
  },
  backSpacer: { width: 16 },
  hudSpacer: { flex: 1 },
  skip: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },
  stage: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbWrap: { marginBottom: 12 },

  // HUD
  hud: { flex: 1, gap: 6 },
  meter: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: v3.meterTo,
  },
  hudStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  pointsValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textPrimary,
  },
  pointsLabel: { fontFamily: 'Poppins-Light', fontSize: 11, color: colors.textTagline },
  momentum: { fontFamily: 'Poppins-Light', fontSize: 12, color: v3.regulated },

  // Type
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  wordmark: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    letterSpacing: 4,
    color: colors.textWordmark,
    marginBottom: 10,
  },
  lede: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 6,
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
  connector: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 6,
  },
  graph: { width: '100%', maxWidth: 360, alignItems: 'center', marginVertical: 8 },

  // Chips
  checklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  chipOn: {
    backgroundColor: 'rgba(150, 120, 235, 0.28)',
    borderColor: colors.beginBorder,
  },
  chipLabel: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle },
  chipLabelOn: { fontFamily: 'Poppins-Medium', color: colors.textPrimary },

  // Sliders
  sliders: { width: '100%', maxWidth: 360, gap: 18, marginVertical: 10 },
  slider: { alignItems: 'flex-start' },
  sliderLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sliderTrack: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  dotFilled: {
    backgroundColor: v3.meterTo,
    borderColor: v3.meterTo,
  },
  dotActive: {
    transform: [{ scale: 1.15 }],
    borderColor: colors.textPrimary,
  },
  sliderEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 5,
  },
  sliderEndLabel: { fontFamily: 'Poppins-Light', fontSize: 11, color: colors.textTagline },

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

  // Cycle
  calendarWrap: { width: '100%', maxWidth: 360, marginTop: 8 },
  lengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  lengthLabel: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
    minWidth: 74,
    textAlign: 'center',
  },
  textBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    marginTop: 12,
  },
  textBtnOn: { borderColor: colors.beginBorder },
  textBtnLabel: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textSubtitle },
  textBtnLabelOn: { color: colors.textPrimary },

  // Sources
  sources: { gap: 4, marginVertical: 6, alignItems: 'center' },
  source: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    lineHeight: 16,
    color: colors.textTagline,
    textAlign: 'center',
  },
  sourceConfirm: { fontStyle: 'italic' },

  // Result
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    marginVertical: 5,
  },
  cardHead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: 4,
  },
  cardBodyStrong: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
    marginTop: 6,
  },
  reward: { alignItems: 'center', gap: 2, marginBottom: 6 },
  rewardPoints: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 30,
    color: v3.regulated,
  },
  rewardLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textTagline,
    letterSpacing: 0.4,
  },

  // Loading
  ring: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderTopColor: v3.regulated,
    marginBottom: 16,
  },

  footer: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
});
