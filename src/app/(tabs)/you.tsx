// You: progress, identity, and settings — the third tab. Grew out of the
// My Soul modal (itself ported from the Mac Settings.tsx panel); same cards,
// now living on a tab instead of behind a close button.

import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, type Href } from 'expo-router';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState, type ReactNode } from 'react';
import { GlassSurface } from '@/components/glass-surface';
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { AmbientGlow } from '@/components/ambient-glow';
import { CosmicBackground } from '@/components/cosmic-background';
import { GlassCardBg } from '@/components/glass-card-bg';
import { CheckInSheet } from '@/components/CheckInSheet';
import { SHOW_CHECKIN, SHOW_ANALYTICS, SHOW_MOOD_TREND } from '@/config/features';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';
import {
  foldLedger,
  materialLevel,
  MATERIAL_ORDER,
  type LightEvent,
  type MintedMoon,
  type MoonMaterial,
} from '@/lib/moon-light';
import { buildCycleSeries, currentCyclePoint, type CyclePoint } from '@/lib/cycle-series';
import {
  getCycleImpacts,
  getMutedDomains,
  latestReadsByAnchor,
  levelOf,
  IMPACT_DOMAINS,
  IMPACT_DOMAIN_LABEL,
  type CycleImpactEntry,
  type ImpactDomain,
} from '@/store/cycle-impact';
import { getStreakInfo } from '@/store/session-history';
import { getMoodRecords, type MoodRecord } from '@/store/mood-history';
import {
  getCheckInRecords,
  todayCheckIn,
  type CheckInLevel,
  type CheckInRecord,
} from '@/store/checkin-history';
import { getMacPromoDismissed, setMacPromoDismissed } from '@/store/mac-promo-dismissed';
import { resetOnboarding } from '@/store/onboarding-complete';
import {
  getReminder,
  setReminder,
  DEFAULT_REMINDER,
  type ReminderPrefs,
} from '@/store/reminder-prefs';
import {
  getPmsPrefs,
  setPmsPrefs,
  DEFAULT_PMS_PREFS,
  DEFAULT_PERIOD_LENGTH,
  type PmsPrefs,
} from '@/store/pms-prefs';
import { todayYmd } from '@/store/pms-readiness';
import { isInPmsWindow, daysUntilPmsWindow } from '@/lib/pms-window';
import {
  ensureNotificationPermission,
  isPermissionBlocked,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '@/lib/notifications';
import { syncPmsReminders } from '@/lib/pms-reminders';
import { prefsAfterPeriodLog } from '@/lib/cycle-tune';
import {
  getPeriodHistory,
  setPeriodHistory,
  addPeriodStart,
  latestStart,
} from '@/store/period-history';
import { PeriodSheet } from '@/components/period-sheet';
import { Host, DatePicker } from '@expo/ui/swift-ui';
import { useNiyoraSync, type MacSoulState } from '@/hooks/use-niyora-sync';
import { MacPairing } from '@/components/MacPairing';
import { colors } from '@/theme/colors';
import { glass } from '@/theme/glass';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing, pageGutter } from '@/theme/spacing';
import { secondaryButtonSurface } from '@/theme/controls';
import { MAC_SOUL_HUES, MAC_SOUL_DISPLAY, freshSoul } from '@/lib/mac-soul';
import { MOON_DRAWINGS } from '@/components/moment/moon-drawings';
import { getRewardCount } from '@/store/reward-progress';
import { getMoments, feelingCounts, type MomentRecord } from '@/store/moment-history';
import { getPmsReads, type PmsRead } from '@/store/pms-reads';
import { CRISIS_COPY } from '@/lib/crisis-scan';
import { getOnboardingV3Progress } from '@/store/onboarding-v3-progress';
import { compareReads, deriveLevel, levelActivation } from '@/v3/v3-content';
import { waveTint } from '@/v3/v3-graphics';

function effectiveSoul(
  isPaired: boolean,
  macSoulState: MacSoulState | null,
): MacSoulState | null {
  return isPaired ? freshSoul(macSoulState) : null;
}

// The three crisis lines' actions, matched to CRISIS_COPY.lines by order:
// 988 lifeline, the Crisis Text Line, and the by-country directory.
const CRISIS_URLS = ['tel:988', 'sms:741741', 'https://findahelpline.com'];
function openCrisisLine(index: number): void {
  const url = CRISIS_URLS[index];
  if (url) Linking.openURL(url).catch(() => {});
}

