// The scale card (Neha 2026-08-20). She places, we only build the ruler.
//
// `middle` used to answer an absolute with more sentences: "the truth usually
// sits in the middle". It measured as the weakest card in the set, because being
// told the middle exists is not the technique. The technique is putting a scale
// under her own word and having HER mark where this one actually sits. The gap
// between "always" and her own mark is the whole intervention, and it belongs to
// her because she made it.
//
// So nothing here argues. The model supplies her claim in her words and what the
// two ends genuinely look like in her situation; the app draws the line; she
// taps. Afterwards we state what happened and stop. No commentary, because a
// closing line that presses the point would hand the conclusion back to us.
//
// Taps, not a drag. There is no slider dependency in this app, a drag is fiddly
// on a phone held one-handed, and a woman mid-feeling should not have to be
// precise. Eleven stops is plenty of resolution for a claim that started at
// "always".

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { moon } from '@/theme/typography';

export const SCALE_COPY = {
  // The heading asks the useful question instead of quoting her claim back at her
  // (Neha, on device 2026-08-21). Her claim is already carried by the two ends.
  title: 'How often does this happen?',
  ask: 'Where do you think this situation is?',
  low: 'Not true at all',
  high: 'Completely true',
  done: 'Continue',
} as const;

const STOPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * What we say after she marks it. Her own word against her own number, stated as
 * a fact and nothing more. Deliberately authored rather than generated: there is
 * no reading to do here, only the gap to name, and a model asked to comment on it
 * would reach for reassurance.
 */
export function scaleResult(word: string, mark: number): string {
  const w = (word || '').trim().toLowerCase();
  // At 100 she has NOT found any daylight, and telling her the world is not black
  // and white there would be the app arguing with an answer it just asked for.
  // Name what she did and leave it, the number above is already the statement.
  if (mark >= 100) return w ? `You said ${w}, and you put this one at 100.` : 'You put this one at 100.';
  if (!w) return 'Not everything is black and white.';
  return `You said ${w}, but not everything is black and white.`;
}

export function ScaleCard({
  word,
  zero,
  hundred,
  onDone,
}: {
  /** The absolute word itself: always, never, everything. */
  word: string;
  /** What her claim being completely untrue would look like, in her situation. */
  zero: string;
  /** What her claim being completely true would look like, taken literally. */
  hundred: string;
  onDone: (mark: number) => void;
}) {
  const [mark, setMark] = useState<number | null>(null);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{SCALE_COPY.title}</Text>

      {/* Both ends before she places anything, so she can see that the top is a
          real claim and not a figure of speech.
          Ordered LOW then HIGH (2026-08-21): they used to stack 100 above 0 while
          the track ran 0 on the left to 100 on the right, so the same scale
          pointed two ways at once. Labelled with the same words as the track ends
          rather than bare numbers, so there is one vocabulary, not two. */}
      <View style={styles.ends}>
        <View style={styles.end}>
          <View style={styles.endDot}>
            <Text style={styles.endDotNum}>100</Text>
          </View>
          <Text style={[styles.endText, styles.endTextHigh]}>{hundred}</Text>
        </View>
        <View style={styles.end}>
          <View style={styles.endDot}>
            <Text style={styles.endDotNum}>0</Text>
          </View>
          <Text style={styles.endText}>{zero}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={styles.ask}>{SCALE_COPY.ask}</Text>

      <View style={styles.track} accessibilityRole="adjustable">
        {STOPS.map((s) => {
          const on = mark !== null && s <= mark;
          const here = mark === s;
          return (
            <Pressable
              key={s}
              onPress={() => setMark(s)}
              accessibilityRole="button"
              accessibilityLabel={`${s} out of 100`}
              accessibilityState={{ selected: here }}
              style={styles.stopHit}
            >
              <View style={[styles.stop, on && styles.stopOn, here && styles.stopHere]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.trackLabels}>
        <Text style={styles.trackLabel}>{SCALE_COPY.low}</Text>
        <Text style={styles.trackLabel}>{SCALE_COPY.high}</Text>
      </View>

      {mark !== null ? (
        <>
          <Text style={styles.markNum}>{mark}</Text>
          <Text style={styles.result}>{scaleResult(word, mark)}</Text>
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => onDone(mark)}
              accessibilityRole="button"
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>{SCALE_COPY.done}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { ...moon.title, color: colors.textOnDark.primary },
  ends: { gap: spacing.lg },
  // The number in a ring, with its sentence beside it: the pole is a place on a
  // scale, not a bullet in a list.
  end: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  endDot: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endDotNum: {
    ...moon.caption,
    color: colors.textOnDark.secondary,
    fontVariant: ['tabular-nums'],
  },
  endText: { ...moon.body, color: colors.textOnDark.tertiary, flex: 1 },
  // Her claim taken literally is the end that does the work.
  endTextHigh: { color: colors.textOnDark.primary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.fill.strong },
  ask: { ...moon.bodyStrong, color: colors.textOnDark.primary, marginTop: spacing.sm },
  track: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // A generous tap target around a small dot: she may be shaking.
  stopHit: { paddingVertical: spacing.md, paddingHorizontal: 2 },
  stop: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.fill.strong,
  },
  // 0.45 against 0.18 was invisible on the night ground: the filled half of the
  // scale read as ten dead dots (Neha, on device 2026-08-21). Filled stops are
  // now near-white, so the track shows how far along she placed it at a glance.
  stopOn: { backgroundColor: colors.fill.on },
  stopHere: { width: 18, height: 18, borderRadius: radius.pill, backgroundColor: colors.textOnDark.primary },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackLabel: { ...moon.caption, color: colors.textOnDark.tertiary },
  // Her number, centred, because it is the thing she just decided.
  markNum: {
    ...moon.celebrate,
    color: colors.textOnDark.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  result: { ...moon.body, color: colors.textOnDark.primary, textAlign: 'center' },
  ctaRow: { alignItems: 'center', marginTop: spacing.sm },
  // Secondary, matching the outlined chip used elsewhere in the flow: continuing
  // is not the achievement here, placing the mark was.
  secondary: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  secondaryText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
});
