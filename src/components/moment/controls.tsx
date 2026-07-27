// The flow's shared controls.
//
// Nothing here is a new visual language. Every value is lifted verbatim from
// something already shipping, because the option row had been copy-pasted five
// times across game-v3 and rough-moment and this screen would have been the
// sixth. Extracting it is the opposite of inventing one.
//
//   OptionRow  === game-v3 `l3Solution` / `l3SolutionText`, byte for byte
//   Bubble     === rough-moment's conversation bubble
//   ScaleButtons === eleven targets, 0 to 10, wrapped to two rows
//
// Colours come only from `colors`, `v3` and `controls`. The one literal here,
// the selected violet, is the app's existing selected-chip fill, used in
// onboarding-v3 and rough-moment; it has no token yet, and inventing one would
// be a bigger change than reusing it.

import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** The app's existing selected-chip fill. Not a token yet; see file header. */
const SELECTED = 'rgba(150, 120, 235, 0.28)';

// --- one option, one line ----------------------------------------------------

/**
 * A full-width option row. One thumb-sized target per line, so she never reads
 * across a wrapped pill row while upset.
 */
export function OptionRow({
  label,
  onPress,
  selected = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      style={[styles.row, selected && styles.rowOn, disabled && styles.rowOff, style]}
      onPress={() => {
        if (disabled) return;
        tap();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
    >
      <Text style={[styles.rowText, disabled && styles.rowTextOff]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The line under an option saying what it is for.
 *
 * The map asks for one at roughly fourteen choice points, and it is not
 * decoration: if she only learns "the app told me to breathe" she has an app
 * habit, and if she learns "waiting twenty minutes is what stops me sending the
 * thing I would take back" she has a skill that survives the phone going back
 * in her pocket. Transfer is the point.
 *
 * It says what the thing does FOR HER, never a mechanism. And it never appears
 * on a safety beat, where an explanation reads as persuasion.
 */
export function WhyLine({ children }: { children: string }) {
  return <Text style={styles.why}>{children}</Text>;
}

// --- the conversation --------------------------------------------------------

export function Bubble({ who, text }: { who: 'me' | 'app'; text: string }) {
  return (
    <View style={[styles.bubble, who === 'me' ? styles.me : styles.app]}>
      <Text style={styles.bubbleText}>{text}</Text>
    </View>
  );
}

/** The pause while the model answers. On this phone that is 1.4 to 1.9 seconds,
 *  which is long enough to read as broken if nothing is designed into it. */
export function Thinking() {
  return (
    <View style={[styles.bubble, styles.app]}>
      <Text style={styles.bubbleText}>…</Text>
    </View>
  );
}

// --- 0 to 10 -----------------------------------------------------------------

/**
 * The intensity scale as buttons, 1 to 5.
 *
 * Five fits one row at a size a thumb can hit without looking, which is the
 * whole argument for it: she is rating this twice, at the start and at the end,
 * and both times she is not at her most patient.
 *
 * The known cost, recorded rather than hidden: the map specifies 0-10, and the
 * delta between the opening and closing readings is the flow's only outcome
 * measure. Five points floor and ceiling faster than eleven, so real movement
 * will sometimes show as no movement. If the delta ever has to carry weight as
 * evidence, this is the first thing to revisit.
 */
export function ScaleButtons({
  value,
  onChange,
  lowLabel = 'Barely',
  highLabel = 'Huge',
}: {
  value: number | null;
  onChange: (v: number) => void;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <View style={styles.numbersWrap}>
      <View style={styles.numbers}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          const on = value === n;
          return (
            <Pressable
              key={n}
              style={[styles.number, on && styles.numberOn]}
              onPress={() => {
                tap();
                onChange(n);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${n} out of 5`}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.numberText, on && styles.numberTextOn]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.numberLabels}>
        <Text style={styles.scaleEnd}>{lowLabel}</Text>
        <Text style={styles.scaleEnd}>{highLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // game-v3 l3Solution, verbatim
  row: {
    minHeight: 56,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  rowOn: { backgroundColor: SELECTED, borderColor: colors.beginBorder },
  rowOff: { opacity: 0.45 },
  rowText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rowTextOff: { color: colors.textSubtitle },

  why: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: v3.textFaint,
    paddingHorizontal: 4,
  },

  // rough-moment's bubble, verbatim
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(115, 57, 172, 0.28)',
    borderBottomRightRadius: 5,
  },
  app: {
    alignSelf: 'flex-start',
    backgroundColor: v3.panel,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderBottomLeftRadius: 5,
  },
  bubbleText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },

  scaleEnd: { fontFamily: 'Poppins-Regular', fontSize: 11, color: colors.textTagline },

  numbersWrap: { gap: 10 },
  // Five fit one row. Each stretches to share the width rather than sitting at
  // a fixed size, so the row fills the card on any phone.
  numbers: { flexDirection: 'row', gap: 8 },
  number: {
    flex: 1,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  numberOn: { backgroundColor: SELECTED, borderColor: colors.beginBorder },
  numberText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: colors.textSubtitle,
    fontVariant: ['tabular-nums'],
  },
  numberTextOn: { fontFamily: 'Poppins-Medium', color: colors.textPrimary },
  numberLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
});