export default function MySoulScreen() {
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [moonMaterial, setMoonMaterial] = useState<MoonMaterial>('moonstone');
  const [shelf, setShelf] = useState<MintedMoon[]>([]);
  const [ledger, setLedger] = useState<LightEvent[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [cycleImpacts, setCycleImpacts] = useState<CycleImpactEntry[]>([]);
  const [mutedDomains, setMutedDomains] = useState<ImpactDomain[]>([]);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [moodRecords, setMoodRecords] = useState<MoodRecord[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [macPromoDismissed, setMacPromoDismissedState] = useState(true);
  const [reminder, setReminderState] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [pmsPrefs, setPmsPrefsState] = useState<PmsPrefs>(DEFAULT_PMS_PREFS);
  const [pmsReads, setPmsReads] = useState<PmsRead[]>([]);
  const [periodHistory, setPeriodHistoryState] = useState<string[]>([]);
  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [crisisOpen, setCrisisOpen] = useState(false);
  const [tab, setTab] = useState<'soul' | 'settings'>('soul');
  // How many gift-reward drawings she has earned (in order), for the Soul grid.
  const [rewardCount, setRewardCount] = useState(0);
  // The real feelings she has named and worked through, from on-device history.
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const {
    isPaired,
    macSoulState,
    syncState,
    discoveredServers,
    connectToMac,
    cancelPairing,
  } = useNiyoraSync();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRewardCount().then((n) => {
        if (active) setRewardCount(n);
      }).catch(() => {});
      getMoments().then((m) => {
        if (active) setMoments(m);
      }).catch(() => {});
      getMoonState().then((s) => {
        if (active) {
          setMoonMaterial(s.material);
          setShelf(s.shelf);
        }
      }).catch(() => {});
      getLightLedger().then((events) => {
        if (active) setLedger(events);
      }).catch(() => {});
      getStreakInfo().then(({ streak }) => {
        if (active) setCurrentStreak(streak);
      }).catch(() => {});
      getCycleImpacts().then((r) => {
        if (active) setCycleImpacts(r);
      }).catch(() => {});
      getMutedDomains().then((m) => {
        if (active) setMutedDomains(m);
      }).catch(() => {});
      getCheckInRecords().then((r) => {
        if (active) setCheckInRecords(r);
      }).catch(() => {});
      getMoodRecords().then((r) => {
        if (active) setMoodRecords(r);
      }).catch(() => {});
      getMacPromoDismissed().then((d) => {
        if (active) setMacPromoDismissedState(d);
      }).catch(() => {});
      getReminder().then((r) => {
        if (active) setReminderState(r);
      }).catch(() => {});
      getPmsPrefs().then((p) => {
        if (active) setPmsPrefsState(p);
      }).catch(() => {});
      getPeriodHistory().then((h) => {
        if (active) setPeriodHistoryState(h);
      }).catch(() => {});
      // Her PMS reads, oldest first. Anyone who finished onboarding before the
      // reads history existed gets a baseline synthesized from the saved
      // onboarding answers (undated), so the card and retake still work.
      getPmsReads().then(async (reads) => {
        if (reads.length > 0) return reads;
        const p = await getOnboardingV3Progress();
        return p?.done ? [{ at: '', answers: p.answers }] : [];
      }).then((reads) => {
        if (active) setPmsReads(reads);
      }).catch(() => {});
      return () => { active = false; };
    }, [])
  );

  function handleCheckInDone(recorded: boolean) {
    setShowCheckIn(false);
    if (recorded) {
      getCheckInRecords().then(setCheckInRecords).catch(() => {});
    }
  }

  function handleMacPromoDismiss() {
    setMacPromoDismissedState(true);
    setMacPromoDismissed().catch(() => {});
  }

  async function handleReminderToggle(on: boolean) {
    if (!on) {
      const next = { ...reminder, enabled: false };
      setReminderState(next);
      await setReminder(next).catch(() => {});
      await cancelDailyReminder().catch(() => {});
      return;
    }
    const granted = await ensureNotificationPermission().catch(() => false);
    if (!granted) {
      // Permission was denied earlier; the only way back is the iOS Settings app.
      if (await isPermissionBlocked().catch(() => false)) {
        Linking.openSettings().catch(() => {});
      }
      return; // leave the toggle off
    }
    const next = { ...reminder, enabled: true };
    setReminderState(next);
    await setReminder(next).catch(() => {});
    await scheduleDailyReminder(next.hour, next.minute).catch(() => {});
    // If she enables it mid-PMS-span, hand straight to the reconciler so the
    // breath reminder pauses right away instead of doubling up until next launch.
    await syncPmsReminders().catch(() => {});
  }

  async function handleReminderTimeChange(hour: number, minute: number) {
    const next = { ...reminder, hour, minute };
    setReminderState(next);
    await setReminder(next).catch(() => {});
    if (next.enabled) {
      await scheduleDailyReminder(hour, minute).catch(() => {});
    }
    // The PMS heads-up reminders reuse this time, so move them too.
    await syncPmsReminders().catch(() => {});
  }

  async function persistPms(next: PmsPrefs) {
    setPmsPrefsState(next);
    await setPmsPrefs(next).catch(() => {});
    // Single write path for PMS prefs: reconcile the heads-up reminders against
    // the new date, cycle length, or on/off state.
    await syncPmsReminders().catch(() => {});
  }

  async function handlePmsToggle(on: boolean) {
    if (!on) {
      await persistPms({ ...pmsPrefs, pmsMode: false });
      return;
    }
    // The heads-up reminders are the feature's only notification, so ask for
    // permission now. PMS framing still works in-app if she declines.
    await ensureNotificationPermission().catch(() => false);
    await persistPms({ ...pmsPrefs, pmsMode: true });
    // Don't fabricate a period: if none is logged yet, open the calendar so she
    // logs her real last period. Predictions stay quiet until she does (every
    // consumer guards a null start), and the "Your periods" row shows "Add".
    if (pmsPrefs.lastPeriodStart == null) {
      setPeriodSheetVisible(true);
    }
  }

  // Logging a period from the calendar: append it to the additive history (the
  // same store onboarding and Now write to) and re-anchor the prediction to the
  // newest start. This is the edit surface, so it stays light — no moon minting
  // or reflection offers (those belong to the Now honesty loop).
  async function handlePeriodConfirm(dt: Date) {
    const history = await addPeriodStart(toYmdLocal(dt)).catch(() => null);
    if (history == null) return;
    setPeriodHistoryState(history);
    await persistPms(prefsAfterPeriodLog(pmsPrefs, history));
  }

  // Removing a logged period: drop it from the history, and if it was the
  // current anchor, fall back to the next most recent start.
  async function handlePeriodRemove(startYmd: string) {
    const remaining = periodHistory.filter((s) => s !== startYmd);
    setPeriodHistoryState(remaining);
    await setPeriodHistory(remaining).catch(() => {});
    if (pmsPrefs.lastPeriodStart === startYmd) {
      await persistPms({ ...pmsPrefs, lastPeriodStart: latestStart(remaining) });
    }
  }

  // Cycle and period length now come from the calendar sheet, which already
  // clamps to the allowed range, so these persist the value as given.
  async function handleCycleLengthChange(length: number) {
    await persistPms({ ...pmsPrefs, cycleLength: length });
  }

  async function handlePeriodLengthChange(length: number) {
    await persistPms({ ...pmsPrefs, periodLength: length });
  }

  const pmsStatus = pmsStatusLine(pmsPrefs);

  // The scoreboard runs on the moon reward system (moon-reward-spec.md): the
  // material is her lifetime tier; cycles kept, noticed, and applied are the
  // depth behaviours that move it, folded from the ledger. The effort-vs-impact
  // chart pairs each cycle's engaged days with its domain reads.
  const level = materialLevel(moonMaterial);
  const totals = foldLedger(ledger);
  const cycleSeries = buildCycleSeries(shelf, ledger);
  // The live cycle joins the chart so You reflects Now the moment she shows up —
  // shown once she's engaged this cycle, or alongside any completed cycles, but
  // never as a lonely zero point that would only make the empty state look wrong.
  const liveCycle = currentCyclePoint(pmsPrefs.lastPeriodStart, pmsPrefs.cycleLength, ledger, new Date());
  const cycleSeriesLive =
    liveCycle != null &&
    !cycleSeries.some((p) => p.cycleStart === liveCycle.cycleStart) &&
    (liveCycle.engagedDays > 0 || cycleSeries.length > 0)
      ? [...cycleSeries, liveCycle]
      : cycleSeries;
  const macSoul = effectiveSoul(isPaired, macSoulState);

  return (
    <View style={styles.root}>
      <CosmicBackground />
      <AmbientGlow />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Same header language as Grow: a big title over a one-line subtitle. */}
          <View style={styles.pageHeader}>
            {/* Dev-only: long-press the title to open the design-system reference. */}
            <Pressable
              onLongPress={__DEV__ ? () => router.push('/design-system' as Href) : undefined}
              delayLongPress={600}
            >
              <Text style={styles.pageTitle}>Soul</Text>
            </Pressable>
            <Text style={styles.pageSub}>Your journey</Text>
          </View>

          {/* Two segments split the page so neither side is a long scroll:
              My Soul carries progress, Settings carries the toggles and about. */}
          <View style={styles.segmented} accessibilityRole="tablist">
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setTab('soul');
              }}
              style={[styles.segment, tab === 'soul' && styles.segmentOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'soul' }}
              accessibilityLabel="My Soul"
            >
              <Text style={[styles.segmentLabel, tab === 'soul' && styles.segmentLabelOn]}>My Soul</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setTab('settings');
              }}
              style={[styles.segment, tab === 'settings' && styles.segmentOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === 'settings' }}
              accessibilityLabel="Settings"
            >
              <Text style={[styles.segmentLabel, tab === 'settings' && styles.segmentLabelOn]}>Settings</Text>
            </Pressable>
          </View>

          {tab === 'soul' && (
            <>
              <ScoreboardCard
                material={moonMaterial}
                level={level}
                noticed={totals.recognitions}
                applied={totals.applications}
                streak={currentStreak}
              />

              <SectionEyebrow title="Your badges" />
              <DrawingsCard earned={rewardCount} />

              <SectionEyebrow title="Emotions you've worked through" />
              <EmotionsCard moments={moments} />

              {/* Eyebrow above the card, matching "Your badges"/"Your growth". */}
              <SectionEyebrow title="You & Niyora" />
              <EffortImpactCard
                series={cycleSeriesLive}
                impacts={cycleImpacts}
                muted={mutedDomains}
                // Always-available way into the cycle reflection (#1); anchors to
                // the current cycle when she has one, else today, so it works
                // before any period is logged. Button lives inside the card.
                onReflect={() =>
                  router.push({
                    pathname: '/reflect',
                    params: { anchor: pmsPrefs.lastPeriodStart ?? todayYmd() },
                  })
                }
              />

              <SectionEyebrow title="Your growth" />
              <CyclesShelfCard shelf={shelf} />

              <PmsReadCard
                reads={pmsReads}
                onStart={() => {
                  Haptics.selectionAsync();
                  router.push('/onboarding-v3' as Href);
                }}
                onRetake={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: '/onboarding-v3', params: { mode: 'retake' } } as Href);
                }}
              />

              {SHOW_CHECKIN && (
                <CheckInCard
                  records={checkInRecords}
                  macSoul={macSoul}
                  onCheckIn={() => setShowCheckIn(true)}
                />
              )}

              {SHOW_MOOD_TREND && <MoodTrendCard records={moodRecords} />}
            </>
          )}

          {tab === 'settings' && (
            <>
              <ReminderCard
                reminder={reminder}
                onToggle={handleReminderToggle}
                onTimeChange={handleReminderTimeChange}
              />

              <PmsCard
                prefs={pmsPrefs}
                status={pmsStatus}
                onToggle={handlePmsToggle}
                onEditPeriods={() => {
                  Haptics.selectionAsync();
                  setPeriodSheetVisible(true);
                }}
              />

              {!isPaired && (
                <MacPairing
                  syncState={syncState}
                  discoveredServers={discoveredServers}
                  connectToMac={connectToMac}
                  cancelPairing={cancelPairing}
                />
              )}

              {!isPaired && !macPromoDismissed && discoveredServers.length === 0 && (
                <MacPromoCard onDismiss={handleMacPromoDismiss} />
              )}

              {SHOW_ANALYTICS && (
                <ToggleCard
                  title="Anonymous analytics"
                  description="Helps shape what to improve next. Stress scores, breath patterns, and anything that identifies you stay on your iPhone."
                  value={analyticsOn}
                  onChange={setAnalyticsOn}
                />
              )}

              <MessageCard />

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  resetOnboarding().finally(() => router.replace('/onboarding-v3'));
                }}
                hitSlop={12}
                style={styles.replayIntro}
                accessibilityRole="button"
                accessibilityLabel="Redo onboarding"
              >
                <Text style={styles.replayIntroText}>Redo onboarding</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setCrisisOpen(true);
                }}
                hitSlop={8}
                style={styles.crisisRow}
                accessibilityRole="button"
                accessibilityLabel="Urgent support"
              >
                <SymbolView name="lifepreserver" tintColor={colors.textSubtitle} size={15} weight="regular" />
                <Text style={styles.crisisRowText}>In a crisis? Get urgent support</Text>
              </Pressable>

              <Text style={styles.footer}>
                Niyora does not collect any data
              </Text>
              <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '—'}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {SHOW_CHECKIN && showCheckIn && (
        <CheckInSheet onDone={handleCheckInDone} />
      )}

      <Modal
        visible={crisisOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCrisisOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.crisisBackdrop}
          onPress={() => setCrisisOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Pressable style={styles.crisisSheet} onPress={() => {}}>
            <Text style={styles.crisisTitle}>If you need a person</Text>
            <Text style={styles.crisisBody}>
              Some moments are bigger than an app can hold. These lines are free, and there any
              time.
            </Text>
            {CRISIS_COPY.lines.map((line, i) => (
              <Pressable
                key={line.label}
                style={styles.crisisLine}
                onPress={() => openCrisisLine(i)}
                accessibilityRole="button"
                accessibilityLabel={`${line.label}. ${line.detail}`}
              >
                <Text style={styles.crisisLineLabel}>{line.label}</Text>
                <Text style={styles.crisisLineDetail}>{line.detail}</Text>
              </Pressable>
            ))}
            <Text style={styles.crisisEmergency}>{CRISIS_COPY.emergency}</Text>
            <Pressable
              onPress={() => setCrisisOpen(false)}
              style={styles.crisisClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.crisisCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* The full period calendar: add multiple past periods, tap a logged one
          to remove it. Same sheet onboarding and Now use, over period-history. */}
      <PeriodSheet
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onConfirm={handlePeriodConfirm}
        onRemove={handlePeriodRemove}
        onCycleLengthChange={handleCycleLengthChange}
        onPeriodLengthChange={handlePeriodLengthChange}
        markedDates={periodHistory}
        cycleLength={pmsPrefs.cycleLength}
        periodLength={pmsPrefs.periodLength ?? DEFAULT_PERIOD_LENGTH}
      />
    </View>
  );
}

