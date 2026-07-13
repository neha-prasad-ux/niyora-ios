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
}: PhaseActionCardProps) {
  const field = done ? DONE_GRADIENT : rose ? ROSE_GRADIENT : ASK_GRADIENT;
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
                tintColor="rgba(255,255,255,0.9)"
                size={13}
                weight="semibold"
                style={styles.ctaCheck}
              />
            )}
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>

      {/* The cycle bar — the card's foot. */}
      {band != null && (
        <View style={styles.barSection}>
          <CycleBar band={band} periodEmphasized={periodEmphasized} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  textCol: { flex: 1 },
  why: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.72)',
    marginBottom: 5,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
  cta: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 19,
    ...secondaryButtonSurface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  ctaDone: {
    borderColor: 'rgba(255, 255, 255, 0.32)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaCheck: { marginRight: 5 },
  ctaText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#ffffff', letterSpacing: 0.3 },
  barSection: {
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
});
