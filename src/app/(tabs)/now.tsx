// Now: the app's home tab. The moon carries the day — its breath entrains
// yours, its ring closes when today's one coached action is done. Below it:
// the cycle state line, the single action card (picked by lib/today-action),
// a one-line progress strip, and the two quiet doors (Add periods, Calm now).
// This screen never shows more than two numbers: the streak and the prep
// count. Everything browsable lives in Grow; everything reflective in You.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Header } from '@/components/header';
import { Orb } from '@/components/orb';
import { PeriodSheet } from '@/components/period-sheet';
import { ProgressRing } from '@/components/progress-ring';
import { RecommendSheet } from '@/components/RecommendSheet';
import { TodayActionCard } from '@/components/today-action-card';
import { type RecResult } from '@/models/recommend';
import { colors } from '@/theme/colors';
import {
  cycleStateLine,
  derivePhase,
  isRingClosed,
  periodButtonState,
  pickTodayAction,
  todayRingProgress,
  type TodayActionInput,
} from '@/lib/today-action';
import { prefsAfterPeriodLog } from '@/lib/cycle-tune';
import { scheduleCombackNudge } from '@/lib/notifications';
import { syncPmsReminders } from '@/lib/pms-reminders';
import { takeBreathCue, type BreathCue } from '@/store/breath-cue';
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
import {
  getReadiness,
  readinessDoneCount,
  READINESS_TOTAL,
  todayYmd,
  type ReadinessState,
} from '@/store/pms-readiness';
import { getReminder } from '@/store/reminder-prefs';
import {
  answeredForCycle,
  appendRemission,
  getRemissionLog,
  type RemissionAnswer,
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
const RING_DIAMETER = 224; // hugs the sphere so it reads as the moon's ring

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
  ]);
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
    lastAction: s.memory.last,
    dismissedDate: s.memory.dismissedDate,
    now: s.now,
  };
}

export default function NowScreen() {
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
  const reload = useCallback(() => {
    loadSnapshot()
      .then(setSnapshot)
      .catch(() => {});
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
  const ringProgress = input == null || action == null ? 0 : todayRingProgress(input, action);
  const ringClosed = input != null && action != null && isRingClosed(input, action);
  const phase =
    snapshot == null ? null : derivePhase(snapshot.prefs, snapshot.reads.length > 0, snapshot.now);
  const stateLine = snapshot == null ? null : cycleStateLine(snapshot.prefs, snapshot.now);
  const periodButton =
    snapshot == null ? null : periodButtonState(snapshot.prefs, snapshot.now);

  // Remember what was asked so tomorrow's pick can rotate away from it.
  const lastRecordedId = useRef<string | null>(null);
  useEffect(() => {
    if (snapshot == null || action == null) return;
    if (action.kind === 'done' || lastRecordedId.current === action.id) return;
    lastRecordedId.current = action.id;
    recordShownAction(todayYmd(snapshot.now), action.id).catch(() => {});
  }, [snapshot, action]);

  // One warm pulse the moment the ring closes on screen — the day's reward,
  // felt in the hand. The ref keeps it to the transition, never on re-renders
  // or on arriving at an already-closed day.
  const ringWasClosed = useRef<boolean | null>(null);
  useEffect(() => {
    if (snapshot == null) return;
    if (ringWasClosed.current === false && ringClosed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    ringWasClosed.current = ringClosed;
  }, [snapshot, ringClosed]);

  // Setup copy nuance: a read left partway resumes, it doesn't restart.
  const actionForCard =
    action != null && action.kind === 'assessment' && snapshot?.setupCard === 'resume'
      ? { ...action, caption: 'Pick up where you left off' }
      : action;

  // --- Handlers -----------------------------------------------------------

  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(false);

  const onActionPress = () => {
    if (action == null || snapshot == null) return;
    Haptics.selectionAsync().catch(() => {});
    if (action.id === 'checkin:period-confirm') {
      setPeriodSheetVisible(true);
      return;
    }
    // Session asks go through the coached feeling-first entry, the same flow
    // as the Calm now button — a bare /session push has no technique to run.
    if (action.kind === 'session') {
      setRecommendVisible(true);
      return;
    }
    if (action.route !== '') router.push(action.route as Href);
  };

  const onRemission = (answer: RemissionAnswer) => {
    if (snapshot?.prefs.lastPeriodStart == null) return;
    Haptics.selectionAsync().catch(() => {});
    const today = todayYmd(snapshot.now);
    appendRemission({ cycleAnchor: snapshot.prefs.lastPeriodStart, answer, at: today })
      .then(() => dismissForDay(today))
      .then(reload)
      .catch(() => {});
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

  // The strip's two numbers: the streak, and (inside the window) today's
  // preps. A zero-day streak is noise, not motivation — it never renders; the
  // strip disappears entirely when there is nothing worth saying.
  const stripParts: string[] = [];
  if (snapshot != null) {
    if (snapshot.streak.streak > 0) stripParts.push(`${snapshot.streak.streak}-day streak`);
    if (phase === 'window') {
      const preps = readinessDoneCount(snapshot.readiness.checks, snapshot.sessionsToday > 0);
      stripParts.push(`${preps}/${READINESS_TOTAL} preps today`);
    }
  }
  const stripText = stripParts.join(' · ');

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The soul: a big calm moon wearing the day's ring. */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Orb
              size={ORB_SIZE}
              phase={breath.phase}
              phaseDuration={breathDuration}
              breathRange={{ min: 0.72, max: 1.16 }}
            />
            <View pointerEvents="none" style={styles.ringOverlay}>
              <ProgressRing diameter={RING_DIAMETER} progress={ringProgress} />
            </View>
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

          {/* Where she is in the cycle, in one quiet line — with the period
              chip right under it, so the state and its correction share a
              spot. The chip is the prediction's honesty loop. */}
          {stateLine != null && (
            <Animated.View entering={FadeInDown.delay(40).duration(500)}>
              <Text style={styles.stateLine}>{stateLine}</Text>
            </Animated.View>
          )}
          {periodButton != null && (
            <Animated.View entering={FadeInDown.delay(70).duration(500)} style={styles.chipRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setPeriodSheetVisible(true);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={periodButton.label}
                style={[styles.periodChip, periodButton.emphasized && styles.periodChipEmphasized]}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    periodButton.emphasized && styles.periodChipTextEmphasized,
                  ]}
                >
                  {periodButton.label}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* The one coached action. */}
          {actionForCard != null && (
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <TodayActionCard
                action={actionForCard}
                done={ringClosed}
                onPress={onActionPress}
                onRemission={onRemission}
              />
            </Animated.View>
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

          {/* The SOS: always one tap, always visible, the screen's one primary
              button. */}
          <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.calmWrap}>
            <BeginButton
              label="Calm now"
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setRecommendVisible(true);
              }}
            />
            <Text style={styles.calmHint}>Feeling worked up? Start here.</Text>
          </Animated.View>

          <View style={{ height: 12 }} />
        </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  // Bottom padding clears the tab bar with a breath of air above it.
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 96, gap: 14 },
  hero: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  // Both overlays center on the orb's oversized canvas, so the ring hugs the
  // sphere and the cue sits on the moon regardless of halo padding.
  ringOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    paddingHorizontal: 56,
  },
  cueLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: 'hsla(222, 10%, 28%, 0.72)',
    letterSpacing: 3,
  },
  stateLine: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.66)',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 2,
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
  calmWrap: { alignItems: 'center', gap: 8, marginTop: 2 },
  calmHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
});
