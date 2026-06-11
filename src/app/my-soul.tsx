// My Soul sheet. Ported from the Mac Settings.tsx "My Soul" panel at the
// level of fidelity DESIGN.md asks for.

import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { CheckInSheet } from '@/components/CheckInSheet';
import { SHOW_CHECKIN, SHOW_ANALYTICS, SHOW_MOOD_TREND } from '@/config/features';
import { Orb } from '@/components/orb';
import { TIERS, currentTier, nextTier, sessionsToNext } from '@/models/tiers';
import { getSessionCount, getSessionsThisWeek, getSessionsToday, getStreakInfo } from '@/store/session-history';
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
  ensureNotificationPermission,
  isPermissionBlocked,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '@/lib/notifications';
import { Host, DatePicker } from '@expo/ui/swift-ui';
import { useNiyoraSync, type MacSoulState } from '@/hooks/use-niyora-sync';
import { MacPairing } from '@/components/MacPairing';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { MAC_SOUL_HUES, MAC_SOUL_DISPLAY, freshSoul } from '@/lib/mac-soul';

function effectiveSoul(
  isPaired: boolean,
  macSoulState: MacSoulState | null,
): MacSoulState | null {
  return isPaired ? freshSoul(macSoulState) : null;
}

// Maps tier id to the number of Saturn-style rings around the orb.
// Matches Mac tierRingCount(): spark=0, glow=1, shine=2, radiance=3, brilliance=4.
const TIER_RING_COUNTS: Record<string, number> = {
  spark: 0, glow: 1, shine: 2, radiance: 3, brilliance: 4,
};

const LEVEL_LABELS: Record<CheckInLevel, string> = {
  light: 'Light',
  okay: 'Okay',
  heavy: 'Heavy',
};

