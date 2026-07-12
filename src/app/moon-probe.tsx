// Dev-only preview of the moon's materials and states, so the gold/opal/diamond
// bodies can be eyeballed on device without grinding to 800+ lifetime light.
// Not shipping UI: registered behind __DEV__ in _layout, reached by a dev-only
// long-press on the Now moon. Safe to delete once the materials are tuned.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BackgroundGradient } from '@/components/background-gradient';
import { Orb } from '@/components/orb';
import { SOUL_RING_HUES } from '@/models/tiers';
import type { MoonMaterial } from '@/lib/moon-light';
import { colors } from '@/theme/colors';

const MATERIALS: { material: MoonMaterial; name: string; gate: string }[] = [
  { material: 'moonstone', name: 'Moonstone', gate: 'default — every new moon' },
  { material: 'gold', name: 'Gold', gate: '800 light + 1 cycle kept' },
  { material: 'opal', name: 'Opal', gate: '2500 light · 3 skills solid' },
  { material: 'diamond', name: 'Diamond', gate: '6000 light · lived outside' },
];

// Lunar phases: the shadow that carries the fade, and a delight in its own
// right. Fullness floors at 0.4, so the dimmest real moon is a fat crescent.
const PHASES: { illum: number; label: string }[] = [
  { illum: 1, label: 'Full' },
  { illum: 0.75, label: 'Gibbous' },
  { illum: 0.5, label: 'Half' },
  { illum: 0.4, label: 'Dimmest · 0.4' },
  { illum: 0.2, label: 'Crescent' },
];

// The colour ladder, in order — auto-evolves one step per ring tier, riding the
// same lifetime-light thresholds. Blues → jewels, then materials take over at
// the 800-light gate. Mirrors TIER_BODY_HUE in models/tiers.
const COLOURS: { hue: number; label: string }[] = [
  { hue: 220, label: 'Calm · 0' },
  { hue: 202, label: 'Light blue · 20' },
  { hue: 178, label: 'Aqua · 100' },
  { hue: 272, label: 'Amethyst · 300' },
  { hue: 250, label: 'Indigo · 600' },
];

export default function MoonProbeScreen() {
  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Text style={styles.back}>Done</Text>
          </Pressable>
          <Text style={styles.title}>Moon materials</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.section}>Clean body</Text>
          <View style={styles.grid}>
            {MATERIALS.map((m) => (
              <View key={m.material} style={styles.cell}>
                <Orb size={128} material={m.material} still />
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.gate}>{m.gate}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>With full rings (Radiance)</Text>
          <Text style={styles.note}>Materials only surface once the ring band is complete.</Text>
          <View style={styles.grid}>
            {MATERIALS.map((m) => (
              <View key={m.material} style={styles.cell}>
                <Orb
                  size={128}
                  material={m.material}
                  tierRingCount={4}
                  ringHues={SOUL_RING_HUES}
                  accumulate
                  still
                />
                <Text style={styles.name}>{m.name}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Phases · fade (moonstone)</Text>
          <Text style={styles.note}>The moon wanes as lessons fade; returning waxes her back.</Text>
          <View style={styles.grid}>
            {PHASES.map((p) => (
              <View key={p.label} style={styles.cell}>
                <Orb size={104} illum={p.illum} brightness={p.illum} still />
                <Text style={styles.name}>{p.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.section}>Colour ladder</Text>
          <Text style={styles.note}>Auto-evolves one step per ring, by lifetime light. Then materials take over.</Text>
          <View style={styles.grid}>
            {COLOURS.map((c) => (
              <View key={c.hue} style={styles.cell}>
                <Orb size={104} hue={c.hue} still />
                <Text style={styles.name}>{c.label}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  back: { fontFamily: 'Poppins-Regular', fontSize: 15, color: colors.textTertiary, width: 44 },
  title: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  scroll: { paddingHorizontal: 12, paddingBottom: 60, alignItems: 'center' },
  section: {
    alignSelf: 'flex-start',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 24,
    marginBottom: 4,
    marginLeft: 8,
  },
  note: {
    alignSelf: 'flex-start',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
    marginBottom: 8,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  cell: { alignItems: 'center', width: 168, marginVertical: 4 },
  name: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: -6,
  },
  gate: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.42)',
    marginTop: 2,
    textAlign: 'center',
  },
});
