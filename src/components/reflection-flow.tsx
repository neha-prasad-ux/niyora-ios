// The reflection (CBT) step, offered after a calming activity. Activity always
// comes first; we never reframe anyone while they are hot. Her written words
// stay on the device and are never sent anywhere. The distancing reframe reuses
// the app's vetted, fact-checked feeling cards (UNDERSTAND_CARDS), on-device,
// not an off-device model. Self-harm-adjacent input routes straight to crisis.
//
// Reused by the post-activity close (PostSessionMood). One reflection per
// journey is enough, so the close offers it once, then pivots to other
// activities.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BeginButton } from '@/components/begin-button';
import { CrisisLink } from '@/components/crisis-link';
import { colors } from '@/theme/colors';
import { looksLikeCrisisText } from '@/lib/crisis';
import {
  UNDERSTAND_CARDS,
  type UnderstandCard,
  type UnderstandContext,
} from '@/models/understand';
import { resolveUnderstandContext } from '@/lib/understand-context';
import { addDistressEntry } from '@/store/distress-history';

// The vetted reframe for a feeling in the current context, falling back to the
// universal "feeling safe" card when there is no specific feeling.
function reframeFor(feeling: string | undefined, ctx: UnderstandContext): UnderstandCard {
  if (feeling) {
    const exact = UNDERSTAND_CARDS.find(
      (c) => c.scope === 'feeling' && c.feeling === feeling && c.context === ctx,
    );
    if (exact) return exact;
    const anyCtx = UNDERSTAND_CARDS.find((c) => c.scope === 'feeling' && c.feeling === feeling);
    if (anyCtx) return anyCtx;
  }
  return UNDERSTAND_CARDS.find((c) => c.id === 'feeling-safe') ?? UNDERSTAND_CARDS[0];
}

export function ReflectionFlow({
  feeling,
  onComplete,
}: {
  feeling?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'write' | 'reframe'>('write');
  const [text, setText] = useState('');
  const [ctx, setCtx] = useState<UnderstandContext>('general');
  const recorded = useRef(false);

  useEffect(() => {
    let alive = true;
    resolveUnderstandContext()
      .then((c) => alive && setCtx(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const reframe = useMemo(() => reframeFor(feeling, ctx), [feeling, ctx]);

  const toReframe = () => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    // Content exit: self-harm-adjacent input goes straight to the crisis
    // resource, never to a reframe.
    if (looksLikeCrisisText(text)) {
      router.push('/crisis');
      return;
    }
    setPhase('reframe');
  };

  const finish = () => {
    Haptics.selectionAsync();
    if (!recorded.current) {
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

  return (
    <View style={styles.root}>
      {phase === 'write' && (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>What&apos;s on your mind?</Text>
          <Text style={styles.sub}>Just for you. It stays on your phone.</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write as little or as much as you like"
            placeholderTextColor={colors.textTagline}
            multiline
            textAlignVertical="top"
            accessibilityLabel="Your reflection"
          />
          <View style={styles.footer}>
            <BeginButton label="Continue" onPress={toReframe} />
          </View>
        </ScrollView>
      )}

      {phase === 'reframe' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.reframeTitle}>{reframe.title}</Text>
          <Text style={styles.reframeBody}>{reframe.body}</Text>
          <Text style={styles.reframeAsk}>Does this land?</Text>
          <View style={styles.footer}>
            <BeginButton label="Yes" onPress={finish} />
          </View>
        </ScrollView>
      )}

      <View style={styles.crisisFooter}>
        <CrisisLink />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
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
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 10,
  },
  input: {
    marginTop: 20,
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
  reframeTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  reframeBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 18,
  },
  reframeAsk: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 26,
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
