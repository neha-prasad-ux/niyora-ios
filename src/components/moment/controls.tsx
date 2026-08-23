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

import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

// The option/skeleton rows sit over the moon glowing through the frosted card,
// so a light panel (v3.panel, ~5% white) leaves white text unreadable where the
// glow is bright. A DARK well keeps every row legible regardless of what is
// behind it, the same value as the moment composer field.
const PANEL_DARK = 'rgba(10,8,16,0.55)';

// One option-motion language (motion-design rules, neha-prasad.com):
//   · options are ACTIONS, so they RISE into place (Y-axis: bottom is action),
//     never drop from the top, motion has to match where the thing lives.
//   · stagger 20-60ms; a small base delay so the parent card settles first
//     (parent before children).
//   · the press is DIRECT touch, so it is a SPRING, not an ease.
const STAGGER = 45;
const STAGGER_BASE = 60;
/** How long a tapped option holds its colour before the beat advances, so the
 *  choice registers on every screen, not just the ones that tracked it by hand.
 *  Matches the moment screen's own ADVANCE_MS. */
const ADVANCE_MS = 260;
/** Interactive spring: stiffness 300 / damping 25 / mass 1, ~72% ratio. */
const PRESS_SPRING = { stiffness: 320, damping: 26, mass: 1 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// --- one option, one line ----------------------------------------------------

/**
 * A full-width option row. One thumb-sized target per line, so she never reads
 * across a wrapped pill row while upset.
 *
 * `index` opts the row into the group stagger (options settle in one after
 * another). `hint` is the VoiceOver hint, e.g. "suggested by the moon" on an
 * AI-written reading. `tint` is the phase colour: pass it and the row lights up
 * in that colour when tapped and holds it for a beat before `onPress` fires, so
 * the choice registers the same way on every screen. Without it, `onPress`
 * fires immediately (for rows that open a field rather than advance a beat).
 * The press-down spring is universal, so every tap answers the same way.
 */
export function OptionRow({
  label,
  onPress,
  selected = false,
  disabled = false,
  style,
  index,
  hint,
  tint,
  recommended = false,
  done = false,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  index?: number;
  hint?: string;
  tint?: StyleProp<ViewStyle>;
  /** The one option we gently steer her toward: the in-app calming action (take
   *  the hold, colour, breathe). Renders as a filled primary row with a
   *  "Recommended" chip, and is meant to sit LAST in the stack so it reads as
   *  the place to land, not the first thing to skip past. */
  recommended?: boolean;
  /** She has finished this one (a settling activity). Shows a quiet check; the
   *  row stays tappable so she can do it again. */
  done?: boolean;
}) {
  const reduce = useReducedMotion();
  const press = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    // Scale is a transform, which reduce-motion avoids; there it presses with
    // opacity alone (motion-design accessibility swap: scale → opacity fade).
    transform: [{ scale: 1 - press.value * (reduce ? 0 : 0.03) }],
    opacity: 1 - press.value * 0.1,
  }));
  // The tapped-and-holding state, so the colour registers before the beat moves.
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );
  const active = selected || flash;
  return (
    <Animated.View
      entering={
        index != null && !reduce
          ? FadeInUp.delay(STAGGER_BASE + index * STAGGER).duration(220)
          : undefined
      }
    >
      <AnimatedPressable
        style={[
          styles.row,
          recommended && styles.rowRecommended,
          active && (recommended ? styles.rowRecommendedOn : (tint ?? styles.rowOn)),
          disabled && styles.rowOff,
          style,
          pressStyle,
        ]}
        onPressIn={() => {
          // Spring, because she touched it directly; begins on the same frame,
          // well under the 100ms feedback rule.
          if (!disabled) press.value = withSpring(1, PRESS_SPRING);
        }}
        onPressOut={() => {
          press.value = withSpring(0, PRESS_SPRING);
        }}
        onPress={() => {
          if (disabled) return;
          tap();
          // With a tint, hold the colour for a beat, then advance; otherwise fire
          // now (rows that toggle a field in place, never leaving the screen).
          if (tint) {
            setFlash(true);
            flashTimer.current = setTimeout(onPress, ADVANCE_MS);
          } else {
            onPress();
          }
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={recommended ? `${label}, recommended` : label}
        accessibilityHint={hint}
        accessibilityState={{ selected: active, disabled }}
      >
        <Text style={[styles.rowText, disabled && styles.rowTextOff]}>{label}</Text>
        {done && (
          <Text style={styles.rowDone} pointerEvents="none">
            ✓
          </Text>
        )}
        {recommended && (
          <View style={styles.recChip} pointerEvents="none">
            <Text style={styles.recChipText}>Recommended</Text>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
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

/** One pulsing dot in the thinking row. Fades and lifts on a loop, staggered by
 *  index so the three read as a wave. Still (dim) under reduce-motion. */
function Dot({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    v.value = withDelay(index * 180, withRepeat(withTiming(1, { duration: 620 }), -1, true));
  }, [index, reduce, v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.65,
    transform: [{ translateY: reduce ? 0 : -3 * v.value }],
  }));
  return <Animated.View style={[styles.dot, style]} />;
}

/**
 * Skeleton placeholder rows (M3), shown while the model ranks/writes the
 * options, reframes or feelings, instead of flashing the authored fallback and
 * then swapping it. Same height as an option row, so nothing jumps when the real
 * content lands. The authored fallback still shows if the model actually fails.
 */
export function SkeletonRows({ count = 3 }: { count?: number }) {
  const reduce = useReducedMotion();
  // A gloss band that sweeps left→right across every row on a loop, the "still
  // loading" motion. `x` runs 0→1 forever; the band (60% of the row wide) is
  // translated from just off the left edge to just off the right, so the wrap is
  // never visible. Row width is measured once so the travel matches any phone.
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    x.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [reduce, x]);
  const shine = useAnimatedStyle(() => ({
    // -w (fully left of the row) → +w (fully right of it).
    transform: [{ translateX: -w + x.value * (2 * w) }],
  }));
  return (
    <View
      style={styles.skelStack}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityLabel="Thinking"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.skelRow}>
          {!reduce && w > 0 && (
            <Animated.View style={[styles.skelShine, { width: w * 0.6 }, shine]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', colors.border.faint, 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * The AI-thinking indicator for the generation gap (M2). Three pulsing dots and
 * an optional line ("Writing you a start"), shown where the model takes a beat
 * to answer, so the pause reads as working, not broken.
 */
export function ThinkingDots({ label }: { label?: string }) {
  return (
    <View style={styles.thinkingRow} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Thinking'}>
      <View style={styles.dots}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
      {label ? <Text style={styles.thinkingLabel}>{label}</Text> : null}
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
  const reduce = useReducedMotion();
  return (
    <View style={styles.numbersWrap}>
      <View style={styles.numbers}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          const on = value === n;
          return (
            <Animated.View
              key={n}
              style={styles.numberCell}
              entering={reduce ? undefined : FadeInUp.delay(STAGGER_BASE + i * STAGGER).duration(220)}
            >
              <Pressable
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
            </Animated.View>
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
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: PANEL_DARK,
  },
  rowOn: { backgroundColor: colors.selectedFill, borderColor: colors.beginBorder },
  rowOff: { opacity: 0.45 },
  // The recommended option: the flat solid-purple primary (colors.primarySolid,
  // the same fill the in-card primary buttons use), so it reads as THE button on
  // the screen while the others stay quiet panels. A brighter shade holds during
  // the tap.
  rowRecommended: { backgroundColor: colors.primarySolid, borderColor: colors.beginBorder },
  rowRecommendedOn: { backgroundColor: 'hsl(270, 50%, 53%)', borderColor: colors.beginBorder },
  // The "Recommended" badge, poking above the top edge of the button. A white
  // pill so it lifts off the purple; dark-purple text so the word stays legible.
  recChip: {
    position: 'absolute',
    top: -9,
    right: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
  },
  recChipText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    lineHeight: 14,
    color: colors.primarySolid,
    letterSpacing: 0.2,
  },
  rowText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rowTextOff: { color: colors.textSubtitle },
  rowDone: {
    position: 'absolute',
    right: 16,
    fontFamily: fonts.semibold,
    fontSize: fontScale.emphasis,
    color: 'hsl(150, 45%, 55%)',
  },

  why: {
    // Bumped from caption/faint to body/soft (Neha 2026-08-02, "the subtext is
    // too small, I can't read it"), these are the step subtitles now, they have
    // to be readable, not fine print.
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: v3.textSoft,
    paddingHorizontal: spacing.xs,
  },

  // rough-moment's bubble, verbatim
  bubble: { maxWidth: '84%', borderRadius: radius.button, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.selectedFill,
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
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 23,
    color: colors.textPrimary,
  },

  skelStack: { gap: spacing.sm },
  skelRow: {
    minHeight: 56,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: PANEL_DARK,
    overflow: 'hidden',
  },
  // The sweeping gloss band, clipped to the row by its overflow:hidden.
  skelShine: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.textSubtitle },
  thinkingLabel: { fontFamily: fonts.light, fontSize: fontScale.caption, color: v3.textFaint },

  scaleEnd: { fontFamily: fonts.regular, fontSize: fontScale.caption, color: colors.textTagline },

  numbersWrap: { gap: spacing.sm },
  // Five fit one row. Each stretches to share the width rather than sitting at
  // a fixed size, so the row fills the card on any phone.
  numbers: { flexDirection: 'row', gap: spacing.sm },
  // The stagger wrapper carries the row flex now; the button fills it.
  numberCell: { flex: 1 },
  number: {
    flex: 1,
    height: 56,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: PANEL_DARK,
  },
  numberOn: { backgroundColor: colors.selectedFill, borderColor: colors.beginBorder },
  numberText: {
    fontFamily: fonts.regular,
    fontSize: fontScale.emphasis,
    color: colors.textSubtitle,
    fontVariant: ['tabular-nums'],
  },
  numberTextOn: { fontFamily: fonts.medium, color: colors.textPrimary },
  numberLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs },
});
