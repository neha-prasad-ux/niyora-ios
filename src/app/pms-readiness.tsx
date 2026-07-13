// The daily PMS Day checklist, grouped by the jobs it does:
//
//   Emotional regulation ("me") — name the wave, get a reframe for that feeling,
//     breathe if it is big. Naming records a `notice` light event.
//   Relationship ("us") — a heads-up before, and topics for if you fight. Each
//     routes to an existing couples screen that scores itself.
//   Life Style (body) — sleep enough, never run hungry, add these foods. Ticks
//     live in the readiness store and feed the daily ring.
//
// Below the sections, a "Know why" grid opens the research per factor.

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { BackgroundGradient } from '@/components/background-gradient';
import { WhySheet } from '@/components/why-sheet';
import { EmotionCard } from '@/components/emotion-card';
import { RelationshipCard } from '@/components/relationship-card';
import { LifeStyleCard } from '@/components/lifestyle-card';
import { colors } from '@/theme/colors';
import {
  getReadiness,
  setReadiness,
  READINESS_WHY,
  READINESS_CHECK_IDS,
  todayYmd,
  type ReadinessChecks,
  type ReadinessCheckId,
} from '@/store/pms-readiness';
import { recordLight } from '@/store/light-ledger';
import { EMOTION_NAMED_REF_ID } from '@/models/emotion-regulation';

const FRESH: ReadinessChecks = {
  calcium: false,
  micronutrient: false,
  steady: false,
  antiInflammatory: false,
  woundDown: false,
};

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionHint}>{hint}</Text>
    </View>
  );
}

export default function PmsReadinessScreen() {
  const today = useMemo(() => todayYmd(), []);
  const [checks, setChecks] = useState<ReadinessChecks>(FRESH);
  const [whyFactor, setWhyFactor] = useState<ReadinessCheckId | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getReadiness(today)
        .then((r) => alive && setChecks(r.checks))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [today]),
  );

  const toggle = (id: ReadinessCheckId) => {
    Haptics.selectionAsync().catch(() => {});
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    setReadiness({ date: today, checks: next, doneForToday: false }).catch(() => {});
  };

  // Naming a feeling is a recognition (moon-reward: notice). Best-effort.
  const onNamed = () => {
    recordLight('notice', { refId: EMOTION_NAMED_REF_ID }).catch(() => {});
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  const openWhy = (id: ReadinessCheckId) => {
    Haptics.selectionAsync().catch(() => {});
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
          <Text style={styles.header}>PMS Day checklist</Text>
          <Text style={styles.subhead}>Science-backed ways to get through the week.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Your emotions — the "me" job: name it, reframe it, breathe. */}
          <SectionHeader title="Your emotions" hint="Observe it, reframe or step away, breathe" />
          <EmotionCard onNamed={onNamed} />

          {/* Your partner — the "us" jobs: a heads-up, plus fight topics. */}
          <SectionHeader title="Your partner" hint="Keep things good between you" />
          <RelationshipCard />

          {/* Your body — sleep and food basics. Ticks feed the ring. */}
          <SectionHeader title="Your body" hint="The basics that make it easier" />
          <LifeStyleCard checks={checks} onToggle={toggle} />

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
  orbHeader: { alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
  header: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  scroll: { paddingBottom: 28 },

  sectionHead: { marginTop: 28, marginBottom: 12 },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionHint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
    marginTop: 2,
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