// ---- Sparkline helpers ----

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toDateString());
  }
  return days;
}

function buildSparkData(records: CheckInRecord[]): (CheckInLevel | null)[] {
  const days = last7Days();
  return days.map((day) => {
    for (let i = records.length - 1; i >= 0; i--) {
      if (new Date(records[i].recordedAt).toDateString() === day) {
        return records[i].level;
      }
    }
    return null;
  });
}

const LEVEL_HUES: Record<CheckInLevel, number> = {
  light: 215,
  okay: 260,
  heavy: 335,
};

function CheckInSparkline({ records }: { records: CheckInRecord[] }) {
  const spark = buildSparkData(records);
  return (
    <View style={styles.sparkline} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
      {spark.map((level, i) => (
        <View
          key={i}
          style={[
            styles.sparkDot,
            {
              backgroundColor: level
                ? `hsl(${LEVEL_HUES[level]}, 52%, 58%)`
                : 'rgba(255,255,255,0.12)',
            },
          ]}
        />
      ))}
    </View>
  );
}

// ---- Mood trend helpers ----

// Matches DOT_HUES in PostSessionMood.tsx: mood 1 (tense) = purple, mood 5 (peace) = blue.
const MOOD_DOT_HUES = [295, 278, 260, 240, 215] as const;

