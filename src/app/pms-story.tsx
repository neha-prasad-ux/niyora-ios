// Neha's story — the PMS preparedness reader (niyora-pms-preparedness-spec.md,
// "Chapter structure"). One content-driven screen walks the locked flow for
// whatever chapter is passed in:
//
//   opening -> beats (read straight through) -> a moment to reflect
//   -> build your own better-PMS kit -> the payoff (rings land) -> the hook
//
// The story never interrupts itself with a question; reflection always comes
// after. The chapter (beats, questions, kit) is pure DATA in
// src/v3/chapter-content.ts, so Story 2+ plug in with no changes here.
//
// The reward is the ISOLATED per-cycle prep state (src/store/pms-prep.ts): the
// kit items she banks land as rings on the payoff moon. This never touches the
// shipped lifetime moon — a fresh cycle simply starts a fresh prep.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CloseButton } from '@/components/CloseButton';
import { Orb } from '@/components/orb';
import { StoryScene } from '@/components/story-scene';
import { colors } from '@/theme/colors';
import {
  chapterById,
  type Chapter,
  type KitItem,
  type ReflectQuestion,
} from '@/v3/chapter-content';
import { getPmsPrefs } from '@/store/pms-prefs';
import {
  cycleKeyFor,
  markEngaged,
  PREP_RING_HUES,
  PREP_RINGS_TOTAL,
  recordChapterComplete,
} from '@/store/pms-prep';

type Phase = 'opening' | 'beats' | 'reflect' | 'kit' | 'payoff';

