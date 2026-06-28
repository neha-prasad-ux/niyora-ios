// The luteal "get ready" page. A big rose orb that softens toward a warm calm
// glow as she acts (the only feedback, no percentage, no streaks). Six plainly
// named cards ordered easiest to hardest: five self-check toggles plus a
// calming activity that reads as done from today's practice. Runs daily through
// the window and resets each morning. Two quiet actions at the foot: "Done for
// today" and "My period's here" (rolls the window forward).
//
// Layout note: the locked design places the orb on the left, sticky; on a phone
// it sits as a sticky header above the scrolling cards instead.

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { MoonCard } from '@/components/moon-card';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import {
  getReadiness,
  setReadiness,
  READINESS_CHECK_IDS,
  READINESS_CHECK_CONTENT,
  todayYmd,
  type ReadinessChecks,
  type ReadinessCheckId,
} from '@/store/pms-readiness';
import { getPmsPrefs, setPmsPrefs } from '@/store/pms-prefs';
import { getLastSession } from '@/store/session-history';

const CARD_TINT: Record<ReadinessCheckId | 'calm', string> = {
  calcium: 'rgba(184, 92, 138, 0.3)',
  micronutrient: 'rgba(184, 92, 138, 0.3)',
  steady: 'rgba(184, 92, 138, 0.3)',
  antiInflammatory: 'rgba(184, 92, 138, 0.3)',
  woundDown: 'rgba(58, 94, 176, 0.32)',
  calm: 'rgba(124, 74, 176, 0.32)',
};

// 0..6 done -> a word under the orb. No numbers, ever.
const STATE_WORDS = ['tender', 'easing', 'softening', 'softening', 'steadier', 'steadier', 'calm'];

const FRESH: ReadinessChecks = {
  calcium: false,
  micronutrient: false,
  steady: false,
  antiInflammatory: false,
  woundDown: false,
};

function isToday(iso: string | undefined, today: string): boolean {
  return !!iso && iso.slice(0, 10) === today;
}

export default function PmsReadinessScreen() {
  const today = useMemo(() => todayYmd(), []);
  const [checks, setChecks] = useState<ReadinessChecks>(FRESH);
  const [calmDone, setCalmDone] = useState(false);

  // Reload on focus so returning from a calming session updates the calm card,
  // and a new day resets the checks.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getReadiness(today)
        .then((r) => alive && setChecks(r.checks))
        .catch(() => {});
      getLastSession()
        .then((s) => alive && setCalmDone(isToday(s?.completedAt, today)))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [today]),
  );

  const doneCount = READINESS_CHECK_IDS.filter((id) => checks[id]).length + (calmDone ? 1 : 0);
  // The orb opens rose and warms toward a calm glow as she acts; never white.
  const orbHue = 350 - (doneCount / 6) * 52; // 350 rose -> ~298 warm calm
  const stateWord = STATE_WORDS[Math.min(doneCount, 6)];

  const toggle = (id: ReadinessCheckId) => {
    Haptics.selectionAsync();
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setReadiness({ date: today, checks: next, doneForToday: false }).catch(() => {});
  };

  const beginCalm = () => {
    Haptics.selectionAsync();
    router.push({ pathname: '/session', params: { id: 'quick-calm' } });
  };

  const doneForToday = () => {
    Haptics.selectionAsync();
    setReadiness({ date: today, checks, doneForToday: true })
      .catch(() => {})
      .finally(() => router.back());
  };

  const periodHere = () => {
    Haptics.selectionAsync();
    Alert.alert('Has your period started?', 'Rest easy. We will ease off until your next window.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, it has',
        onPress: async () => {
          try {
            const p = await getPmsPrefs();
            await setPmsPrefs({ ...p, lastPeriodStart: today });
          } catch {
            // Storage can throw; never trap the user.
          }
          router.back();
        },
      },
    ]);
  };

  const goBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient luteal />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.orbHeader}>
          <Orb size={132} hue={orbHue} still />
          <Text style={styles.stateWord}>{stateWord}</Text>
          <Text style={styles.header}>Let&apos;s make you PMS ready</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {READINESS_CHECK_IDS.map((id) => {
            const c = READINESS_CHECK_CONTENT[id];
            const on = checks[id];
            return (
              <MoonCard key={id} color={CARD_TINT[id]} style={styles.card}>
                <Pressable
                  onPress={() => toggle(id)}
                  style={styles.cardRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${c.title}. ${c.examples}`}
                >
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <Text style={styles.cardExamples}>{c.examples}</Text>
                  </View>
                  <View style={[styles.check, on && styles.checkOn]}>
                    {on && <SymbolView name="checkmark" tintColor="#ffffff" size={14} weight="bold" />}
                  </View>
                </Pressable>
              </MoonCard>
            );
          })}

          {/* The calming activity: not a self-toggle. It reads as done from
              today's practice, and offers Begin when not yet done. */}
          <MoonCard color={CARD_TINT.calm} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>A calming activity</Text>
                <Text style={styles.cardExamples}>breath, stretch</Text>
              </View>
              {calmDone ? (
                <View style={[styles.check, styles.checkOn]}>
                  <SymbolView name="checkmark" tintColor="#ffffff" size={14} weight="bold" />
                </View>
              ) : (
                <Pressable
                  onPress={beginCalm}
                  style={styles.beginPill}
                  accessibilityRole="button"
                  accessibilityLabel="Begin a calming activity"
                >
                  <Text style={styles.beginPillText}>Begin</Text>
                </Pressable>
              )}
            </View>
          </MoonCard>

          <View style={styles.actions}>
            <Pressable
              onPress={doneForToday}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Done for today"
            >
              <Text style={styles.doneText}>Done for today</Text>
            </Pressable>
            <Pressable
              onPress={periodHere}
              hitSlop={10}
              style={styles.periodLink}
              accessibilityRole="button"
              accessibilityLabel="My period is here"
            >
              <Text style={styles.periodText}>My period&apos;s here</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  topBar: {
    height: 32,
    justifyContent: 'center',
  },
  orbHeader: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 18,
  },
  stateWord: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
    marginTop: 14,
  },
  header: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
  },
  scroll: {
    paddingBottom: 28,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  cardExamples: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  beginPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#ffffff',
  },
  beginPillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#7C40B0',
    letterSpacing: 0.2,
  },
  actions: {
    alignItems: 'center',
    marginTop: 14,
    gap: 16,
  },
  doneText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  periodLink: {
    paddingVertical: 2,
  },
  periodText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
});
