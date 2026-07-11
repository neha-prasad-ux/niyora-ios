// Now: the app's home tab. A big calm moon (the soul) at the top, then the
// day's cards. Profile and progress live in the You tab; the library of
// programs lives in Grow.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { Header } from '@/components/header';
import { LutealCard } from '@/components/luteal-card';
import { Orb } from '@/components/orb';
import { RecommendSheet } from '@/components/RecommendSheet';
import { type RecResult } from '@/models/recommend';
import { SOUL_RING_HUES } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { takeBreathCue, type BreathCue } from '@/store/breath-cue';
import { trainSummary } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';
import {
  getOnboardingV3Progress,
  setupCardFor,
  type SetupCard,
} from '@/store/onboarding-v3-progress';

// The home moon paces a calm, exhale-biased breath so just looking at it pulls
// you into sync. ~6 breaths/min with a longer exhale is the resonance sweet spot
// and the easiest to fall into passively; a longer 4:8 is more demanding to ride.
// No hold: a pause would break a casual viewer's entrainment.
const BREATH_IN = 4; // seconds, inhale
const BREATH_OUT = 6; // seconds, exhale (longer = calming)

export default function HomeV3() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);
  // Which setup card to pin at the top: 'resume' when she left onboarding
  // partway, 'start' when the app has no PMS read at all, null once done.
  const [setupCard, setSetupCard] = useState<SetupCard | null>(null);

  // Drive the moon's inhale/exhale on a loop, counting completed breaths so
  // the welcome cue below can hand off (name it, pace it, go quiet) exactly on
  // the beat. Phase starts on inhale (initial state) and only flips inside a
  // timer, so no synchronous set-state-in-effect.
  const [breath, setBreath] = useState<{ phase: 'inhale' | 'exhale'; cycle: number }>({
    phase: 'inhale',
    cycle: 0,
  });
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (current: 'inhale' | 'exhale', cycle: number) => {
      const secs = current === 'inhale' ? BREATH_IN : BREATH_OUT;
      timer = setTimeout(() => {
        if (!alive) return;
        const next = current === 'inhale' ? 'exhale' : 'inhale';
        const nextCycle = next === 'inhale' ? cycle + 1 : cycle;
        setBreath({ phase: next, cycle: nextCycle });
        schedule(next, nextCycle);
      }, secs * 1000);
    };
    schedule('inhale', 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);
  const breathDuration = breath.phase === 'inhale' ? BREATH_IN : BREATH_OUT;

  // The breathing cue: a soft invitation over the moon on genuine arrivals.
  // The first open ever gets the fuller line; later arrivals the short one.
  // Its words render straight from `breath` — the same state driving the Orb —
  // and advance only on phase boundaries, so they can never drift off the
  // moon's beat. Nothing is blocked while it shows; the cards stay live.
  const [breathCue, setBreathCue] = useState<BreathCue | null>(null);
  useEffect(() => {
    let alive = true;
    takeBreathCue().then((cue) => {
      if (!alive || cue == null) return;
      setBreathCue(cue);
      // One soft pulse as the first inhale begins, for eyes already on the cards.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, []);

  // Reload on focus so returning from the game shows fresh progress. The luteal
  // card reads its own cycle/readiness state.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTraining().then((t) => {
        if (alive) setTraining(t);
      });
      // Surface the setup card whenever the PMS read is missing — she left
      // onboarding partway, or never started it. On a failed read, err quiet
      // (no card) rather than nag someone who may have finished.
      getOnboardingV3Progress()
        .then((p) => {
          if (alive) setSetupCard(setupCardFor(p));
        })
        .catch(() => {
          if (alive) setSetupCard(null);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const resumeOnboarding = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/onboarding-v3');
  };

  // The training card opens the chapters page, where she picks an emotion.
  const openTrain = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/train');
  };

  // The couples card opens the "Us vs. the PMS" shelf of relationship activities.
  const openCouples = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/couples');
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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The soul: a big calm moon, always here. Keeps whatever ring the orb
              itself carries; no wave. */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Orb
              size={260}
              phase={breath.phase}
              phaseDuration={breathDuration}
              breathRange={{ min: 0.72, max: 1.16 }}
            />
            {/* The cue rides the moon itself. Cycle 0 names the motion, cycles
                1-2 pace it with "in"/"out" swapped exactly when the phase flips
                (same state as the Orb, so text and swell cannot desync), then
                it all fades and the moon breathes wordless. */}
            {breathCue != null && breath.cycle <= 2 && (
              <View pointerEvents="none" style={styles.cueOverlay}>
                {breath.cycle === 0 ? (
                  <Animated.Text
                    key="cue-headline"
                    entering={FadeIn.duration(900)}
                    exiting={FadeOut.duration(600)}
                    style={styles.cueHeadline}
                  >
                    {breathCue === 'first' ? 'Breathe with me, always' : 'Breathe with me'}
                  </Animated.Text>
                ) : (
                  <Animated.Text
                    key={`cue-${breath.cycle}-${breath.phase}`}
                    entering={FadeIn.duration(700)}
                    exiting={FadeOut.duration(500)}
                    style={styles.cueLabel}
                  >
                    {breath.phase === 'inhale' ? 'in' : 'out'}
                  </Animated.Text>
                )}
              </View>
            )}
          </Animated.View>

          {/* Until the app has her PMS read, the way into (or back into)
              onboarding sits right under the moon, warm against the cool
              cards below so it draws the eye first. */}
          {setupCard != null && (
            <Animated.View entering={FadeInDown.delay(60).duration(500)}>
              <ResumeCard variant={setupCard} onPress={resumeOnboarding} />
            </Animated.View>
          )}

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

          <Animated.View entering={FadeInDown.delay(540).duration(500)}>
            <CouplesCard onOpen={openCouples} />
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

// Setup card · shown until the PMS read is done; the whole card taps into
// onboarding. Orchid-magenta: the one hue band (300-330) no other card uses,
// echoing the soul's innermost pink ring, at the same muted depth as the rest
// of the shelf — the unique hue and the spot under the moon do the drawing.
const RESUME_GRADIENT: readonly [string, string, string] = [
  'hsl(300, 46%, 31%)',
  'hsl(316, 46%, 33%)',
  'hsl(330, 46%, 34%)',
];

// Copy per variant: 'resume' welcomes her back to a read in progress; 'start'
// invites a first read. Same card, same tap target, same spot at the top.
const SETUP_COPY = {
  resume: {
    tag: 'Finish setup',
    title: 'Know your PMS level',
    sub: 'Pick up where you left off.',
    a11y: 'Finish setup. Know your PMS level. Pick up where you left off.',
  },
  start: {
    tag: 'Start here',
    title: 'Know your PMS level',
    sub: 'A few quick questions unlock your plan.',
    a11y: 'Start setup. Know your PMS level. A few quick questions unlock your plan.',
  },
} as const;

function ResumeCard({ variant, onPress }: { variant: SetupCard; onPress: () => void }) {
  const copy = SETUP_COPY[variant];
  return (
    <View style={styles.resumeWrap}>
      <View style={styles.resumeTag}>
        <Text style={styles.tagText}>{copy.tag}</Text>
      </View>
      <Pressable
        style={styles.resumeCard}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={copy.a11y}
      >
        <LinearGradient
          colors={RESUME_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.resumeBody, styles.cardRow]}>
          <View style={styles.cardTextCol}>
            <Text style={styles.resumeTitle}>{copy.title}</Text>
            <Text style={styles.cardSub}>{copy.sub}</Text>
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

// The training summary card: the home's single entry into "train your mind". It
// surfaces the next action so tapping in resumes the right chapter, and opens the
// /train page for the full list. Its violet field sits between Calm's blue and
// Luteal's pink; a pair of ringed soul-moons carries the app's texture.
const TRAIN_GRADIENT: readonly [string, string, string] = [
  'hsl(258, 44%, 28%)',
  'hsl(276, 42%, 30%)',
  'hsl(292, 40%, 31%)',
];

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

// Couples · "Us vs. the PMS". A warm rose-to-red field with faint heart motifs,
// set apart from the cooler Train/Calm cards. The heart iconography flags the
// relationship shelf at a glance.
const COUPLES_GRADIENT: readonly [string, string, string] = [
  'hsl(340, 44%, 30%)',
  'hsl(352, 46%, 31%)',
  'hsl(6, 44%, 32%)',
];

function CouplesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.couplesWrap}>
      <View style={styles.couplesTag}>
        <Text style={styles.tagText}>Together</Text>
      </View>
      <Pressable
        style={styles.couplesCard}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Us vs. the PMS. Get through PMS as a team. Open."
      >
        <LinearGradient
          colors={COUPLES_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.couplesBackdrop}>
          <SymbolView
            name="heart.fill"
            tintColor="rgba(255, 255, 255, 0.14)"
            size={120}
            weight="semibold"
            style={styles.couplesHeartBig}
          />
          <SymbolView
            name="heart.fill"
            tintColor="rgba(255, 255, 255, 0.1)"
            size={62}
            weight="semibold"
            style={styles.couplesHeartSmall}
          />
        </View>
        <View style={[styles.calmBody, styles.cardRow]}>
          <View style={styles.cardTextCol}>
            <Text style={styles.calmTitle}>Us vs. the PMS</Text>
            <Text style={styles.cardSub}>Get through PMS as a team.</Text>
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
  couplesWrap: { marginBottom: 4 },
  couplesTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(205, 90, 120, 0.95)',
  },
  couplesCard: {
    minHeight: 104,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
  },
  couplesBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  couplesHeartBig: { position: 'absolute', top: -22, right: -14, transform: [{ rotate: '14deg' }] },
  couplesHeartSmall: { position: 'absolute', bottom: -18, right: 58, transform: [{ rotate: '-10deg' }] },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },
  hero: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  // The breathing cue, centered on the moon. Deep violet so it reads on the
  // pale sphere; the words are part of the moon, not a banner over the page.
  cueOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Soft slate grey, not a brand violet: quiet against the pale sphere, in the
  // greyish register of the app's muted text rather than a coloured banner.
  cueHeadline: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 21,
    color: 'hsla(222, 10%, 28%, 0.82)',
    letterSpacing: 0.4,
    textAlign: 'center',
    paddingHorizontal: 56,
  },
  cueLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: 'hsla(222, 10%, 28%, 0.72)',
    letterSpacing: 3,
  },

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

  // Resume-onboarding card (violet · matches the onboarding world)
  resumeWrap: { marginBottom: 4 },
  resumeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(196, 110, 170, 0.95)',
  },
  resumeCard: {
    minHeight: 88,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
  },
  resumeBody: { paddingHorizontal: 20, paddingVertical: 18 },
  resumeTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
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
