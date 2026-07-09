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
import { router } from 'expo-router';
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
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { WaveMeter } from '@/v3/v3-graphics';
import { waveMeterLabel } from '@/v3/v3-content';
import {
  IRRITABILITY_LEVELS,
  KIND_WORD,
  L1_CARDS,
  L1_CLOSE,
  L2_CLOSE,
  L2_SCENES,
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

const tap = () => Haptics.selectionAsync().catch(() => {});

export default function GameV3() {
  const { width: screenW } = useWindowDimensions();
  const levels = IRRITABILITY_LEVELS;
  const [index, setIndex] = useState(0);
  const [skill, setSkill] = useState(SEED_SKILL);

  useEffect(() => {
    getTraining().then((t) => setSkill(t.skill));
  }, []);

  const done = index >= levels.length;
  const level = done ? undefined : levels[index];

  const advance = useCallback((levelId: string) => {
    recordLevelComplete(levelId).catch(() => {});
    setSkill((s) => Math.min(MAX_SKILL, s + LEVEL_SKILL_GAIN));
    setIndex((i) => i + 1);
  }, []);

  const meter = waveMeterLabel(skill, false);
  const stripW = Math.min(screenW - 40, 420);

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
