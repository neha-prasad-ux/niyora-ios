// The fill-in template and its chips.
//
// One component behind three old layouts (fill-chips, pick-to-fill, fill+text):
// a sentence with blanks she completes by tapping a suggested chip OR typing.
// Used by the hurt beat ("I feel __ when __, I need __"), the lonely draft and
// the work-clash frame (describe / effect / ask).
//
// Nothing here is a new visual language. The chip is the app's existing
// translucent selection toggle (colors.selectedFill), the motion is the shared
// option language (rise + stagger from controls.tsx), and the type-your-own
// field is the same panel surface as every other field.
//
// SAFETY: the assembled sentence is free text. Any caller that sends it onward
// to a model MUST run it through analyse()/scanForCrisis first, same as every
// other typed input in the flow (crisis-scan runs before the model, always).

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';

import { assemble, isBlank, type Blank, type TemplatePart } from './fill-in-assemble';

export { assemble };
export type { Blank, TemplatePart };

const tap = () => Haptics.selectionAsync().catch(() => {});

const STAGGER = 45;
const STAGGER_BASE = 60;

// --- the chip ----------------------------------------------------------------

/** The app's translucent selection toggle. Shared so the fill-in suggestions and
 *  the standalone chip step (anxious: likely / worst) read identically. */
export function Chip({
  label,
  selected = false,
  onPress,
  index,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  index?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <Animated.View
      entering={
        index != null && !reduce ? FadeInUp.delay(STAGGER_BASE + index * STAGGER).duration(220) : undefined
      }
    >
      <Pressable
        style={[styles.chip, selected && styles.chipOn]}
        onPress={() => {
          tap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
      >
        <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// --- the fill-in template ----------------------------------------------------

/**
 * Render `parts` as a sentence with dashed blanks. Tapping a blank makes it
 * active; its suggestion chips and a type-your-own field appear below. Filling
 * from either source writes back through `onChange`. The caller owns `values`
 * and the Continue CTA, so the template stays a controlled, testable view.
 */
export function FillInTemplate({
  parts,
  values,
  onChange,
}: {
  parts: TemplatePart[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const reduce = useReducedMotion();
  const blanks = parts.filter(isBlank);
  // Start on the first empty blank so she can begin typing/tapping immediately.
  const firstEmpty = blanks.find((b) => !values[b.key]?.trim())?.key ?? blanks[0]?.key ?? null;
  const [active, setActive] = useState<string | null>(firstEmpty);
  const activeBlank = blanks.find((b) => b.key === active) ?? null;

  return (
    <View style={styles.wrap}>
      <View style={styles.sentence}>
        {parts.map((p, i) => {
          if (!isBlank(p)) {
            // Split the run into words so the sentence wraps like prose.
            return p
              .split(/(\s+)/)
              .filter((w) => w.length)
              .map((w, j) =>
                w.trim() === '' ? (
                  <Text key={`${i}-${j}`} style={styles.space}>
                    {' '}
                  </Text>
                ) : (
                  <Text key={`${i}-${j}`} style={styles.word}>
                    {w}
                  </Text>
                ),
              );
          }
          const val = values[p.key]?.trim();
          const on = active === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => {
                tap();
                setActive(p.key);
              }}
              style={[styles.blank, val ? styles.blankFilled : styles.blankEmpty, on && styles.blankActive]}
              accessibilityRole="button"
              accessibilityLabel={val ? `${val}, edit` : p.placeholder ?? 'fill in'}
            >
              <Text style={[styles.blankText, !val && styles.blankPlaceholder]}>{val || p.placeholder || ' '}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeBlank && (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(200)} style={styles.editor}>
          {!!activeBlank.suggestions?.length && (
            <View style={styles.chips}>
              {activeBlank.suggestions.map((s, i) => (
                <Chip
                  key={s}
                  label={s}
                  index={i}
                  selected={values[activeBlank.key]?.trim() === s}
                  onPress={() => onChange(activeBlank.key, s)}
                />
              ))}
            </View>
          )}
          <TextInput
            value={values[activeBlank.key] ?? ''}
            onChangeText={(t) => onChange(activeBlank.key, t)}
            placeholder="or type your own"
            placeholderTextColor={v3.textFaint}
            style={styles.input}
            multiline
            accessibilityLabel="Type your own"
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  sentence: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  word: { fontFamily: fonts.light, fontSize: fontScale.body, lineHeight: 34, color: colors.textPrimary },
  space: { fontFamily: fonts.light, fontSize: fontScale.body, lineHeight: 34, color: colors.textPrimary },
  // The dashed slot. borderStyle 'dashed' renders on iOS; the min width keeps an
  // empty blank tappable, and the small vertical padding lifts the word off the
  // dashes so a filled value never sits on the line.
  blank: {
    minWidth: 70,
    marginHorizontal: 3,
    paddingHorizontal: spacing.sm,
    paddingBottom: 1,
    borderBottomWidth: 1.5,
    alignItems: 'center',
  },
  blankEmpty: { borderStyle: 'dashed', borderColor: colors.textSubtitle },
  blankFilled: { borderStyle: 'solid', borderColor: colors.beginBorder },
  blankActive: { borderColor: colors.beginBorder },
  blankText: { fontFamily: fonts.regular, fontSize: fontScale.body, lineHeight: 30, color: colors.textPrimary },
  blankPlaceholder: { fontFamily: fonts.light, color: colors.textSubtitle },

  editor: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.selectedFill, borderColor: colors.beginBorder },
  chipText: { fontFamily: fonts.regular, fontSize: fontScale.emphasis, lineHeight: 21, color: colors.textSubtitle },
  chipTextOn: { fontFamily: fonts.medium, color: colors.textPrimary },

  input: {
    minHeight: 48,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 23,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
});
