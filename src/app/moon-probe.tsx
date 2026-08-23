// The moon-growth explainer: the materials (moonstone -> gold -> opal ->
// diamond), the ring band, and the lunar phases, so she can see where her moon
// is and what moves it. Opened from "You're on [material]" on the Soul page
// (which passes her current material so this page can mark "You're here"), and
// still reachable by a dev long-press on the Now moon.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { BackgroundGradient } from '@/components/background-gradient';
import { Orb } from '@/components/orb';
import { SOUL_RING_HUES } from '@/models/tiers';
import type { MoonMaterial } from '@/lib/moon-light';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

// The four materials, in order. `unlock` is the warm, user-facing version of the
// underlying light/behaviour gate. [DRAFT] copy, awaiting Neha's voice.
const MATERIALS: { material: MoonMaterial; name: string; unlock: string }[] = [
  { material: 'moonstone', name: 'Moonstone', unlock: 'Where every moon begins.' },
  { material: 'gold', name: 'Gold', unlock: 'Show up steadily, and keep one full cycle.' },
  { material: 'opal', name: 'Opal', unlock: 'Three skills solid, and the practice runs deep.' },
  { material: 'diamond', name: 'Diamond', unlock: 'Carried into real life, again and again.' },
];

// Lunar phases: the moon fades as lessons fade, waxes back when she returns.
const PHASES: { illum: number; label: string }[] = [
  { illum: 1, label: 'Full' },
  { illum: 0.75, label: 'Gibbous' },
  { illum: 0.5, label: 'Half' },
  { illum: 0.4, label: 'Crescent' },
];

export default function MoonProbeScreen() {
  const { current } = useLocalSearchParams<{ current?: string }>();
  const currentMaterial = (current as MoonMaterial) ?? 'moonstone';
  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Done">
            <Text style={styles.back}>Done</Text>
          </Pressable>
          <Text style={styles.title}>How your moon grows</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            Your moon is a record of your practice. It brightens as you show up, and
            over time its very material changes — from moonstone to something rarer.
          </Text>

          <Text style={styles.section}>The stages</Text>
          {MATERIALS.map((m) => {
            const here = m.material === currentMaterial;
            return (
              <View key={m.material} style={[styles.stageRow, here && styles.stageHere]}>
                <Orb size={64} material={m.material} still />
                <View style={styles.stageText}>
                  <View style={styles.stageNameRow}>
                    <Text style={styles.stageName}>{m.name}</Text>
                    {here && <Text style={styles.hereChip}>You&apos;re here</Text>}
                  </View>
                  <Text style={styles.stageUnlock}>{m.unlock}</Text>
                </View>
              </View>
            );
          })}

          <Text style={styles.section}>Rings</Text>
          <View style={styles.ringRow}>
            <Orb
              size={76}
              material={currentMaterial}
              tierRingCount={4}
              ringHues={SOUL_RING_HUES}
              accumulate
              still
            />
            <Text style={styles.rowNote}>
              Rings fill as you practise. Each new material only surfaces once the
              ring band is complete.
            </Text>
          </View>

          <Text style={styles.section}>Phases</Text>
          <Text style={styles.note}>Your moon wanes as lessons fade, and waxes back when you return.</Text>
          <View style={styles.phaseRow}>
            {PHASES.map((p) => (
              <View key={p.label} style={styles.phaseCell}>
                <Orb size={56} illum={p.illum} brightness={p.illum} still />
                <Text style={styles.phaseLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerSpacer: { width: 44 },
  back: { fontFamily: fonts.medium, fontSize: fontScale.body, color: colors.textTertiary, width: 44 },
  title: { fontFamily: fonts.semibold, fontSize: fontScale.emphasis, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  intro: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 22,
    color: colors.textOnDark.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.caption,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textOnDark.faint,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.card,
    marginBottom: spacing.xs,
  },
  // The current stage, lifted from the row above it.
  stageHere: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  stageText: { flex: 1 },
  stageNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stageName: { fontFamily: fonts.semibold, fontSize: fontScale.bodyLg, color: colors.textPrimary },
  hereChip: {
    fontFamily: fonts.medium,
    fontSize: fontScale.tagline,
    color: colors.textPrimary,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  stageUnlock: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textOnDark.faint,
    marginTop: 2,
  },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  rowNote: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 20,
    color: colors.textOnDark.secondary,
  },
  note: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textOnDark.faint,
    marginBottom: spacing.md,
  },
  phaseRow: { flexDirection: 'row', justifyContent: 'space-between' },
  phaseCell: { alignItems: 'center', gap: spacing.xs },
  phaseLabel: { fontFamily: fonts.medium, fontSize: fontScale.tagline, color: colors.textOnDark.secondary },
});
