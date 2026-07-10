// The V3 PMS dashboard: the post-assessment home. A big calm moon (the soul) at
// the top, then the day's cards. No wave here: the wave belongs to the read and
// the game, not the app's home, where it did not fit the calm-orb theme.
//
// Coexists with the real home (src/app/index.tsx); reachable from the V3 goal
// screen and, in dev, the "Home" button. Reads pms-prefs (cycle) and the
// training store (level progress); writes nothing here.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { Header } from '@/components/header';
import { LutealCard } from '@/components/luteal-card';
import { Orb } from '@/components/orb';
import { RecommendSheet } from '@/components/RecommendSheet';
import { type RecResult } from '@/models/recommend';
import { SOUL_RING_HUES } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { CHAPTERS } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';

// The home moon paces a calm, exhale-biased breath so just looking at it pulls
// you into sync. ~6 breaths/min with a longer exhale is the resonance sweet spot
// and the easiest to fall into passively; a longer 4:8 is more demanding to ride.
// No hold: a pause would break a casual viewer's entrainment.
const BREATH_IN = 4; // seconds, inhale
const BREATH_OUT = 6; // seconds, exhale (longer = calming)

export default function HomeV3() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);

  // Drive the moon's inhale/exhale on a loop. Phase starts on inhale (initial
  // state) and only flips inside a timer, so no synchronous set-state-in-effect.
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'exhale'>('inhale');
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (current: 'inhale' | 'exhale') => {
      const secs = current === 'inhale' ? BREATH_IN : BREATH_OUT;
      timer = setTimeout(() => {
        if (!alive) return;
        const next = current === 'inhale' ? 'exhale' : 'inhale';
        setBreathPhase(next);
        schedule(next);
      }, secs * 1000);
    };
    schedule('inhale');
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  const breathDuration = breathPhase === 'inhale' ? BREATH_IN : BREATH_OUT;

  // Reload on focus so returning from the game shows fresh progress. The luteal
  // card reads its own cycle/readiness state.
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

  // The training card opens the chapters page, where she picks an emotion.
  const openTrain = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/train');
  };

  // The Calm card is the real home's acute path, unchanged: open the same
  // RecommendSheet, then hand off to the /result deck exactly as index.tsx does.
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

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Header onPressProfile={() => router.push('/my-soul')} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The soul: a big calm moon, always here. Keeps whatever ring the orb
              itself carries; no wave. */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Orb
              size={260}
              phase={breathPhase}
              phaseDuration={breathDuration}
              breathRange={{ min: 0.72, max: 1.16 }}
            />
          </Animated.View>

          {/* Train your mind: one summary card that opens the chapters page,
              where she picks an emotion and trains it one at a time. */}
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <TrainCard training={training} onOpen={openTrain} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <CalmCard onBegin={openCalm} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(470).duration(500)}>
            <LutealCard />
          </Animated.View>

          <View style={{ height: 12 }} />
        </ScrollView>
      </SafeAreaView>

      {/* The exact acute-calm flow from the real home: pick a feeling, then the
          /result deck. Nothing about this path changes here. */}
      <RecommendSheet
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        onPick={onRecommendPick}
      />
    </View>
  );
}

// --- Cards -------------------------------------------------------------

// The training summary card: the home's single entry into "train your mind". It
// surfaces the next action so tapping in resumes the right chapter, and opens the
// /train page for the full list. Its violet field sits between Calm's blue and
// Luteal's pink; a pair of ringed soul-moons carries the app's texture.
const TRAIN_GRADIENT: readonly [string, string, string] = [
  'hsl(258, 44%, 28%)',
  'hsl(276, 42%, 30%)',
  'hsl(292, 40%, 31%)',
];

// The next thing to do across all chapters: continue the one in progress, else
// start the first untouched one, else everything is done.
function trainSummary(training: TrainingState): { statusWord: string; detail: string } {
  const inProgress = CHAPTERS.find((c) => {
    const done = c.levels.filter((l) => training.completed.includes(l.id)).length;
    return done > 0 && done < c.levels.length;
  });
  if (inProgress) {
    const idx = inProgress.levels.findIndex((l) => !training.completed.includes(l.id));
    return { statusWord: 'Continue', detail: `${inProgress.emotion}, Level ${inProgress.levels[idx].n}` };
  }
  const untouched = CHAPTERS.find((c) => !c.levels.some((l) => training.completed.includes(l.id)));
  if (untouched) {
    return { statusWord: 'Start', detail: `Begin with ${untouched.emotion}` };
  }
  return { statusWord: 'Complete', detail: 'You have trained them all' };
}