export default function MySoulScreen() {
  const [analyticsOn, setAnalyticsOn] = useState(true);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [availableFreezes, setAvailableFreezes] = useState(0);
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [moodRecords, setMoodRecords] = useState<MoodRecord[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [macPromoDismissed, setMacPromoDismissedState] = useState(true);
  const [reminder, setReminderState] = useState<ReminderPrefs>(DEFAULT_REMINDER);
  const [orbRevealKey, setOrbRevealKey] = useState(0);
  const {
    isPaired,
    macSoulState,
    macStatus,
    syncState,
    discoveredServers,
    connectToMac,
    cancelPairing,
  } = useNiyoraSync();

  const orbTapScale = useSharedValue(1);
  const orbTapAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbTapScale.value }],
  }));

  function handleOrbTap() {
    Haptics.selectionAsync();
    orbTapScale.value = withSequence(
      withTiming(0.91, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1.12, { duration: 220, easing: Easing.out(Easing.sin) }),
      withTiming(1.0, { duration: 380, easing: Easing.inOut(Easing.sin) })
    );
    setOrbRevealKey((k) => k + 1);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessionCount().then((n) => {
        if (active) setSessionsCompleted(n);
      }).catch(() => {});
      getSessionsThisWeek().then((n) => {
        if (active) setSessionsThisWeek(n);
      }).catch(() => {});
      getSessionsToday().then((n) => {
        if (active) setSessionsToday(n);
      }).catch(() => {});
      getStreakInfo().then(({ streak, availableFreezes: af }) => {
        if (active) {
          setCurrentStreak(streak);
          setAvailableFreezes(af);
        }
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
  }

  async function handleReminderTimeChange(hour: number, minute: number) {
    const next = { ...reminder, hour, minute };
    setReminderState(next);
    await setReminder(next).catch(() => {});
    if (next.enabled) {
      await scheduleDailyReminder(hour, minute).catch(() => {});
    }
  }

  // Unified soul: when paired, add the Mac's own (native) completed sessions
  // to the phone's. The Mac reports a native-only count, so this sum never
  // double-counts sessions the phone already pushed there. Tier + track
  // reflect the combined total; the breakdown shows each device's share.
  const macSessions = isPaired ? macStatus?.nativeCompleted ?? 0 : 0;
  const combinedSessions = sessionsCompleted + macSessions;

  const tier = currentTier(combinedSessions);
  const next = nextTier(tier);
  const toNext = sessionsToNext(combinedSessions);
  const accent = `hsl(${tier.hue}, 70%, 75%)`;
  const todayRecord = SHOW_CHECKIN ? todayCheckIn(checkInRecords) : null;
  const macSoul = effectiveSoul(isPaired, macSoulState);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              router.back();
            }}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Close My Soul"
          >
            <View style={styles.closeButton}>
              <SymbolView
                name="xmark"
                tintColor={colors.iconChrome}
                size={14}
                weight="medium"
              />
            </View>
          </Pressable>
          <Text style={styles.title}>My Soul</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={handleOrbTap}
            style={[styles.orbWrap, !todayRecord && { marginBottom: 20 }]}
            accessibilityRole="button"
            accessibilityLabel="Soul orb, tap to replay"
          >
            <Animated.View
              style={orbTapAnimStyle}
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            >
              <Orb
                size={110}
                tierRingCount={TIER_RING_COUNTS[tier.id] ?? 0}
                tierHue={tier.hue}
                revealKey={orbRevealKey}
              />
            </Animated.View>
          </Pressable>
          {todayRecord && (
            <Text style={styles.todayLabel}>
              Today:{' '}
              <Text style={{ color: colors.textPrimary }}>
                {LEVEL_LABELS[todayRecord.level]}
              </Text>
            </Text>
          )}
          {!todayRecord && macSoul && (
            <Text style={styles.todayLabel}>
              Mac:{' '}
              <Text style={{ color: `hsl(${MAC_SOUL_HUES[macSoul.label] ?? 260}, 60%, 70%)` }}>
                {MAC_SOUL_DISPLAY[macSoul.label] ?? macSoul.label}
              </Text>
            </Text>
          )}

          <LevelCard
            tierName={tier.name}
            nextName={next?.name ?? null}
            nextThreshold={next?.threshold ?? null}
            toNext={toNext}
            accent={accent}
            sessions={combinedSessions}
            sessionsThisWeek={sessionsThisWeek}
            sessionsToday={sessionsToday}
            currentStreak={currentStreak}
            availableFreezes={availableFreezes}
            paired={isPaired}
            phoneSessions={sessionsCompleted}
            macSessions={macSessions}
          />

          {currentStreak === 0 && sessionsCompleted > 0 && (
            <ComebackCard onPress={() => { Haptics.selectionAsync(); router.back(); }} />
          )}

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

          {SHOW_CHECKIN && (
            <CheckInCard
              records={checkInRecords}
              macSoul={macSoul}
              onCheckIn={() => setShowCheckIn(true)}
            />
          )}

          {SHOW_MOOD_TREND && <MoodTrendCard records={moodRecords} />}

          <ReminderCard
            reminder={reminder}
            onToggle={handleReminderToggle}
            onTimeChange={handleReminderTimeChange}
          />

          {SHOW_ANALYTICS && (
            <ToggleCard
              title="Anonymous analytics"
              description="Helps shape what to improve next. Stress scores, breath patterns, and anything that identifies you stay on your iPhone."
              value={analyticsOn}
              onChange={setAnalyticsOn}
            />
          )}

          <MessageCard accent={accent} />

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              resetOnboarding().finally(() => router.replace('/onboarding'));
            }}
            hitSlop={12}
            style={styles.replayIntro}
            accessibilityRole="button"
            accessibilityLabel="Watch the intro again"
          >
            <Text style={styles.replayIntroText}>Watch the intro again</Text>
          </Pressable>

          <Text style={styles.footer}>
            Niyora runs entirely on your iPhone. No accounts, no profiles.
            Breathe easy.
          </Text>
          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '—'}</Text>
        </ScrollView>
      </SafeAreaView>

      {SHOW_CHECKIN && showCheckIn && (
        <CheckInSheet onDone={handleCheckInDone} />
      )}
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
function MoodTrendCard({ records }: { records: MoodRecord[] }) {
  const recent = records.slice(-10);
  if (recent.length < 2) return null;
  const stops = recent.map((r) => `hsl(${MOOD_DOT_HUES[r.mood - 1]}, 62%, 60%)`);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Calm after practice</Text>
      <Text style={[styles.cardCopy, { marginTop: 6, marginBottom: 14 }]}>
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

function LevelCard({
  tierName,
  nextName,
  nextThreshold,
  toNext,
  accent,
  sessions,
  sessionsThisWeek,
  sessionsToday,
  currentStreak,
  availableFreezes,
  paired,
  phoneSessions,
  macSessions,
}: {
  tierName: string;
  nextName: string | null;
  nextThreshold: number | null;
  toNext: number;
  accent: string;
  sessions: number;
  sessionsThisWeek: number;
  sessionsToday: number;
  currentStreak: number;
  availableFreezes: number;
  paired: boolean;
  phoneSessions: number;
  macSessions: number;
}) {
  return (
    <View style={[styles.card, { borderColor: accent + '33' }]}>
      <View style={styles.levelHeader}>
        <Text style={[styles.levelName, { color: accent }]}>Level {tierName}</Text>
        {nextName && (
          <Text style={styles.levelSub}>
            {toNext} to {nextName}
          </Text>
        )}
      </View>
      <View style={styles.sessionsRow}>
        <Text style={styles.sessionsNum}>{sessions}</Text>
        <Text style={styles.sessionsLabel}>sessions</Text>
      </View>
      <TierTrack sessions={sessions} accent={accent} nextThreshold={nextThreshold} />
      <View style={styles.miniStatsRow}>
        <Text style={styles.miniStat}>{sessionsToday} today</Text>
        <Text style={styles.miniStat}>{sessionsThisWeek} this week</Text>
        <Text style={styles.miniStat}>
          {currentStreak} {currentStreak === 1 ? 'day' : 'days'} streak
        </Text>
      </View>
      {availableFreezes > 0 && (
        <Text style={styles.freezeBadge}>
          {availableFreezes} {availableFreezes === 1 ? 'freeze' : 'freezes'} saved
        </Text>
      )}
      {paired && (
        <View style={styles.breakdownRow}>
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownNum}>{phoneSessions}</Text>
            <Text style={styles.breakdownLabel}>This iPhone</Text>
          </View>
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownNum}>{macSessions}</Text>
            <Text style={styles.breakdownLabel}>Your Mac</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function TierTrack({
  sessions,
  accent,
  nextThreshold,
}: {
  sessions: number;
  accent: string;
  nextThreshold: number | null;
}) {
  // Skip the spark marker (always reached) per Mac convention.
  const markers = TIERS.filter((t) => t.id !== 'spark');
  const cap = markers[markers.length - 1].threshold;
  const fillPct = Math.min(100, (sessions / cap) * 100);

  return (
    <View style={styles.trackWrap} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
      <View style={styles.trackBase} />
      <View
        style={[
          styles.trackFill,
          { width: `${fillPct}%`, backgroundColor: accent },
        ]}
      />
      <View style={styles.markers}>
        {markers.map((m) => {
          const reached = sessions >= m.threshold;
          const isNext =
            nextThreshold !== null && m.threshold === nextThreshold;
          const pos = (m.threshold / cap) * 100;
          return (
            <View
              key={m.id}
              style={[
                styles.marker,
                {
                  left: `${pos}%`,
                  borderColor:
                    isNext || reached ? accent : 'rgba(255,255,255,0.25)',
                  borderWidth: isNext ? 2.5 : 1.5,
                  backgroundColor: '#13101a',
                  ...(isNext && {
                    shadowColor: accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.75,
                    shadowRadius: 5,
                  }),
                },
              ]}
            >
              <Text
                style={[
                  styles.markerNum,
                  {
                    color:
                      isNext || reached ? accent : 'rgba(255,255,255,0.4)',
                    fontWeight: isNext ? '600' : '500',
                  },
                ]}
                maxFontSizeMultiplier={1.0}
              >
                {m.threshold}
              </Text>
            </View>
          );
        })}
      </View>
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
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.cardTitle}>Daily reminder</Text>
          <Text style={[styles.cardCopy, { marginTop: 6 }]}>
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
          trackColor={{ false: '#2a2433', true: 'hsl(270, 50%, 45%)' }}
          thumbColor="#fff"
        />
      </View>
      {reminder.enabled && (
        <View style={styles.reminderTimeRow}>
          <Text style={styles.cardCopy}>Remind me at</Text>
          <Host matchContents style={styles.reminderPicker}>
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
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardCopy, { marginTop: 6 }]}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => {
            Haptics.selectionAsync();
            onChange(v);
          }}
          accessibilityLabel={title}
          trackColor={{ false: '#2a2433', true: 'hsl(270, 50%, 45%)' }}
          thumbColor="#fff"
        />
      </View>
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
      <View style={styles.macPromoHeader}>
        <Text style={[styles.cardTitle, { flex: 1, paddingRight: 8 }]}>
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
      <Text style={[styles.cardCopy, { marginTop: 6 }]}>
        Pair with your Mac to share session data and reflect across devices.
      </Text>
      <Pressable
        onPress={handleLearnMore}
        style={styles.primarySmallButton}
        accessibilityRole="link"
        accessibilityLabel="Get Niyora for Mac"
      >
        <Text style={styles.primarySmallButtonLabel}>Get Niyora for Mac</Text>
      </Pressable>
    </View>
  );
}

function ComebackCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.cardTitle, { textAlign: 'center', marginBottom: 14 }]}>
        Take a breath.
      </Text>
      <Pressable
        onPress={onPress}
        style={styles.checkInButton}
        accessibilityRole="button"
        accessibilityLabel="Begin again"
      >
        <Text style={styles.checkInButtonLabel}>Begin again</Text>
      </Pressable>
    </View>
  );
}

