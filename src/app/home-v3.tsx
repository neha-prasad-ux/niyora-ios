// The V3 PMS dashboard: the post-assessment home. A big calm moon (the soul) at
// the top, then the day's cards. No wave here: the wave belongs to the read and
// the game, not the app's home, where it did not fit the calm-orb theme.
//
// Coexists with the real home (src/app/index.tsx); reachable from the V3 goal
// screen and, in dev, the "Home" button. Reads pms-prefs (cycle) and the
// training store (level progress); writes nothing here.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { RecommendSheet } from '@/components/RecommendSheet';
import { type RecResult } from '@/models/recommend';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { CHAPTER } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';
import { DEFAULT_PMS_PREFS, getPmsPrefs, type PmsPrefs } from '@/store/pms-prefs';
import { daysUntilPmsWindow, isInPmsWindow } from '@/lib/pms-window';

export default function HomeV3() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);
  const [prefs, setPrefs] = useState<PmsPrefs>(DEFAULT_PMS_PREFS);

  // Reload on focus so returning from the game shows fresh progress.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getTraining(), getPmsPrefs()]).then(([t, p]) => {
        if (alive) {
          setTraining(t);
          setPrefs(p);
        }
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const today = new Date();
  const inWindow = prefs.pmsMode
    ? isInPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, today)
    : false;
  const daysUntil = prefs.pmsMode
    ? daysUntilPmsWindow(prefs.lastPeriodStart, prefs.cycleLength, today)
    : null;

  const chapterDone = training.completed.length >= CHAPTER.levels.length;
  const started = training.completed.length > 0;

  const openGame = () => router.push('/game-v3');

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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The soul: a big calm moon, always here. Keeps whatever ring the orb
              itself carries; no wave. */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Orb size={260} />
            <Text style={styles.heroLine}>You can always match your breath with this</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <Level1Card done={chapterDone} started={started} onStart={openGame} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <CalmCard onBegin={openCalm} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).duration(500)}>
            <PmsModeCard
              inWindow={inWindow}
              daysUntil={daysUntil}
              onBegin={() => router.push('/pms-readiness')}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).duration(500)}>
            <FactGameCard />
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

function Card({ accent, children }: { accent?: string; children: React.ReactNode }) {
  return <View style={[styles.card, accent ? { borderColor: accent } : null]}>{children}</View>;
}

function CardHead({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardHead}>{children}</Text>;
}

// Level 1 · the game entry. Plain: a status dot + the task + Start. No wave.
function Level1Card({
  done,
  started,
  onStart,
}: {
  done: boolean;
  started: boolean;
  onStart: () => void;
}) {
  return (
    <Card accent={colorAlpha(v3.accent, 0.4)}>
      <CardHead>Level 1</CardHead>
      <View style={styles.taskRow}>
        <View style={[styles.dot, done && { backgroundColor: v3.accent, borderColor: v3.accent }]} />
        <Text style={styles.taskText}>
          {done ? 'You helped Neha through it' : 'Help Neha with her emotions'}
        </Text>
      </View>
      <BeginButton
        fullWidth
        label={done ? 'Play again' : started ? 'Continue' : 'Start'}
        onPress={onStart}
      />
    </Card>
  );
}

// Calm · the acute path, unchanged in spirit: one tap to a breath.
function CalmCard({ onBegin }: { onBegin: () => void }) {
  return (
    <Card>
      <CardHead>Calm based on your emotions</CardHead>
      <Text style={styles.cardBody}>Worked up right now? Drop straight into a breath.</Text>
      <BeginButton fullWidth label="Begin" onPress={onBegin} />
    </Card>
  );
}

// PMS mode · brought over from Smart PMS mode: where she is in her cycle, framed
// as prep, plus the day's check list.
function PmsModeCard({
  inWindow,
  daysUntil,
  onBegin,
}: {
  inWindow: boolean;
  daysUntil: number | null;
  onBegin: () => void;
}) {
  const status = inWindow
    ? 'You are in your window now. Go gentle.'
    : daysUntil != null && daysUntil > 0
      ? `About ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} to your PMS window.`
      : daysUntil != null
        ? 'Your window is starting.'
        : 'Turn on Smart PMS mode to track your window.';
  return (
    <Card accent={colorAlpha(v3.activated, 0.35)}>
      <Text style={styles.pmsStatus}>{status}</Text>
      <CardHead>PMS check list</CardHead>
      <Text style={styles.cardBody}>A light set of reps for today, softer in your window.</Text>
      <BeginButton fullWidth label="Begin" onPress={onBegin} />
    </Card>
  );
}

// Women's health facts · a quick myth-buster, self-validation over trivia.
const FACT_OPTIONS = [
  { text: 'PMS is just in your head.', correct: false },
  { text: 'You should be able to push through it.', correct: false },
  { text: 'Your brain gets more sensitive to normal hormones.', correct: true },
];

function FactGameCard() {
  const [started, setStarted] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <Card accent={colorAlpha(v3.regulated, 0.3)}>
      <CardHead>Women&apos;s health facts game</CardHead>
      {!started ? (
        <>
          <Text style={styles.cardBody}>One quick true-or-myth. A small win for the day.</Text>
          <BeginButton fullWidth label="Begin" onPress={() => setStarted(true)} />
        </>
      ) : (
        <>
          <Text style={[styles.cardBody, { marginBottom: 8 }]}>Which one is true?</Text>
          <View style={styles.factList}>
            {FACT_OPTIONS.map((o, i) => {
              const chosen = picked === i;
              const reveal = picked != null;
              return (
                <Pressable
                  key={o.text}
                  onPress={() => setPicked(i)}
                  disabled={reveal}
                  style={[
                    styles.factOption,
                    reveal && o.correct && styles.factOptionGood,
                    reveal && chosen && !o.correct && styles.factOptionMiss,
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={styles.factOptionText}>{o.text}</Text>
                </Pressable>
              );
            })}
          </View>
          {picked != null && (
            <Text style={[styles.cardBody, { marginTop: 10 }]}>
              Your hormones are normal. Your brain is just more sensitive to them right now. That is
              real, and it is not in your head.
            </Text>
          )}
        </>
      )}
    </Card>
  );
}

function colorAlpha(color: string, alpha: number): string {
  if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
  return color;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 12 },
  hero: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  heroLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 14,
  },
  card: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  cardHead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginBottom: 12,
  },
  pmsStatus: {
    fontFamily: 'Poppins-Light',
    fontSize: 12.5,
    letterSpacing: 0.3,
    color: v3.activated,
    marginBottom: 6,
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: v3.panelBorder,
    backgroundColor: 'transparent',
  },
  taskText: { fontFamily: 'Poppins-Light', fontSize: 15, color: colors.textPrimary, flex: 1 },
  factList: { gap: 8, marginTop: 2 },
  factOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  factOptionGood: {
    borderColor: colorAlpha(v3.regulated, 0.7),
    backgroundColor: colorAlpha(v3.regulated, 0.16),
  },
  factOptionMiss: { borderColor: colorAlpha(v3.activated, 0.6) },
  factOptionText: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textPrimary },
});