export default function PmsStoryScreen() {
  const params = useLocalSearchParams<{ chapter?: string }>();
  const chapter = chapterById(typeof params.chapter === 'string' ? params.chapter : undefined);

  const [phase, setPhase] = useState<Phase>('opening');
  const [beatIndex, setBeatIndex] = useState(0);
  const [reflectIndex, setReflectIndex] = useState(0);
  // The correct kit ids she banked; set on the kit step, read by the payoff.
  const [chosenKit, setChosenKit] = useState<string[]>([]);

  // The cycle this prep belongs to (the period anchor). Loaded once; the story is
  // playable before onboarding via the stable no-cycle key. Opening the story is
  // itself engagement, so the moon lifts off its resting half even if she leaves.
  const cycleKeyRef = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    getPmsPrefs().then((p) => {
      if (!alive) return;
      const key = cycleKeyFor(p.lastPeriodStart);
      cycleKeyRef.current = key;
      markEngaged(key).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, []);

  const tap = useCallback((next: Phase) => {
    Haptics.selectionAsync().catch(() => {});
    setPhase(next);
  }, []);

  const exit = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, []);

  // Beats read straight through; the last beat hands straight into the questions.
  const nextBeat = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setBeatIndex((i) => {
      if (i < chapter.beats.length - 1) return i + 1;
      setPhase('reflect');
      return i;
    });
  }, [chapter.beats.length]);

  const nextQuestion = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    setReflectIndex((i) => {
      if (i < chapter.reflect.length - 1) return i + 1;
      setPhase('kit');
      return i;
    });
  }, [chapter.reflect.length]);

  const finishKit = useCallback((ids: string[]) => {
    Haptics.selectionAsync().catch(() => {});
    setChosenKit(ids);
    setPhase('payoff');
  }, []);

  // Back retraces the flow deterministically without a history stack: within a
  // multi-step phase it steps one back, otherwise it steps to the prior phase.
  const back = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (phase === 'beats') {
      if (beatIndex > 0) setBeatIndex((i) => i - 1);
      else setPhase('opening');
    } else if (phase === 'reflect') {
      if (reflectIndex > 0) setReflectIndex((i) => i - 1);
      else setPhase('beats');
    } else if (phase === 'kit') {
      setPhase('reflect');
    } else {
      // opening (and any terminal step) leaves the flow.
      router.back();
    }
  }, [phase, beatIndex, reflectIndex]);

  const showChrome = phase !== 'payoff';
  const showProgress = phase === 'beats';

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      {phase === 'beats' && (
        // Each beat's scene cross-dissolves into the next, like turning a page.
        <Animated.View
          key={`scene-${beatIndex}`}
          entering={FadeIn.duration(600)}
          exiting={FadeOut.duration(600)}
          style={styles.sceneLayer}
        >
          <StoryScene scene={chapter.beats[beatIndex].scene} />
        </Animated.View>
      )}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {showChrome && (
          <View style={styles.topBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.backChevron}>‹</Text>
            </Pressable>
            {showProgress ? (
              <ProgressBar current={beatIndex} total={chapter.beats.length} />
            ) : (
              <View style={styles.progressSpacer} />
            )}
            <CloseButton onPress={exit} />
          </View>
        )}

        {phase === 'opening' ? (
          <Opening chapter={chapter} onBegin={() => tap('beats')} />
        ) : phase === 'beats' ? (
          <Beat
            beatIndex={beatIndex}
            text={chapter.beats[beatIndex].text}
            last={beatIndex === chapter.beats.length - 1}
            onNext={nextBeat}
          />
        ) : phase === 'reflect' ? (
          <Reflect
            key={reflectIndex}
            question={chapter.reflect[reflectIndex]}
            index={reflectIndex}
            total={chapter.reflect.length}
            onNext={nextQuestion}
          />
        ) : phase === 'kit' ? (
          <Kit kit={chapter.kit} onDone={finishKit} />
        ) : (
          <Payoff
            chapter={chapter}
            chosenKit={chosenKit}
            cycleKeyRef={cycleKeyRef}
            onClose={exit}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// --- Progress bar -----------------------------------------------------------
// One segment per beat, filled up to the current beat. Sits in the top bar so
// she always knows how much of the story is left.

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progressBar} accessibilityLabel={`Beat ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.progressSeg, i <= current && styles.progressSegOn]} />
      ))}
    </View>
  );
}

// --- Opening ----------------------------------------------------------------

function Opening({ chapter, onBegin }: { chapter: Chapter; onBegin: () => void }) {
  return (
    <View style={styles.center}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.block}>
        <Text style={styles.eyebrow}>Neha's story</Text>
        <Text style={styles.openingTitle}>{chapter.title}</Text>
        <Text style={styles.openingSub}>{chapter.intro}</Text>
      </Animated.View>
      <View style={styles.footer}>
        <BeginButton label="Read" onPress={onBegin} fullWidth />
      </View>
    </View>
  );
}

// --- A story beat -----------------------------------------------------------
// The scene fills the screen (rendered behind, in the root); the copy sits in a
// scrollable dark band low on the screen where the scrim keeps it legible. A
// single Next control advances — tap-through, never a question mid-story.

function Beat({
  beatIndex,
  text,
  last,
  onNext,
}: {
  beatIndex: number;
  text: string;
  last: boolean;
  onNext: () => void;
}) {
  return (
    <View style={styles.beatWrap}>
      {/* The copy fades up as the scene cross-dissolves beneath it — keyed on the
          beat so each turn animates. The button stays put so it never jumps. */}
      <Animated.View
        key={beatIndex}
        entering={FadeInDown.duration(520)}
        exiting={FadeOut.duration(260)}
        style={styles.beatTextWrap}
      >
        <ScrollView
          style={styles.beatScroll}
          contentContainerStyle={styles.beatScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.beatText}>{text}</Text>
        </ScrollView>
      </Animated.View>
      <View style={styles.beatFooter}>
        <NextButton label={last ? 'So, what worked?' : 'Next'} onPress={onNext} />
      </View>
    </View>
  );
}

// The forward button, shared by the beats: a purple capsule with an aligned SF
// Symbol chevron and a quick press-in scale. Snappy (no particle delay) so
// tapping through the story stays fluid.
function NextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.03 }] }));
  return (
    <Pressable
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 400, mass: 0.7 });
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 20, stiffness: 400, mass: 0.7 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.nextShadow}
    >
      <Animated.View style={[style, styles.nextBtn]}>
        <LinearGradient
          colors={[colors.beginStart, colors.beginEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.nextLabel}>{label}</Text>
        <SymbolView
          name="chevron.right"
          tintColor={colors.textPrimary}
          size={15}
          weight="semibold"
          style={styles.nextIcon}
        />
      </Animated.View>
    </Pressable>
  );
}

// --- Reflect ----------------------------------------------------------------
// Un-failable. She taps an option; a wrong tap tints her pick and reveals the
// true answer, then a one-line takeaway teaches. Nothing here can be failed.
// Keyed per question, so each one slides in from the right as the last slides
// out to the left — the questions read as a moving deck.

function Reflect({
  question,
  index,
  total,
  onNext,
}: {
  question: ReflectQuestion;
  index: number;
  total: number;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked != null;

  const choose = (i: number) => {
    if (answered) return;
    const correct = question.options[i].correct;
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    setPicked(i);
  };

  return (
    <Animated.View
      style={styles.reflectWrap}
      entering={SlideInRight.duration(360)}
      exiting={SlideOutLeft.duration(240)}
    >
      <ScrollView contentContainerStyle={styles.reflectScroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.reflectCount}>{`Reflect · ${index + 1} of ${total}`}</Text>
          <Text style={styles.reflectPrompt}>{question.prompt}</Text>
          <View style={styles.reflectOptions}>
            {question.options.map((o, i) => {
              const isPicked = picked === i;
              const revealCorrect = answered && o.correct;
              return (
                <Pressable
                  key={i}
                  onPress={() => choose(i)}
                  disabled={answered}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  style={[
                    styles.optionChip,
                    revealCorrect && styles.optionCorrect,
                    isPicked && !o.correct && styles.optionWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      revealCorrect && styles.optionTextStrong,
                      answered && !o.correct && !isPicked && styles.optionTextDim,
                    ]}
                  >
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {answered && (
            <Animated.Text entering={FadeIn.duration(400)} style={styles.reflectTakeaway}>
              {question.takeaway}
            </Animated.Text>
          )}
        </View>
      </ScrollView>
      {answered && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.footer}>
          <BeginButton
            label={index < total - 1 ? 'Next' : 'Create your own PMS prep list'}
            onPress={onNext}
            fullWidth
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

// --- Build your prep list ---------------------------------------------------
// A short list with exactly one wrong option. Tapping a good move adds it to her
// prep list (and, at the payoff, lands a ring); tapping the wrong one surfaces
// its soft redirect and simply cannot be added. Un-failable: she moves on
// whenever. Slides in from the reflect step to keep the deck feel.

function Kit({ kit, onDone }: { kit: readonly KitItem[]; onDone: (ids: string[]) => void }) {
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [struck, setStruck] = useState<string | null>(null);

  const toggle = (item: KitItem) => {
    Haptics.selectionAsync().catch(() => {});
    if (!item.correct) {
      setStruck(item.id);
      return;
    }
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  return (
    <Animated.View style={styles.kitWrap} entering={SlideInRight.duration(360)}>
      <ScrollView contentContainerStyle={styles.kitScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kitTitle}>Choose everything that helps with PMS</Text>
        {kit.map((item) => {
          const on = chosen.has(item.id);
          const isStruck = struck === item.id;
          return (
            <View key={item.id}>
              <Pressable
                onPress={() => toggle(item)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={item.label}
                style={[styles.kitItem, on && styles.kitItemOn]}
              >
                <View style={[styles.kitCheck, on && styles.kitCheckOn]}>
                  {on && <Text style={styles.kitCheckMark}>✓</Text>}
                </View>
                <Text style={[styles.kitItemText, on && styles.kitItemTextOn]}>{item.label}</Text>
              </Pressable>
              {isStruck && item.redirect != null && (
                <Animated.Text entering={FadeIn.duration(300)} style={styles.kitRedirect}>
                  {item.redirect}
                </Animated.Text>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <BeginButton label="Add to my prep list" onPress={() => onDone([...chosen])} fullWidth />
      </View>
    </Animated.View>
  );
}

// --- Payoff -----------------------------------------------------------------
// The rings land on the prep moon (as many as the kit items she banked) and the
// moon fills. Records the chapter + her kit into the isolated per-cycle prep
// state exactly once. The closing line is a live door into Steady yourself.

function Payoff({
  chapter,
  chosenKit,
  cycleKeyRef,
  onClose,
}: {
  chapter: Chapter;
  chosenKit: string[];
  cycleKeyRef: React.MutableRefObject<string | null>;
  onClose: () => void;
}) {
  const ringCount = Math.min(PREP_RINGS_TOTAL, chosenKit.length);
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Resolve the cycle key even if prefs are still loading, so the record never
    // races the mount. Then bank the chapter + her chosen kit as this cycle's rings.
    const run = async () => {
      let key = cycleKeyRef.current;
      if (key == null) {
        const prefs = await getPmsPrefs();
        key = cycleKeyFor(prefs.lastPeriodStart);
      }
      await recordChapterComplete(key, chapter.id, chosenKit).catch(() => {});
    };
    run().catch(() => {});
  }, [chapter.id, chosenKit, cycleKeyRef]);

  const openSteady = () => {
    Haptics.selectionAsync().catch(() => {});
    router.replace('/steady-yourself' as Href);
  };

  return (
    <View style={styles.center}>
      <View style={styles.payoffMoon} pointerEvents="none">
        <Orb size={220} tierRingCount={ringCount} ringHues={PREP_RING_HUES} accumulate still />
      </View>
      <Animated.View entering={FadeIn.duration(700)} style={styles.payoffBlock}>
        <Text style={styles.payoffTitle}>You've prepped for PMS.</Text>
        <Pressable
          onPress={openSteady}
          accessibilityRole="button"
          accessibilityLabel="Come back here whenever you need a hand"
          style={styles.payoffChip}
        >
          <SymbolView name="wind" tintColor={colors.bandBlueText} size={15} weight="regular" />
          <Text style={styles.payoffChipText}>Come back here whenever you need a hand</Text>
        </Pressable>
      </Animated.View>
      <View style={styles.footer}>
        <BeginButton label="Done" onPress={onClose} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 32,
    paddingTop: 4,
  },
  backChevron: {
    fontFamily: 'Poppins-Light',
    fontSize: 30,
    lineHeight: 32,
    color: colors.textSubtitle,
  },
  progressSpacer: { flex: 1 },

  progressBar: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center' },
  progressSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  progressSegOn: { backgroundColor: 'rgba(255, 255, 255, 0.85)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  block: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },

  eyebrow: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: 6,
  },
  openingTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 27,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  openingSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // The scene layer fills the screen behind the copy (crossfaded per beat).
  sceneLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },

  // Beat: the copy fills the space between the top bar and the button and sits
  // at its foot, so short beats rest in the lower band with the scene above.
  // The ScrollView only scrolls when a long beat's copy exceeds that whole area.
  beatWrap: { flex: 1 },
  beatTextWrap: { flex: 1 },
  beatScroll: { flex: 1 },
  beatScrollContent: { flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 8 },
  beatText: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  beatFooter: { paddingTop: 18, paddingBottom: 10 },
  nextShadow: {
    alignSelf: 'stretch',
    shadowColor: colors.beginGlow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 30,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.beginBorder,
    overflow: 'hidden',
  },
  nextLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.4,
  },
  nextIcon: { marginTop: 1 },

  // Reflect.
  reflectWrap: { flex: 1 },
  reflectScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  reflectCount: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: 12,
  },
  reflectPrompt: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 22,
  },
  reflectOptions: { gap: 12 },
  optionChip: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionCorrect: {
    borderColor: 'rgba(150, 200, 170, 0.8)',
    backgroundColor: 'rgba(120, 190, 150, 0.16)',
  },
  optionWrong: {
    borderColor: 'rgba(237, 147, 177, 0.55)',
    backgroundColor: 'rgba(237, 147, 177, 0.10)',
  },
  optionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15.5,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  optionTextStrong: { fontFamily: 'Poppins-Medium' },
  optionTextDim: { color: colors.textTagline },
  reflectTakeaway: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 20,
  },

  // Kit.
  kitWrap: { flex: 1 },
  kitScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24, gap: 12 },
  kitTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 21,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  kitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  kitItemOn: {
    borderColor: 'rgba(150, 200, 170, 0.7)',
    backgroundColor: 'rgba(120, 190, 150, 0.14)',
  },
  kitCheck: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  kitCheckOn: {
    borderColor: 'rgba(150, 200, 170, 0.9)',
    backgroundColor: 'rgba(120, 190, 150, 0.9)',
  },
  kitCheckMark: { fontFamily: 'Poppins-SemiBold', fontSize: 14, color: '#0b120e' },
  kitItemText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  kitItemTextOn: { color: colors.textPrimary },
  kitRedirect: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(244, 192, 209, 0.95)',
    letterSpacing: 0.2,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Payoff.
  payoffMoon: { alignItems: 'center', marginBottom: -8 },
  payoffBlock: { alignItems: 'center', gap: 16, paddingHorizontal: 12 },
  payoffTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  payoffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(169, 184, 232, 0.4)',
    backgroundColor: 'rgba(169, 184, 232, 0.10)',
    maxWidth: 320,
  },
  payoffChipText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.bandBlueText,
    letterSpacing: 0.2,
    flexShrink: 1,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
    gap: 6,
  },
});
