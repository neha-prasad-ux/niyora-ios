// Grow: the library. Every program and tool lives here as a shelf — training,
// the calm toolkit, the couples section — so the Now tab can stay a single
// coached action. Future verticals (CBT, workplace, family) land as new
// shelves on this page, never as new home cards.

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AmbientGlow } from '@/components/ambient-glow';
import { CosmicBackground } from '@/components/cosmic-background';
import { GlassCardBg } from '@/components/glass-card-bg';
import { Orb } from '@/components/orb';
import { PrepCard } from '@/components/prep-card';
import { RecommendSheet } from '@/components/RecommendSheet';
import { type RecResult } from '@/models/recommend';
import { SOUL_RING_HUES } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { glass } from '@/theme/glass';
import { typography, fontScale } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { trainSummary, workSummary, type TrainSummary } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';
import { getPmsPrefs, type StartedWith } from '@/store/pms-prefs';

export default function GrowScreen() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);
  // The pillar she picked at the end of onboarding ("where do you want to
  // start?"). The training shelf leads with it so the choice keeps paying off.
  const [startedWith, setStartedWith] = useState<StartedWith | null>(null);
  // The left rail connecting the phase dots runs from the first dot to the
  // last. We measure the last section's offset so the line ends exactly on its
  // dot rather than overhanging past the final card.
  const [railHeight, setRailHeight] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTraining().then((t) => {
        if (alive) setTraining(t);
      });
      getPmsPrefs().then((p) => {
        if (alive) setStartedWith(p.startedWith ?? null);
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
  const openStories = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/stories' as Href);
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
  // Ahead of that, the pillar she chose at onboarding leads, so her first pick
  // stays front-and-centre when she comes back.
  const trainCards = useMemo(() => {
    const cards = [
      {
        key: 'train',
        title: 'Master emotional regulation',
        sub: 'Own your emotions',
        gradient: TRAIN_GRADIENT,
        tagColor: 'rgba(150, 110, 205, 0.95)',
        summary: trainSummary(training),
        onOpen: openTrain,
      },
      {
        key: 'work',
        title: 'Build confidence at work',
        sub: 'Sound strong under pressure',
        gradient: WORKPLACE_GRADIENT,
        tagColor: 'rgba(70, 165, 155, 0.95)',
        summary: workSummary(training),
        onOpen: openWorkplace,
      },
    ];
    // Map the onboarding pick to the shelf it corresponds to (the two training
    // shelves are emotion + workplace; partner/story live in other sections).
    const startedKey = startedWith === 'workplace' ? 'work' : startedWith === 'emotion' ? 'train' : null;
    return cards.sort((a, b) => {
      if (startedKey) {
        if (a.key === startedKey && b.key !== startedKey) return -1;
        if (b.key === startedKey && a.key !== startedKey) return 1;
      }
      return stateRank(a.summary.statusWord) - stateRank(b.summary.statusWord);
    });
  }, [training, startedWith]);

  return (
    <View style={styles.root}>
      <CosmicBackground />
      <AmbientGlow />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Train</Text>
            <Text style={styles.pageSub}>Build emotional skills for softer PMS</Text>
          </View>

          {/* Her PMS preparedness readout — moved here off the Today card. Shows
              only in the build phase and self-loads; renders nothing otherwise. */}
          <PrepCard onCalm={openCalm} />

          {/* The page reads top-to-bottom as the cycle does: the long build
              stretch to train skills, then prep for the PMS week, then care
              through the period itself. A single rail links the phase dots so
              the three groups read as one path. */}
          <View style={styles.pathWrap}>
            {railHeight > 0 && <View style={[styles.rail, { height: railHeight }]} />}
            <PhaseSection
            label="Training"
            sub="After Periods"
            hue={BUILD_HUE}
          >
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

            {/* Neha's story serial, learned as part of Training. One card that
                opens the /stories page listing each chapter. */}
            <Shelf
              title="Learn through stories"
              sub="Neha's story, one chapter at a time"
              gradient={STORY_GRADIENT}
              backdrop={<StoryBackdrop />}
              onOpen={openStories}
            />
          </PhaseSection>

          <PhaseSection
            label="PMS prep"
            sub="The week before your period"
            hue={PMS_HUE}
          >
            <Shelf
              title="PMS day checklist"
              sub="Proven ways to ease symptoms."
              gradient={PMS_GRADIENT}
              onOpen={openPmsChecklist}
            />
            <Shelf
              title="Relationship & PMS"
              sub="Win PMS together"
              gradient={COUPLES_GRADIENT}
              backdrop={<CouplesBackdrop />}
              onOpen={openCouples}
            />
            <Shelf
              title="Enjoy calmness now"
              sub="Quick breathing to zen"
              gradient={CALM_GRADIENT}
              onOpen={openCalm}
            />
          </PhaseSection>

            <PhaseSection
              label="Periods prep"
              sub="During your period"
              hue={PERIOD_HUE}
              onLayout={(e) => setRailHeight(e.nativeEvent.layout.y)}
            >
              <Shelf
                title="Care through your period"
                sub="Comfort for PMS"
                gradient={PERIOD_GRADIENT}
                onOpen={openPeriodsCare}
              />
            </PhaseSection>
          </View>
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
        <GlassCardBg gradient={gradient} />
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

// --- The phase section ------------------------------------------------------
// A group header that names one cycle phase and colours it with a small dot,
// then stacks that phase's shelves beneath it. The three sections read as one
// path down the page: Building → PMS prep → Periods prep.

function PhaseSection({
  label,
  sub,
  hue,
  onLayout,
  children,
}: {
  label: string;
  sub: string;
  hue: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.phaseSection} onLayout={onLayout}>
      <View style={[styles.phaseDot, { backgroundColor: hue }]} />
      <Text style={styles.phaseLabel}>{label}</Text>
      <Text style={styles.phaseSub}>{sub}</Text>
      <View style={styles.phaseCards}>{children}</View>
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

function StoryBackdrop() {
  return (
    <View pointerEvents="none" style={styles.backdrop}>
      <View style={styles.patTopRight}>
        <Orb size={78} ringHues={SOUL_RING_HUES} still />
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
// The shelf palette + phase-dot hues live in the theme now (colors.shelfGradients
// / colors.phaseHues), so grow and stories share one source. These are local
// aliases onto those tokens.
const TRAIN_GRADIENT = colors.shelfGradients.train;
const WORKPLACE_GRADIENT = colors.shelfGradients.work;
const CALM_GRADIENT = colors.shelfGradients.calm;
const COUPLES_GRADIENT = colors.shelfGradients.couples;
const PMS_GRADIENT = colors.shelfGradients.pms;
const STORY_GRADIENT = colors.shelfGradients.story;
const PERIOD_GRADIENT = colors.shelfGradients.period;

const BUILD_HUE = colors.phaseHues.build;
const PMS_HUE = colors.phaseHues.pms;
const PERIOD_HUE = colors.phaseHues.period;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  // The tab bar floats over the content now; padding lets the last card
  // scroll fully out from under the glass with a breath of air above it.
  scroll: { paddingHorizontal: pageGutter, paddingTop: spacing.xs, paddingBottom: 120, gap: spacing.xxl },

  header: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  pageTitle: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },
  pageSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },

  // The three phase groups, linked by one vertical rail down the left gutter.
  pathWrap: { position: 'relative', gap: spacing.xxl },
  rail: {
    position: 'absolute',
    left: 5.25,
    top: 11.5,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },

  // One phase group: a node on the rail, a label, a one-line blurb, its shelves.
  // The left padding clears the gutter the rail and dot live in.
  phaseSection: { position: 'relative', paddingLeft: spacing.xxl },
  phaseDot: {
    position: 'absolute',
    left: 1.5,
    top: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    zIndex: 2,
  },
  phaseLabel: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  phaseSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 18,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  phaseCards: { gap: spacing.md },

  // One card, one height for every shelf.
  shelfWrap: { marginBottom: 0 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    marginLeft: spacing.sm,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(150, 110, 205, 0.95)',
  },
  tagText: { fontFamily: fonts.medium, fontSize: fontScale.caption, color: colors.textOnDark.primary, letterSpacing: 0.5 },
  card: {
    width: '100%',
    minHeight: 112,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTextCol: { flex: 1 },
  cardChevron: { marginRight: -2 },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    lineHeight: 23,
    color: colors.textOnDark.primary,
    letterSpacing: 0.15,
  },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },

  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  patTopRight: { position: 'absolute', top: -24, right: -16, opacity: 0.3, transform: [{ rotate: '18deg' }] },
  patBotLeft: { position: 'absolute', bottom: -24, left: -18, opacity: 0.24, transform: [{ rotate: '-12deg' }] },
  couplesHeartBig: { position: 'absolute', top: -22, right: -14, transform: [{ rotate: '14deg' }] },
  couplesHeartSmall: { position: 'absolute', bottom: -18, right: 58, transform: [{ rotate: '-10deg' }] },
});
