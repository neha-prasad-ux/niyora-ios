// The V3 emotion-training game runner: the Irritability chapter, six levels,
// each with a distinct interaction (swipe, tap, hold-to-preview, slider, breathe,
// chip-assembly) plus the woven kind-word beat. Best-fit, gentle: no red X ever.
// The wave header is the same water from the result screen, and it visibly
// settles a little as each level completes.
//
// Content lives in v3/game-content.ts; progress persists via store/training-v3.

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CelebrationParticles } from '@/components/CelebrationParticles';
import { Orb } from '@/components/orb';
import { RingCelebration } from '@/components/RingCelebration';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import {
  IRRITABILITY_LEVELS,
  KIND_WORD,
  L1_CARDS,
  L1_CONGRATS,
  L1_INTRO,
  L2_CHEAT,
  L2_CONGRATS,
  L2_INTRO,
  L2_SCENES,
  L3_CHEAT,
  L3_CONGRATS,
  L3_INTRO,
  L3_SCENES,
  L4_CONGRATS,
  L4_INTRO,
  L4_TEACH,
  L5_CONGRATS,
  L5_INTRO,
  L5_SLOTS,
  buildL5Sentence,
  type Intensity,
  type MoveTier,
} from '@/v3/game-content';
import { getTraining, recordKindWord, recordLevelComplete } from '@/store/training-v3';
import { SOUL_RING_HUES } from '@/models/tiers';

const tap = () => Haptics.selectionAsync().catch(() => {});

// Truth reads calm blue (steady/true); Myth reads brand pink (the soul-ring
// rose family), so the pair is on-brand rather than a warning amber.
const TRUTH_BLUE = v3.regulated;
const MYTH_PINK = 'hsl(330, 68%, 72%)';

// Level 2 "size" colours: Small is cool pink, Big is warm coral (heat, not
// alarm red). The backdrop moons drift through the stress stages coral -> violet
// -> pink.
const SMALL_PINK = 'hsl(330, 68%, 74%)';
const BIG_CORAL = 'hsl(8, 72%, 68%)';
const STRESS_HUES = [8, 275, 330, 8] as const; // coral, violet, pink, coral

// The one place we mark a harmful choice: a muted brick red for "push it down"
// (suppression), never an alarm neon.
const SUPPRESS_RED = 'hsl(2, 55%, 56%)';

// The clean-run reward: finish a graded level with no wrong answers and the
// congrats orb wears a warm gold ring (instead of the usual soul hues) and the
// burst flares gold. A retry anywhere in the level drops it back to the soul ring.
const GOLD_HUE = 45;
const GOLD_RING_HUES = [GOLD_HUE, GOLD_HUE, GOLD_HUE] as const;
const VIOLET_BURST = 275;

export default function GameV3() {
  const levels = IRRITABILITY_LEVELS;
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

  // Optional deep-link jump: /game-v3?level=4 opens a level directly (1-indexed),
  // handy for testing a single level without replaying the earlier ones.
  const { level: levelParam } = useLocalSearchParams<{ level?: string }>();

  // Resume where she left off: start at the first level she has not completed
  // (or a jumped-to level, or the beginning if the chapter is done).
  useEffect(() => {
    getTraining()
      .then((t) => {
        const jump = levelParam ? Number(levelParam) - 1 : NaN;
        if (Number.isInteger(jump) && jump >= 0 && jump < levels.length) {
          setIndex(jump);
          return;
        }
        const firstIncomplete = levels.findIndex((l) => !t.completed.includes(l.id));
        setIndex(firstIncomplete === -1 ? 0 : firstIncomplete);
      })
      .finally(() => setReady(true));
  }, [levels, levelParam]);

  // Record the level, nudge the wave steadier (in the store), and step forward.
  const advance = useCallback((levelId: string) => {
    recordLevelComplete(levelId).catch(() => {});
    setIndex((i) => i + 1);
  }, []);

  // The last level records completion, then hands back to the dashboard.
  const finish = useCallback((levelId: string) => {
    recordLevelComplete(levelId).catch(() => {});
    router.back();
  }, []);

  const exit = useCallback(() => router.back(), []);

  // Hold the first paint until we know the resume point, so we never flash
  // Level 1 before jumping to where she left off.
  if (!ready) {
    return (
      <View style={styles.root}>
        <BackgroundGradient />
      </View>
    );
  }

  // Every level is a self-contained, full-screen arc (intro -> [cheat] -> play ->
  // congrats), big buttons at the bottom, soft retry, a gold ring for a clean run.
  switch (index) {
    case 0:
      return <LevelOne onDone={() => advance(levels[0].id)} onExit={exit} />;
    case 1:
      return <LevelTwo onDone={() => advance(levels[1].id)} onExit={exit} />;
    case 2:
      return <LevelThree onDone={() => advance(levels[2].id)} onExit={exit} />;
    case 3:
      return <LevelFour onDone={() => advance(levels[3].id)} onExit={exit} />;
    default:
      return <LevelFive onDone={() => finish(levels[4].id)} onExit={exit} />;
  }
}

