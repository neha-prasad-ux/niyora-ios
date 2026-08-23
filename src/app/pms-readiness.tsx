// The daily PMS Day checklist. Purely proactive prep, getting ahead of the
// day, not managing a spike (in-the-moment regulation lives in the "Steady
// yourself" flow now). Grouped by the jobs it does:
//
//   Relationship ("us"), a heads-up before, and topics for if you fight. Each
//     routes to an existing couples screen that scores itself.
//   Life Style (body), sleep enough, never run hungry, add these foods. Ticks
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
import { RelationshipCard } from '@/components/relationship-card';
import { LifeStyleCard } from '@/components/lifestyle-card';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { tileSurface } from '@/theme/controls';
import {
  getReadiness,
  setReadiness,
  READINESS_WHY,
  READINESS_CHECK_IDS,
  todayYmd,
  type ReadinessChecks,
  type ReadinessCheckId,
} from '@/store/pms-readiness';

const FRESH: ReadinessChecks = {
  calcium: false,
  micronutrient: false,
  steady: false,
  antiInflammatory: false,
  sleep: false,
  move: false,
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
          <Text style={styles.subhead}>A few kind things to get ahead of the day.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Your partner, the "us" jobs: a heads-up, plus fight topics. */}
          <SectionHeader title="Your partner" hint="Keep things good between you" />
          <RelationshipCard />

          {/* Your body, sleep and food basics. Ticks feed the ring. */}
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
  safe: { flex: 1, paddingHorizontal: pageGutter },
  topBar: { height: 32, justifyContent: 'center' },
  orbHeader: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.sm },
  header: {
    fontFamily: fonts.medium,
    fontSize: fontScale.technique,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subhead: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  scroll: { paddingBottom: spacing.xxxl },

  sectionHead: { marginTop: spacing.xxxl, marginBottom: spacing.md },
  sectionTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionHint: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 18,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },

  know: { marginTop: spacing.xxxl },
  knowHeader: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginBottom: spacing.md,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
  },
  whyCell: {
    width: '48%',
    minHeight: 84,
    justifyContent: 'flex-end',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    ...tileSurface,
  },
  whyName: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    lineHeight: 20,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  whyTeaser: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },
});
