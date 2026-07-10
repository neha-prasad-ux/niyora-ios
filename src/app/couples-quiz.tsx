// "Is it PMS or a real issue?" A short yes/no reflection on one specific fight
// or feeling. Every answer votes (see scoreQuiz); the result names PMS-amplified
// vs a real issue, and always closes with the decide-when-calm rule. Ties resolve
// to "real" so a genuine issue is never dismissed as the cycle.
//
// Its own light runner rather than the emotion-game state machine: this is a
// linear one-question-at-a-time flow with a result page, not a leveled game.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { Pill } from '@/components/Pill';
import { colors } from '@/theme/colors';
import { COUPLES_QUIZ, QUIZ_FOOTER, QUIZ_RESULT, scoreQuiz } from '@/models/couples-content';

const HEART = 'hsl(8, 72%, 68%)'; // coral, matching the hub's PMS-or-real heart

export default function CouplesQuizScreen() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);

  const total = COUPLES_QUIZ.length;
  const q = COUPLES_QUIZ[index];
  const side = useMemo(() => (done ? scoreQuiz(answers) : null), [done, answers]);

  const answer = (yes: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    const next = { ...answers, [q.id]: yes };
    setAnswers(next);
    if (index + 1 < total) {
      setIndex(index + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDone(true);
    }
  };

  const restart = () => {
    Haptics.selectionAsync().catch(() => {});
    setAnswers({});
    setIndex(0);
    setDone(false);
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        {!done ? (
          <Animated.View key={q.id} entering={FadeIn.duration(260)} style={styles.playWrap}>
            <View style={styles.head}>
              <SymbolView name="heart.fill" tintColor={HEART} size={22} weight="semibold" />
              <Text style={styles.progress}>{index + 1} of {total}</Text>
              <Text style={styles.hint}>Think of one specific fight or feeling.</Text>
            </View>

            <Text style={styles.question}>{q.question}</Text>

            <View style={styles.answers}>
              <Pressable
                onPress={() => answer(true)}
                style={styles.answerBtn}
                accessibilityRole="button"
                accessibilityLabel="Yes"
              >
                <Text style={styles.answerText}>Yes</Text>
              </Pressable>
              <Pressable
                onPress={() => answer(false)}
                style={styles.answerBtn}
                accessibilityRole="button"
                accessibilityLabel="No"
              >
                <Text style={styles.answerText}>No</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(320)} style={styles.resultCard}>
              <SymbolView name="heart.fill" tintColor={HEART} size={28} weight="semibold" />
              <Text style={styles.resultTitle}>{side ? QUIZ_RESULT[side].title : ''}</Text>
              <Text style={styles.resultBody}>{side ? QUIZ_RESULT[side].body : ''}</Text>
            </Animated.View>

            <View style={styles.footerCard}>
              <Text style={styles.footerText}>{QUIZ_FOOTER}</Text>
            </View>

            <View style={styles.actions}>
              <Pill label="Done" onPress={goBack} />
              <Pressable onPress={restart} hitSlop={10} accessibilityRole="button" accessibilityLabel="Start over">
                <Text style={styles.restart}>Start over</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },

  playWrap: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  head: { alignItems: 'center', gap: 10, marginBottom: 28 },
  progress: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  hint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  question: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 4,
  },
  answers: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  answerBtn: {
    flex: 1,
    maxWidth: 160,
    paddingVertical: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  answerText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  resultScroll: { paddingTop: 12, paddingBottom: 28, gap: 16 },
  resultCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resultTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 27,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  resultBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  footerCard: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  footerText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  actions: { alignItems: 'center', gap: 16, marginTop: 8 },
  restart: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textTagline,
    letterSpacing: 0.3,
  },
});