// Faint soul orbs (with rings) drifting behind the Level 1 intro screens, so the
// pages carry the app's own texture instead of reading flat. Decorative only.
function L1Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.l1Orb1}>
        <Orb size={84} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
      </View>
      <View style={styles.l1Orb2}>
        <Orb size={64} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
      </View>
      <View style={styles.l1Orb3}>
        <Orb size={58} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
      </View>
      <View style={styles.l1Orb4}>
        <Orb size={92} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
      </View>
    </View>
  );
}

// The shared "Congratulations" page every level ends on: the soul orb wearing N
// accumulated rings, the level's copy, and a big forward button. A clean run
// (gold = true) swaps the soul hues for a warm gold ring and tags the page.
// Optional children slot in below the card (the chapter-end kind word).
function LevelCongrats({
  ringCount,
  gold,
  congrats,
  buttonLabel,
  onNext,
  children,
}: {
  ringCount: number;
  gold: boolean;
  congrats: { title: string; subtitle: string; body: string };
  buttonLabel: string;
  onNext: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.l1Body}>
      <ScrollView
        contentContainerStyle={styles.congratsScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.l1Center}>
          {gold && (
            <View style={styles.cleanRunTag}>
              <Text style={styles.cleanRunText}>Clean run</Text>
            </View>
          )}
          <Orb
            size={110}
            tierRingCount={ringCount}
            ringHues={gold ? GOLD_RING_HUES : SOUL_RING_HUES}
            accumulate
          />
          <Text style={styles.l1CongratsTitle}>{congrats.title}</Text>
          <Text style={styles.l1CongratsSub}>{congrats.subtitle}</Text>
          <View style={styles.l1CongratsCard}>
            <Text style={styles.l1CongratsBody}>{congrats.body}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
      <BeginButton fullWidth label={buttonLabel} onPress={onNext} />
    </View>
  );
}

