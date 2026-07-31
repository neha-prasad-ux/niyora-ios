// The Now tab's one card, redesigned: a textured phase HEADER (why this is the
// right thing now + what it is + one phase-verb button) sitting over the cycle
// bar, so the phase is visibly the reason the ask exists. The verb changes with
// the phase — Start/Continue on build days, Prep on PMS days, Reflect on period
// days — but the specific target still comes from the Now screen's selector.
//
// The cycle bar is a display with doors: it shows where today sits and tapping a
// phase opens that phase's surface (Build -> Grow, PMS -> checklist, Periods ->
// the period sheet). Remission is no longer asked here — it lives in the Reflect
// flow now.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { CycleBar } from '@/components/cycle-bar';
import { prepBand } from '@/lib/preparedness';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing, radius } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';
import { secondaryButtonSurface } from '@/theme/controls';
import type { PhaseBand } from '@/lib/phase-band';

// The field gradients: cosmic violet for the ask, calm green once it's done.
const ASK_GRADIENT: readonly [string, string, string, string] = [
  'rgba(78,72,150,0.6)',
  'rgba(96,84,158,0.58)',
  'rgba(110,96,166,0.56)',
  'rgba(70,88,150,0.56)',
];
const DONE_GRADIENT: readonly [string, string, string, string] = [
  'rgba(64,134,108,0.55)',
  'rgba(86,162,126,0.55)',
  'rgba(92,170,132,0.55)',
  'rgba(58,112,120,0.55)',
];
const ROSE_GRADIENT: readonly [string, string, string, string] = [
  'rgba(150,84,120,0.55)',
  'rgba(168,96,134,0.55)',
  'rgba(176,104,150,0.52)',
  'rgba(140,88,140,0.52)',
];
const GRADIENT_LOCATIONS = [0, 0.42, 0.62, 1] as const;

type PhaseActionCardProps = {
  /** The cycle bar rides at the bottom of the card when known. */
  band: PhaseBand | null;
  /** The "why" eyebrow — the phase rationale. */
  why: string | null;
  /** The "what" title — the ask. */
  title: string;
  /** The phase verb: Start / Continue / Prep / Reflect. */
  ctaLabel: string;
  onCta: () => void;
  done: boolean;
  /** True only when the ask is truly empty — a closed ring alone never disables
   *  the button, so learning (Revisit a practice) stays reachable. */
  ctaDisabled: boolean;
  rose: boolean;
  periodEmphasized: boolean;
  /**
   * This cycle's PMS readiness (0..1). When set, a "Your PMS preparedness" band
   * row sits above the cycle bar and the bar fills to it. Null on PMS/period
   * days, where the bar stays the plain cycle strip.
   */
  readiness?: number | null;
  /** Tapping the preparedness row/bar opens the PrepSheet. Only wired in prep mode. */
  onPrepPress?: () => void;
};

export function PhaseActionCard({
  band,
  why,
  title,
  ctaLabel,
  onCta,
  done,
  ctaDisabled,
  rose,
  periodEmphasized,
  readiness = null,
  onPrepPress,
}: PhaseActionCardProps) {
  const field = done ? DONE_GRADIENT : rose ? ROSE_GRADIENT : ASK_GRADIENT;
  const showPrep = readiness != null;
  // The band word is the hero — no standing percentage (a percent reintroduces
  // "why not 100 / why did it drop"). Movement shows through the bar filling.
  const band_ = showPrep ? prepBand(readiness ?? 0) : '';
  return (
    <View style={styles.card}>
      {/* Textured header: the field gradient, a soft top-light sheen for
          texture, then the copy and the phase button. */}
      <View style={styles.header}>
        <LinearGradient
          colors={field}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.10)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.4, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.headerRow}>
          <View style={styles.textCol}>
            {why != null && <Text style={styles.why}>{why}</Text>}
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable
            style={[styles.cta, done && styles.ctaDone]}
            onPress={ctaDisabled ? undefined : onCta}
            disabled={ctaDisabled}
            accessibilityRole={ctaDisabled ? 'text' : 'button'}
            accessibilityLabel={ctaLabel}
          >
            {done && (
              <SymbolView
                name="checkmark"
                tintColor={colors.textOnDark.primary}
                size={13}
                weight="semibold"
                style={styles.ctaCheck}
              />
            )}
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* The cycle bar — the card's foot. On build days it carries the
          preparedness row + readiness fill and, when tappable, opens the
          PrepSheet; otherwise the plain cycle strip. */}
      {band != null && (
        <Pressable
          style={styles.barSection}
          onPress={showPrep ? onPrepPress : undefined}
          disabled={!showPrep || onPrepPress == null}
          accessibilityRole={showPrep && onPrepPress != null ? 'button' : undefined}
          accessibilityLabel={showPrep ? 'See your PMS preparedness' : undefined}
        >
          {showPrep && (
            <View style={styles.prepRow}>
              <Text style={styles.prepLabel} numberOfLines={1}>
                Your PMS preparedness
              </Text>
              <View style={styles.prepBandWrap}>
                <Text style={styles.prepPct} numberOfLines={1}>
                  {band_}
                </Text>
                {onPrepPress != null && (
                  <SymbolView
                    name="chevron.right"
                    tintColor={colors.textOnDark.tertiary}
                    size={12}
                    weight="semibold"
                  />
                )}
              </View>
            </View>
          )}
          <CycleBar band={band} periodEmphasized={periodEmphasized} readiness={readiness} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    ...secondaryButtonSurface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  ctaDone: {
    borderColor: colors.border.strong,
    backgroundColor: colors.fill.base,
  },
  ctaCheck: { marginRight: spacing.xs },
  ctaText: { fontFamily: fonts.medium, fontSize: fontScale.body, color: colors.textOnDark.primary, letterSpacing: 0.3 },
  barSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  prepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  prepBandWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  prepLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  // The band word is the emphasis; it stays whole and the label yields if space
  // runs short.
  prepPct: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.caption,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
});
