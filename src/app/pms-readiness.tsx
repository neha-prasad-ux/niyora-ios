// The daily PMS-readiness page: a calm moon that eases as she acts, then the
// luteal "get ready" check list (calcium, micronutrients, steady eating,
// anti-inflammatory food, winding down early) plus a calming activity, and a
// "Know why" grid that opens the research per factor.
//
// Ported from the v2-pms branch and adapted to this branch: the period-logging
// sheet is dropped (cycle editing lives in My Soul, and it needs pms-prefs
// period-history that this branch does not carry). Everything else is faithful.

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { Checklist, type ChecklistItem } from '@/components/checklist';
import { Orb } from '@/components/orb';
import { WhySheet } from '@/components/why-sheet';
import { colors } from '@/theme/colors';
import {
  getReadiness,
  setReadiness,
  READINESS_CHECK_IDS,
  READINESS_CHECK_CONTENT,
  READINESS_WHY,
  readinessDoneCount,
  READINESS_STATE_WORDS,
  todayYmd,
  type ReadinessChecks,
  type ReadinessCheckId,
} from '@/store/pms-readiness';
import { getLastSession } from '@/store/session-history';

const FRESH: ReadinessChecks = {
  calcium: false,
  micronutrient: false,
  steady: false,
  antiInflammatory: false,
  woundDown: false,
};

const CHECK_ITEMS: readonly ChecklistItem[] = READINESS_CHECK_IDS.map((id) => ({
  id,
  label: READINESS_CHECK_CONTENT[id].title,
  examples: READINESS_CHECK_CONTENT[id].examples,
}));

function isToday(iso: string | undefined, today: string): boolean {
  return !!iso && iso.slice(0, 10) === today;
}

export default function PmsReadinessScreen() {
  const today = useMemo(() => todayYmd(), []);
  const [checks, setChecks] = useState<ReadinessChecks>(FRESH);
  const [calmDone, setCalmDone] = useState(false);
  const [whyFactor, setWhyFactor] = useState<ReadinessCheckId | null>(null);

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

  const doneCount = readinessDoneCount(checks, calmDone);
  const stateWord = READINESS_STATE_WORDS[Math.min(doneCount, READINESS_STATE_WORDS.length - 1)];

  // The orb pulses gently each time the count changes: the little "light into
  // the orb" beat as she acts.
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withSequence(
      withTiming(1.06, { duration: 220 }),
      withTiming(1, { duration: 420 }),
    );
  }, [doneCount, pulse]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    const key = id as ReadinessCheckId;
    const next = { ...checks, [key]: !checks[key] };
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

  const goBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const openWhy = (id: ReadinessCheckId) => {
    Haptics.selectionAsync();
    setWhyFactor(id);
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.orbHeader}>
          <Animated.View style={orbStyle}>
            <Orb size={128} still />
          </Animated.View>
          <Text style={styles.stateWord}>{stateWord}</Text>
          <Text style={styles.header}>Let&apos;s make you PMS ready</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Checklist items={CHECK_ITEMS} isChecked={(id) => checks[id as ReadinessCheckId]} onToggle={toggle} />

          {/* The calming activity: not a self-toggle. Reads as done from today's
              practice, offers Begin otherwise. */}
          <View style={styles.calmRow}>
            <View style={styles.calmText}>
              <Text style={styles.calmTitle}>A calming activity</Text>
              <Text style={styles.calmExamples}>breath, stretch</Text>
            </View>
            {calmDone ? (
              <View style={styles.calmCheck}>
                <SymbolView name="checkmark" tintColor="#3a2d52" size={14} weight="bold" />
              </View>
            ) : (
              <Pressable onPress={beginCalm} style={styles.beginPill} accessibilityRole="button" accessibilityLabel="Begin a calming activity">
                <Text style={styles.beginPillText}>Begin</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable onPress={doneForToday} hitSlop={10} accessibilityRole="button" accessibilityLabel="Done for today">
              <Text style={styles.doneText}>Done for today</Text>
            </Pressable>
          </View>

          {/* Know why: compact cards in a 2-up grid. Tapping one opens a
              half-page sheet with the full reason and the research. */}
          <View style={styles.know}>
            <Text style={styles.knowHeader}>Know why</Text>
            <View style={styles.whyGrid}>
              {READINESS_CHECK_IDS.map((id) => {
                const w = READINESS_WHY[id];
                return (
                  <Pressable
                    key={id}
                    onPress={() => openWhy(id)}
                    style={styles.whyCell}
                    accessibilityRole="button"
                    accessibilityLabel={`Know why: ${w.name}`}
                  >
                    <Text style={styles.whyName} numberOfLines={2}>{w.name}</Text>
                    <Text style={styles.whyTeaser} numberOfLines={1}>{w.teaser}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <WhySheet factor={whyFactor} onClose={() => setWhyFactor(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  orbHeader: { alignItems: 'center', paddingTop: 6, paddingBottom: 18 },
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
  scroll: { paddingBottom: 28 },
  calmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  calmText: { flex: 1 },
  calmTitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  calmExamples: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  calmCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
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
  actions: { alignItems: 'center', marginTop: 18, gap: 16 },
  doneText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  know: { marginTop: 36 },
  knowHeader: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  whyCell: {
    width: '48%',
    minHeight: 84,
    justifyContent: 'flex-end',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  whyName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  whyTeaser: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