// --- Level 1 · the redesigned Truth/Myth arc --------------------------
// Self-contained, full-screen: game intro -> level intro -> play -> congrats.
// Big buttons at the bottom, soft retry (never a harsh fail), a brand particle
// burst on each right answer, and a ring celebration on the congrats page.
function LevelOne({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'gameIntro' | 'levelIntro' | 'play' | 'congrats'>('gameIntro');
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null); // Truth = true, Myth = false
  const [celebrate, setCelebrate] = useState(false);
  const [flawless, setFlawless] = useState(true); // no wrong answers -> gold ring

  const card = L1_CARDS[i];
  const answered = guess !== null;
  const right = answered && guess === card.isTrue;

  const pick = (asTrue: boolean) => {
    if (answered) return;
    if (asTrue === card.isTrue) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setGuess(asTrue);
  };

  const next = () => {
    tap();
    if (right) {
      setCelebrate(false);
      if (i + 1 >= L1_CARDS.length) setStage('congrats');
      else {
        setI(i + 1);
        setGuess(null);
      }
    } else {
      setGuess(null); // soft retry: let her answer again
    }
  };

  const back = () => {
    tap();
    if (stage === 'play') {
      setGuess(null);
      setCelebrate(false);
      setStage('levelIntro');
    } else if (stage === 'levelIntro') {
      setStage('gameIntro');
    } else {
      onExit();
    }
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.l1Safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage !== 'congrats' && (
          <View style={styles.l1TopBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            {stage === 'play' ? (
              <View style={styles.l1Segments}>
                {L1_CARDS.map((c, idx) => (
                  <View key={c.id} style={[styles.l1Seg, idx <= i && styles.l1SegOn]} />
                ))}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'gameIntro' && (
          <View style={styles.l1Body}>
            <L1Backdrop />
            <View style={styles.l1Center}>
              <Text style={styles.l1Kicker}>{L1_INTRO.kicker}</Text>
              <Text style={styles.l1Subtitle}>{L1_INTRO.subtitle}</Text>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
            </View>
            <BeginButton fullWidth label="Let's go" onPress={() => { tap(); setStage('levelIntro'); }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L1Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Level}>{L1_INTRO.level}</Text>
              <View style={styles.l1RoundBadge}>
                <Text style={styles.l1RoundText}>{L1_INTRO.round}</Text>
              </View>
              <View style={styles.l1CardsHero}>
                <View style={[styles.l1HeroCard, styles.l1HeroTruth]}>
                  <Text style={styles.l1HeroCardText}>Truth</Text>
                </View>
                <View style={[styles.l1HeroCard, styles.l1HeroMyth]}>
                  <Text style={styles.l1HeroCardText}>Myth</Text>
                </View>
              </View>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('play'); }} />
          </View>
        )}

        {stage === 'play' && (
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Text style={styles.l1Statement}>{card.statement}</Text>
            </View>
            <View style={styles.l1Bottom}>
              {!answered ? (
                <View style={styles.l1Choices}>
                  <Pressable
                    style={[styles.l1Choice, styles.l1ChoiceTruth]}
                    onPress={() => pick(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Truth"
                  >
                    <Text style={styles.l1ChoiceLabel}>Truth</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.l1Choice, styles.l1ChoiceMyth]}
                    onPress={() => pick(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Myth"
                  >
                    <Text style={styles.l1ChoiceLabel}>Myth</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, right ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text style={[styles.l1Verdict, { color: right ? v3.regulated : v3.activated }]}>
                      {right ? `${card.isTrue ? 'True' : 'Myth'}, nice` : 'Not quite'}
                    </Text>
                    <Text style={styles.l1RevealText}>{card.reveal}</Text>
                  </View>
                  <BeginButton
                    fullWidth
                    label={right ? (i + 1 >= L1_CARDS.length ? 'Finish' : 'Next') : 'Try again'}
                    onPress={next}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={1}
            gold={flawless}
            congrats={L1_CONGRATS}
            buttonLabel="On to Level 2"
            onNext={() => { tap(); onDone(); }}
          />
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={flawless ? GOLD_HUE : VIOLET_BURST} />}
    </View>
  );
}

// Level 2 backdrop: the same ringed soul moons as L1, now tinted through the
// stress stages (coral -> violet -> pink) so the pattern itself says "big / small".
function L2Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.l1Orb1}>
        <Orb size={84} hue={STRESS_HUES[0]} still />
      </View>
      <View style={styles.l1Orb2}>
        <Orb size={64} hue={STRESS_HUES[1]} still />
      </View>
      <View style={styles.l1Orb3}>
        <Orb size={58} hue={STRESS_HUES[2]} still />
      </View>
      <View style={styles.l1Orb4}>
        <Orb size={92} hue={STRESS_HUES[3]} still />
      </View>
    </View>
  );
}

// --- Level 2 · Recognise the size (Big vs Small) ----------------------
// Reuses the Level 1 arc, with a "cheat code" teaching page before play that
// spells out how to read the size. Big = coral (hot), Small = pink (cool).
function LevelTwo({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'levelIntro' | 'cheat' | 'play' | 'congrats'>('levelIntro');
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<Intensity | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [flawless, setFlawless] = useState(true); // no wrong answers -> gold ring

  const scene = L2_SCENES[i];
  const answered = guess !== null;
  const right = answered && guess === scene.answer;

  const pick = (g: Intensity) => {
    if (answered) return;
    if (g === scene.answer) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setGuess(g);
  };

  const next = () => {
    tap();
    if (right) {
      setCelebrate(false);
      if (i + 1 >= L2_SCENES.length) setStage('congrats');
      else {
        setI(i + 1);
        setGuess(null);
      }
    } else {
      setGuess(null);
    }
  };

  const back = () => {
    tap();
    if (stage === 'play') {
      setGuess(null);
      setCelebrate(false);
      setStage('cheat');
    } else if (stage === 'cheat') {
      setStage('levelIntro');
    } else {
      onExit();
    }
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.l1Safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage !== 'congrats' && (
          <View style={styles.l1TopBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            {stage === 'play' ? (
              <View style={styles.l1Segments}>
                {L2_SCENES.map((s, idx) => (
                  <View key={s.id} style={[styles.l1Seg, idx <= i && styles.l1SegOn]} />
                ))}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L2Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L2_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L2_INTRO.title}</Text>
              <Text style={styles.l2Subtitle}>{L2_INTRO.subtitle}</Text>
              <View style={styles.l1CardsHero}>
                <View style={[styles.l1HeroCard, styles.l2HeroSmall]}>
                  <Text style={styles.l1HeroCardText}>Small</Text>
                </View>
                <View style={[styles.l1HeroCard, styles.l2HeroBig]}>
                  <Text style={styles.l1HeroCardText}>Big</Text>
                </View>
              </View>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('cheat'); }} />
          </View>
        )}

        {stage === 'cheat' && (
          <View style={styles.l1Body}>
            <L2Backdrop />
            <View style={styles.l2CheatCenter}>
              <Text style={styles.l2CheatKicker}>{L2_CHEAT.kicker}</Text>
              <Text style={styles.l2CheatTitle}>{L2_CHEAT.title}</Text>
              <View style={styles.l2Table}>
                <View style={styles.l2TableHead}>
                  <Text style={styles.l2RowLabel} />
                  <Text style={[styles.l2TableHeadCell, { color: SMALL_PINK }]}>Small</Text>
                  <Text style={[styles.l2TableHeadCell, { color: BIG_CORAL }]}>Big</Text>
                </View>
                {L2_CHEAT.rows.map((r) => (
                  <View key={r.label} style={styles.l2TableRow}>
                    <Text style={styles.l2RowLabel}>{r.label}</Text>
                    <Text style={styles.l2RowCell}>{r.small}</Text>
                    <Text style={styles.l2RowCell}>{r.big}</Text>
                  </View>
                ))}
              </View>
            </View>
            <BeginButton fullWidth label="Got it" onPress={() => { tap(); setStage('play'); }} />
          </View>
        )}

        {stage === 'play' && (
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Text style={styles.l2Scene}>{scene.scene}</Text>
            </View>
            <View style={styles.l1Bottom}>
              {!answered ? (
                <View style={styles.l1Choices}>
                  <Pressable
                    style={[styles.l2Choice, styles.l2ChoiceSmall]}
                    onPress={() => pick('little')}
                    accessibilityRole="button"
                    accessibilityLabel="Small"
                  >
                    <Text style={styles.l1ChoiceLabel}>Small</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.l2Choice, styles.l2ChoiceBig]}
                    onPress={() => pick('lot')}
                    accessibilityRole="button"
                    accessibilityLabel="Big"
                  >
                    <Text style={styles.l1ChoiceLabel}>Big</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, right ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text
                      style={[
                        styles.l1Verdict,
                        { color: right ? (scene.answer === 'lot' ? BIG_CORAL : SMALL_PINK) : v3.activated },
                      ]}
                    >
                      {right ? `${scene.answer === 'lot' ? 'Big' : 'Small'}, yes` : 'Look again'}
                    </Text>
                    <Text style={styles.l1RevealText}>{scene.why}</Text>
                  </View>
                  <BeginButton
                    fullWidth
                    label={right ? (i + 1 >= L2_SCENES.length ? 'Finish' : 'Next') : 'Try again'}
                    onPress={next}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={2}
            gold={flawless}
            congrats={L2_CONGRATS}
            buttonLabel="On to Level 3"
            onNext={() => { tap(); onDone(); }}
          />
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={flawless ? GOLD_HUE : VIOLET_BURST} />}
    </View>
  );
}

// Level 3 backdrop: 15 soft static particles scattered around the edges (kept
// out of the central reading band), a calm speckle instead of a live field.
const L3_PARTICLES: { top: `${number}%`; left: `${number}%`; size: number; opacity: number }[] = [
  { top: '6%', left: '12%', size: 5, opacity: 0.5 },
  { top: '10%', left: '82%', size: 4, opacity: 0.4 },
  { top: '4%', left: '48%', size: 3, opacity: 0.35 },
  { top: '17%', left: '91%', size: 5, opacity: 0.45 },
  { top: '20%', left: '5%', size: 4, opacity: 0.4 },
  { top: '38%', left: '93%', size: 3, opacity: 0.3 },
  { top: '44%', left: '5%', size: 5, opacity: 0.45 },
  { top: '58%', left: '95%', size: 4, opacity: 0.4 },
  { top: '62%', left: '4%', size: 3, opacity: 0.3 },
  { top: '78%', left: '88%', size: 5, opacity: 0.5 },
  { top: '82%', left: '13%', size: 4, opacity: 0.4 },
  { top: '90%', left: '50%', size: 3, opacity: 0.35 },
  { top: '92%', left: '78%', size: 5, opacity: 0.45 },
  { top: '86%', left: '30%', size: 4, opacity: 0.4 },
  { top: '30%', left: '85%', size: 3, opacity: 0.3 },
];
function L3Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {L3_PARTICLES.map((p, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: 'rgba(214, 202, 246, 1)',
            opacity: p.opacity,
            shadowColor: 'rgba(200, 190, 245, 0.9)',
            shadowOpacity: 0.9,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
      ))}
    </View>
  );
}

// --- Level 3 · What helps most (the solution flips with the size) -----
// Reuses the Level 2 arc. Concrete per-scene solutions (reframe / take 20 /
// push it down), best-fit flips with the size, push-it-down flagged red,
// 3-tier gentle feedback with soft retry to the best solution.
function LevelThree({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'levelIntro' | 'cheat' | 'play' | 'congrats'>('levelIntro');
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [flawless, setFlawless] = useState(true); // only best-fit first tries -> gold ring

  const scene = L3_SCENES[i];
  const chosen = picked != null ? scene.options[picked] : null;
  const best = chosen?.tier === 'best';

  const pick = (idx: number) => {
    if (picked != null) return;
    if (scene.options[idx].tier === 'best') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setPicked(idx);
  };

  const next = () => {
    tap();
    if (best) {
      setCelebrate(false);
      if (i + 1 >= L3_SCENES.length) setStage('congrats');
      else {
        setI(i + 1);
        setPicked(null);
      }
    } else {
      setPicked(null); // soft retry toward the solution that fits
    }
  };

  const verdict = (tier: MoveTier) =>
    tier === 'best' ? 'That is the one' : tier === 'lesser' ? 'That can work, not here though' : 'That one backfires';
  const verdictColor = (tier: MoveTier) => (tier === 'best' ? v3.regulated : v3.activated);

  const back = () => {
    tap();
    if (stage === 'play') {
      setPicked(null);
      setCelebrate(false);
      setStage('cheat');
    } else if (stage === 'cheat') {
      setStage('levelIntro');
    } else {
      onExit();
    }
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.l1Safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage !== 'congrats' && (
          <View style={styles.l1TopBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            {stage === 'play' ? (
              <View style={styles.l1Segments}>
                {L3_SCENES.map((s, idx) => (
                  <View key={s.id} style={[styles.l1Seg, idx <= i && styles.l1SegOn]} />
                ))}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L3Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L3_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L3_INTRO.title}</Text>
              <View style={styles.l3Points}>
                <Text style={styles.l3IntroLead}>{L3_INTRO.lead}</Text>
                <Text style={styles.l3Point}>
                  <Text style={[styles.l3PointTerm, { color: TRUTH_BLUE }]}>
                    {L3_INTRO.points[0].term}
                  </Text>
                  {`  ${L3_INTRO.points[0].def}`}
                </Text>
                <Text style={styles.l3PointOr}>or</Text>
                <Text style={styles.l3Point}>
                  <Text style={[styles.l3PointTerm, { color: BIG_CORAL }]}>
                    {L3_INTRO.points[1].term}
                  </Text>
                  {`  ${L3_INTRO.points[1].def}`}
                </Text>
              </View>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('cheat'); }} />
          </View>
        )}

        {stage === 'cheat' && (
          <View style={styles.l1Body}>
            <L3Backdrop />
            <View style={styles.l2CheatCenter}>
              <Text style={styles.l2CheatKicker}>{L3_CHEAT.kicker}</Text>
              <Text style={styles.l2CheatTitle}>{L3_CHEAT.title}</Text>
              <View style={styles.l2Table}>
                <View style={styles.l2TableHead}>
                  <Text style={styles.l2RowLabel} />
                  <Text style={[styles.l2TableHeadCell, { color: SMALL_PINK }]}>Small</Text>
                  <Text style={[styles.l2TableHeadCell, { color: BIG_CORAL }]}>Big</Text>
                </View>
                {L3_CHEAT.rows.map((r) => (
                  <View key={r.label} style={[styles.l2TableRow, r.bad && styles.l2TableRowBad]}>
                    <Text style={[styles.l2RowLabel, r.bad && styles.l2RowCellBad]}>{r.label}</Text>
                    <Text style={[styles.l2RowCell, r.bad && styles.l2RowCellBad]}>{r.small}</Text>
                    <Text style={[styles.l2RowCell, r.bad && styles.l2RowCellBad]}>{r.big}</Text>
                  </View>
                ))}
              </View>
            </View>
            <BeginButton fullWidth label="Got it" onPress={() => { tap(); setStage('play'); }} />
          </View>
        )}

        {stage === 'play' && (
          <View style={styles.l1Body}>
            <Text style={styles.l3Prompt}>{scene.prompt}</Text>
            <View style={styles.l3PlayBottom}>
              {picked == null ? (
                <View style={styles.l3Solutions}>
                  {scene.options.map((o, idx) => (
                    <Pressable
                      key={o.label}
                      style={styles.l3Solution}
                      onPress={() => pick(idx)}
                      accessibilityRole="button"
                      accessibilityLabel={o.label}
                    >
                      <Text style={styles.l3SolutionText}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, best ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text style={[styles.l1Verdict, { color: verdictColor(chosen!.tier) }]}>
                      {verdict(chosen!.tier)}
                    </Text>
                    <Text style={styles.l1RevealText}>{chosen!.future}</Text>
                  </View>
                  <BeginButton
                    fullWidth
                    label={best ? (i + 1 >= L3_SCENES.length ? 'Finish' : 'Next') : 'Try another'}
                    onPress={next}
                  />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={3}
            gold={flawless}
            congrats={L3_CONGRATS}
            buttonLabel="On to Level 4"
            onNext={() => { tap(); onDone(); }}
          />
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={flawless ? GOLD_HUE : VIOLET_BURST} />}
    </View>
  );
}


// --- Level 4 · Rehearse (the 4-7-8 breath, felt from the inside) -------
// A self-contained guided breath: in 4, hold 7, out 8, for a few rounds. The
// long exhale from Level 1, done for real. No right or wrong here.
const BREATH = { inhale: 4, hold: 7, exhale: 8 } as const;
const BREATH_LABEL = { inhale: 'Breathe in', hold: 'Hold', exhale: 'Breathe out' } as const;
const BREATH_ROUNDS = 3;
type BreathPhase = keyof typeof BREATH;

function LevelFour({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'levelIntro' | 'teach' | 'breathe' | 'congrats'>('levelIntro');
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [round, setRound] = useState(1);
  const [breathDone, setBreathDone] = useState(false);

  // Guided 4-7-8. Start on inhale (initial state) and only flip phases inside
  // the timer, so there is no synchronous set-state in the effect. Each finished
  // exhale counts a round; after the last one the breath rests.
  useEffect(() => {
    if (stage !== 'breathe' || breathDone) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let completed = 0;
    const schedule = (current: BreathPhase) => {
      timer = setTimeout(() => {
        if (!alive) return;
        if (current === 'exhale') {
          completed += 1;
          if (completed >= BREATH_ROUNDS) {
            setBreathDone(true);
            return;
          }
          setRound(completed + 1);
          setPhase('inhale');
          schedule('inhale');
        } else {
          const next: BreathPhase = current === 'inhale' ? 'hold' : 'exhale';
          setPhase(next);
          schedule(next);
        }
      }, BREATH[current] * 1000);
    };
    schedule('inhale');
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [stage, breathDone]);

  const back = () => {
    tap();
    if (stage === 'breathe') setStage('teach');
    else if (stage === 'teach') setStage('levelIntro');
    else onExit();
  };

  const startBreath = () => {
    tap();
    setRound(1);
    setPhase('inhale');
    setBreathDone(false);
    setStage('breathe');
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.l1Safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage !== 'congrats' && (
          <View style={styles.l1TopBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L1Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L4_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L4_INTRO.title}</Text>
              <Text style={styles.l2Subtitle}>{L4_INTRO.subtitle}</Text>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('teach'); }} />
          </View>
        )}

        {stage === 'teach' && (
          <View style={styles.l1Body}>
            <L1Backdrop />
            <View style={styles.l2CheatCenter}>
              <Text style={styles.l2CheatKicker}>{L4_TEACH.kicker}</Text>
              <Text style={styles.l2CheatTitle}>{L4_TEACH.title}</Text>
              <View style={styles.l1CongratsCard}>
                <Text style={styles.l1CongratsBody}>{L4_TEACH.body}</Text>
              </View>
            </View>
            <BeginButton fullWidth label="Let's breathe" onPress={startBreath} />
          </View>
        )}

        {stage === 'breathe' && (
          <View style={styles.l1Body}>
            <View style={styles.l4BreatheCenter}>
              <Orb size={150} phase={phase} phaseDuration={BREATH[phase]} />
              <Text style={styles.l4PhaseLabel}>
                {breathDone ? 'Nicely done' : BREATH_LABEL[phase]}
              </Text>
              <Text style={styles.l4RoundLabel}>
                {breathDone ? 'Feel that settle' : `Round ${round} of ${BREATH_ROUNDS}`}
              </Text>
            </View>
            {breathDone ? (
              <BeginButton fullWidth label="Finish" onPress={() => { tap(); setStage('congrats'); }} />
            ) : (
              <Pressable
                onPress={() => { tap(); setStage('congrats'); }}
                style={styles.l4Skip}
                accessibilityRole="button"
              >
                <Text style={styles.l4SkipText}>I'm good</Text>
              </Pressable>
            )}
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={3}
            gold={false}
            congrats={L4_CONGRATS}
            buttonLabel="On to Level 5"
            onNext={() => { tap(); onDone(); }}
          />
        )}
      </SafeAreaView>

      {stage === 'congrats' && <RingCelebration hue={VIOLET_BURST} />}
    </View>
  );
}

// --- Level 5 · Your move next time (assemble the if-then plan) ---------
// The chapter closes here: build one plan in her own words, then the woven kind
// word. No right or wrong, so the reward is finishing.
function LevelFive({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'levelIntro' | 'play' | 'congrats'>('levelIntro');
  const [choices, setChoices] = useState<Record<string, string>>({});
  const allFilled = L5_SLOTS.every((s) => choices[s.id]);
  const sentence = buildL5Sentence(choices);

  const set = (slot: string, opt: string) => {
    tap();
    setChoices((c) => ({ ...c, [slot]: opt }));
  };

  const back = () => {
    tap();
    if (stage === 'play') setStage('levelIntro');
    else onExit();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.l1Safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage !== 'congrats' && (
          <View style={styles.l1TopBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L1Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L5_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L5_INTRO.title}</Text>
              <Text style={styles.l2Subtitle}>{L5_INTRO.subtitle}</Text>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('play'); }} />
          </View>
        )}

        {stage === 'play' && (
          <View style={styles.l1Body}>
            <ScrollView
              contentContainerStyle={styles.l5PlayScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.l5SentenceCard, allFilled && { borderColor: hsla(v3.accent, 0.6) }]}>
                <Text style={styles.sentence}>
                  {allFilled ? sentence : 'Fill in the blanks below.'}
                </Text>
                {allFilled && <View style={styles.seal} />}
              </View>
              {L5_SLOTS.map((slot) => (
                <View key={slot.id} style={styles.slotGroup}>
                  <Text style={styles.slotLead}>{slot.lead}…</Text>
                  <View style={styles.chipRow}>
                    {slot.options.map((opt) => {
                      const on = choices[slot.id] === opt;
                      return (
                        <Pressable
                          key={opt}
                          onPress={() => set(slot.id, opt)}
                          style={[styles.chip, on && { borderColor: v3.accent, backgroundColor: hsla(v3.accent, 0.18) }]}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.chipText, on && { color: colors.textPrimary }]}>{opt}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <BeginButton
              fullWidth
              label="Seal it"
              disabled={!allFilled}
              onPress={() => { tap(); setStage('congrats'); }}
            />
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={3}
            gold={false}
            congrats={L5_CONGRATS}
            buttonLabel="Back to home"
            onNext={() => { tap(); onDone(); }}
          >
            <View style={styles.l5PlanCard}>
              <Text style={styles.l5PlanLabel}>Your plan</Text>
              <Text style={styles.l5PlanText}>{sentence}</Text>
            </View>
            <KindWord />
          </LevelCongrats>
        )}
      </SafeAreaView>

      {stage === 'congrats' && <RingCelebration hue={VIOLET_BURST} />}
    </View>
  );
}

// Press-and-hold ~3s to fill; it tints blue -> violet like a slow breath.
function KindWord() {
  const [filled, setFilled] = useState(false);
  const progress = useSharedValue(0);
  const HOLD_MS = 3000;

  const complete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    recordKindWord().catch(() => {});
    setFilled(true);
  }, []);

  const start = () => {
    if (filled) return;
    progress.value = withTiming(1, { duration: HOLD_MS }, (done) => {
      if (done) runOnJS(complete)();
    });
  };
  const end = () => {
    if (!filled) progress.value = withTiming(0, { duration: 350 });
  };

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + progress.value * 0.4 }], opacity: 0.4 + progress.value * 0.6 }));

  return (
    <View style={styles.kindWrap}>
      <Text style={styles.kindTitle}>{KIND_WORD.title}</Text>
      <Text style={styles.cardBody}>{KIND_WORD.body}</Text>
      <Pressable onPressIn={start} onPressOut={end} disabled={filled} accessibilityLabel={KIND_WORD.hold}>
        <View style={styles.kindOrbWrap}>
          <Animated.View style={[styles.kindOrb, fillStyle]} />
        </View>
      </Pressable>
      <Text style={styles.kindHint}>{filled ? KIND_WORD.done : KIND_WORD.hold}</Text>
    </View>
  );
}

// --- helpers -----------------------------------------------------------

function hsla(color: string, alpha: number): string {
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  return color;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  back: { fontFamily: 'Poppins-Light', fontSize: 30, lineHeight: 34, color: colors.textSubtitle },

  // Level 1 (Truth/Myth) arc.
  l1Safe: { flex: 1, paddingHorizontal: 24 },
  l1TopBar: { flexDirection: 'row', alignItems: 'center', minHeight: 34, gap: 12, marginTop: 4 },
  l1Segments: { flex: 1, flexDirection: 'row', gap: 6 },
  l1Seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  l1SegOn: { backgroundColor: v3.accent },
  l1Body: { flex: 1, paddingBottom: 12 },
  l1Center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  l1Kicker: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 27,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  l1Subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  l1EmotionChip: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: hsla(v3.accent, 0.42),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hsla(v3.accent, 0.85),
  },
  l1EmotionChipText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  l1Orb1: { position: 'absolute', top: 10, left: -20, opacity: 0.3, transform: [{ rotate: '-18deg' }] },
  l1Orb2: { position: 'absolute', top: -12, right: -14, opacity: 0.32, transform: [{ rotate: '22deg' }] },
  l1Orb3: { position: 'absolute', top: '46%', right: 8, opacity: 0.1, transform: [{ rotate: '-9deg' }] },
  l1Orb4: { position: 'absolute', bottom: 96, left: -24, opacity: 0.3, transform: [{ rotate: '14deg' }] },
  l1Level: { fontFamily: 'Poppins-SemiBold', fontSize: 30, color: colors.textPrimary, textAlign: 'center' },
  // Small eyebrow above a level's name, for clear hierarchy (LEVEL 3 > the name).
  l1Eyebrow: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  l1RoundBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: hsla(v3.accent, 0.2),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hsla(v3.accent, 0.5),
  },
  l1RoundText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.3 },
  l1CardsHero: { flexDirection: 'row', marginTop: 20, height: 150, alignItems: 'center', justifyContent: 'center' },
  l1HeroCard: { width: 120, height: 120, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  l1HeroTruth: { backgroundColor: hsla(TRUTH_BLUE, 0.9), transform: [{ rotate: '-8deg' }], marginRight: -18, zIndex: 2 },
  l1HeroMyth: { backgroundColor: hsla(MYTH_PINK, 0.85), transform: [{ rotate: '7deg' }] },
  l1HeroCardText: { fontFamily: 'Poppins-Medium', fontSize: 20, color: '#1a1526' },
  l1Statement: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    lineHeight: 33,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  l1Bottom: { gap: 12 },
  l1Choices: { flexDirection: 'row', gap: 12 },
  l1Choice: {
    flex: 1,
    height: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  l1ChoiceTruth: { backgroundColor: hsla(TRUTH_BLUE, 0.9), borderColor: TRUTH_BLUE },
  l1ChoiceMyth: { backgroundColor: hsla(MYTH_PINK, 0.88), borderColor: MYTH_PINK },
  l1ChoiceLabel: { fontFamily: 'Poppins-Medium', fontSize: 22, color: '#1a1526' },
  l1Reveal: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  l1RevealRight: { backgroundColor: hsla(v3.regulated, 0.16), borderColor: hsla(v3.regulated, 0.5) },
  l1RevealWrong: { backgroundColor: hsla(v3.activated, 0.16), borderColor: hsla(v3.activated, 0.5) },
  l1Verdict: { fontFamily: 'Poppins-SemiBold', fontSize: 18, marginBottom: 6 },
  l1RevealText: { fontFamily: 'Poppins-Light', fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  l1CongratsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 18,
  },
  l1CongratsSub: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  l1CongratsCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  l1CongratsBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Level 2 (Big vs Small) extras.
  l2Title: { fontFamily: 'Poppins-SemiBold', fontSize: 31, lineHeight: 38, color: colors.textPrimary, textAlign: 'center' },
  // L3 intro, point-wise: a lead line, then the two solutions highlighted, "or" between.
  l3Points: { alignSelf: 'stretch', gap: 9, paddingHorizontal: 8, marginTop: 2 },
  l3IntroLead: { fontFamily: 'Poppins-Light', fontSize: 15, color: colors.textSubtitle, textAlign: 'center', marginBottom: 2 },
  l3Point: { fontFamily: 'Poppins-Light', fontSize: 16, lineHeight: 23, color: colors.textPrimary, textAlign: 'center' },
  l3PointTerm: { fontFamily: 'Poppins-SemiBold' },
  l3PointOr: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textSubtitle, textAlign: 'center' },
  l2Subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 18,
  },
  l2HeroSmall: { backgroundColor: hsla(SMALL_PINK, 0.88), transform: [{ rotate: '-8deg' }], marginRight: -18, zIndex: 2 },
  l2HeroBig: { backgroundColor: hsla(BIG_CORAL, 0.85), transform: [{ rotate: '7deg' }] },
  l2Scene: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Cheat page: top-aligned like the rest, roomy table, bigger text to skim.
  l2CheatCenter: { flex: 1, gap: 14, paddingTop: 8 },
  l2CheatKicker: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: v3.accent,
    textAlign: 'center',
  },
  l2CheatTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 25, lineHeight: 32, color: colors.textPrimary, textAlign: 'center' },
  l2Table: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    overflow: 'hidden',
    marginTop: 4,
  },
  l2TableHead: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  l2TableHeadCell: { flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: 16, letterSpacing: 0.3 },
  l2TableRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  l2RowLabel: { width: 76, fontFamily: 'Poppins-Medium', fontSize: 15, color: colors.textSubtitle },
  l2RowCell: { flex: 1, fontFamily: 'Poppins-Light', fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  l2TableRowBad: { backgroundColor: hsla(SUPPRESS_RED, 0.16) },
  l2RowCellBad: { color: SUPPRESS_RED },
  l2Choice: {
    flex: 1,
    minHeight: 108,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  l2ChoiceSmall: { backgroundColor: hsla(SMALL_PINK, 0.9), borderColor: SMALL_PINK },
  l2ChoiceBig: { backgroundColor: hsla(BIG_CORAL, 0.9), borderColor: BIG_CORAL },

  // Level 3 (What helps most) extras.
  l3Prompt: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    lineHeight: 29,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  l3PlayBottom: { flex: 1, justifyContent: 'flex-end', gap: 12 },
  l3Solutions: { gap: 10 },
  l3Solution: {
    minHeight: 56,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  l3SolutionText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  // Congrats page: clean-run gold tag + centering scroll wrapper.
  congratsScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  cleanRunTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `hsl(${GOLD_HUE}, 78%, 62%)`,
  },
  cleanRunText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    color: '#2a2010',
    letterSpacing: 0.5,
  },

  // Level 4 · Rehearse (the guided 4-7-8 breath).
  l4BreatheCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  l4PhaseLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 28,
  },
  l4RoundLabel: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle, textAlign: 'center' },
  l4Skip: { alignItems: 'center', paddingVertical: 14 },
  l4SkipText: { fontFamily: 'Poppins-Medium', fontSize: 15, color: colors.textSubtitle },

  // Level 5 · Your move next time (chip builder + plan readback).
  l5PlayScroll: { paddingTop: 8, paddingBottom: 20, gap: 16 },
  l5SentenceCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    padding: 18,
  },
  l5PlanCard: {
    alignSelf: 'stretch',
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hsla(v3.accent, 0.5),
    backgroundColor: hsla(v3.accent, 0.12),
  },
  l5PlanLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    marginBottom: 6,
  },
  l5PlanText: { fontFamily: 'Poppins-Medium', fontSize: 15, lineHeight: 22, color: colors.textPrimary },

  // Chips (L5)
  sentence: { fontFamily: 'Poppins-Medium', fontSize: 17, lineHeight: 26, color: colors.textPrimary },
  seal: { height: 2, borderRadius: 1, backgroundColor: v3.accent, marginTop: 8 },
  slotGroup: { gap: 8 },
  slotLead: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textSubtitle },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipText: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle },

  // Kind word
  cardBody: { fontFamily: 'Poppins-Light', fontSize: 14, lineHeight: 21, color: colors.textPrimary },
  kindWrap: {
    alignItems: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  kindTitle: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  kindOrbWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  kindOrb: { width: 72, height: 72, borderRadius: 36, backgroundColor: v3.accent },
  kindHint: { fontFamily: 'Poppins-Light', fontSize: 12.5, color: colors.textSubtitle },
});
