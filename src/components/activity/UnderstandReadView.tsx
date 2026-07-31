// The "why this happens" read, surfaced as a gentle option at the end of an
// activity. A single Understand reframe in the quiet reading layout: the body
// holds on screen, scrolls if it runs long, and a soft Done closes it.
//
// It shows the reframe only (title + body). The citation behind each card's
// `source` is intentionally not surfaced here -- it carries raw URLs and wants
// its own "the science" treatment, separate from this calm exit beat.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { UnderstandCard } from '@/models/understand';
import { Pill } from '@/components/Pill';

type Props = { card: UnderstandCard; onDone: () => void };

export function UnderstandReadView({ card, onDone }: Props) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.wrap}>
      <Text style={styles.title}>{card.title}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.body}>{card.body}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pill label="Done" variant="ghost" onPress={onDone} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignSelf: 'stretch' },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 29,
    color: colors.textPrimary,
    textAlign: 'left',
    letterSpacing: 0.2,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  scroll: { flex: 1 },
  // Top-aligned so the body sits directly under the title instead of floating in
  // the vertical centre with a dead gap between heading and text.
  scrollContent: { justifyContent: 'flex-start', flexGrow: 1, paddingTop: spacing.xs, paddingBottom: spacing.md },
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    lineHeight: 30,
    color: colors.textOnDark.primary,
    textAlign: 'left',
  },
  actions: { alignItems: 'center', paddingVertical: spacing.lg },
});
