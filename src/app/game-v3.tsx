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

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CelebrationParticles } from '@/components/CelebrationParticles';
import { Orb } from '@/components/orb';
import { RingCelebration } from '@/components/RingCelebration';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import {
  getChapter,
  type Chapter,
  type Intensity,
  type MoveTier,
} from '@/v3/game-content';
import { getTraining, recordLevelComplete } from '@/store/training-v3';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import type { BreathPhase } from '@/models/techniques';
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
const GOLD_RING_HUES = [GOLD_HUE, GOLD_HUE, GOLD_HUE, GOLD_HUE] as const;
const VIOLET_BURST = 275;

export default function GameV3() {
  // Which emotion's chapter to play: /game-v3?chapter=anxiety. Falls back to
  // Irritability when the param is missing or unknown.
  const { level: levelParam, chapter: chapterParam } = useLocalSearchParams<{
    level?: string;
    chapter?: string;
  }>();
  const ch = getChapter(chapterParam);
  const levels = ch.levels;
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);

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
      return <LevelOne ch={ch} onDone={() => advance(levels[0].id)} onExit={exit} />;
    case 1:
      return <LevelTwo ch={ch} onDone={() => advance(levels[1].id)} onExit={exit} />;
    case 2:
      return <LevelThree ch={ch} onDone={() => advance(levels[2].id)} onExit={exit} />;
    case 3:
      return <LevelFour ch={ch} onDone={() => advance(levels[3].id)} onExit={exit} />;
    default:
      return <LevelFive ch={ch} onDone={() => finish(levels[4].id)} onExit={exit} />;
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
  finale = false,
}: {
  ringCount: number;
  gold: boolean;
  congrats: { title: string; subtitle?: string; body: string };
  buttonLabel: string;
  onNext: () => void;
  children?: React.ReactNode;
  finale?: boolean;
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
            size={finale ? 140 : 110}
            tierRingCount={ringCount}
            ringHues={gold ? GOLD_RING_HUES : SOUL_RING_HUES}
            accumulate
          />
          <Text style={styles.l1CongratsTitle}>{congrats.title}</Text>
          {congrats.subtitle ? <Text style={styles.l1CongratsSub}>{congrats.subtitle}</Text> : null}
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
function LevelOne({ ch, onDone, onExit }: { ch: Chapter; onDone: () => void; onExit: () => void }) {
  const { L1_CARDS, L1_INTRO, L1_CONGRATS } = ch;
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
function LevelTwo({ ch, onDone, onExit }: { ch: Chapter; onDone: () => void; onExit: () => void }) {
  const { L1_INTRO, L2_INTRO, L2_CHEAT, L2_SCENES, L2_CONGRATS } = ch;
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
function LevelThree({ ch, onDone, onExit }: { ch: Chapter; onDone: () => void; onExit: () => void }) {
  const { L1_INTRO, L3_INTRO, L3_CHEAT, L3_SCENES, L3_CONGRATS } = ch;
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


// One big soul, faint and centered, behind the Level 4 intro + cheat pages.
function L4Backdrop() {
  return (
    <View pointerEvents="none" style={styles.l4Backdrop}>
      <Orb size={300} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
    </View>
  );
}

// The guided breath itself: five slow rounds of a 4s inhale / 8s exhale, driving
// the same growing orb as Quick Calm (breathRange) via useBreathCycle. Mounted
// only once she taps in, so each run starts fresh from round 1. No skipping.
const POWER_PHASES: BreathPhase[] = [
  { type: 'inhale', label: 'breathe in', duration: 4 },
  { type: 'exhale', label: 'breathe out', duration: 8 },
];
const POWER_ROUNDS = 5;
const POWER_BREATH_RANGE = { min: 0.7, max: 1.4 };

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function PowerBreath({
  onFinish,
  rounds = POWER_ROUNDS,
  finishLabel = 'Finish',
}: {
  onFinish: () => void;
  rounds?: number;
  finishLabel?: string;
}) {
  const cycle = useBreathCycle(POWER_PHASES, rounds, false);
  return (
    <View style={styles.l1Body}>
      <View style={styles.l4BreatheCenter}>
        <Orb
          size={200}
          phase={cycle.phase.type === 'hold2' ? 'hold' : cycle.phase.type}
          phaseDuration={cycle.phase.duration}
          breathRange={POWER_BREATH_RANGE}
        />
        <Text style={styles.l4PhaseLabel}>{cycle.done ? 'Well done' : cap(cycle.phase.label)}</Text>
        <Text style={styles.l4RoundLabel}>
          {cycle.done ? 'That is your power move' : `Round ${cycle.round} of ${rounds}`}
        </Text>
      </View>
      {cycle.done ? (
        <BeginButton fullWidth label={finishLabel} onPress={onFinish} />
      ) : (
        <View style={styles.l4Spacer} />
      )}
    </View>
  );
}

// --- Level 4 · The power move (teach the long exhale, then breathe) ----
// We have not covered breathing yet, so this level introduces it: what the move
// is, why the long exhale calms you, then five rounds done together. No skip.
function LevelFour({ ch, onDone, onExit }: { ch: Chapter; onDone: () => void; onExit: () => void }) {
  const { L1_INTRO, L4_INTRO, L4_TEACH, L4_CONGRATS } = ch;
  const [stage, setStage] = useState<'levelIntro' | 'cheat' | 'breathe' | 'congrats'>('levelIntro');
  const [started, setStarted] = useState(false);

  const back = () => {
    tap();
    if (stage === 'breathe') {
      setStarted(false);
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
            <View style={{ flex: 1 }} />
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'levelIntro' && (
          <View style={styles.l1Body}>
            <L4Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L4_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L4_INTRO.title}</Text>
              <Text style={styles.l2Subtitle}>{L4_INTRO.subtitle}</Text>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('cheat'); }} />
          </View>
        )}

        {stage === 'cheat' && (
          <View style={styles.l1Body}>
            <L4Backdrop />
            <View style={styles.l2CheatCenter}>
              <Text style={styles.l2CheatKicker}>{L4_TEACH.kicker}</Text>
              <Text style={styles.l2CheatTitle}>{L4_TEACH.title}</Text>
              <Text style={styles.l4TeachRule}>{L4_TEACH.rule}</Text>
              <View style={styles.l4DoseTable}>
                {L4_TEACH.doses.map((d, idx) => (
                  <View key={d.size} style={[styles.l4DoseRow, idx > 0 && styles.l4DoseRowDivider]}>
                    <Text style={[styles.l4DoseSize, { color: idx === 0 ? SMALL_PINK : BIG_CORAL }]}>
                      {d.size}
                    </Text>
                    <Text style={styles.l4DoseAmount}>{d.amount}</Text>
                  </View>
                ))}
              </View>
            </View>
            <BeginButton fullWidth label={L4_TEACH.cta} onPress={() => { tap(); setStage('breathe'); }} />
          </View>
        )}

        {stage === 'breathe' && !started && (
          <View style={styles.l1Body}>
            <View style={styles.l4BreatheCenter}>
              <Orb size={200} still />
              <Text style={styles.l4PhaseLabel}>Ready when you are</Text>
              <Text style={styles.l4RoundLabel}>Three long exhales. I will count them with you.</Text>
            </View>
            <BeginButton fullWidth label="I can do it" onPress={() => { tap(); setStarted(true); }} />
          </View>
        )}

        {stage === 'breathe' && started && (
          <PowerBreath rounds={3} onFinish={() => { tap(); setStarted(false); setStage('congrats'); }} />
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


// Level 5 pattern: one huge soul zoomed in and tilted, so its rings sweep across
// the intro on a diagonal. The finale's own texture, distinct from the scattered
// soul-moons of L1-L3 and the single centered soul of L4.
function L5Backdrop() {
  return (
    <View pointerEvents="none" style={styles.l5Backdrop}>
      <View style={styles.l5BackdropOrb}>
        <Orb size={460} tierRingCount={4} ringHues={SOUL_RING_HUES} still />
      </View>
    </View>
  );
}

// --- Level 5 · The last test (a graded recap: read, move, breath, order) ----
// Four beats testing the whole chapter: read the size (L2), pick the move (L3),
// answer the breath (L4, as knowledge), then put the whole method in order. Each
// beat is graded, so a fully clean run earns gold. A big celebration on the last
// page. The scramble the reorder pool is shown in (indices into L5_REORDER.steps).
const L5_SCRAMBLE = [2, 0, 3, 1];

function LevelFive({ ch, onDone, onExit }: { ch: Chapter; onDone: () => void; onExit: () => void }) {
  const { L1_INTRO, L5_INTRO, L5_CAPSTONE, L5_BREATH_Q, L5_CONGRATS, L5_REORDER } = ch;
  const [stage, setStage] = useState<'levelIntro' | 'size' | 'move' | 'breath' | 'reorder' | 'congrats'>('levelIntro');
  const [sizeGuess, setSizeGuess] = useState<Intensity | null>(null);
  const [movePick, setMovePick] = useState<number | null>(null);
  const [breathPick, setBreathPick] = useState<number | null>(null);
  const [placed, setPlaced] = useState<number[]>([]);
  const [solved, setSolved] = useState(false); // reorder locked in correctly
  const [nudge, setNudge] = useState(false); // last check was wrong, try again
  const [celebrate, setCelebrate] = useState(false);
  const [flawless, setFlawless] = useState(true);

  const scene = L5_CAPSTONE;
  const sizeAnswered = sizeGuess !== null;
  const sizeRight = sizeAnswered && sizeGuess === scene.size;
  const chosen = movePick != null ? scene.options[movePick] : null;
  const moveBest = chosen?.tier === 'best';
  const breathAnswered = breathPick !== null;
  const breathRight = breathAnswered && L5_BREATH_Q.options[breathPick].correct;
  const allPlaced = placed.length === L5_REORDER.steps.length;
  const beat = stage === 'size' ? 0 : stage === 'move' ? 1 : stage === 'breath' ? 2 : stage === 'reorder' ? 3 : -1;

  const pickSize = (g: Intensity) => {
    if (sizeAnswered) return;
    if (g === scene.size) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setSizeGuess(g);
  };

  const nextSize = () => {
    tap();
    if (sizeRight) {
      setCelebrate(false);
      setStage('move');
    } else {
      setSizeGuess(null);
    }
  };

  const pickMove = (idx: number) => {
    if (movePick != null) return;
    if (scene.options[idx].tier === 'best') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setMovePick(idx);
  };

  const nextMove = () => {
    tap();
    if (moveBest) {
      setCelebrate(false);
      setStage('breath');
    } else {
      setMovePick(null);
    }
  };

  const pickBreath = (idx: number) => {
    if (breathAnswered) return;
    if (L5_BREATH_Q.options[idx].correct) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
    }
    setBreathPick(idx);
  };

  const nextBreath = () => {
    tap();
    if (breathRight) {
      setCelebrate(false);
      setStage('reorder');
    } else {
      setBreathPick(null);
    }
  };

  const placeStep = (idx: number) => {
    if (solved || placed.includes(idx)) return;
    tap();
    setNudge(false);
    setPlaced((p) => [...p, idx]);
  };

  const unplaceStep = (idx: number) => {
    if (solved) return;
    tap();
    setNudge(false);
    setPlaced((p) => p.filter((x) => x !== idx));
  };

  // She cannot move on until the order is right: a wrong check nudges her to
  // rearrange (and costs the clean-run ring), it never reveals the answer.
  const checkOrder = () => {
    tap();
    if (placed.every((v, i) => v === i)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCelebrate(true);
      setSolved(true);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setFlawless(false);
      setNudge(true);
    }
  };

  const verdict = (tier: MoveTier) =>
    tier === 'best' ? 'That is the one' : tier === 'lesser' ? 'That can work, not here though' : 'That one backfires';

  const back = () => {
    tap();
    if (stage === 'reorder') {
      setPlaced([]);
      setSolved(false);
      setNudge(false);
      setCelebrate(false);
      setStage('breath');
    } else if (stage === 'breath') {
      setBreathPick(null);
      setCelebrate(false);
      setStage('move');
    } else if (stage === 'move') {
      setMovePick(null);
      setCelebrate(false);
      setStage('size');
    } else if (stage === 'size') {
      setSizeGuess(null);
      setCelebrate(false);
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
            {beat >= 0 ? (
              <View style={styles.l1Segments}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.l1Seg, i <= beat && styles.l1SegOn]} />
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
            <L5Backdrop />
            <View style={styles.l1Center}>
              <View style={styles.l1EmotionChip}>
                <Text style={styles.l1EmotionChipText}>{L1_INTRO.emotion}</Text>
              </View>
              <Text style={styles.l1Eyebrow}>{L5_INTRO.level}</Text>
              <Text style={styles.l2Title}>{L5_INTRO.title}</Text>
              <Text style={styles.l2Subtitle}>{L5_INTRO.subtitle}</Text>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('size'); }} />
          </View>
        )}

        {stage === 'size' && (
          <View style={styles.l1Body}>
            <View style={styles.l1Center}>
              <Text style={styles.l5StepLabel}>First, read the size</Text>
              <Text style={styles.l2Scene}>{scene.scene}</Text>
            </View>
            <View style={styles.l1Bottom}>
              {!sizeAnswered ? (
                <View style={styles.l1Choices}>
                  <Pressable style={[styles.l2Choice, styles.l2ChoiceSmall]} onPress={() => pickSize('little')} accessibilityRole="button" accessibilityLabel="Small">
                    <Text style={styles.l1ChoiceLabel}>Small</Text>
                  </Pressable>
                  <Pressable style={[styles.l2Choice, styles.l2ChoiceBig]} onPress={() => pickSize('lot')} accessibilityRole="button" accessibilityLabel="Big">
                    <Text style={styles.l1ChoiceLabel}>Big</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, sizeRight ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text style={[styles.l1Verdict, { color: sizeRight ? BIG_CORAL : v3.activated }]}>
                      {sizeRight ? 'Big, yes' : 'Look again'}
                    </Text>
                    <Text style={styles.l1RevealText}>{scene.sizeWhy}</Text>
                  </View>
                  <BeginButton fullWidth label={sizeRight ? 'Next' : 'Try again'} onPress={nextSize} />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'move' && (
          <View style={styles.l1Body}>
            <Text style={styles.l5StepLabel}>Now, pick the move</Text>
            <Text style={styles.l3Prompt}>{scene.prompt}</Text>
            <View style={styles.l3PlayBottom}>
              {movePick == null ? (
                <View style={styles.l3Solutions}>
                  {scene.options.map((o, idx) => (
                    <Pressable key={o.label} style={styles.l3Solution} onPress={() => pickMove(idx)} accessibilityRole="button" accessibilityLabel={o.label}>
                      <Text style={styles.l3SolutionText}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, moveBest ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text style={[styles.l1Verdict, { color: moveBest ? v3.regulated : v3.activated }]}>
                      {verdict(chosen!.tier)}
                    </Text>
                    <Text style={styles.l1RevealText}>{chosen!.future}</Text>
                  </View>
                  <BeginButton fullWidth label={moveBest ? 'Next' : 'Try another'} onPress={nextMove} />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'breath' && (
          <View style={styles.l1Body}>
            <Text style={styles.l5StepLabel}>{L5_BREATH_Q.stepLabel}</Text>
            <Text style={styles.l3Prompt}>{L5_BREATH_Q.prompt}</Text>
            <View style={styles.l3PlayBottom}>
              {!breathAnswered ? (
                <View style={styles.l3Solutions}>
                  {L5_BREATH_Q.options.map((o, idx) => (
                    <Pressable key={o.label} style={styles.l3Solution} onPress={() => pickBreath(idx)} accessibilityRole="button" accessibilityLabel={o.label}>
                      <Text style={styles.l3SolutionText}>{o.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <>
                  <View style={[styles.l1Reveal, breathRight ? styles.l1RevealRight : styles.l1RevealWrong]}>
                    <Text style={[styles.l1Verdict, { color: breathRight ? v3.regulated : v3.activated }]}>
                      {breathRight ? 'That is it' : 'Not quite'}
                    </Text>
                    <Text style={styles.l1RevealText}>
                      {breathRight ? L5_BREATH_Q.whyRight : L5_BREATH_Q.whyWrong}
                    </Text>
                  </View>
                  <BeginButton fullWidth label={breathRight ? 'Next' : 'Try again'} onPress={nextBreath} />
                </>
              )}
            </View>
          </View>
        )}

        {stage === 'reorder' && (
          <View style={styles.l1Body}>
            <Text style={styles.l5StepLabel}>{L5_REORDER.stepLabel}</Text>
            <Text style={styles.l3Prompt}>{L5_REORDER.prompt}</Text>
            <ScrollView contentContainerStyle={styles.l5ReorderScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.l5Slots}>
                {placed.map((stepIdx, pos) => (
                  <Pressable
                    key={stepIdx}
                    disabled={solved}
                    onPress={() => unplaceStep(stepIdx)}
                    style={styles.l5Slot}
                    accessibilityRole="button"
                  >
                    <Text style={styles.l5SlotNum}>{pos + 1}</Text>
                    <Text style={styles.l5SlotText}>{L5_REORDER.steps[stepIdx]}</Text>
                  </Pressable>
                ))}
                {!allPlaced && (
                  <View style={styles.l5SlotEmpty}>
                    <Text style={styles.l5SlotNum}>{placed.length + 1}</Text>
                    <Text style={styles.l5SlotEmptyText}>Tap a step below</Text>
                  </View>
                )}
              </View>

              {!solved && (
                <View style={styles.l5Pool}>
                  {L5_SCRAMBLE.filter((i) => !placed.includes(i)).map((i) => (
                    <Pressable key={i} onPress={() => placeStep(i)} style={styles.l5PoolCard} accessibilityRole="button">
                      <Text style={styles.l5PoolText}>{L5_REORDER.steps[i]}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {nudge && !solved && <Text style={styles.l5Nudge}>{L5_REORDER.whyWrong}</Text>}

              {solved && (
                <View style={[styles.l1Reveal, styles.l1RevealRight]}>
                  <Text style={[styles.l1Verdict, { color: v3.regulated }]}>That is the order</Text>
                  <Text style={styles.l1RevealText}>{L5_REORDER.whyRight}</Text>
                </View>
              )}
            </ScrollView>
            {!solved ? (
              <BeginButton fullWidth label="Check" disabled={!allPlaced} onPress={checkOrder} />
            ) : (
              <BeginButton fullWidth label="Finish" onPress={() => { tap(); setCelebrate(false); setStage('congrats'); }} />
            )}
          </View>
        )}

        {stage === 'congrats' && (
          <LevelCongrats
            ringCount={4}
            gold={flawless}
            congrats={L5_CONGRATS}
            buttonLabel="Done"
            onNext={() => { tap(); onDone(); }}
            finale
          />
        )}
      </SafeAreaView>

      {(celebrate || stage === 'congrats') && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CelebrationParticles style={StyleSheet.absoluteFill} />
        </View>
      )}
      {stage === 'congrats' && <RingCelebration hue={flawless ? GOLD_HUE : VIOLET_BURST} />}
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

  // Level 4 · The power move (teach + guided breath).
  l4Backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.12,
  },
  l4TeachRule: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 25,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  l4DoseTable: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    overflow: 'hidden',
  },
  l4DoseRow: { paddingVertical: 16, paddingHorizontal: 18, gap: 4 },
  l4DoseRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.06)' },
  l4DoseSize: { fontFamily: 'Poppins-SemiBold', fontSize: 16, letterSpacing: 0.3 },
  l4DoseAmount: { fontFamily: 'Poppins-Light', fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  l4BreatheCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  l4PhaseLabel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 28,
  },
  l4RoundLabel: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle, textAlign: 'center' },
  l4Spacer: { height: 52 },

  // Level 5 · The last test (step label above each reused beat + the reorder).
  l5StepLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: v3.accent,
    textAlign: 'center',
    marginTop: 10,
  },
  l5ReorderScroll: { paddingTop: 4, paddingBottom: 16, gap: 16 },
  l5Slots: { gap: 8 },
  l5Slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: hsla(v3.accent, 0.5),
    backgroundColor: hsla(v3.accent, 0.12),
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  l5SlotNum: { fontFamily: 'Poppins-SemiBold', fontSize: 15, color: v3.accent, width: 18, textAlign: 'center' },
  l5SlotText: { flex: 1, fontFamily: 'Poppins-Medium', fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  l5SlotEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: v3.panelBorder,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  l5SlotEmptyText: { flex: 1, fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textSubtitle },
  l5Pool: { gap: 8 },
  l5PoolCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  l5PoolText: { fontFamily: 'Poppins-Medium', fontSize: 15, lineHeight: 21, color: colors.textPrimary },
  l5Nudge: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 20,
    color: v3.activated,
    textAlign: 'center',
  },
  l5Backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  l5BackdropOrb: {
    opacity: 0.14,
    transform: [{ rotate: '-18deg' }, { translateX: 46 }, { translateY: -34 }],
  },
});
