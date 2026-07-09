// The V3 emotion-training game runner: the Irritability chapter, six levels,
// each with a distinct interaction (swipe, tap, hold-to-preview, slider, breathe,
// chip-assembly) plus the woven kind-word beat. Best-fit, gentle: no red X ever.
// The wave header is the same water from the result screen, and it visibly
// settles a little as each level completes.
//
// Content lives in v3/game-content.ts; progress persists via store/training-v3.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CelebrationParticles } from '@/components/CelebrationParticles';
import { Orb } from '@/components/orb';
import { RingCelebration } from '@/components/RingCelebration';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { WaveMeter } from '@/v3/v3-graphics';
import { waveMeterLabel } from '@/v3/v3-content';
import {
  IRRITABILITY_LEVELS,
  KIND_WORD,
  L1_CARDS,
  L1_CLOSE,
  L1_CONGRATS,
  L1_INTRO,
  L2_CHEAT,
  L2_CLOSE,
  L2_CONGRATS,
  L2_INTRO,
  L2_SCENES,
  L3_CHEAT,
  L3_CONGRATS,
  L3_INTRO,
  L3_PAYLOAD,
  L3_SCENES,
  L4_SCENE,
  L4_ZONES,
  L5_TEACH,
  L5_TECHNIQUE_ID,
  L6_SLOTS,
  buildL6Sentence,
  type GameLevel,
  type Intensity,
  type L3Option,
  type MoveTier,
} from '@/v3/game-content';
import {
  LEVEL_SKILL_GAIN,
  MAX_SKILL,
  SEED_SKILL,
  getTraining,
  recordKindWord,
  recordLevelComplete,
} from '@/store/training-v3';
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

