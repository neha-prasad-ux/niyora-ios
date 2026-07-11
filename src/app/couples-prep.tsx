// "Prep well together": a single reflection on the game's Level-1 shell (segmented
// top bar, big question, two large choice buttons), then a result page that turns
// her answers into a warm, ready-to-send "Hi love" message. Send opens the native
// share sheet (Messages, WhatsApp, wherever). A heart stands where the game's
// soul-orb stands. The partner can be any gender, so every line is neutral.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CouplesFinale } from '@/components/couples-finale';
import { colors } from '@/theme/colors';
import { PREP_MESSAGE, PREP_QUESTIONS, buildPrepChecklist, buildPrepMessage } from '@/models/couples-content';

const tap = () => Haptics.selectionAsync().catch(() => {});

const HEART = 'hsl(275, 55%, 70%)'; // violet, the prep heart
const YES_BG = 'hsla(8, 72%, 68%, 0.92)';
const NO_BG = 'hsla(330, 68%, 72%, 0.9)';

export default function CouplesPrepScreen() {
  const [stage, setStage] = useState<'intro' | 'play' | 'note' | 'finale'>('intro');
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const total = PREP_QUESTIONS.length;
  const q = PREP_QUESTIONS[i];
  const plan = useMemo(() => buildPrepChecklist(answers), [answers]);

  const answer = (yes: boolean) => {
    tap();
    const next = { ...answers, [q.id]: yes };
    setAnswers(next);
    if (i + 1 < total) {
      setI(i + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStage('note');
    }
  };

  const send = async () => {
    tap();
    const res = await Share.share({ message: buildPrepMessage(answers) }).catch(() => null);
    if (res && res.action === Share.sharedAction) setStage('finale');
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
                {PREP_QUESTIONS.map((pq, idx) => (
                  <View key={pq.id} style={[styles.seg, idx <= i && styles.segOn]} />
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
            <View style={styles.center}>
              <Text style={styles.kicker}>Prep well together</Text>
              <Text style={styles.subtitle}>A few quick questions about your PMS. We&apos;ll turn them into a note to send.</Text>
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
                  style={[styles.choice, { backgroundColor: YES_BG, borderColor: 'hsl(8, 72%, 68%)' }]}
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

        {stage === 'note' && (
          <View style={styles.body}>
            <View style={styles.noteHead}>
              <Text style={styles.noteTitle}>Your note</Text>
              <Text style={styles.noteSub}>Read it over, then send it to your partner.</Text>
            </View>
            <ScrollView contentContainerStyle={styles.noteScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.messageCard}>
                <Text style={styles.msgGreeting}>{PREP_MESSAGE.greeting}</Text>
                <Text style={styles.msgIntro}>{PREP_MESSAGE.intro}</Text>
                {plan.map((p, idx) => (
                  <View key={p.id} style={styles.msgRow}>
                    <Text style={styles.msgNum}>{idx + 1}.</Text>
                    <Text style={styles.msgText}>{p.label}</Text>
                  </View>
                ))}
                <Text style={styles.msgSignoff}>{PREP_MESSAGE.signoff}</Text>
              </View>
            </ScrollView>
            <BeginButton fullWidth label="Send" onPress={send} />
            <Pressable onPress={() => { tap(); setStage('finale'); }} hitSlop={10} style={styles.restartWrap} accessibilityRole="button" accessibilityLabel="Done">
              <Text style={styles.restart}>Done</Text>
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
    fontSize: 23,
    lineHeight: 32,
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

  // Note (result) page.
  noteHead: { alignItems: 'center', gap: 8, paddingTop: 8, paddingBottom: 14 },
  noteTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
  },
  noteSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  noteScroll: { paddingVertical: 6 },
  messageCard: {
    padding: 20,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  msgGreeting: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  msgIntro: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 10,
  },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  msgNum: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 22,
    color: HEART,
    width: 20,
  },
  msgText: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  msgSignoff: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 16,
  },
  restartWrap: { alignItems: 'center', marginTop: 14 },
  restart: { fontFamily: 'Poppins-Regular', fontSize: 14, color: colors.textTagline, letterSpacing: 0.3 },
});
