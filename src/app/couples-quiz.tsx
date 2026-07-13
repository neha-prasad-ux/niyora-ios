// "Is it PMS or a real issue?" Built on the game's Level-1 shell exactly: a heart
// hero intro, a segmented top bar over a big centered question, two large bottom
// choice buttons, and a skimmable result (verdict title, one-line takeaway, a
// card of three moves, the decide-when-calm rule as a caption). A heart stands
// where the soul-orb stands in the game intro; the result page has no icon so
// the verdict itself leads. Every answer votes (scoreQuiz); the result names PMS-
// amplified vs a real issue, ties resolving to "real" so a genuine issue is never
// dismissed, and closes with the decide-when-calm rule.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CouplesFinale } from '@/components/couples-finale';
import { colors } from '@/theme/colors';
import { COUPLES_QUIZ, QUIZ_FOOTER, QUIZ_RESULT, scoreQuiz } from '@/models/couples-content';
import { recordLight } from '@/store/light-ledger';

const tap = () => Haptics.selectionAsync().catch(() => {});

// Ledger ref: telling PMS-amplified from a real issue is recognizing the
// pattern (moon-reward-spec: notice). Also lets the checklist read "done today".
const COUPLES_QUIZ_REF = 'couples-quiz';

const HEART = 'hsl(8, 72%, 68%)'; // coral, the PMS-or-real heart
const YES_BG = 'hsla(8, 72%, 68%, 0.92)';
const NO_BG = 'hsla(330, 68%, 72%, 0.9)';

// Faint hearts drifting behind the intro, where the game floats soul-orbs.
function HeartBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SymbolView name="heart.fill" tintColor="rgba(255,255,255,0.10)" size={92} style={styles.h1} />
      <SymbolView name="heart.fill" tintColor="rgba(255,255,255,0.09)" size={64} style={styles.h2} />
      <SymbolView name="heart.fill" tintColor="rgba(255,255,255,0.07)" size={58} style={styles.h3} />
      <SymbolView name="heart.fill" tintColor="rgba(255,255,255,0.10)" size={84} style={styles.h4} />
    </View>
  );
}