function MessageCard({ accent: _accent }: { accent: string }) {
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
      <Text style={styles.cardTitle}>Message the founder</Text>
      <Text style={[styles.cardCopy, { marginTop: 6 }]}>
        Tell Neha what's working, what isn't, what you'd love next.
      </Text>
      <Pressable
        onPress={handleOpen}
        style={[styles.primarySmallButton]}
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
    backgroundColor: '#000',
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  orbWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  todayLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '300',
    marginTop: 2,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.card,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Unified-soul breakdown: this iPhone vs your Mac, shown when paired.
  breakdownRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  breakdownBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  breakdownNum: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  cardCopy: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 18,
  },
  // Check-in card
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  checkInCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  checkInCountLabel: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.45)',
  },
  sparkline: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    alignItems: 'center',
  },
  sparkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkInButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  checkInButtonLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  macSoulRow: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: 14,
  },
  // Level card
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  levelName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  levelSub: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.55)',
    flexShrink: 1,
  },
  sessionsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 14,
    marginBottom: 18,
  },
  sessionsNum: {
    fontSize: 36,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 8,
  },
  sessionsLabel: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  trackWrap: {
    position: 'relative',
    height: 28,
    marginTop: 6,
    marginHorizontal: 14,
  },
  trackBase: {
    position: 'absolute',
    top: 11,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
  },
  trackFill: {
    position: 'absolute',
    top: 11,
    left: 0,
    height: 2,
    borderRadius: 1,
  },
  markers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
  },
  markerNum: {
    fontSize: 10,
    fontWeight: '500',
  },
  miniStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  miniStat: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  freezeBadge: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.35)',
    marginTop: 6,
  },
  moodRibbon: {
    height: 16,
    borderRadius: 8,
  },
  moodRibbonEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  moodEndLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.35)',
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
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  // The native compact time picker's Host claims more vertical height than the
  // visible pill and top-aligns it, so it rides up against the row's top
  // border. Pin the Host to the pill's natural height and center its content so
  // the row's alignItems:center lines it up with the "Remind me at" label.
  reminderPicker: {
    height: 36,
    justifyContent: 'center',
  },
  primarySmallButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'hsl(270, 50%, 45%)',
    marginTop: 12,
  },
  primarySmallButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  replayIntro: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 8,
  },
  replayIntroText: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  footer: {
    marginTop: 18,
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 17,
    textAlign: 'center',
  },
  version: {
    marginTop: 8,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
});