export default function GameV3() {
  const { width: screenW } = useWindowDimensions();
  const levels = IRRITABILITY_LEVELS;
  const [index, setIndex] = useState(0);
  const [skill, setSkill] = useState(SEED_SKILL);
  const [ready, setReady] = useState(false);

  // Optional deep-link jump: /game-v3?level=3 opens Level 3 directly (1-indexed).
  const { level: levelParam } = useLocalSearchParams<{ level?: string }>();

  // Resume where she left off: start at the first level she has not completed
  // (or a jumped-to level, or the beginning if the chapter is done).
  useEffect(() => {
    getTraining()
      .then((t) => {
        setSkill(t.skill);
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

  const done = index >= levels.length;
  const level = done ? undefined : levels[index];

  const advance = useCallback((levelId: string) => {
    recordLevelComplete(levelId).catch(() => {});
    setSkill((s) => Math.min(MAX_SKILL, s + LEVEL_SKILL_GAIN));
    setIndex((i) => i + 1);
  }, []);

  const meter = waveMeterLabel(skill, false);
  const stripW = Math.min(screenW - 40, 420);

  // Hold the first paint until we know the resume point, so we never flash
  // Level 1 before jumping to where she left off.
  if (!ready) {
    return (
      <View style={styles.root}>
        <BackgroundGradient />
      </View>
    );
  }

  // Level 1 is the redesigned Truth/Myth arc: a self-contained, full-screen flow
  // (game intro -> level intro -> play -> congrats), big buttons at the bottom.
  // Levels 2-6 keep the shared runner below for now.
  if (!done && index === 0) {
    return <LevelOne onDone={() => advance(levels[0].id)} onExit={() => router.back()} />;
  }
  if (!done && index === 1) {
    return <LevelTwo onDone={() => advance(levels[1].id)} onExit={() => router.back()} />;
  }
  if (!done && index === 2) {
    return <LevelThree onDone={() => advance(levels[2].id)} onExit={() => router.back()} />;
  }

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <View style={styles.dots}>
            {levels.map((l, i) => (
              <View
                key={l.id}
                style={[
                  styles.dot,
                  i < index && styles.dotDone,
                  i === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.waveHeader}>
          <WaveMeter
            activation={0.5}
            skill={skill}
            label={meter.label}
            note={meter.note}
            showYou={false}
            width={stripW}
            height={66}
          />
        </View>

        {done ? (
          <Completion onClose={() => router.back()} />
        ) : (
          <LevelBody key={level!.id} level={level!} onDone={() => advance(level!.id)} />
        )}
      </SafeAreaView>
    </View>
  );
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

// --- Level 1 · the redesigned Truth/Myth arc --------------------------
// Self-contained, full-screen: game intro -> level intro -> play -> congrats.
// Big buttons at the bottom, soft retry (never a harsh fail), a brand particle
// burst on each right answer, and a ring celebration on the congrats page.
function LevelOne({ onDone, onExit }: { onDone: () => void; onExit: () => void }) {
  const [stage, setStage] = useState<'gameIntro' | 'levelIntro' | 'play' | 'congrats'>('gameIntro');
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<boolean | null>(null); // Truth = true, Myth = false
  const [celebrate, setCelebrate] = useState(false);

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
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Orb size={110} tierRingCount={1} ringHues={SOUL_RING_HUES} accumulate />
              <Text style={styles.l1CongratsTitle}>{L1_CONGRATS.title}</Text>
              <Text style={styles.l1CongratsSub}>{L1_CONGRATS.subtitle}</Text>
              <View style={styles.l1CongratsCard}>
                <Text style={styles.l1CongratsBody}>{L1_CONGRATS.body}</Text>
              </View>
            </View>
            <BeginButton fullWidth label="On to Level 2" onPress={() => { tap(); onDone(); }} />
          </View>
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={275} />}
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
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Orb size={110} tierRingCount={2} ringHues={SOUL_RING_HUES} accumulate />
              <Text style={styles.l1CongratsTitle}>{L2_CONGRATS.title}</Text>
              <Text style={styles.l1CongratsSub}>{L2_CONGRATS.subtitle}</Text>
              <View style={styles.l1CongratsCard}>
                <Text style={styles.l1CongratsBody}>{L2_CONGRATS.body}</Text>
              </View>
            </View>
            <BeginButton fullWidth label="On to Level 3" onPress={() => { tap(); onDone(); }} />
          </View>
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={275} />}
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
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Orb size={110} tierRingCount={3} ringHues={SOUL_RING_HUES} accumulate />
              <Text style={styles.l1CongratsTitle}>{L3_CONGRATS.title}</Text>
              <Text style={styles.l1CongratsSub}>{L3_CONGRATS.subtitle}</Text>
              <View style={styles.l1CongratsCard}>
                <Text style={styles.l1CongratsBody}>{L3_CONGRATS.body}</Text>
              </View>
            </View>
            <BeginButton fullWidth label="On to Level 4" onPress={() => { tap(); onDone(); }} />
          </View>
        )}
      </SafeAreaView>

      {celebrate && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={275} />}
    </View>
  );
}

// Routes each level to its interaction, with a shared intro header.
function LevelBody({ level, onDone }: { level: GameLevel; onDone: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(450)}>
        <Text style={styles.levelKicker}>
          Level {level.n} · {level.title}
        </Text>
        <Text style={styles.intro}>{level.intro}</Text>
      </Animated.View>
      {level.kind === 'swipe' && <LevelSwipe onDone={onDone} />}
      {level.kind === 'tap' && <LevelTap onDone={onDone} />}
      {level.kind === 'preview' && <LevelPreview onDone={onDone} />}
      {level.kind === 'slider' && <LevelSlider onDone={onDone} />}
      {level.kind === 'breathe' && <LevelBreathe onDone={onDone} />}
      {level.kind === 'chips' && <LevelChips onDone={onDone} />}
    </ScrollView>
  );
}

// --- L1 · swipe true / myth -------------------------------------------

function LevelSwipe({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [side, setSide] = useState<null | 'true' | 'myth'>(null);
  const card = L1_CARDS[i];
  const tx = useSharedValue(0);
  const THRESH = 90;

  const commit = useCallback((s: 'true' | 'myth') => {
    tap();
    setSide(s);
  }, []);

  const pan = Gesture.Pan()
    .enabled(side === null)
    .onUpdate((e) => {
      tx.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX > THRESH) {
        tx.value = withTiming(360);
        runOnJS(commit)('true');
      } else if (e.translationX < -THRESH) {
        tx.value = withTiming(-360);
        runOnJS(commit)('myth');
      } else {
        tx.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { rotateZ: `${tx.value / 22}deg` }],
  }));
  const trueHint = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, tx.value / THRESH)) }));
  const mythHint = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, -tx.value / THRESH)) }));

  const next = () => {
    tap();
    tx.value = 0;
    setSide(null);
    if (i + 1 >= L1_CARDS.length) onDone();
    else setI(i + 1);
  };

  const gotItRight = side != null && (side === 'true') === card.isTrue;

  return (
    <View style={styles.interaction}>
      {side == null ? (
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.swipeCard, cardStyle]}>
            <Animated.Text style={[styles.swipeHintRight, trueHint]}>TRUE ▶</Animated.Text>
            <Animated.Text style={[styles.swipeHintLeft, mythHint]}>◀ MYTH</Animated.Text>
            <Text style={styles.swipeStatement}>{card.statement}</Text>
            <Text style={styles.swipeHelp}>Swipe right if true, left if myth</Text>
          </Animated.View>
        </GestureDetector>
      ) : (
        <Animated.View entering={FadeIn.duration(300)} style={styles.revealCard}>
          <Text style={[styles.verdict, { color: card.isTrue ? v3.regulated : v3.activated }]}>
            {card.isTrue ? 'True' : 'Myth'}
          </Text>
          <Text style={styles.revealBody}>{card.reveal}</Text>
          {!gotItRight && <Text style={styles.gentleNote}>Good one to know. No stress.</Text>}
        </Animated.View>
      )}

      <Text style={styles.counter}>
        {i + 1} of {L1_CARDS.length}
      </Text>
      {side != null && (
        <BeginButton
          fullWidth
          label={i + 1 >= L1_CARDS.length ? 'Done' : 'Next'}
          onPress={next}
        />
      )}
      {i + 1 >= L1_CARDS.length && side != null && <Text style={styles.close}>{L1_CLOSE}</Text>}
    </View>
  );
}

