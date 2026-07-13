// Grow: the library. Every program and tool lives here as a shelf — training,
// the calm toolkit, the couples section — so the Now tab can stay a single
// coached action. Future verticals (CBT, workplace, family) land as new
// shelves on this page, never as new home cards.

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { Orb } from '@/components/orb';
import { RecommendSheet } from '@/components/RecommendSheet';
import { type RecResult } from '@/models/recommend';
import { SOUL_RING_HUES } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { trainSummary, workSummary, type TrainSummary } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';

export default function GrowScreen() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTraining().then((t) => {
        if (alive) setTraining(t);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const openTrain = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/train');
  };
  const openWorkplace = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/train?track=workplace');
  };
  const openCouples = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/couples');
  };
  const openPmsChecklist = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/pms-readiness');
  };
  const openPeriodsCare = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/periods-care' as Href);
  };

  // The calm shelf opens the coached entry (the same feeling-first sheet as
  // everywhere else), which recommends a technique from how she feels.
  const [recommendVisible, setRecommendVisible] = useState(false);
  const openCalm = () => {
    Haptics.selectionAsync().catch(() => {});
    setRecommendVisible(true);
  };
  const onRecommendPick = (result: RecResult) => {
    setRecommendVisible(false);
    router.push({
      pathname: '/result',
      params: { feelings: result.feelingIds.join(','), needs: result.needIds.join(',') },
    });
  };

  // The two trainable shelves carry progress, so they reorder: the one she can
  // continue floats to the top, anything finished sinks below. The calm and
  // couples tools have no "done" state, so they hold their place underneath.
  const trainCards = useMemo(() => {
    const cards = [
      {
        key: 'train',
        title: 'Master emotional regulation',
        sub: 'Practice staying steady when emotions spike.',
        gradient: TRAIN_GRADIENT,
        tagColor: 'rgba(150, 110, 205, 0.95)',
        summary: trainSummary(training),
        onOpen: openTrain,
      },
      {
        key: 'work',
        title: 'Build confidence at work',
        sub: 'Speak up and stay calm under pressure.',
        gradient: WORKPLACE_GRADIENT,
        tagColor: 'rgba(70, 165, 155, 0.95)',
        summary: workSummary(training),
        onOpen: openWorkplace,
      },
    ];
    return cards.sort((a, b) => stateRank(a.summary.statusWord) - stateRank(b.summary.statusWord));
  }, [training]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Grow</Text>
            <Text style={styles.pageSub}>Programs to train through PMS, and tools for the hard moments.</Text>
          </View>

          {trainCards.map((c) => (
            <Shelf
              key={c.key}
              title={c.title}
              sub={c.sub}
              gradient={c.gradient}
              tag={c.summary.statusWord === 'Continue' ? 'Continue' : undefined}
              tagColor={c.tagColor}
              backdrop={<SoulBackdrop />}
              onOpen={c.onOpen}
            />
          ))}

          {/* The two cycle-care checklists: prep for the PMS week, then soothe
              the period itself. */}
          <Shelf
            title="PMS day checklist"
            sub="Science-backed ways to get through the week."
            gradient={PMS_GRADIENT}
            onOpen={openPmsChecklist}
          />

          <Shelf
            title="Care through your period"
            sub="Soothing things for the heavy days."
            gradient={PERIOD_GRADIENT}
            onOpen={openPeriodsCare}
          />

          <Shelf
            title="Find calm now"
            sub="Breathing and mindfulness for right now."
            gradient={CALM_GRADIENT}
            onOpen={openCalm}
          />

          <Shelf
            title="Prep your relationship for PMS"
            sub="Face the hard days as a team."
            gradient={COUPLES_GRADIENT}
            backdrop={<CouplesBackdrop />}
            onOpen={openCouples}
          />
          <View style={{ height: 12 }} />
        </ScrollView>
      </SafeAreaView>

      <RecommendSheet
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        onPick={onRecommendPick}
      />
    </View>
  );
}

// Continue first, then a fresh start, then anything already finished.
function stateRank(word: TrainSummary['statusWord']): number {
  return word === 'Continue' ? 0 : word === 'Start' ? 1 : 2;
}

// --- The shelf --------------------------------------------------------------
// One card language for every shelf: a two-stop gradient field, an optional
// backdrop texture, a SemiBold title, a one-line blurb, and a whole-card tap
// with a chevron. A tag floats above only when there is something to resume.

