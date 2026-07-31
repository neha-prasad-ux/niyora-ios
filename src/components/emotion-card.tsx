// The emotional-regulation card: name what you feel, get a kind reframe for that
// exact feeling, and a breath for the big version. Naming is the win, so the
// chips lead; a reframe appears the moment one is tapped. Self-contained; it
// tells the parent when a feeling was first named (for scoring / the ring).

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing, radius } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';
import { clayChipSurface } from '@/theme/controls';
import {
  EMOTION_BREATHS,
  EMOTION_CHIPS,
  EMOTION_HEADER,
  EMOTION_RULE,
  EMOTION_SUBHEAD,
} from '@/models/emotion-regulation';

export function EmotionCard({ onNamed }: { onNamed?: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = EMOTION_CHIPS.find((c) => c.id === selectedId) ?? null;

  const pick = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    const firstNaming = selectedId == null;
    setSelectedId(id);
    if (firstNaming) onNamed?.();
  };

  const breathe = (technique: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/session?id=${technique}` as Href);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.header}>{EMOTION_HEADER}</Text>
      <Text style={styles.subhead}>{EMOTION_SUBHEAD}</Text>

      <View style={styles.chips}>
        {EMOTION_CHIPS.map((c) => {
          const on = c.id === selectedId;
          return (
            <Pressable
              key={c.id}
              onPress={() => pick(c.id)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={c.label}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <Animated.Text key={selected.id} entering={FadeIn.duration(220)} style={styles.reframe}>
          {selected.reframe}
        </Animated.Text>
      )}

      <Text style={styles.rule}>{EMOTION_RULE}</Text>

      <View style={styles.breaths}>
        {EMOTION_BREATHS.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => breathe(b.technique)}
            style={styles.breathBtn}
            accessibilityRole="button"
            accessibilityLabel={b.label}
          >
            <Text style={styles.breathText}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
  },
  header: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subhead: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    ...clayChipSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  chipTextOn: { fontFamily: fonts.medium, color: colors.primarySolid },
  reframe: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: spacing.md,
  },
  rule: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.2,
    marginTop: spacing.lg,
  },
  breaths: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  breathBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    backgroundColor: colors.fill.base,
  },
  breathText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
