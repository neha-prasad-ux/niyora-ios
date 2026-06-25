// Result page: the hero + ranked list as a calm swipe deck. Reached from the
// recommend sheet with the chosen feelings + needs. Time is not a question and
// not a toggle -- every option shows its own length on the card, and that is
// what the user reads to decide. Fully on-device.
//
// A brief "finding what helps" loading beat (the Soul orb breathing + pulsing
// dots) plays before the deck fades in, so the moment feels personal rather
// than an instant cut.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { ResultDeck } from '@/components/ResultDeck';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { recommend, type Need, type RecCard } from '@/models/recommend';

// The header leads with where she's headed (the need), never the feeling she's
// leaving. A gentle "Let's..." invitation toward feeling better.
const NEED_HEADER: Record<Need, string> = {
  calm: "Let's find some calm",
  focused: "Let's clear your head",
  relaxed: "Let's unwind",
  sleepy: "Let's wind down",
  cozy: "Let's get cozy",
  'let-it-out': "Let's let it out",
};

// Orb hue per need, matching the recommend sheet so the orb carries through.
const NEED_HUE: Record<Need, number> = {
  calm: 220,
  focused: 186,
  relaxed: 150,
  sleepy: 250,
  cozy: 28,
  'let-it-out': 295,
};

const LOADING_MS = 1300;

export default function ResultScreen() {
  const params = useLocalSearchParams<{ feelings?: string; needs?: string }>();
  const feelings = useMemo(
    () => (params.feelings ? params.feelings.split(',') : []),
    [params.feelings],
  );
  const needs = useMemo(
    () => (params.needs ? (params.needs.split(',') as Need[]) : []),
    [params.needs],
  );

  // No time budget: show every option at its authored length.
  const result = useMemo(() => recommend(feelings, needs), [feelings, needs]);
  const cards = useMemo(() => (result ? [result.hero, ...result.list] : []), [result]);

  const header = needs[0] ? NEED_HEADER[needs[0]] : "Let's find what helps";
  const orbHue = needs[0] ? NEED_HUE[needs[0]] : undefined;

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  const onBegin = useCallback((card: RecCard) => {
    if (card.techniqueId) {
      const p: Record<string, string> = { id: card.techniqueId };
      if (card.feelingId) p.feeling = card.feelingId;
      if (card.rounds != null) p.rounds = String(card.rounds);
      router.push({ pathname: '/session', params: p });
      return;
    }
    if (card.activityId) {
      // Carry the primary feeling so the post-activity "why this happens" read
      // can show the matching Understand reframe.
      router.push({
        pathname: '/activity',
        params: feelings[0]
          ? { id: card.activityId, feeling: feelings[0] }
          : { id: card.activityId },
      });
    }
  }, [feelings]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <SymbolView name="xmark" tintColor={colors.textSubtitle} size={16} weight="medium" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <LoadingOrb hue={orbHue} />
            <View style={{ height: 30 }} />
            <LoadingLine />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(450)} style={styles.loaded}>
            <Text style={styles.ctx}>{header}</Text>
            {cards.length > 0 ? (
              <ResultDeck cards={cards} onBegin={onBegin} />
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}

// One smooth swell during the loading beat: the orb grows, then settles -- a
// single calming breath, not a repeating pulse.
function LoadingOrb({ hue }: { hue?: number }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : 0.92);
  useEffect(() => {
    if (reduced) return;
    scale.value = withSequence(
      withTiming(1.12, { duration: 680, easing: Easing.inOut(Easing.sin) }),
      withTiming(1.0, { duration: 620, easing: Easing.inOut(Easing.sin) }),
    );
  }, [reduced, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Orb size={116} hue={hue} />
    </Animated.View>
  );
}

// A single softly-breathing line, paced like a slow exhale, instead of three
// bouncing dots. Calmer, and it tells her what the wait is for.
function LoadingLine() {
  const reduced = useReducedMotion();
  const o = useSharedValue(reduced ? 0.7 : 0.4);
  useEffect(() => {
    if (reduced) return;
    o.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduced, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[styles.loadingLine, style]}>Finding what helps</Animated.Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', height: 24, marginBottom: 4 },
  loaded: { flex: 1, width: '100%' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  ctx: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 48,
    marginBottom: 22,
  },
});