// --- L2 · binary tap (A little / A lot) -------------------------------

function LevelTap({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<Intensity | null>(null);
  const scene = L2_SCENES[i];
  const choose = (p: Intensity) => {
    tap();
    setPick(p);
  };
  const next = () => {
    tap();
    setPick(null);
    if (i + 1 >= L2_SCENES.length) onDone();
    else setI(i + 1);
  };
  const right = pick != null && pick === scene.answer;
  return (
    <View style={styles.interaction}>
      <View style={styles.sceneCard}>
        <Text style={styles.sceneText}>{scene.scene}</Text>
      </View>
      <View style={styles.choiceRow}>
        <ChoiceButton
          label="A little"
          sub="Annoyed, still reachable"
          on={pick === 'little'}
          dim={pick != null && pick !== 'little'}
          onPress={() => choose('little')}
          disabled={pick != null}
          color={v3.regulated}
        />
        <ChoiceButton
          label="A lot"
          sub="Flooded, past talking"
          on={pick === 'lot'}
          dim={pick != null && pick !== 'lot'}
          onPress={() => choose('lot')}
          disabled={pick != null}
          color={v3.activated}
        />
      </View>
      {pick != null && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.whyCard}>
          <Text style={styles.whyLead}>{right ? 'Yes.' : 'Look again.'}</Text>
          <Text style={styles.revealBody}>{scene.why}</Text>
        </Animated.View>
      )}
      <Text style={styles.counter}>
        {i + 1} of {L2_SCENES.length}
      </Text>
      {pick != null && (
        <BeginButton fullWidth label={i + 1 >= L2_SCENES.length ? 'Done' : 'Next'} onPress={next} />
      )}
      {i + 1 >= L2_SCENES.length && pick != null && <Text style={styles.close}>{L2_CLOSE}</Text>}
    </View>
  );
}

function ChoiceButton({
  label,
  sub,
  on,
  dim,
  onPress,
  disabled,
  color,
}: {
  label: string;
  sub: string;
  on: boolean;
  dim: boolean;
  onPress: () => void;
  disabled: boolean;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.choiceBtn,
        on && { borderColor: color, backgroundColor: hsla(color, 0.16) },
        dim && { opacity: 0.4 },
      ]}
      accessibilityRole="button"
    >
      <Text style={styles.choiceLabel}>{label}</Text>
      <Text style={styles.choiceSub}>{sub}</Text>
    </Pressable>
  );
}