function TrainCard({ training, onOpen }: { training: TrainingState; onOpen: () => void }) {
  const { statusWord, detail } = trainSummary(training);
  return (
    <View style={styles.chapterWrap}>
      <View style={styles.chapterTag}>
        <Text style={styles.tagText}>{statusWord}</Text>
      </View>
      <Pressable
        style={styles.chapterCard}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Train your mind. ${detail}. ${statusWord}.`}
      >
        <LinearGradient
          colors={TRAIN_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.chapterBackdrop}>
          <View style={styles.patTopRight}>
            <Orb size={82} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
          </View>
          <View style={styles.patBotLeft}>
            <Orb size={60} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardTextCol}>
            <Text style={styles.chapterTitle}>Train your mind</Text>
            <Text style={styles.cardSub}>{detail}</Text>
          </View>
          <SymbolView
            name="chevron.right"
            tintColor="rgba(255, 255, 255, 0.7)"
            size={15}
            weight="semibold"
            style={styles.cardChevron}
          />
        </View>
      </Pressable>
    </View>
  );
}

// Calm · the acute path. Its own world: a clean cool colour field (no moons, no
// stars), a floating tag, and the whole card taps straight into a breath.
const CALM_GRADIENT: readonly [string, string, string] = [
  'hsl(206, 48%, 30%)',
  'hsl(232, 44%, 31%)',
  'hsl(258, 42%, 33%)',
];

function CalmCard({ onBegin }: { onBegin: () => void }) {
  return (
    <View style={styles.calmWrap}>
      <View style={styles.calmTag}>
        <Text style={styles.tagText}>Calm now</Text>
      </View>
      <Pressable
        style={styles.calmCard}
        onPress={onBegin}
        accessibilityRole="button"
        accessibilityLabel="Feeling worked up? Get activities based on your feeling. Open."
      >
        <LinearGradient
          colors={CALM_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.calmBody, styles.cardRow]}>
          <View style={styles.cardTextCol}>
            <Text style={styles.calmTitle}>Feeling worked up?</Text>
            <Text style={styles.cardSub}>Get activities based on your feeling.</Text>
          </View>
          <SymbolView
            name="chevron.right"
            tintColor="rgba(255, 255, 255, 0.7)"
            size={15}
            weight="semibold"
            style={styles.cardChevron}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
  hero: { alignItems: 'center', marginBottom: 8, marginTop: 4 },

  // Shared card interior: a text column plus a disclosure chevron, so the
  // whole-card tap stays discoverable now that the CTA buttons are gone.
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTextCol: { flex: 1 },
  cardChevron: { opacity: 0.55, marginRight: -2 },

  // --- Type scale (shared across cards) ------------------------------------
  // eyebrow: 12 Medium · title: SemiBold (primary 21 / secondary 18) ·
  // subtitle: 13.5 Regular @ 0.72. One system so the cards read as a set.
  tagText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#ffffff', letterSpacing: 0.5 },
  cardSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.1,
    marginTop: 3,
  },

  // Calm card (secondary · its own cool colour field, whole-card tap)
  calmWrap: { marginBottom: 4 },
  calmTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(110, 150, 205, 0.95)',
  },
  calmCard: {
    minHeight: 104,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
  },
  calmBody: { paddingHorizontal: 20, paddingVertical: 18 },
  calmTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
  },

  // Chapter card (primary · the game · the biggest title + a touch more height)
  chapterWrap: { marginBottom: 4 },
  chapterTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(150, 110, 205, 0.95)',
  },
  chapterCard: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chapterBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  patTopRight: { position: 'absolute', top: -24, right: -16, opacity: 0.3, transform: [{ rotate: '18deg' }] },
  patBotLeft: { position: 'absolute', bottom: -24, left: -18, opacity: 0.24, transform: [{ rotate: '-12deg' }] },
  chapterTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 21,
    lineHeight: 26,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
});