export default function CouplesQuizScreen() {
  const [stage, setStage] = useState<'intro' | 'play' | 'result' | 'finale'>('intro');
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const total = COUPLES_QUIZ.length;
  const q = COUPLES_QUIZ[i];
  const side = useMemo(() => (stage === 'result' ? scoreQuiz(answers) : null), [stage, answers]);

  const answer = (yes: boolean) => {
    tap();
    const next = { ...answers, [q.id]: yes };
    setAnswers(next);
    if (i + 1 < total) {
      setI(i + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      recordLight('notice', { refId: COUPLES_QUIZ_REF }).catch(() => {});
      setStage('result');
    }
  };

  const restart = () => {
    tap();
    setAnswers({});
    setI(0);
    setStage('intro');
  };

  const back = () => {
    tap();
    if (stage === 'play') {
      if (i > 0) setI(i - 1);
      else setStage('intro');
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {(stage === 'intro' || stage === 'play') && (
          <View style={styles.topBar}>
            <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
            {stage === 'play' ? (
              <View style={styles.segments}>
                {COUPLES_QUIZ.map((c, idx) => (
                  <View key={c.id} style={[styles.seg, idx <= i && styles.segOn]} />
                ))}
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={{ width: 22 }} />
          </View>
        )}

        {stage === 'intro' && (
          <View style={styles.body}>
            <HeartBackdrop />
            <View style={styles.center}>
              <SymbolView name="heart.fill" tintColor={HEART} size={52} weight="semibold" />
              <Text style={styles.kicker}>Is it PMS or real?</Text>
              <Text style={styles.subtitle}>Think of one specific fight or feeling, then answer honestly.</Text>
            </View>
            <BeginButton fullWidth label="Start" onPress={() => { tap(); setStage('play'); }} />
          </View>
        )}

        {stage === 'play' && (
          <Animated.View key={q.id} entering={FadeIn.duration(240)} style={styles.body}>
            <View style={styles.center}>
              <Text style={styles.statement}>{q.question}</Text>
            </View>
            <View style={styles.bottom}>
              <View style={styles.choices}>
                <Pressable
                  style={[styles.choice, { backgroundColor: YES_BG, borderColor: HEART }]}
                  onPress={() => answer(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Yes"
                >
                  <Text style={styles.choiceLabel}>Yes</Text>
                </Pressable>
                <Pressable
                  style={[styles.choice, { backgroundColor: NO_BG, borderColor: 'hsl(330, 68%, 72%)' }]}
                  onPress={() => answer(false)}
                  accessibilityRole="button"
                  accessibilityLabel="No"
                >
                  <Text style={styles.choiceLabel}>No</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}

        {stage === 'result' && side != null && (
          <View style={styles.body}>
            <ScrollView contentContainerStyle={styles.congratsScroll} showsVerticalScrollIndicator={false}>
              <Animated.View entering={FadeIn.duration(320)} style={styles.resultCenter}>
                <Text style={styles.resultTitle}>{QUIZ_RESULT[side].title}</Text>
                <Text style={styles.resultTakeaway}>{QUIZ_RESULT[side].takeaway}</Text>
                <View style={styles.resultCard}>
                  {QUIZ_RESULT[side].points.map((point, idx) => (
                    <View key={point} style={[styles.pointRow, idx > 0 && styles.pointRowGap]}>
                      <View style={styles.pointDot} />
                      <Text style={styles.pointText}>{point}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.resultFooter}>{QUIZ_FOOTER}</Text>
              </Animated.View>
            </ScrollView>
            <BeginButton fullWidth label="Done" onPress={() => { tap(); setStage('finale'); }} />
            <Pressable onPress={restart} hitSlop={10} style={styles.restartWrap} accessibilityRole="button" accessibilityLabel="Start over">
              <Text style={styles.restart}>Start over</Text>
            </Pressable>
          </View>
        )}

        {stage === 'finale' && (
          <CouplesFinale line="Go fall in love again" onDone={() => { tap(); router.back(); }} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  back: { fontFamily: 'Poppins-Light', fontSize: 30, lineHeight: 34, color: colors.textSubtitle },

  topBar: { flexDirection: 'row', alignItems: 'center', minHeight: 34, gap: 12, marginTop: 4 },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  segOn: { backgroundColor: HEART },

  body: { flex: 1, paddingBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  kicker: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  statement: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    lineHeight: 33,
    color: colors.textPrimary,
    textAlign: 'center',
  },

  bottom: { gap: 12 },
  choices: { flexDirection: 'row', gap: 12 },
  choice: {
    flex: 1,
    height: 96,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  choiceLabel: { fontFamily: 'Poppins-Medium', fontSize: 22, color: '#1a1526' },

  // Result: a strict ladder. Big verdict title, one-line takeaway, ONE card of
  // left-aligned skimmable moves (dot per line), then the rule as a bare caption.
  congratsScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  resultCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  resultTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  resultTakeaway: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 25,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  resultCard: {
    alignSelf: 'stretch',
    padding: 18,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointRowGap: { marginTop: 14 },
  pointDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: HEART, marginTop: 8 },
  pointText: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  resultFooter: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  restartWrap: { alignItems: 'center', marginTop: 14 },
  restart: { fontFamily: 'Poppins-Regular', fontSize: 14, color: colors.textTagline, letterSpacing: 0.3 },

  // Intro heart backdrop (positions mirror the game's floating orbs).
  h1: { position: 'absolute', top: 10, left: -20, transform: [{ rotate: '-18deg' }] },
  h2: { position: 'absolute', top: -12, right: -14, transform: [{ rotate: '22deg' }] },
  h3: { position: 'absolute', top: '46%', right: 8, transform: [{ rotate: '-9deg' }] },
  h4: { position: 'absolute', bottom: 96, left: -24, transform: [{ rotate: '14deg' }] },
});