// --- L3 · card pick, press-and-hold to preview the future --------------

function LevelPreview({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [committed, setCommitted] = useState<number | null>(null);
  const scene = L3_SCENES[i];

  const commit = (optIndex: number) => {
    tap();
    setCommitted(optIndex);
  };
  const next = () => {
    tap();
    setCommitted(null);
    if (i + 1 >= L3_SCENES.length) onDone();
    else setI(i + 1);
  };
  const committedOpt = committed != null ? scene.options[committed] : null;

  return (
    <View style={styles.interaction}>
      <View style={styles.sceneCard}>
        <IntensityBadge intensity={scene.intensity} />
        <Text style={styles.sceneText}>{scene.prompt}</Text>
      </View>
      <View style={styles.moveList}>
        {scene.options.map((o, idx) => (
          <MoveCard
            key={o.label}
            option={o}
            committed={committed === idx}
            faded={committed != null && committed !== idx}
            onCommit={() => commit(idx)}
          />
        ))}
      </View>
      {committedOpt && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.whyCard}>
          <Text style={[styles.whyLead, { color: tierColor(committedOpt.tier) }]}>
            {committedOpt.tier === 'best' ? 'Best fit.' : 'That is one way.'}
          </Text>
          <Text style={styles.revealBody}>{committedOpt.future}</Text>
        </Animated.View>
      )}
      <Text style={styles.counter}>
        {i + 1} of {L3_SCENES.length}
      </Text>
      {committed != null && (
        <BeginButton fullWidth label={i + 1 >= L3_SCENES.length ? 'Done' : 'Next'} onPress={next} />
      )}
      {i + 1 >= L3_SCENES.length && committed != null && (
        <Text style={styles.close}>{L3_PAYLOAD}</Text>
      )}
    </View>
  );
}

// A move card: press-and-hold (~260ms) to peek its future; quick tap to commit.
function MoveCard({
  option,
  committed,
  faded,
  onCommit,
}: {
  option: L3Option;
  committed: boolean;
  faded: boolean;
  onCommit: () => void;
}) {
  const [peeking, setPeeking] = useState(false);
  const heldRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPressIn = () => {
    heldRef.current = false;
    timer.current = setTimeout(() => {
      heldRef.current = true;
      setPeeking(true);
    }, 260);
  };
  const onPressOut = () => {
    if (timer.current) clearTimeout(timer.current);
    if (heldRef.current) {
      setPeeking(false); // was a hold-to-preview; release retracts
    } else if (!committed) {
      onCommit(); // was a quick tap; commit
    }
  };

  const show = peeking || committed;
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.moveCard,
        committed && { borderColor: tierColor(option.tier), backgroundColor: hsla(tierColor(option.tier), 0.14) },
        faded && { opacity: 0.4 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={option.label}
    >
      <Text style={styles.moveLabel}>{option.label}</Text>
      {show ? (
        <Text style={[styles.moveFuture, peeking && !committed && styles.moveFutureGhost]}>
          {option.future}
        </Text>
      ) : (
        <Text style={styles.moveHint}>Hold to preview · tap to pick</Text>
      )}
    </Pressable>
  );
}

function IntensityBadge({ intensity }: { intensity: Intensity }) {
  const little = intensity === 'little';
  const color = little ? v3.regulated : v3.activated;
  return (
    <View style={[styles.badge, { borderColor: hsla(color, 0.6), backgroundColor: hsla(color, 0.14) }]}>
      <Text style={[styles.badgeText, { color }]}>{little ? 'A little' : 'A lot'}</Text>
    </View>
  );
}

// --- L4 · slider on a timeline ----------------------------------------

