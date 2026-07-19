// Now: the app's home tab. The moon carries the day — its breath entrains
// yours, its ring closes when today's one coached action is done. Below it:
// the phase-action card (the cycle strip fused to the single ask picked by
// lib/today-action, with the Periods door on its right), a one-line progress
// strip, and Calm now docked above the tab bar so the SOS is guaranteed
// visible on every device. The only number it ever surfaces is today's prep
// count, and only inside the window. Everything browsable lives in Grow;
// everything reflective in You.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { BAR_CONTENT_HEIGHT, BAR_MIN_BOTTOM_PAD } from '@/components/night-tab-bar';
import { Orb } from '@/components/orb';
import { OnboardingCard } from '@/components/onboarding-card';
import { PeriodSheet } from '@/components/period-sheet';
import { PhaseActionCard } from '@/components/phase-action-card';
import { RecommendSheet } from '@/components/RecommendSheet';
import { RingCelebration } from '@/components/RingCelebration';
import { type RecResult } from '@/models/recommend';
import { bodyHue, currentTier, SOUL_RING_HUES, TIER_RING_COUNTS } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { bandHeadline, derivePhaseBand } from '@/lib/phase-band';
import { cycleKeyFor, getPrep, prepReadiness, type PrepState } from '@/store/pms-prep';
import {
  isRingClosed,
  periodButtonState,
  pickTodayAction,
  type TodayActionInput,
} from '@/lib/today-action';
import { COURSE_TITLE, trainSummary, workSummary } from '@/v3/game-content';
import { prefsAfterPeriodLog } from '@/lib/cycle-tune';
import { scheduleCombackNudge } from '@/lib/notifications';
import { syncPmsReminders } from '@/lib/pms-reminders';
import { daysBetween, engagedDatesFrom, foldLedger } from '@/lib/moon-light';
import { lightEarned } from '@/lib/light-bus';
import { takeBreathCue, type BreathCue } from '@/store/breath-cue';
import { getLightLedger, recordLight } from '@/store/light-ledger';
import {
  clearPendingCrossings,
  getPendingCrossings,
  type PendingCrossing,
} from '@/store/pending-crossing';
import { getMoonState, recordCycleMint, type MoonState } from '@/store/moon-state';
import { getLastCombackNudgeSentAt, setLastCombackNudgeSentAt } from '@/store/comeback-nudge';
import {
  getOnboardingV3Progress,
  setupCardFor,
  type SetupCard,
} from '@/store/onboarding-v3-progress';
import {
  addPeriodStart,
  getPeriodHistory,
  latestStart,
  setPeriodHistory,
} from '@/store/period-history';
import { getPmsPrefs, setPmsPrefs, type PmsPrefs } from '@/store/pms-prefs';
import { getPmsReads, type PmsRead } from '@/store/pms-reads';
import { getReadiness, todayYmd, type ReadinessState } from '@/store/pms-readiness';
import { getReminder } from '@/store/reminder-prefs';
import {
  answeredForCycle,
  getRemissionLog,
  type RemissionEntry,
} from '@/store/remission-log';
import {
  getLastSession,
  getSessionsToday,
  getStreakInfo,
  type StreakInfo,
} from '@/store/session-history';
import {
  dismissForDay,
  getTodayActionMemory,
  recordShownAction,
  type TodayActionMemory,
} from '@/store/today-action';
import { getTraining, type TrainingState } from '@/store/training-v3';

// The home moon paces a calm, exhale-biased breath so just looking at it pulls
// you into sync. ~6 breaths/min with a longer exhale is the resonance sweet spot
// and the easiest to fall into passively; a longer 4:8 is more demanding to ride.
// No hold: a pause would break a casual viewer's entrainment.
const BREATH_IN = 4; // seconds, inhale
const BREATH_OUT = 6; // seconds, exhale (longer = calming)

// Small enough that the whole loop (moon, state line, action, strip, calm
// button) fits one viewport without scrolling — the moon is the hero, not the
// whole show.
const ORB_SIZE = 208;

const LAPSE_DAYS = 3;