// Its own card: how you felt right after recent sessions, as a soft gradient
// ribbon (purple = tense, blue = at peace), oldest on the left. Deliberately a
// different shape from the daily check-in dot sparkline so the two read as
// distinct, and on-brand with the app's gradients.
// The gift-reward drawings she has uncovered, saved to her Soul. Earned one by
// one in order; unearned slots stay dim until she reaches them (M9-14 / reward).
function DrawingsCard({ earned }: { earned: number }) {
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.drawGrid}>
        {MOON_DRAWINGS.map((d, i) => (
          <View key={i} style={styles.drawCell}>
            {i < earned ? (
              <Image source={d.src} style={styles.drawImg} resizeMode="contain" accessibilityIgnoresInvertColors />
            ) : (
              <View style={styles.drawLocked} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// The constellations she has actually named, most worked-through first. Each
// feeling belongs to one constellation (FEELING_SET), and a moment carries it,
// so we just tally by constellation. (docs/moon-ai-constellations.md)
function constellationGroups(
  moments: readonly MomentRecord[],
): { constellation: string; count: number }[] {
  const by = new Map<string, number>();
  for (const m of moments) {
    if (!m.constellation) continue;
    by.set(m.constellation, (by.get(m.constellation) ?? 0) + 1);
  }
  return [...by.entries()]
    .map(([constellation, count]) => ({ constellation, count }))
    .sort((a, b) => b.count - a.count);
}

// The real feelings she has named and worked through, gathered on-device. The
// feelings come most-worked-through first (feelingCounts), then the
// constellations those feelings belong to — each one "rising" in her sky as she
// names the emotions inside it. No badge PNGs are wired yet (Neha is sourcing
// them), so the constellations surface as lit names rather than art.
function EmotionsCard({ moments }: { moments: MomentRecord[] }) {
  if (moments.length === 0) {
    return (
      <View style={styles.card}>
        <GlassCardBg />
        <Text style={styles.cardCopy}>
          The feelings you name and work through will gather here, like stars finding their shape.
        </Text>
      </View>
    );
  }
  const feelings = feelingCounts(moments);
  const constellations = constellationGroups(moments);
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.emotionChips}>
        {feelings.map(({ feeling, count }) => (
          <View key={feeling} style={styles.emotionChip}>
            <View style={styles.emotionStar} />
            <Text style={styles.emotionChipLabel}>{feeling}</Text>
            {count > 1 && <Text style={styles.emotionChipCount}>{count}</Text>}
          </View>
        ))}
      </View>
      {constellations.length > 0 && (
        <>
          <Text style={styles.emotionSub}>Rising in your sky</Text>
          <View style={styles.emotionChips}>
            {constellations.map(({ constellation, count }) => (
              <View key={constellation} style={styles.emotionChip}>
                <View style={styles.emotionStarLit} />
                <Text style={styles.emotionChipLabel}>
                  {constellation.charAt(0).toUpperCase() + constellation.slice(1)}
                </Text>
                <Text style={styles.emotionChipCount}>{count}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function MoodTrendCard({ records }: { records: MoodRecord[] }) {
  const recent = records.slice(-10);
  if (recent.length < 2) return null;
  const stops = recent.map((r) => `hsl(${MOOD_DOT_HUES[r.mood - 1]}, 62%, 60%)`);
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <Text style={styles.cardTitle}>Calm after practice</Text>
      <Text style={[styles.cardCopy, { marginTop: spacing.sm, marginBottom: spacing.md }]}>
        Bluer is the calmer you.
      </Text>
      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.moodRibbon}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={styles.moodRibbonEnds}>
        <Text style={styles.moodEndLabel}>older</Text>
        <Text style={styles.moodEndLabel}>now</Text>
      </View>
    </View>
  );
}

// ---- Card components ----

function CheckInCard({
  records,
  macSoul,
  onCheckIn,
}: {
  records: CheckInRecord[];
  macSoul: MacSoulState | null;
  onCheckIn: () => void;
}) {
  const todayRecord = todayCheckIn(records);
  const count = records.length;

  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.checkInHeader}>
        <Text style={styles.cardTitle}>Mental health</Text>
        {count > 0 && (
          <Text style={styles.checkInCount}>
            {count}
            <Text style={styles.checkInCountLabel}> check-ins</Text>
          </Text>
        )}
      </View>
      {count > 0 && <CheckInSparkline records={records} />}
      {macSoul && (
        <Text style={styles.macSoulRow}>
          {'From Mac: '}
          <Text style={{ color: `hsl(${MAC_SOUL_HUES[macSoul.label] ?? 260}, 60%, 68%)` }}>
            {MAC_SOUL_DISPLAY[macSoul.label] ?? macSoul.label}
          </Text>
        </Text>
      )}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onCheckIn();
        }}
        style={styles.checkInButton}
        accessibilityRole="button"
        accessibilityLabel={todayRecord ? 'Check in again' : 'Check in'}
      >
        <Text style={styles.checkInButtonLabel}>
          {todayRecord ? 'Check in again' : 'Check in'}
        </Text>
      </Pressable>
    </View>
  );
}

// One look per material, in the moon's register (matches tab-moon's palette).
const MATERIAL_ACCENT: Record<MoonMaterial, string> = {
  moonstone: '#C6CFE6',
  gold: '#E7C878',
  opal: '#D9A9E0',
  diamond: '#CFE7F2',
};

const DOMAIN_COLOR: Record<ImpactDomain, string> = {
  work: '#4ec7a6',
  partner: '#e87ba9',
  yourself: '#9d8cf0',
};

// Per-domain caption, keyed off the last move. Honest in both directions: a
// worse cycle names the dip and credits the effort anyway — never "you slipped"
// (moon-reward-spec.md: honesty is never penalized, copy never says "failed").
const IMPACT_CAPS: Record<ImpactDomain, Record<'up' | 'flat' | 'down', string>> = {
  work: {
    up: 'Yey! Your effort on Niyora is paying off',
    flat: 'PMS is not affecting work as much',
    down: 'This cycle was a tough one at work',
  },
  partner: {
    up: 'Yey! Your effort on Niyora is paying off',
    flat: 'PMS is not affecting your partner as much',
    down: 'This cycle was a tough one with your partner',
  },
  yourself: {
    up: 'Self love is back this cycle',
    flat: 'PMS is not affecting you as much',
    down: 'This was a tough cycle for you',
  },
};

const CYCLE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthShort(ymd: string): string {
  const m = /^\d{4}-(\d{2})-\d{2}$/.exec(ymd);
  return m ? CYCLE_MONTHS[Number(m[1]) - 1] ?? '' : '';
}

function SectionEyebrow({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.eyebrow}>
      <Text style={styles.eyebrowTitle}>{title}</Text>
      {hint ? <Text style={styles.eyebrowHint}>{hint}</Text> : null}
    </View>
  );
}

// "Where you are": her lifetime tier and the four depth behaviours that move it.
// No forward requirements, no rainbow — just where she stands and a whisper of
// how far the ladder runs (the pips).
function ScoreboardCard({
  material,
  level,
  noticed,
  applied,
  streak,
}: {
  material: MoonMaterial;
  level: number;
  noticed: number;
  applied: number;
  streak: number;
}) {
  const accent = MATERIAL_ACCENT[material];
  const name = material.charAt(0).toUpperCase() + material.slice(1);
  return (
    <View style={styles.scoreboard}>
      {/* Tap the material to read how the moon grows (materials, rings, phases). */}
      <Pressable
        onPress={() => router.push({ pathname: '/moon-probe', params: { current: material } })}
        style={({ pressed }) => [styles.scoreTap, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`You're on ${name}. See how your moon grows.`}
      >
        <View style={styles.scoreLevelRow}>
          <Text style={styles.scoreLevel}>
            You&apos;re on <Text style={{ color: accent }}>{name}</Text>
          </Text>
          <SymbolView name="chevron.right" tintColor={accent} size={15} weight="semibold" />
        </View>
        <Text style={styles.scoreSub}>Level {level} of {MATERIAL_ORDER.length} · tap to see the stages</Text>
      </Pressable>
      <View style={styles.statsRow}>
        <GlassCardBg radius={radius.control} />
        <StatCell n={noticed} t="Noticed" />
        <StatCell n={applied} t="Applied" />
        <StatCell n={streak} t="Streak" suffix="d" />
      </View>
    </View>
  );
}

function StatCell({ n, t, suffix }: { n: number; t: string; suffix?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statNum}>
        {n}
        {suffix != null && <Text style={styles.statSuffix}>{suffix}</Text>}
      </Text>
      <Text style={styles.statLabel}>{t}</Text>
    </View>
  );
}

// "Is it working?": each cycle's engaged days (faint bars — the effort) under
// the selected domain's felt line (rough → fine — the impact). The chips switch
// domains; muted domains never appear. Until the Now-tab check-in has fed a
// read, the bars stand alone with a gentle note.
// An empty state that sells the payoff instead of apologising: a blurred,
// non-interactive preview of the filled surface (a real render with sample
// data), under a crisp line and a way to start. Every empty state on You uses
// this so "nothing yet" always reads as "here's what's coming, and how to get
// there".
function GhostPreview({
  renderPreview,
  line,
  actionLabel,
  onAction,
}: {
  renderPreview: (width: number) => ReactNode;
  line: string;
  actionLabel: string;
  // Omit for a locked/status card: the label renders as a static chip instead
  // of a tappable button.
  onAction?: () => void;
}) {
  const [width, setWidth] = useState(0);
  return (
    <View style={styles.ghostWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View
        style={styles.ghostContent}
        pointerEvents="none"
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      >
        {renderPreview(width || 300)}
      </View>
      {/* Heavier frost + scrim so the preview stays a soft backdrop and the copy
          on top reads cleanly. */}
      <GlassSurface intensity={40} />
      <View style={styles.ghostScrim} pointerEvents="none" />
      <View style={styles.ghostOverlay}>
        <Text style={styles.ghostLine}>{line}</Text>
        {onAction != null ? (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onAction();
            }}
            style={styles.ghostBtn}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.ghostBtnLabel}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.ghostBtn} accessibilityLabel={actionLabel}>
            <Text style={styles.ghostBtnLabel}>{actionLabel}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Sample data for the blurred previews — never persisted, never shown crisp.
const GHOST_SERIES: CyclePoint[] = [
  { cycleStart: '2026-04-01', cycleEnd: '2026-05-01', label: 'Apr', engagedDays: 5, span: 30 },
  { cycleStart: '2026-05-01', cycleEnd: '2026-06-01', label: 'May', engagedDays: 8, span: 31 },
  { cycleStart: '2026-06-01', cycleEnd: '2026-07-01', label: 'Jun', engagedDays: 9, span: 30 },
  { cycleStart: '2026-07-01', cycleEnd: '2026-08-01', label: 'Jul', engagedDays: 12, span: 31 },
];
const GHOST_LEVELS: (number | null)[] = [18, 44, 52, 82];
const GHOST_SHELF: MintedMoon[] = [
  { cycleStart: '2026-04-01', cycleEnd: '2026-05-01', fullness: 0.4, clarity: null, material: 'moonstone', kept: false },
  { cycleStart: '2026-05-01', cycleEnd: '2026-06-01', fullness: 0.62, clarity: null, material: 'moonstone', kept: true },
  { cycleStart: '2026-06-01', cycleEnd: '2026-07-01', fullness: 0.86, clarity: null, material: 'gold', kept: true },
];

const CHART_H = 156;

// The chart drawing, split out so the live card and the blurred preview render
// the same shape. `levels` is one impact reading per cycle on the 0–100 scale
// (null = not rated), so the line lands at any height and shows a real slope.
function EffortChart({
  series,
  levels,
  color,
  width,
  showLine,
}: {
  series: CyclePoint[];
  levels: (number | null)[];
  color: string;
  width: number;
  showLine: boolean;
}) {
  const padL = 8;
  const padR = 30;
  const padT = 14;
  const padB = 26;
  const w = width || 300;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = CHART_H - padT - padB;
  const n = series.length;
  const xAt = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const yForValue = (v: number) => padT + ((100 - v) / 100) * plotH;
  const maxEngaged = Math.max(1, ...series.map((p) => p.engagedDays));
  const barW = Math.min(26, (plotW / n) * 0.5);
  const linePts = series
    .map((p, i) => (levels[i] != null ? `${xAt(i)},${yForValue(levels[i] as number)}` : null))
    .filter((s): s is string => s != null)
    .join(' ');

  return (
    <Svg
      width={w}
      height={CHART_H}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {[
        { v: 100, label: 'fine' },
        { v: 50, label: 'okay' },
        { v: 0, label: 'rough' },
      ].map(({ v, label }) => {
        const y = yForValue(v);
        return (
          <G key={label}>
            <Line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <SvgText x={w - padR + 5} y={y + 3} fill="rgba(244,242,248,0.3)" fontSize={8.5} fontFamily="Poppins-Regular">
              {label}
            </SvgText>
          </G>
        );
      })}
      {series.map((p, i) => {
        const h = (p.engagedDays / maxEngaged) * (plotH - 6);
        return (
          <Rect
            key={p.cycleEnd}
            x={xAt(i) - barW / 2}
            y={padT + plotH - h}
            width={barW}
            height={Math.max(0, h)}
            rx={4}
            fill={p.provisional ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.055)'}
          />
        );
      })}
      {showLine && linePts !== '' && (
        <Polyline points={linePts} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {series.map((p, i) =>
        levels[i] != null ? (
          <Circle
            key={`pt-${p.cycleEnd}`}
            cx={xAt(i)}
            cy={yForValue(levels[i] as number)}
            r={i === n - 1 ? 5 : 4}
            fill={color}
            stroke="#14101c"
            strokeWidth={2}
          />
        ) : null,
      )}
      {series.map((p, i) => (
        <SvgText key={`lbl-${p.cycleEnd}`} x={xAt(i)} y={CHART_H - 8} fill="rgba(244,242,248,0.4)" fontSize={10} textAnchor="middle" fontFamily="Poppins-Regular">
          {p.label}
        </SvgText>
      ))}
    </Svg>
  );
}

function EffortImpactCard({
  series,
  impacts,
  muted,
  onReflect,
}: {
  series: CyclePoint[];
  impacts: CycleImpactEntry[];
  muted: ImpactDomain[];
  onReflect: () => void;
}) {
  const [width, setWidth] = useState(0);
  const reflectBtn = (
    <Pressable
      onPress={onReflect}
      style={[styles.ghostBtn, styles.reflectBtn]}
      accessibilityRole="button"
      accessibilityLabel="Reflect on this cycle"
    >
      <Text style={styles.ghostBtnLabel}>Reflect on this cycle</Text>
    </Pressable>
  );
  const visibleDomains = IMPACT_DOMAINS.filter((d) => !muted.includes(d));
  const [selected, setSelected] = useState<ImpactDomain>(visibleDomains[0] ?? 'work');

  // No completed cycle yet: a blurred preview of the rising chart, plus a way in.
  if (series.length === 0) {
    return (
      <View style={styles.card}>
      <GlassCardBg />
        <GhostPreview
          renderPreview={(w) => (
            <EffortChart series={GHOST_SERIES} levels={GHOST_LEVELS} color={DOMAIN_COLOR.work} width={w} showLine />
          )}
          line="See how showing up lands in each part of your life. Work, your partner, you."
          actionLabel="Take today's moment"
          onAction={() => router.navigate('/now' as Href)}
        />
        {reflectBtn}
      </View>
    );
  }

  const readByAnchor = latestReadsByAnchor(impacts);
  const domain = visibleDomains.includes(selected) ? selected : visibleDomains[0] ?? 'work';
  const color = DOMAIN_COLOR[domain];
  const levels = series.map((p) => readByAnchor.get(p.cycleStart)?.[domain] ?? null);
  const haveReads = levels.some((l) => l != null);

  const present = levels.filter((l): l is number => l != null);
  let caption: string;
  if (!haveReads) {
    caption = 'Is your PMS getting any better?';
  } else if (present.length < 2) {
    caption = "We have just one cycle to see now, let's see next month";
  } else {
    // A small wobble on the continuous scale isn't a real move — only credit a
    // change once it crosses a band, so the copy doesn't flip on noise.
    const delta = levelOf(present[present.length - 1]) - levelOf(present[present.length - 2]);
    caption = IMPACT_CAPS[domain][delta > 0 ? 'up' : delta === 0 ? 'flat' : 'down'];
  }

  return (
    <View style={styles.card}>
      <GlassCardBg />
      {visibleDomains.length > 0 && (
        <View style={styles.chips}>
          {visibleDomains.map((d) => {
            const on = d === domain;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(d);
                }}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={IMPACT_DOMAIN_LABEL[d]}
              >
                <View style={[styles.chipDot, { backgroundColor: DOMAIN_COLOR[d] }]} />
                <Text style={[styles.chipLabel, on && { color: colors.textPrimary }]}>
                  {IMPACT_DOMAIN_LABEL[d]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <EffortChart series={series} levels={levels} color={color} width={width} showLine={haveReads} />
      </View>

      <Text style={styles.chartCaption}>{caption}</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendBar} />
          <Text style={styles.legendText}>days you showed up</Text>
        </View>
        {haveReads && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: color }]} />
            <Text style={styles.legendText}>
              how {domain === 'yourself' ? 'you' : IMPACT_DOMAIN_LABEL[domain].toLowerCase()} felt
            </Text>
          </View>
        )}
      </View>
      {reflectBtn}
    </View>
  );
}

// "Your cycles": the shelf as a record. Each confirmed cycle is a minted moon —
// material-tinted, its ring the share of days she engaged, a check on the ones
// she kept. Tappable back into that cycle's compare (wired when the Now flow
// lands).
function CycleDisc({ moon }: { moon: MintedMoon }) {
  const accent = MATERIAL_ACCENT[moon.material];
  const size = 54;
  const r = 23;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, moon.fullness));
  return (
    <View style={styles.disc}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.12)" strokeWidth={3} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={accent}
            strokeWidth={3}
            fill="none"
            strokeDasharray={`${c * pct} ${c}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <Circle cx={size / 2} cy={size / 2} r={r - 6} fill={accent} opacity={0.85} />
        </Svg>
        {moon.kept && (
          <View style={styles.keptBadge}>
            <Text style={styles.keptCheck}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.discMonth}>{monthShort(moon.cycleStart)}</Text>
      <Text style={styles.discPct}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

function CyclesShelfCard({ shelf }: { shelf: MintedMoon[] }) {
  if (shelf.length === 0) {
    return (
      <View style={styles.card}>
      <GlassCardBg />
        <GhostPreview
          renderPreview={() => (
            <View style={styles.shelfRow}>
              {GHOST_SHELF.map((m) => (
                <CycleDisc key={m.cycleEnd} moon={m} />
              ))}
            </View>
          )}
          line="Every cycle you move through becomes a moon you keep. A record of the hard weeks you got through."
          actionLabel="Unlocks in a month"
        />
      </View>
    );
  }
  const ordered = [...shelf].sort((a, b) =>
    a.cycleStart < b.cycleStart ? -1 : a.cycleStart > b.cycleStart ? 1 : 0,
  );
  const latest = ordered[ordered.length - 1];
  const best = ordered.reduce((m, cur) => (cur.fullness > m.fullness ? cur : m), ordered[0]);
  const foot =
    latest.kept && latest.cycleEnd === best.cycleEnd
      ? `${monthShort(latest.cycleStart)} kept · your best cycle yet.`
      : latest.kept
        ? `${monthShort(latest.cycleStart)} kept.`
        : null;
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
        {ordered.map((m) => (
          <CycleDisc key={m.cycleEnd} moon={m} />
        ))}
      </ScrollView>
      {foot != null && <Text style={styles.shelfFoot}>{foot}</Text>}
    </View>
  );
}

function ReminderCard({
  reminder,
  onToggle,
  onTimeChange,
}: {
  reminder: ReminderPrefs;
  onToggle: (on: boolean) => void;
  onTimeChange: (hour: number, minute: number) => void;
}) {
  const selection = new Date();
  selection.setHours(reminder.hour, reminder.minute, 0, 0);
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: spacing.lg }}>
          <Text style={styles.cardTitle}>Daily reminder</Text>
          <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>
            One gentle nudge a day to take a breath.
          </Text>
        </View>
        <Switch
          value={reminder.enabled}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onToggle(v);
          }}
          accessibilityLabel="Daily reminder"
          trackColor={{ false: colors.switchTrackOff, true: colors.primarySolid }}
          thumbColor="#fff"
        />
      </View>
      {reminder.enabled && (
        <View style={styles.reminderTimeRow}>
          <Text style={styles.cardCopy}>Remind me at</Text>
          <Host matchContents>
            <DatePicker
              selection={selection}
              displayedComponents={['hourAndMinute']}
              onDateChange={(d) => onTimeChange(d.getHours(), d.getMinutes())}
            />
          </Host>
        </View>
      )}
    </View>
  );
}

function ToggleCard({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: spacing.lg }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onChange(v);
          }}
          accessibilityLabel={title}
          trackColor={{ false: colors.switchTrackOff, true: colors.primarySolid }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromYmdLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Status line under the toggle. Claims only where she is in her cycle (an
// estimate), never how she feels, matching the onboarding closer's voice.
function pmsStatusLine(prefs: PmsPrefs): string | null {
  if (!prefs.pmsMode || !prefs.lastPeriodStart) return null;
  const now = new Date();
  if (isInPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now)) {
    return "Looks like you're in your window now.";
  }
  const days = daysUntilPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, now);
  if (days == null) return null;
  if (days <= 0) return 'Your PMS window is about to start.';
  if (days === 1) return 'Your PMS window starts tomorrow.';
  return `Your PMS window is about ${days} days away.`;
}

// "Measured 10 Jun" from a stored YYYY-MM-DD.
function formatReadDate(ymd: string): string {
  return fromYmdLocal(ymd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Her PMS read: where she stands (from the last completed read), how it moved
// since the read before, and the way to measure again. The retake runs just
// the onboarding's five questions and ends on a then-vs-now compare, appending
// a new read here.
function PmsReadCard({
  reads,
  onStart,
  onRetake,
}: {
  reads: PmsRead[];
  onStart: () => void;
  onRetake: () => void;
}) {
  const latest = reads.length > 0 ? reads[reads.length - 1] : null;
  const prev = reads.length >= 2 ? reads[reads.length - 2] : null;

  // No read yet: the same "know your PMS level" invitation the home pins, so
  // the loop stays closed from here too.
  if (!latest) {
    return (
      <View style={styles.card}>
      <GlassCardBg />
        <Text style={styles.cardTitle}>Your PMS level</Text>
        <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>
          Not measured yet. A few quick questions unlock your plan.
        </Text>
        <Pressable
          onPress={onStart}
          style={styles.primarySmallButton}
          accessibilityRole="button"
          accessibilityLabel="Know your PMS level"
        >
          <Text style={styles.primarySmallButtonLabel}>Know your PMS level</Text>
        </Pressable>
      </View>
    );
  }

  const level = deriveLevel(latest.answers);
  const levelColor = waveTint(levelActivation(level));
  const cmp = prev ? compareReads(prev.answers, latest.answers) : null;
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <Text style={styles.cardTitle}>Your PMS level</Text>
      <Text style={[styles.readLevel, { color: levelColor }]}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Text>
      <Text style={styles.cardCopy}>
        {latest.at ? `Measured ${formatReadDate(latest.at)}.` : 'From your onboarding read.'}
      </Text>
      {cmp && <Text style={styles.pmsStatus}>{cmp.headline}</Text>}
      <Pressable
        onPress={onRetake}
        style={styles.secondarySmallButton}
        accessibilityRole="button"
        accessibilityLabel="Check your PMS level"
      >
        <Text style={styles.primarySmallButtonLabel}>Check your PMS level</Text>
      </Pressable>
    </View>
  );
}

function PmsCard({
  prefs,
  status,
  onToggle,
  onEditPeriods,
}: {
  prefs: PmsPrefs;
  status: string | null;
  onToggle: (on: boolean) => void;
  onEditPeriods: () => void;
}) {
  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: spacing.lg }}>
          <Text style={styles.cardTitle}>Smart PMS mode</Text>
          <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>
            Niyora tracks your cycle so it helps you with PMS
          </Text>
        </View>
        <Switch
          value={prefs.pmsMode}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onToggle(v);
          }}
          accessibilityLabel="Smart PMS mode"
          trackColor={{ false: colors.switchTrackOff, true: colors.primarySolid }}
          thumbColor="#fff"
        />
      </View>
      {prefs.pmsMode && (
        <>
          {status && <Text style={styles.pmsStatus}>{status}</Text>}
          <Pressable
            style={styles.pmsEditRow}
            onPress={onEditPeriods}
            accessibilityRole="button"
            accessibilityLabel="Edit your periods on the calendar"
          >
            <Text style={styles.cardCopy}>Your periods</Text>
            <View style={styles.pmsDateValue}>
              <Text style={styles.pmsDateText}>
                {prefs.lastPeriodStart ? `Last ${formatReadDate(prefs.lastPeriodStart)}` : 'Add'}
              </Text>
              <SymbolView name="chevron.right" tintColor={colors.textTertiary} size={13} weight="semibold" />
            </View>
          </Pressable>
        </>
      )}
    </View>
  );
}

function MacPromoCard({ onDismiss }: { onDismiss: () => void }) {
  async function handleLearnMore() {
    Haptics.selectionAsync();
    const url = 'https://niyora.com/mac';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.card}>
      <GlassCardBg />
      <View style={styles.macPromoHeader}>
        <Text style={[styles.cardTitle, { flex: 1, paddingRight: spacing.sm }]}>
          Niyora is calmer with your Mac
        </Text>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onDismiss();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <SymbolView
            name="xmark"
            tintColor={colors.iconChrome}
            size={14}
            weight="regular"
          />
        </Pressable>
      </View>
      <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>
        Pair with your Mac to share session data and reflect across devices.
      </Text>
      <Pressable
        onPress={handleLearnMore}
        style={styles.secondarySmallButton}
        accessibilityRole="link"
        accessibilityLabel="Get Niyora for Mac"
      >
        <Text style={styles.primarySmallButtonLabel}>Get Niyora for Mac</Text>
      </Pressable>
    </View>
  );
}

function MessageCard() {
  async function handleOpen() {
    Haptics.selectionAsync();
    const url = 'mailto:neha@luminik.io?subject=Niyora%20iOS%20feedback';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  }

  return (
    <View style={styles.card}>
      <GlassCardBg />
      <Text style={styles.cardTitle}>Message the founder</Text>
      <Text style={[styles.cardCopy, { marginTop: spacing.sm }]}>
        Hi, Tell Me what's working, what isn't, what you'd love next. I genuinely appreciate it
      </Text>
      <Pressable
        onPress={handleOpen}
        style={styles.secondarySmallButton}
        accessibilityRole="button"
        accessibilityLabel="Message the founder"
      >
        <Text style={styles.primarySmallButtonLabel}>Open</Text>
      </Pressable>
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
  },
  // Header language shared with Grow: a big Poppins title over a one-line sub.
  pageHeader: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  pageTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  pageSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },
  // In-page segmented control: My Soul (progress) vs Settings (config).
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.fill.faint,
    borderRadius: radius.control,
    padding: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    alignItems: 'center',
  },
  segmentOn: {
    backgroundColor: colors.fill.base,
  },
  segmentLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.2,
  },
  segmentLabelOn: {
    color: colors.textPrimary,
  },
  scrollBody: {
    paddingHorizontal: pageGutter,
    paddingTop: spacing.xs,
    // The tab bar floats over the content now; padding lets the last card
    // scroll fully out from under the glass with a breath of air above it.
    paddingBottom: 120,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  eyebrowTitle: {
    fontSize: fontScale.caption,
    fontFamily: fonts.semibold,
    letterSpacing: 0.4,
    color: colors.textPrimary,
  },
  eyebrowHint: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.light,
    color: colors.textOnDark.faint,
  },
  // Scoreboard — no card box; the level line sits under the page header.
  scoreboard: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  scoreTap: { alignSelf: 'flex-start' },
  scoreLevelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  scoreLevel: {
    fontSize: fontScale.title,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  scoreSub: {
    fontSize: fontScale.tagline,
    color: colors.textOnDark.faint,
    marginTop: spacing.xs,
    letterSpacing: 0.2,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radius.control,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    gap: 1,
    marginTop: spacing.lg,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  statNum: {
    fontSize: fontScale.title,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  statSuffix: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textOnDark.faint,
  },
  statLabel: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.medium,
    color: colors.textOnDark.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  // Effort × impact chart
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border.faint,
  },
  chipOn: {
    backgroundColor: 'rgba(255,255,255,0.065)',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipLabel: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textOnDark.tertiary,
  },
  chartCaption: {
    fontSize: fontScale.caption,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendBar: {
    width: 16,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.fill.strong,
  },
  legendLine: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: fontScale.tagline,
    color: colors.textOnDark.faint,
  },
  // Cycle shelf
  shelfRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xs,
  },
  disc: {
    alignItems: 'center',
    width: 62,
  },
  keptBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E7C878',
    borderWidth: 2,
    borderColor: '#14101c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keptCheck: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.bold,
    color: '#3a2c08',
  },
  discMonth: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  discPct: {
    fontSize: fontScale.tagline,
    color: colors.textOnDark.faint,
    fontVariant: ['tabular-nums'],
  },
  shelfFoot: {
    fontSize: fontScale.tagline,
    color: colors.textOnDark.tertiary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
  },
  // Actionable, blurred empty state
  ghostWrap: {
    position: 'relative',
    borderRadius: radius.control,
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'center',
  },
  ghostContent: {
    opacity: 0.35,
  },
  ghostScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16,13,23,0.55)',
  },
  ghostOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  ghostLine: {
    fontSize: fontScale.caption,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  ghostBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...secondaryButtonSurface,
  },
  ghostBtnLabel: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  reflectBtn: { alignSelf: 'center', marginTop: spacing.md },
  // Glass card: transparent container (the frost + tint + sheen come from the
  // <GlassCardBg /> dropped in as each card's first child, over the cosmic
  // background) with a bright edge and a brighter top border for the glass rim.
  card: {
    backgroundColor: 'transparent',
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: fontScale.bodyLg,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  // The drawings collection grid: three per row, square cells.
  drawGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  drawCell: { width: '30%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  drawImg: { width: '100%', height: '100%' },
  drawLocked: {
    width: '82%',
    height: '82%',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  cardCopy: {
    fontSize: fontScale.caption,
    fontFamily: fonts.light,
    color: colors.textOnDark.tertiary,
    lineHeight: 18,
  },
  // Emotions worked-through: her named feelings, then the constellations they
  // belong to, as wrapping lit pills. No badge art yet, so names carry it.
  emotionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  emotionStar: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C6CFE6',
  },
  emotionStarLit: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E7C878',
  },
  emotionChipLabel: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  emotionChipCount: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.medium,
    color: colors.textOnDark.faint,
    fontVariant: ['tabular-nums'],
  },
  emotionSub: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.medium,
    color: colors.textOnDark.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  // Check-in card
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  checkInCount: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  checkInCountLabel: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.light,
    color: colors.textOnDark.faint,
  },
  sparkline: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  sparkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkInButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...secondaryButtonSurface,
  },
  checkInButtonLabel: {
    fontSize: fontScale.caption,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  macSoulRow: {
    fontSize: fontScale.caption,
    fontFamily: fonts.light,
    color: colors.textOnDark.faint,
    marginBottom: spacing.md,
  },
  moodRibbon: {
    height: 16,
    borderRadius: radius.control,
  },
  moodRibbonEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  moodEndLabel: {
    fontSize: fontScale.tagline,
    fontFamily: fonts.light,
    color: colors.textOnDark.faint,
    letterSpacing: 0.3,
  },
  macPromoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.faint,
  },
  readLevel: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    letterSpacing: 0.3,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pmsStatus: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: spacing.lg,
  },
  pmsEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.faint,
  },
  pmsDateValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pmsDateText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  primarySmallButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySolid,
    marginTop: spacing.md,
  },
  // The demoted, secondary version of the small card button: same size, ghost
  // surface. Every in-card action uses this so the single solid primary (Know
  // your PMS level) stays the one emphasis on the tab.
  secondarySmallButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    ...secondaryButtonSurface,
  },
  primarySmallButtonLabel: {
    fontSize: fontScale.caption,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  replayIntro: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  replayIntroText: {
    fontSize: fontScale.caption,
    fontFamily: fonts.light,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: spacing.lg,
    fontSize: fontScale.tagline,
    fontFamily: fonts.light,
    color: colors.textOnDark.faint,
    lineHeight: 17,
    textAlign: 'center',
  },
  version: {
    marginTop: spacing.sm,
    fontSize: fontScale.tagline,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  crisisRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  crisisRowText: {
    fontSize: fontScale.caption,
    fontFamily: fonts.regular,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  crisisBackdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  crisisSheet: {
    backgroundColor: colors.backgroundBottom,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    paddingTop: spacing.xxl,
    paddingBottom: 40,
    paddingHorizontal: spacing.xl,
  },
  crisisTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  crisisBody: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  crisisLine: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
    marginBottom: spacing.sm,
  },
  crisisLineLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textPrimary,
  },
  crisisLineDetail: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  crisisEmergency: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 18,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  crisisClose: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxxl,
  },
  crisisCloseText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textSubtitle,
  },
});
