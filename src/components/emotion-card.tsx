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
    padding: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  header: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    ...clayChipSurface,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  chipTextOn: { fontFamily: 'Poppins-Medium', color: '#7C40B0' },
  reframe: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 14,
  },
  rule: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.2,
    marginTop: 16,
  },
  breaths: { flexDirection: 'row', gap: 10, marginTop: 12 },
  breathBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  breathText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