// Nudge someone who drifted for a few days, at most once per lapse. Carried
// over from the retired v2 home — this is the only place it runs now.
async function checkAndScheduleCombackNudge(): Promise<void> {
  const pref = await getReminder();
  if (!pref.enabled) return;

  const last = await getLastSession();
  if (!last) return;

  const daysSince = (Date.now() - new Date(last.completedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < LAPSE_DAYS) return;

  const lastNudgeIso = await getLastCombackNudgeSentAt();
  if (lastNudgeIso && new Date(lastNudgeIso) > new Date(last.completedAt)) return;

  await scheduleCombackNudge();
  await setLastCombackNudgeSentAt(new Date().toISOString());
}

// Everything the selector and the strip need, loaded in one pass so the screen
// derives its whole render from a single consistent snapshot.
type Snapshot = {
  prefs: PmsPrefs;
  reads: PmsRead[];
  readiness: ReadinessState;
  sessionsToday: number;
  training: TrainingState;
  memory: TodayActionMemory;
  streak: StreakInfo;
  periodHistory: string[];
  remissionLog: RemissionEntry[];
  setupCard: SetupCard | null;
  // The one moon's state: rings come from lifetime light, brightness + material
  // from the persisted moon-state (moon-reward-spec.md).
  moonState: MoonState;
  lifetimeLight: number;
  // This cycle's isolated preparedness state (Neha's story rings + readiness).
  prep: PrepState;
  now: Date;
};

async function loadSnapshot(): Promise<Snapshot> {
  const now = new Date();
  const [
    prefs,
    reads,
    readiness,
    sessionsToday,
    training,
    memory,
    streak,
    periodHistory,
    remissionLog,
    progress,
    moonState,
    ledger,
  ] = await Promise.all([
    getPmsPrefs(),
    getPmsReads(),
    getReadiness(todayYmd(now)),
    getSessionsToday(),
    getTraining(),
    getTodayActionMemory(),
    getStreakInfo(),
    getPeriodHistory(),
    getRemissionLog(),
    getOnboardingV3Progress().catch(() => null),
    getMoonState(),
    getLightLedger(),
  ]);
  // Prep is keyed by the cycle anchor, which comes from prefs, so it loads after
  // the parallel batch resolves.
  const prep = await getPrep(cycleKeyFor(prefs.lastPeriodStart));
  return {
    prefs,
    reads,
    readiness,
    sessionsToday,
    training,
    memory,
    streak,
    periodHistory,
    remissionLog,
    setupCard: progress == null ? null : setupCardFor(progress),
    moonState,
    lifetimeLight: foldLedger(ledger).lifetimeLight,
    prep,
    now,
  };
}

function selectorInput(s: Snapshot): TodayActionInput {
  return {
    prefs: s.prefs,
    reads: s.reads,
    readiness: s.readiness,
    calmDoneToday: s.sessionsToday > 0,
    training: s.training,
    remissionAnsweredThisCycle: answeredForCycle(s.remissionLog, s.prefs.lastPeriodStart),
    storyDoneThisCycle: s.prep.chaptersDone.length > 0,
    lastAction: s.memory.last,
    dismissedDate: s.memory.dismissedDate,
    now: s.now,
  };
}

export default function NowScreen() {
  // The Calm dock floats above the night-sky tab bar; content scrolls under
  // both, so the scroll padding has to clear the bar, the button, and its hint.
  const insets = useSafeAreaInsets();
  const barHeight = BAR_CONTENT_HEIGHT + Math.max(insets.bottom, BAR_MIN_BOTTOM_PAD);

  // Drive the moon's inhale/exhale on a loop, counting completed breaths so
  // the welcome cue below can hand off (name it, pace it, go quiet) exactly on
  // the beat. Focus-gated so a hidden Now tab does no timer work; each return
  // restarts on a fresh inhale, which is the calmest possible re-entry.
  const [breath, setBreath] = useState<{ phase: 'inhale' | 'exhale'; cycle: number }>({
    phase: 'inhale',
    cycle: 0,
  });
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout>;
      const schedule = (current: 'inhale' | 'exhale', cycle: number) => {
        const secs = current === 'inhale' ? BREATH_IN : BREATH_OUT;
        timer = setTimeout(() => {
          if (!alive) return;
          const next = current === 'inhale' ? 'exhale' : 'inhale';
          const nextCycle = next === 'inhale' ? cycle + 1 : cycle;
          setBreath({ phase: next, cycle: nextCycle });
          schedule(next, nextCycle);
        }, secs * 1000);
      };
      schedule('inhale', 0);
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, []),
  );
  const breathDuration = breath.phase === 'inhale' ? BREATH_IN : BREATH_OUT;

  // The breathing cue: a soft invitation over the moon on genuine arrivals.
  // Mount-only on purpose — switching tabs must never replay it or re-stamp
  // the arrival window. Its words render straight from `breath` (the same
  // state driving the Orb) so text and swell cannot desync.
  const [breathCue, setBreathCue] = useState<BreathCue | null>(null);
  useEffect(() => {
    let alive = true;
    takeBreathCue().then((cue) => {
      if (!alive || cue == null) return;
      setBreathCue(cue);
      // One soft pulse as the first inhale begins, for eyes already on the cards.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, []);

  // One snapshot feeds the whole screen; refreshed on focus and on foreground
  // (the latter is what re-evaluates the 17:00 morning/evening flip — no
  // timers). The action itself is derived during render, never stored.
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  // A ring or material crossing owed a celebration, played as a bloom on the
  // moon the moment she lands on Home (earned here or in a flow she just left).
  const [crossing, setCrossing] = useState<PendingCrossing | null>(null);
  const reload = useCallback(() => {
    // The arrival earns its light (first open of the day; repeats are free
    // no-ops). The moon itself stays bright — absence never dims it; only
    // fading lessons do, and recordLight refreshes that.
    recordLight('visit')
      .catch(() => {})
      .finally(() => {
        loadSnapshot()
          .then(setSnapshot)
          .catch(() => {})
          .finally(() => {
            // A crossing earned anywhere — this visit, or a flow she just left —
            // gets its moment here on the moon. Material milestones outrank rings.
            getPendingCrossings()
              .then((owed) => {
                if (owed.length === 0) return;
                clearPendingCrossings().catch(() => {});
                setCrossing(owed.find((c) => c.kind === 'material') ?? owed[owed.length - 1]);
              })
              .catch(() => {});
          });
      });
  }, []);
  useFocusEffect(
    useCallback(() => {
      reload();
      checkAndScheduleCombackNudge().catch(() => {});
      // Roll the PMS heads-up reminders forward to the next predicted window.
      syncPmsReminders().catch(() => {});
    }, [reload]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  const input = snapshot == null ? null : selectorInput(snapshot);
  const action = input == null ? null : pickTodayAction(input);
  const ringClosed = input != null && action != null && isRingClosed(input, action);
  // The one moon carries the whole soul: her earned rings (the lifetime-light
  // ladder, same as My Soul), her brightness (fades with unremembered lessons),
  // and her material. Bare, moonstone, and full for a new user — so the default
  // Now moon is unchanged until she earns her first ring.
  const moonTier = snapshot == null ? null : currentTier(snapshot.lifetimeLight);
  // The cycle strip drives the card's phase framing. Null when PMS mode is off
  // or no period is logged — the card then shows the header alone (no bar).
  const band = snapshot == null ? null : derivePhaseBand(snapshot.prefs, snapshot.now);
  // PMS days fold the SOS into the hero: the coached action becomes the
  // Steady-yourself flow (which opens with a breath), so the separate Calm now
  // dock stands down for the window.
  const pmsDays = band != null && band.current === 'pms';
  const periodButton =
    snapshot == null ? null : periodButtonState(snapshot.prefs, snapshot.now);

  // Onboarding gate: until she has a PMS read, the home pins one card — finish
  // setup — because the phase card and reflection both need that data.
  const setupCard = snapshot?.setupCard ?? null;
  const needsOnboarding = setupCard != null;

  // The redesigned card's copy, driven by the phase (the verb + framing); the
  // specific build-day target still comes from the selector's `action`.
  const rose = band != null && band.current !== 'build';
  // The eyebrow is the short forward cue — "X days to PMS" on build days, the
  // day-in-phase otherwise — straight from bandHeadline.
  const phaseWhy = snapshot == null ? null : bandHeadline(snapshot.prefs, snapshot.now);
  // Build days walk courses forward, never repeating: the next course to learn
  // (the mind pillar, then the work pillar), or a Grow replay only once every
  // course is trained. Completing today's course simply advances to the next.
  const buildSummary =
    snapshot == null
      ? null
      : (() => {
          const mind = trainSummary(snapshot.training);
          if (mind.next != null) return mind;
          const work = workSummary(snapshot.training);
          return work.next != null ? work : null;
        })();
  // In the pre-PMS run-up the coached action becomes Neha's story, then the
  // checklist (from the today-action ladder). When it does, the card takes its
  // title + verb straight from that action so the header matches where the
  // button goes; otherwise it walks the training courses.
  const buildIsStory = action?.kind === 'story';
  const buildIsChecklist = action?.kind === 'readiness';
  const buildTitle =
    buildIsStory || buildIsChecklist
      ? action!.title
      : buildSummary?.next
        ? (COURSE_TITLE[buildSummary.next.chapterId] ??
          buildSummary.detail.replace(/^Begin with /, ''))
        : 'Revisit a practice';
  const buildVerb = buildIsStory
    ? 'Read'
    : buildIsChecklist
      ? 'Prep'
      : buildSummary
        ? buildSummary.statusWord
        : 'Practice';
  const phaseTitle =
    band != null && band.current === 'period'
      ? 'Look back'
      : band != null && band.current === 'pms'
        ? 'Cried, fought, or snapped?'
        : buildTitle;
  const phaseCtaLabel =
    band != null && band.current === 'period'
      ? 'Reflect'
      : band != null && band.current === 'pms'
        ? 'Try'
        : buildVerb;
  // Build days never show a "done" card — there's always a next course, and the
  // day's reward is the moon lighting up. Only the window/period cards settle.
  const cardDone = band != null && band.current !== 'build' ? ringClosed : false;
  // The phase CTAs (Prep -> checklist, Reflect -> the flow, Start/Again ->
  // Grow) all point somewhere real, so a closed ring never locks the button.
  // It only deadens when there's no cycle and the ask is the empty "done"
  // action — nothing left to open.
  const ctaDisabled = band == null && (action == null || action.kind === 'done');

  // Remember what was asked so tomorrow's pick can rotate away from it.
  const lastRecordedId = useRef<string | null>(null);
  useEffect(() => {
    if (snapshot == null || action == null) return;
    if (action.kind === 'done' || lastRecordedId.current === action.id) return;
    lastRecordedId.current = action.id;
    recordShownAction(todayYmd(snapshot.now), action.id).catch(() => {});
  }, [snapshot, action]);

  // One warm pulse the moment the ring closes on screen — the day's reward,
  // felt in the hand and seen as the moon swelling with light (there is no
  // task ring anymore; the moon herself lighting up is the reward). The ref
  // keeps it to the transition, never on re-renders or on arriving at an
  // already-closed day.
  const glow = useSharedValue(1);
  // A separate, subtler swell for "light landed" (the non-numeric cue); it
  // multiplies with the ring-close pulse so the two never fight.
  const shimmer = useSharedValue(1);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: glow.value * shimmer.value }] }));
  const ringWasClosed = useRef<boolean | null>(null);
  useEffect(() => {
    if (snapshot == null) return;
    if (ringWasClosed.current === false && ringClosed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      glow.value = withSequence(
        withTiming(1.06, { duration: 280, easing: Easing.out(Easing.sin) }),
        withTiming(1, { duration: 640, easing: Easing.inOut(Easing.sin) }),
      );
    }
    ringWasClosed.current = ringClosed;
  }, [snapshot, ringClosed, glow]);

  // The Home crossing moment: once a crossing is owed, play the bloom, land a
  // success haptic, then let it clear itself.
  useEffect(() => {
    if (crossing == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => setCrossing(null), 2800);
    return () => clearTimeout(t);
  }, [crossing]);

  // Light landed while she's on Home: the moon gives a quiet, wordless swell.
  // No number, no counter — brighter is the whole reward, per the no-points design.
  useFocusEffect(
    useCallback(
      () =>
        lightEarned.subscribe(() => {
          shimmer.value = withSequence(
            withTiming(1.035, { duration: 220, easing: Easing.out(Easing.sin) }),
            withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
          );
        }),
      [shimmer],
    ),
  );

  // Setup copy nuance: a read left partway resumes, it doesn't restart.
  const actionForCard =
    action != null && action.kind === 'assessment' && snapshot?.setupCard === 'resume'
      ? { ...action, caption: 'Pick up where you left off' }
      : action;

  // --- Handlers -----------------------------------------------------------

  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(false);

  // PMS -> the checklist (the Prep button's target), Periods -> the calendar
  // sheet (the one write path, reached from the Add periods button).
  const openPeriods = () => {
    Haptics.selectionAsync().catch(() => {});
    setPeriodSheetVisible(true);
  };
  // PMS days: the coached action opens the in-the-moment Steady-yourself flow
  // (the readiness checklist lives in Grow now).
  const openSteady = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/steady-yourself' as Href);
  };
  const openReflect = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/reflect' as Href);
  };

  const onActionPress = () => {
    if (action == null || snapshot == null) return;
    Haptics.selectionAsync().catch(() => {});
    if (action.id === 'checkin:period-confirm') {
      setPeriodSheetVisible(true);
      return;
    }
    if (action.route !== '') router.push(action.route as Href);
  };

  // Logging a period is the one write that re-anchors the whole prediction:
  // the newest start becomes the anchor and, once three real cycles exist,
  // the cycle length tunes itself to the observed median (lib/cycle-tune).
  const onPeriodConfirm = (date: Date) => {
    if (snapshot == null) return;
    const ymd = todayYmd(date);
    addPeriodStart(ymd)
      .then(async (history) => {
        await setPmsPrefs(prefsAfterPeriodLog(snapshot.prefs, history));
        await syncPmsReminders().catch(() => {});
        // Confirming the period completes the day's check-in ask, if that is
        // what the card was asking.
        if (action?.id === 'checkin:period-confirm') {
          await dismissForDay(todayYmd(snapshot.now)).catch(() => {});
        }
        // A live confirmation closes a cycle: mint it onto the shelf
        // (moon-reward-spec.md). The guards keep backfilled history and
        // implausible gaps from minting — only this cycle's real confirmation
        // becomes a moon.
        const prevAnchor = snapshot.prefs.lastPeriodStart;
        const cycleDays = prevAnchor == null ? null : daysBetween(prevAnchor, ymd);
        const recency = daysBetween(ymd, todayYmd(snapshot.now));
        if (
          prevAnchor != null &&
          cycleDays != null &&
          cycleDays >= 15 &&
          cycleDays <= 60 &&
          recency != null &&
          recency >= 0 &&
          recency <= 10
        ) {
          const clarity =
            snapshot.remissionLog.find((e) => e.cycleAnchor === prevAnchor)?.answer ?? null;
          const ledger = await getLightLedger();
          await recordCycleMint({
            cycleStart: prevAnchor,
            cycleEnd: ymd,
            clarity,
            engagedDates: engagedDatesFrom(ledger),
            totals: foldLedger(ledger),
          }).catch(() => {});
        }
      })
      .then(reload)
      .catch(() => {});
  };

  const onPeriodRemove = (startYmd: string) => {
    if (snapshot == null) return;
    const remaining = snapshot.periodHistory.filter((s) => s !== startYmd);
    setPeriodHistory(remaining)
      .then(async () => {
        // Removing the anchor itself may legitimately move the anchor back.
        if (snapshot.prefs.lastPeriodStart === startYmd) {
          await setPmsPrefs({ ...snapshot.prefs, lastPeriodStart: latestStart(remaining) });
        }
      })
      .then(reload)
      .catch(() => {});
  };

  const onRecommendPick = (result: RecResult) => {
    setRecommendVisible(false);
    router.push({
      pathname: '/result',
      params: { feelings: result.feelingIds.join(','), needs: result.needIds.join(',') },
    });
  };

  // The one-line progress strip is reserved for a number worth saying. The PMS
  // readiness count moved to Grow with the checklist, so there is nothing to
  // surface here for now; with no parts the strip stays hidden rather than
  // showing an empty rail.
  const stripParts: string[] = [];
  const stripText = stripParts.join(' · ');

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: barHeight + 106 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Dev-only shortcut straight into the Rough Moment reflect chat, so
              the on-device AI session is reachable for testing without walking
              the whole Steady-yourself flow (which is PMS-day gated). Never
              ships — __DEV__ only. */}
          {__DEV__ && (
            <Pressable
              onPress={() => router.push('/rough-moment' as Href)}
              style={styles.devChatLink}
              accessibilityRole="button"
              accessibilityLabel="Open reflect chat (dev)"
            >
              <Text style={styles.devChatLinkText}>💬 reflect chat (dev)</Text>
            </Pressable>
          )}
          {/* The soul: one big calm moon that carries the whole reward — her
              earned rings, her brightness, her material — and lights up when
              the day's action lands. */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Animated.View style={glowStyle}>
              {/* Dev-only: long-press the moon to preview all materials. */}
              <Pressable
                onLongPress={__DEV__ ? () => router.push('/moon-probe' as Href) : undefined}
                delayLongPress={600}
              >
                <Orb
                  size={ORB_SIZE}
                  phase={breath.phase}
                  phaseDuration={breathDuration}
                  breathRange={{ min: 0.72, max: 1.16 }}
                  tierRingCount={moonTier == null ? 0 : TIER_RING_COUNTS[moonTier.id]}
                  tierHue={moonTier?.hue ?? 335}
                  ringHues={SOUL_RING_HUES}
                  accumulate
                  hue={snapshot == null ? 220 : bodyHue(snapshot.lifetimeLight)}
                  brightness={snapshot?.moonState.fullness ?? 1}
                  illum={snapshot?.moonState.fullness ?? 1}
                  material={snapshot?.moonState.material ?? 'moonstone'}
                />
              </Pressable>
            </Animated.View>
            {/* The cue rides the moon itself. Cycle 0 names the motion, cycles
                1-2 pace it with "in"/"out" swapped exactly when the phase flips
                (same state as the Orb, so text and swell cannot desync), then
                it all fades and the moon breathes wordless. */}
            {breathCue != null && breath.cycle <= 2 && (
              <View pointerEvents="none" style={styles.cueOverlay}>
                {breath.cycle === 0 ? (
                  <Animated.Text
                    key="cue-headline"
                    entering={FadeIn.duration(900)}
                    exiting={FadeOut.duration(600)}
                    style={styles.cueHeadline}
                  >
                    {breathCue === 'first' ? 'Breathe with me, always' : 'Breathe with me'}
                  </Animated.Text>
                ) : (
                  <Animated.Text
                    key={`cue-${breath.cycle}-${breath.phase}`}
                    entering={FadeIn.duration(700)}
                    exiting={FadeOut.duration(500)}
                    style={styles.cueLabel}
                  >
                    {breath.phase === 'inhale' ? 'in' : 'out'}
                  </Animated.Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Until she's onboarded, the home pins the finish-setup card and
              nothing else cycle-related — the rest needs her PMS/period data. */}
          {needsOnboarding && setupCard != null ? (
            <Animated.View entering={FadeInDown.delay(60).duration(500)}>
              <OnboardingCard
                setup={setupCard}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push('/onboarding-v3' as Href);
                }}
              />
            </Animated.View>
          ) : (
            actionForCard != null && (
              <>
                {/* The one coached action: a textured phase header (why + what +
                    the phase verb) over the cycle bar. On build days the bar
                    carries "Your PMS preparedness · N%" and fills to this cycle's
                    readiness (the dot still marks today). */}
                <Animated.View entering={FadeInDown.delay(60).duration(500)}>
                  <PhaseActionCard
                    band={band}
                    why={phaseWhy}
                    title={phaseTitle}
                    ctaLabel={phaseCtaLabel}
                    onCta={
                      band != null && band.current === 'period'
                        ? openReflect
                        : band != null && band.current === 'pms'
                          ? openSteady
                          : onActionPress
                    }
                    done={cardDone}
                    ctaDisabled={ctaDisabled}
                    rose={rose}
                    periodEmphasized={periodButton?.emphasized ?? false}
                    readiness={
                      snapshot != null && band != null && band.current === 'build'
                        ? prepReadiness(snapshot.prep)
                        : null
                    }
                  />
                </Animated.View>

                {/* The two cycle utilities: log periods (the honesty loop) and
                    reflect on the cycle just gone. */}
                <Animated.View entering={FadeInDown.delay(110).duration(500)} style={styles.actionRow}>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={openPeriods}
                    accessibilityRole="button"
                    accessibilityLabel="Add periods"
                  >
                    <SymbolView name="calendar" tintColor="rgba(255,255,255,0.85)" size={17} weight="regular" />
                    <Text style={styles.actionBtnText}>Add periods</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={openReflect}
                    accessibilityRole="button"
                    accessibilityLabel="Reflect on your cycle"
                  >
                    <SymbolView name="book.closed" tintColor="rgba(255,255,255,0.85)" size={17} weight="regular" />
                    <Text style={styles.actionBtnText}>Reflect</Text>
                  </Pressable>
                </Animated.View>
              </>
            )
          )}

          {/* One line of numbers, tapping into the full story in You. Hidden
              while there is nothing worth saying (no zero-day streaks). */}
          {stripText !== '' && (
            <Animated.View entering={FadeInDown.delay(160).duration(500)}>
              <Pressable
                style={styles.strip}
                onPress={() => router.navigate('/you' as Href)}
                accessibilityRole="button"
                accessibilityLabel={`${stripText}. See your progress.`}
              >
                <Text style={styles.stripText}>{stripText}</Text>
                <Text style={styles.stripChevron}>›</Text>
              </Pressable>
            </Animated.View>
          )}

          <View style={{ height: 12 }} />
        </ScrollView>

        {/* The SOS, docked above the tab bar: same spot, same look, every
            single day — a stressed brain finds it by muscle memory, never by
            reading. It never scrolls away, even on an SE. During the PMS days
            it folds into the Steady-yourself hero (which opens with a breath),
            so the dock stands down to keep exactly one SOS on screen. */}
        {!pmsDays && (
          <Animated.View
            entering={FadeInDown.delay(220).duration(500)}
            style={[styles.calmDock, { bottom: barHeight + 10 }]}
            pointerEvents="box-none"
          >
            <BeginButton
              label="Calm now"
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRecommendVisible(true);
              }}
            />
            <Text style={styles.calmHint}>Feeling worked up? Start here.</Text>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* The same acute-calm flow as everywhere: pick a feeling, then the
          /result deck. */}
      <RecommendSheet
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        onPick={onRecommendPick}
      />

      {/* The one write path for period dates: the calendar flow built for
          onboarding, reused verbatim. */}
      <PeriodSheet
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onConfirm={onPeriodConfirm}
        onRemove={onPeriodRemove}
        markedDates={snapshot?.periodHistory ?? []}
        cycleLength={snapshot?.prefs.cycleLength}
      />

      {/* The unified crossing moment: a bloom on the moon with a plain line, for
          a ring or material milestone earned via any path. Clears itself. */}
      {crossing != null && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <RingCelebration hue={crossing.hue} />
          <Animated.Text
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(500)}
            style={styles.crossingLabel}
          >
            {crossing.kind === 'material'
              ? `Your soul is ${crossing.label} now`
              : `New ring · ${crossing.label}`}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  devChatLink: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  devChatLinkText: { fontFamily: 'Poppins-Light', fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  // The crossing line sits over the bloom, near the moon's centre.
  crossingLabel: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '42%',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  // Bottom padding is set inline: it clears the floating Calm dock and the
  // tab bar glass, both of which depend on the device's bottom inset.
  scroll: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  // The orb's canvas is 1.8x the sphere (halo room), so a chunk of transparent
  // padding sits below the visible moon; a negative margin pulls the card up
  // into that gap so the moon and the ask read as one composition.
  hero: { alignItems: 'center', marginBottom: -24, marginTop: 4 },
  // The cue overlay centers on the orb's oversized canvas so the words sit on
  // the moon regardless of halo padding.
  cueOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soft slate grey, not a brand violet: quiet against the pale sphere, in the
  // greyish register of the app's muted text rather than a coloured banner.
  cueHeadline: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 21,
    color: 'hsla(222, 10%, 28%, 0.82)',
    letterSpacing: 0.4,
    textAlign: 'center',
    // Capped to the sphere's width so the dark-slate words (tuned for the pale
    // moon) can never spill onto the dim halo and vanish.
    maxWidth: 188,
  },
  cueLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: 'hsla(222, 10%, 28%, 0.72)',
    letterSpacing: 3,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  stripText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  stripChevron: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: -1,
  },
  // The two cycle utilities under the card: Add periods · Reflect.
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtnText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
  },
  chipRow: { alignItems: 'center', marginTop: -2, marginBottom: 2 },
  periodChip: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  periodChipEmphasized: {
    borderColor: 'rgba(237, 147, 177, 0.5)',
    backgroundColor: 'rgba(237, 147, 177, 0.10)',
  },
  periodChipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  periodChipTextEmphasized: {
    fontFamily: 'Poppins-Medium',
    color: 'rgba(244, 192, 209, 0.95)',
  },
  calmDock: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  calmHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
});
