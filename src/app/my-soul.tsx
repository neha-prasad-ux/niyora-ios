// My Soul sheet. Ported from the Mac Settings.tsx "My Soul" panel at the
// level of fidelity DESIGN.md asks for.

import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
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

import { BackgroundGradient } from '@/components/background-gradient';
import { CheckInSheet } from '@/components/CheckInSheet';
import { Orb } from '@/components/orb';
import { TIERS, currentTier, nextTier, sessionsToNext } from '@/models/tiers';
import { getSessionCount } from '@/store/session-history';
import {
  getCheckInRecords,
  todayCheckIn,
  type CheckInLevel,
  type CheckInRecord,
} from '@/store/checkin-history';
import { colors } from '@/theme/colors';

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
  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSessionCount().then((n) => {
        if (active) setSessionsCompleted(n);
      }).catch(() => {});
      getCheckInRecords().then((r) => {
        if (active) setCheckInRecords(r);
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

  const tier = currentTier(sessionsCompleted);
  const next = nextTier(tier);
  const toNext = sessionsToNext(sessionsCompleted);
  const accent = `hsl(${tier.hue}, 70%, 75%)`;
  const todayRecord = todayCheckIn(checkInRecords);

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
            <SymbolView
              name="xmark"
              tintColor={colors.iconChrome}
              size={20}
              weight="regular"
            />
          </Pressable>
          <Text style={styles.title}>My Soul</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.orbWrap, !todayRecord && { marginBottom: 20 }]} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
            <Orb
              size={110}
              tierRingCount={TIER_RING_COUNTS[tier.id] ?? 0}
              tierHue={tier.hue}
            />
          </View>
          {todayRecord && (
            <Text style={styles.todayLabel}>
              Today:{' '}
              <Text style={{ color: colors.textPrimary }}>
                {LEVEL_LABELS[todayRecord.level]}
              </Text>
            </Text>
          )}

          <LevelCard
            tierName={tier.name}
            nextName={next?.name ?? null}
            nextThreshold={next?.threshold ?? null}
            toNext={toNext}
            accent={accent}
            sessions={sessionsCompleted}
          />

          <CheckInCard
            records={checkInRecords}
            onCheckIn={() => setShowCheckIn(true)}
          />

          <ToggleCard
            title="Anonymous analytics"
            description="Helps shape what to improve next. Stress scores, breath patterns, and anything that identifies you stay on your iPhone."
            value={analyticsOn}
            onChange={setAnalyticsOn}
          />

          <MessageCard accent={accent} />

          <Text style={styles.footer}>
            Niyora runs entirely on your iPhone. No accounts, no profiles.
            Analytics are anonymous, optional, and only sent if you choose.
            Breathe easy.
          </Text>
          <Text style={styles.version}>Version 0.1.0</Text>
        </ScrollView>
      </SafeAreaView>

      {showCheckIn && (
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

// ---- Card components ----

function CheckInCard({
  records,
  onCheckIn,
}: {
  records: CheckInRecord[];
  onCheckIn: () => void;
}) {
  const todayRecord = todayCheckIn(records);
  const count = records.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopEdge} />
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
}: {
  tierName: string;
  nextName: string | null;
  nextThreshold: number | null;
  toNext: number;
  accent: string;
  sessions: number;
}) {
  return (
    <View style={[styles.card, { borderColor: accent + '33' }]}>
      <View style={styles.cardTopEdge} />
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
      <View style={styles.cardTopEdge} />
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
      <View style={styles.cardTopEdge} />
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
    paddingTop: 16,
    paddingBottom: 12,
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
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  // Thin inner highlight along the top edge -- mirrors the Mac card top-gradient.
  cardTopEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