function LevelSlider({ onDone }: { onDone: () => void }) {
  const [trackW, setTrackW] = useState(0);
  const [zoneIdx, setZoneIdx] = useState(1); // start at the middle (best-fit)
  const [locked, setLocked] = useState(false);
  const x = useSharedValue(0.5);

  const onLayout = (e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width);

  const setZoneFromFraction = useCallback((f: number) => {
    const idx = f < 0.34 ? 0 : f < 0.67 ? 1 : 2;
    setZoneIdx((prev) => {
      if (prev !== idx) tap();
      return idx;
    });
  }, []);

  const pan = Gesture.Pan()
    .enabled(!locked && trackW > 0)
    .onUpdate((e) => {
      const f = Math.max(0, Math.min(1, e.x / trackW));
      x.value = f;
      runOnJS(setZoneFromFraction)(f);
    });

  const thumbStyle = useAnimatedStyle(() => ({ left: `${x.value * 100}%` }));
  const zone = L4_ZONES[zoneIdx];

  return (
    <View style={styles.interaction}>
      <View style={styles.sceneCard}>
        <Text style={styles.sceneText}>{L4_SCENE}</Text>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onLayout}>
          <View style={[styles.trackZone, { backgroundColor: hsla(v3.activated, 0.18) }]} />
          <View style={[styles.trackZone, { backgroundColor: hsla(v3.regulated, 0.22) }]} />
          <View style={[styles.trackZone, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
      <View style={styles.trackLabels}>
        <Text style={styles.trackEnd}>now</Text>
        <Text style={styles.trackEnd}>take 20</Text>
        <Text style={styles.trackEnd}>never</Text>
      </View>

      <Animated.View key={zone.id} entering={FadeIn.duration(220)} style={styles.whyCard}>
        <Text style={[styles.whyLead, { color: zone.best ? v3.regulated : v3.activated }]}>
          {zone.label}
        </Text>
        <Text style={styles.revealBody}>{zone.future}</Text>
      </Animated.View>

      {!locked ? (
        <BeginButton fullWidth label="Lock it in" onPress={() => { tap(); setLocked(true); }} />
      ) : (
        <>
          <Text style={styles.close}>
            {zone.best
              ? 'That is it. Say the real thing, just not mid-flood.'
              : 'Notice the cost at each end. The middle is where it lands.'}
          </Text>
          <BeginButton fullWidth label="Done" onPress={onDone} />
        </>
      )}
    </View>
  );
}

// --- L5 · rehearse: the built Wind Down breath ------------------------

function LevelBreathe({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.interaction}>
      <View style={styles.breatheOrb}>
        <Orb size={140} />
      </View>
      <Text style={styles.teach}>{L5_TEACH}</Text>
      <BeginButton
        fullWidth
        label="Breathe with Niyora"
        onPress={() => {
          tap();
          router.push({ pathname: '/session', params: { id: L5_TECHNIQUE_ID } });
        }}
      />
      <Pressable onPress={onDone} style={styles.secondary} accessibilityRole="button">
        <Text style={styles.secondaryText}>Continue</Text>
      </Pressable>
    </View>
  );
}

// --- L6 · tap-to-assemble if-then chips -------------------------------

