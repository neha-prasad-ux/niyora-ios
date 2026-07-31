// Phase cue, shown as glowing text. The word swaps instantly when the phase
// changes: no fade, no overlap, so the cue is always a single clear word. A soft
// text glow keeps the active cue feeling "lit" (mirrors the Mac canvas shadowBlur).
//
// Pass nextLabel to show a dimmer sub-label below the cue.

import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fontScale } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/spacing';

type PhaseLabelProps = {
  label: string;
  nextLabel?: string | null;
};

export function PhaseLabel({ label, nextLabel }: PhaseLabelProps) {
  const lastLabelRef = useRef(label);

  // Announce the new phase label for iOS VoiceOver when it changes.
  useEffect(() => {
    if (label === lastLabelRef.current) return;
    lastLabelRef.current = label;
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <View style={styles.textStack}>
          <Text style={styles.text} accessibilityLiveRegion="polite">
            {label}
          </Text>
        </View>
      </View>
      {nextLabel ? (
        <View style={styles.nextWrap}>
          <Text style={styles.nextText}>{nextLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  chip: {
    // No pill container off-centre: the cue is just glowing text now that it no
    // longer needs to stand apart from the bloom behind it.
    minWidth: 132,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed-height stack keeps the cue vertically centred so swapping words of
  // different heights never shifts the layout.
  textStack: {
    height: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: fontScale.hero,
    fontFamily: fonts.semibold,
    lineHeight: 38,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 245, 235, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  nextWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  nextText: {
    fontSize: fontScale.body,
    fontFamily: fonts.regular,
    color: colors.textOnDark.tertiary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