function Shelf({
  title,
  sub,
  gradient,
  backdrop,
  tag,
  tagColor,
  onOpen,
}: {
  title: string;
  sub: string;
  gradient: readonly [string, string, string];
  backdrop?: ReactNode;
  tag?: string;
  tagColor?: string;
  onOpen: () => void;
}) {
  return (
    <View style={styles.shelfWrap}>
      {tag != null && (
        <View style={[styles.tag, tagColor != null && { backgroundColor: tagColor }]}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      )}
      <Pressable
        style={styles.card}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${sub}${tag != null ? `. ${tag}` : ''}.`}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {backdrop}
        <View style={styles.cardRow}>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardSub}>{sub}</Text>
          </View>
          <SymbolView
            name="chevron.right"
            tintColor="rgba(255, 255, 255, 0.6)"
            size={15}
            weight="regular"
            style={styles.cardChevron}
          />
        </View>
      </Pressable>
    </View>
  );
}

function SoulBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.patTopRight}>
        <Orb size={82} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
      </View>
      <View style={styles.patBotLeft}>
        <Orb size={60} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
      </View>
    </View>
  );
}

function CouplesBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <SymbolView
        name="heart.fill"
        tintColor="rgba(255, 255, 255, 0.14)"
        size={120}
        weight="regular"
        style={styles.couplesHeartBig}
      />
      <SymbolView
        name="heart.fill"
        tintColor="rgba(255, 255, 255, 0.1)"
        size={62}
        weight="regular"
        style={styles.couplesHeartSmall}
      />
    </View>
  );
}

// --- Shelf gradients --------------------------------------------------------
// Each shelf keeps its own colour field so they read as a set but never blur:
// Train violet, Work teal-green, Calm blue, Couples rose.
const TRAIN_GRADIENT: readonly [string, string, string] = [
  'hsl(258, 44%, 28%)',
  'hsl(276, 42%, 30%)',
  'hsl(292, 40%, 31%)',
];
const WORKPLACE_GRADIENT: readonly [string, string, string] = [
  'hsl(190, 42%, 28%)',
  'hsl(172, 40%, 29%)',
  'hsl(158, 40%, 30%)',
];
const CALM_GRADIENT: readonly [string, string, string] = [
  'hsl(206, 48%, 30%)',
  'hsl(232, 44%, 31%)',
  'hsl(258, 42%, 33%)',
];
const COUPLES_GRADIENT: readonly [string, string, string] = [
  'hsl(340, 44%, 30%)',
  'hsl(352, 46%, 31%)',
  'hsl(6, 44%, 32%)',
];
// PMS checklist a magenta-plum (distinct from Train violet); period care a warm
// coral-amber (rest and warmth, set apart from the Couples rose).
const PMS_GRADIENT: readonly [string, string, string] = [
  'hsl(300, 40%, 29%)',
  'hsl(316, 40%, 30%)',
  'hsl(332, 40%, 31%)',
];
const PERIOD_GRADIENT: readonly [string, string, string] = [
  'hsl(6, 48%, 31%)',
  'hsl(20, 46%, 32%)',
  'hsl(34, 44%, 33%)',
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  // The tab bar floats over the content now; padding lets the last card
  // scroll fully out from under the glass with a breath of air above it.
  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120, gap: 14 },

  header: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 2 },
  pageTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  pageSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: 4,
  },

  // One card, one height for every shelf.
  shelfWrap: { marginBottom: 0 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(150, 110, 205, 0.95)',
  },
  tagText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#ffffff', letterSpacing: 0.5 },
  card: {
    width: '100%',
    minHeight: 112,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTextCol: { flex: 1 },
  cardChevron: { marginRight: -2 },
  cardTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
  cardSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.1,
    marginTop: 3,
  },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  patTopRight: { position: 'absolute', top: -24, right: -16, opacity: 0.3, transform: [{ rotate: '18deg' }] },
  patBotLeft: { position: 'absolute', bottom: -24, left: -18, opacity: 0.24, transform: [{ rotate: '-12deg' }] },
  couplesHeartBig: { position: 'absolute', top: -22, right: -14, transform: [{ rotate: '14deg' }] },
  couplesHeartSmall: { position: 'absolute', bottom: -18, right: 58, transform: [{ rotate: '-10deg' }] },
});
