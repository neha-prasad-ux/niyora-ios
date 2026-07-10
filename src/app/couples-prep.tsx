// "Prep well together": a two-track yes/no questionnaire (one track for the
// person with PMS, one for the partner) that assembles a shared prep checklist.
// Deciding preferences while calm beats negotiating in the moment (adapted from
// DBT crisis-planning), and it heads off the demand-withdraw "eggshells" pattern.
// The partner can be any gender, so every line is neutral.

import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { Checklist, type ChecklistItem } from '@/components/checklist';
import { Pill } from '@/components/Pill';
import { colors } from '@/theme/colors';
import { PREP_QUESTIONS, buildPrepChecklist, type PrepTrack } from '@/models/couples-content';

const HEART = 'hsl(275, 55%, 70%)'; // violet, matching the hub's prep heart

const TRACKS: { key: PrepTrack; label: string }[] = [
  { key: 'you', label: 'You' },
  { key: 'partner', label: 'Your partner' },
];

function AnswerToggle({ value, onPick }: { value: boolean | undefined; onPick: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      {[true, false].map((v) => {
        const on = value === v;
        return (
          <Pressable
            key={String(v)}
            onPress={() => onPick(v)}
            style={[styles.toggleBtn, on && styles.toggleBtnOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={v ? 'Yes' : 'No'}
          >
            <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{v ? 'Yes' : 'No'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function CouplesPrepScreen() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [stage, setStage] = useState<'form' | 'plan'>('form');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const allAnswered = PREP_QUESTIONS.every((q) => answers[q.id] !== undefined);
  const plan = useMemo(() => buildPrepChecklist(answers), [answers]);
  const planItems: readonly ChecklistItem[] = plan.map((p) => ({ id: p.id, label: p.label }));

  const pick = (id: string, v: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    setAnswers((cur) => ({ ...cur, [id]: v }));
  };

  const build = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setStage('plan');
  };

  const toggleCheck = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setChecks((cur) => ({ ...cur, [id]: !cur[id] }));
  };

  const copyPlan = async () => {
    Haptics.selectionAsync().catch(() => {});
    const text = ['Our prep plan for the hard week:', ...plan.map((p) => `- ${p.label}`)].join('\n');
    await Clipboard.setStringAsync(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const restart = () => {
    Haptics.selectionAsync().catch(() => {});
    setAnswers({});
    setChecks({});
    setCopied(false);
    setStage('form');
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

        <View style={styles.head}>
          <SymbolView name="heart.fill" tintColor={HEART} size={24} weight="semibold" />
          <Text style={styles.title}>Prep well together</Text>
          <Text style={styles.subhead}>
            {stage === 'form'
              ? 'Answer these in a calm week. Both of you, honestly.'
              : 'Your shared plan. Copy it and keep it somewhere you both see.'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {stage === 'form' ? (
            <>
              {TRACKS.map((t) => (
                <View key={t.key} style={styles.section}>
                  <Text style={styles.sectionTitle}>{t.label}</Text>
                  {PREP_QUESTIONS.filter((q) => q.track === t.key).map((q) => (
                    <View key={q.id} style={styles.qRow}>
                      <Text style={styles.qText}>{q.question}</Text>
                      <AnswerToggle value={answers[q.id]} onPick={(v) => pick(q.id, v)} />
                    </View>
                  ))}
                </View>
              ))}
              <View style={styles.actions}>
                <Pill label="See our plan" onPress={build} disabled={!allAnswered} />
                {!allAnswered ? <Text style={styles.hint}>Answer every question to build your plan.</Text> : null}
              </View>
            </>
          ) : (
            <>
              <Checklist items={planItems} isChecked={(id) => !!checks[id]} onToggle={toggleCheck} />
              <View style={styles.actions}>
                <Pill label={copied ? 'Copied' : 'Copy plan'} onPress={copyPlan} />
                <Pressable onPress={restart} hitSlop={10} accessibilityRole="button" accessibilityLabel="Start over">
                  <Text style={styles.restart}>Start over</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 18, gap: 10 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scroll: { paddingBottom: 28 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  qRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
    gap: 12,
  },
  qText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  toggle: { flexDirection: 'row', gap: 10, alignSelf: 'flex-start' },
  toggleBtn: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  toggleBtnOn: {
    borderColor: HEART,
    backgroundColor: 'hsla(275, 55%, 70%, 0.2)',
  },
  toggleText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
  },
  toggleTextOn: { color: colors.textPrimary },
  actions: { alignItems: 'center', gap: 14, marginTop: 12 },
  hint: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  restart: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: colors.textTagline,
    letterSpacing: 0.3,
  },
});
