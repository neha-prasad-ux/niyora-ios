// The "finish your setup" card pinned to the top of Now until onboarding is
// done (setupCardFor decides start vs resume). Everything else on the dashboard
// — the phase card, the reflection — needs her PMS read and period data, which
// only onboarding gives, so until then this is the one thing the home asks.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing, radius } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';
import type { SetupCard } from '@/store/onboarding-v3-progress';

const COPY: Record<SetupCard, { why: string; title: string; cta: string }> = {
  start: {
    why: 'A few quick questions',
    title: 'Know your PMS level',
    cta: 'Start',
  },
  resume: {
    why: 'Pick up where you left off',
    title: 'Finish setting up',
    cta: 'Continue',
  },
};

export function OnboardingCard({ setup, onPress }: { setup: SetupCard; onPress: () => void }) {
  const copy = COPY[setup];
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${copy.title}. ${copy.why}.`}
    >
      {/* The SAME frosted glass as the Home card (now.tsx): blur + light frost +
          a top-left gloss sheen, so the card reads as the same material as the
          home glass and the period pill, not a violet slab from another world. */}
      <BlurView intensity={30} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.tint} />
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'transparent']}
        locations={[0, 0.28, 0.62]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.why}>{copy.why}</Text>
          <Text style={styles.title}>{copy.title}</Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{copy.cta}</Text>
          <SymbolView name="chevron.right" tintColor={colors.textOnDark.primary} size={13} weight="semibold" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 96,
    justifyContent: 'center',
  },
  // A light frost over the blur, matching the home glass card's glassTint, so
  // the moon halo glows through rather than a flat fill.
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,26,38,0.20)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  textCol: { flex: 1 },
  why: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textOnDark.secondary,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.emphasis,
    lineHeight: 23,
    color: colors.textOnDark.primary,
    letterSpacing: 0.15,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: colors.fill.strong,
  },
  ctaText: { fontFamily: fonts.medium, fontSize: fontScale.body, color: colors.textOnDark.primary, letterSpacing: 0.3 },
});