function LevelChips({ onDone }: { onDone: () => void }) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const allFilled = L6_SLOTS.every((s) => choices[s.id]);
  const set = (slot: string, opt: string) => {
    tap();
    setChoices((c) => ({ ...c, [slot]: opt }));
  };
  return (
    <View style={styles.interaction}>
      <View style={[styles.sceneCard, allFilled && { borderColor: hsla(v3.accent, 0.6) }]}>
        <Text style={styles.sentence}>
          {allFilled ? buildL6Sentence(choices) : 'Fill in the blanks below.'}
        </Text>
        {allFilled && <View style={styles.seal} />}
      </View>

      {L6_SLOTS.map((slot) => (
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

      {allFilled && <BeginButton fullWidth label="Seal it" onPress={onDone} />}
    </View>
  );
}

// --- Completion + the woven kind word ---------------------------------

function Completion({ onClose }: { onClose: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center' }}>
        <Orb size={92} />
        <Text style={styles.doneTitle}>Chapter done</Text>
        <Text style={styles.doneBody}>You read the wave and picked the move. The water is steadier for it.</Text>
      </Animated.View>
      <KindWord />
      <BeginButton fullWidth label="Back to home" onPress={onClose} />
    </ScrollView>
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

function tierColor(tier: MoveTier): string {
  return tier === 'best' ? v3.regulated : tier === 'lesser' ? v3.activated : v3.activated;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 34, gap: 12 },
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
  l3HeroReframe: { backgroundColor: hsla(TRUTH_BLUE, 0.85), transform: [{ rotate: '-8deg' }], marginRight: -18, zIndex: 2 },
  l3HeroSpace: { backgroundColor: hsla(BIG_CORAL, 0.82), transform: [{ rotate: '7deg' }] },
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

  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.16)' },
  dotDone: { backgroundColor: v3.accent },
  dotActive: { backgroundColor: colors.textPrimary },
  waveHeader: { alignItems: 'center', marginTop: 4, marginBottom: 6 },
  body: { paddingBottom: 28, gap: 14 },

  levelKicker: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSubtitle,
    marginBottom: 8,
  },
  intro: { fontFamily: 'Poppins-Light', fontSize: 17, lineHeight: 25, color: colors.textPrimary },
  interaction: { gap: 14, marginTop: 4 },

  // Swipe
  swipeCard: {
    minHeight: 180,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    padding: 20,
    justifyContent: 'center',
  },
  swipeStatement: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  swipeHelp: {
    fontFamily: 'Poppins-Light',
    fontSize: 12.5,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 14,
  },
  swipeHintRight: {
    position: 'absolute',
    right: 16,
    top: 14,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 1,
    color: v3.regulated,
  },
  swipeHintLeft: {
    position: 'absolute',
    left: 16,
    top: 14,
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 1,
    color: v3.activated,
  },
  revealCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    padding: 20,
  },
  verdict: { fontFamily: 'Poppins-SemiBold', fontSize: 24, marginBottom: 8 },
  revealBody: { fontFamily: 'Poppins-Light', fontSize: 15, lineHeight: 22, color: colors.textPrimary },
  gentleNote: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textSubtitle, marginTop: 10 },
  counter: { fontFamily: 'Poppins-Light', fontSize: 12, color: colors.textSubtitle, textAlign: 'center' },
  close: { fontFamily: 'Poppins-Light', fontSize: 14, lineHeight: 21, color: colors.textSubtitle, textAlign: 'center' },

  // Scene / choices
  sceneCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    padding: 18,
    gap: 10,
  },
  sceneText: { fontFamily: 'Poppins-Light', fontSize: 17, lineHeight: 25, color: colors.textPrimary },
  choiceRow: { flexDirection: 'row', gap: 12 },
  choiceBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    minHeight: 76,
  },
  choiceLabel: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  choiceSub: { fontFamily: 'Poppins-Light', fontSize: 12.5, color: colors.textSubtitle, marginTop: 3 },
  whyCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 16,
  },
  whyLead: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary, marginBottom: 4 },

  // Move cards (L3)
  moveList: { gap: 10 },
  moveCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 15,
  },
  moveLabel: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  moveHint: { fontFamily: 'Poppins-Light', fontSize: 12, color: colors.textSubtitle, marginTop: 5 },
  moveFuture: { fontFamily: 'Poppins-Light', fontSize: 14, lineHeight: 20, color: colors.textPrimary, marginTop: 7 },
  moveFutureGhost: { color: colors.textSubtitle, fontStyle: 'italic' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  badgeText: { fontFamily: 'Poppins-Medium', fontSize: 12, letterSpacing: 0.3 },

  // Slider (L4)
  track: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  trackZone: { flex: 1, height: '100%' },
  thumb: {
    position: 'absolute',
    top: -4,
    marginLeft: -13,
    width: 26,
    height: 54,
    borderRadius: 13,
    backgroundColor: colors.textPrimary,
    borderWidth: 2,
    borderColor: v3.accent,
  },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  trackEnd: { fontFamily: 'Poppins-Light', fontSize: 12, color: colors.textSubtitle },

  // Breathe (L5)
  breatheOrb: { alignItems: 'center', marginVertical: 8 },
  teach: { fontFamily: 'Poppins-Light', fontSize: 16, lineHeight: 24, color: colors.textPrimary, textAlign: 'center' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { fontFamily: 'Poppins-Medium', fontSize: 15, color: colors.textSubtitle },

  // Chips (L6)
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

  // Completion + kind word
  doneTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 22, color: colors.textPrimary, marginTop: 16 },
  doneBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 8,
  },
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
