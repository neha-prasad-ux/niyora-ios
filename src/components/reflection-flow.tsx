// The reflection (CBT) step, offered after a calming activity. Activity always
// comes first; we never reflect with anyone while they are hot. Her written
// words stay on the device and are never sent anywhere.
//
// The reflection is Socratic, not a handed reframe: she answers three short
// questions (perception, control, capacity) and arrives at the conclusion
// herself. Self-generated insight lasts longer than a line we give her. Nothing
// she taps or types leaves the phone; the questions are fixed and run on-device.
// Self-harm-adjacent input routes straight to crisis, never into the questions.
//
// Reused by the post-activity close (PostSessionMood). One reflection per
// journey is enough, so the close offers it once, then pivots to other
// activities.

import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BeginButton } from '@/components/begin-button';
import { CrisisLink } from '@/components/crisis-link';
import { colors } from '@/theme/colors';
import { looksLikeCrisisText } from '@/lib/crisis';
import { addDistressEntry } from '@/store/distress-history';

// The three questions, in order: perception, then control (the Stoic crux),
// then capacity. Tapping an answer advances; there is no commentary between
// taps. The thinking lands in the conclusion, not in a reply to each answer.
const QUESTIONS: { q: string; opts: string[] }[] = [
  { q: 'Does this feel bigger right now than it usually does?', opts: ['Yes', 'No', 'Not sure'] },
  {
    q: 'How much of this is actually yours to control?',
    opts: ['All of it', 'Some of it', 'None of it'],
  },
  { q: 'Are you able to take any step toward it?', opts: ['Yes', 'No', 'Not sure'] },
];

// The close adapts to her control answer (question 2) because that is the one
// that changes what is actually true for her. It tells her the truth she landed
// on; it never says "you answered X".
const CLOSE_LINES: Record<string, string> = {
  'All of it': "It's yours to act on, but not right now. Even this looks different in a few days.",
  'Some of it': "Do the part that's yours. Let the rest wait for clearer days.",
  'None of it': "There's nothing here to fix right now. Give it a few days. It changes.",
};
const DEFAULT_CLOSE = CLOSE_LINES['Some of it'];

// A rotating prompt inside the field: the first frame is the instruction, the
// rest are real one-liners so she sees what to write and feels less alone in it.
const PROMPTS = [
  'Say it in one line',
  "I feel like I'm failing",
  "I can't keep up with anything",
  'Everything feels too much',
  'I snapped at someone I love',
  'No one really gets it',
];
const PROMPT_INTERVAL_MS = 2800;

export function ReflectionFlow({
  feeling,
  onComplete,
  // The post-session close has no before/after rating, so it records the
  // reflection itself. The distress loop records its own real delta on the done
  // page, so it leaves this off to avoid a double count.
  recordOnComplete = false,
  // When embedded inside a screen that already provides the crisis footer and
  // horizontal padding (the distress loop), drop our own so they do not double.
  embedded = false,
}: {
  feeling?: string;
  onComplete: () => void;
  recordOnComplete?: boolean;
  embedded?: boolean;
}) {
  const [phase, setPhase] = useState<'write' | 'questions' | 'conclusion'>('write');
  const [text, setText] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const answers = useRef<string[]>([]);
  const recorded = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptOpacity = useRef(new Animated.Value(1)).current;

  // Cycle the in-field prompt only while she is on the write step. The state
  // update fires from a timer callback, never synchronously in the effect body,
  // so it stays clear of the set-state-in-effect lint.
  useEffect(() => {
    if (phase !== 'write') return;
    const id = setInterval(() => {
      Animated.timing(promptOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => {
          setPromptIndex((i) => (i + 1) % PROMPTS.length);
          Animated.timing(promptOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        },
      );
    }, PROMPT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [phase, promptOpacity]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const toQuestions = () => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    // Content exit: self-harm-adjacent input goes straight to the crisis
    // resource, never into the questions.
    if (looksLikeCrisisText(text)) {
      router.push('/crisis');
      return;
    }
    setPhase('questions');
  };

  const answer = (optIndex: number) => {
    if (selected !== null) return;
    Haptics.selectionAsync();
    setSelected(optIndex);
    answers.current[qIndex] = QUESTIONS[qIndex].opts[optIndex];
    // A brief beat so the chosen answer registers before the next question.
    advanceTimer.current = setTimeout(() => {
      setSelected(null);
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex((i) => i + 1);
      } else {
        setPhase('conclusion');
      }
    }, 300);
  };

  const finish = () => {
    Haptics.selectionAsync();
    if (recordOnComplete && !recorded.current) {
      recorded.current = true;
      // Additive, reset-proof: one more reflection moved through.
      addDistressEntry({
        feeling: feeling ?? null,
        before: 4,
        after: 2,
        completedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    onComplete();
  };

  const closeLine = CLOSE_LINES[answers.current[1]] ?? DEFAULT_CLOSE;

  return (
    <View style={embedded ? styles.rootEmbedded : styles.root}>
      {phase === 'write' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Let&apos;s look at this together.</Text>
          <View>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Your reflection"
            />
            {text === '' && (
              <Animated.Text
                style={[styles.prompt, { opacity: promptOpacity }]}
                pointerEvents="none"
              >
                {PROMPTS[promptIndex]}
              </Animated.Text>
            )}
          </View>
          <Text style={styles.privacy}>This stays on your phone.</Text>
          <View style={styles.footer}>
            <BeginButton label="Continue" onPress={toQuestions} />
          </View>
        </ScrollView>
      )}

      {phase === 'questions' && (
        <View style={styles.content}>
          <Text style={styles.question}>{QUESTIONS[qIndex].q}</Text>
          <Text style={styles.hint}>reflect before answering</Text>
          <View style={styles.options}>
            {QUESTIONS[qIndex].opts.map((opt, i) => (
              <Pressable
                key={opt}
                onPress={() => answer(i)}
                style={[styles.optionCard, selected === i && styles.optionSelected]}
                accessibilityRole="button"
                accessibilityLabel={opt}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {phase === 'conclusion' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.science}>
            In the days before your period, your body raises its guard. You question more and trust
            less, because part of you is trying to keep you safe.
          </Text>
          <Text style={styles.verdict}>
            What you&apos;re feeling is real. What it&apos;s telling you isn&apos;t the whole story.
          </Text>
          <Text style={styles.close}>{closeLine}</Text>
          <View style={styles.footer}>
            <BeginButton label="Okay" onPress={finish} />
          </View>
        </ScrollView>
      )}

      {!embedded && (
        <View style={styles.crisisFooter}>
          <CrisisLink />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
  },
  // Embedded: the host screen owns the horizontal padding and crisis footer.
  rootEmbedded: {
    flex: 1,
    alignSelf: 'stretch',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  // The rotating prompt sits over the empty field, aligned to its text inset.
  prompt: {
    position: 'absolute',
    left: 16,
    top: 14,
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textTagline,
  },
  privacy: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSubtitle,
    marginTop: 12,
  },
  question: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  hint: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTagline,
    textAlign: 'center',
    marginTop: 8,
  },
  options: {
    marginTop: 26,
    gap: 12,
  },
  optionCard: {
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  optionText: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  science: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  verdict: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    lineHeight: 27,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 16,
  },
  close: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  crisisFooter: {
    paddingTop: 8,
    paddingBottom: 4,
  },
});
