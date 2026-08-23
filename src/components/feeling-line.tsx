// The Moon home's ask: the moon gently guesses a feeling as a question, drifting
// soft -> intense through ONE emotion so a mild day and a flooding one both see
// themselves. One emotion is picked per open (three rungs); each rung is held
// ~2s with a soft fade while the frame ("Feeling ___?") stays put, so only the
// word breathes. A question, not a claim about her ("I feel ___"), so it reads as
// the moon checking in rather than telling her. Reduce motion holds the first
// rung. Copy: Neha 2026-08-01 (question form over the first-person statement).

import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';

// Three emotions, each an adjective ladder: simple -> more -> most. Adjectives
// throughout so "I feel ___" never breaks grammatically. Start with three; add
// more once it breathes.
const EMOTIONS: readonly (readonly string[])[] = [
  ['annoyed', 'angry', 'furious'],
  ['low', 'tearful', 'heartbroken'],
  ['stretched', 'overwhelmed', 'frantic'],
];

const HOLD_MS = 2800; // per rung, unhurried
const FADE_MS = 600; // long, soft crossfade

function pickLadder(): readonly string[] {
  return EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
}

export function FeelingLine() {
  // One emotion per mount. The home re-keys this on every genuine open, so each
  // arrival gets a fresh feeling without reshuffling mid-view.
  const [ladder] = useState(pickLadder);
  const [i, setI] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (!cancelled) setReduceMotion(rm);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Each rung: fade the word in, hold, fade it out, then advance, the next
  // rung's run of this effect fades the new word in. Under reduce motion it just
  // holds the first rung, fully shown, and never advances.
  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.out(Easing.sin) });
    const out = setTimeout(() => {
      opacity.value = withTiming(0, { duration: FADE_MS, easing: Easing.in(Easing.sin) });
    }, HOLD_MS - FADE_MS);
    const next = setTimeout(() => setI((x) => (x + 1) % ladder.length), HOLD_MS);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i, reduceMotion, ladder.length, opacity]);

  const wordStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const word = ladder[i];

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`Feeling ${word}? What do I do?`}
    >
      <Text style={styles.lead}>Feeling </Text>
      <Animated.Text style={[styles.word, wordStyle]}>{word}?</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Left-aligned: "I feel" stays put and the word grows rightward, so a longer
  // feeling never recenters the line (no horizontal jump on each change).
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-start',
  },
  lead: {
    fontFamily: fonts.light,
    fontSize: fontScale.heading, // 26
    lineHeight: 34,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.2,
  },
  word: {
    fontFamily: fonts.medium,
    fontSize: fontScale.heading, // 26
    lineHeight: 34,
    color: colors.textOnDark.primary,
    letterSpacing: 0.2,
  },
});
