// The "finish your setup" card pinned to the top of Now until onboarding is
// done (setupCardFor decides start vs resume). Everything else on the dashboard
// — the phase card, the reflection — needs her PMS read and period data, which
// only onboarding gives, so until then this is the one thing the home asks.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import type { SetupCard } from '@/store/onboarding-v3-progress';

const GRADIENT: readonly [string, string, string, string] = [
  'rgba(78,72,150,0.62)',
  'rgba(96,84,158,0.6)',
  'rgba(110,96,166,0.58)',
  'rgba(70,88,150,0.58)',
];
const GRADIENT_LOCATIONS = [0, 0.42, 0.62, 1] as const;

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
      <LinearGradient
        colors={GRADIENT}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.1)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.4, y: 1 }}
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
          <SymbolView name="chevron.right" tintColor="rgba(255,255,255,0.9)" size={13} weight="semibold" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 96,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  ctaText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#ffffff', letterSpacing: 0.3 },
});
