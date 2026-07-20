// The design-system reference: every token on one screen, so consistency is
// visible and it's obvious when something in the app didn't come from here.
// Dev-only (opened by long-pressing the You title). Renders straight off the
// theme tokens — colours, type, radius/spacing, and the control surfaces — so
// this page can never drift from what the components actually use.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { clayChipSurface, secondaryButtonSurface, tileSurface } from '@/theme/controls';
import { GlassSurface } from '@/components/glass-surface';
import { SunIcon, StarIcon } from '@/components/tab-icons';
import { TabMoon } from '@/components/tab-moon';

// The three tab icons, each rendered resting then selected.
const TAB_ICON_SAMPLES: { label: string; render: (focused: boolean) => React.ReactNode }[] = [
  { label: 'Now', render: (f) => <TabMoon focused={f} /> },
  { label: 'Train', render: (f) => <SunIcon focused={f} size={24} /> },
  { label: 'Soul', render: (f) => <StarIcon focused={f} size={24} /> },
];

const TYPE_SAMPLES = [
  { family: 'Poppins-SemiBold', size: 28, label: 'SemiBold 28 · page title' },
  { family: 'Poppins-Medium', size: 16, label: 'Medium 16 · card title' },
  { family: 'Poppins-Regular', size: 14, label: 'Regular 14 · body' },
  { family: 'Poppins-Light', size: 13, label: 'Light 13 · caption' },
] as const;

const CHIP_LABELS = ['Irritable', 'Anxious', 'Low', 'Foggy'] as const;

export default function DesignSystemScreen() {
  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
          <Text style={styles.title}>Design system</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Section title="Colour">
            <View style={styles.swatchGrid}>
              {Object.entries(colors).map(([name, value]) => (
                <View key={name} style={styles.swatchCell}>
                  <View style={[styles.swatch, { backgroundColor: value }]} />
                  <Text style={styles.swatchName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.swatchValue} numberOfLines={1}>{value}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Type">
            {TYPE_SAMPLES.map((t) => (
              <View key={t.family} style={styles.typeRow}>
                <Text style={{ fontFamily: t.family, fontSize: t.size, color: colors.textPrimary }}>
                  The moon carries the day
                </Text>
                <Text style={styles.tokenLabel}>{t.label}</Text>
              </View>
            ))}
          </Section>

          <Section title="Radius">
            <View style={styles.rowWrap}>
              {Object.entries(radius).map(([name, r]) => (
                <View key={name} style={styles.radiusCell}>
                  <View style={[styles.radiusBox, { borderRadius: r }]} />
                  <Text style={styles.tokenLabel}>{name} · {r}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Spacing">
            <View style={styles.rowWrap}>
              {Object.entries(spacing).map(([name, s]) => (
                <View key={name} style={styles.spaceCell}>
                  <View style={[styles.spaceBar, { width: s }]} />
                  <Text style={styles.tokenLabel}>{name} · {s}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="Secondary button">
            <View style={[styles.secondaryBtn, secondaryButtonSurface]}>
              <Text style={styles.secondaryBtnText}>Secondary action</Text>
            </View>
            <Text style={styles.tokenLabel}>secondaryButtonSurface</Text>
          </Section>

          <Section title="Chips (soft clay)">
            <View style={styles.chipRow}>
              {CHIP_LABELS.map((label, i) => {
                const on = i === 1;
                return (
                  <View key={label} style={[styles.chip, clayChipSurface, on && styles.chipOn]}>
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.tokenLabel}>clayChipSurface · rest + selected</Text>
          </Section>

          <Section title="Tile surface">
            <View style={[styles.tileDemo, tileSurface]}>
              <Text style={styles.secondaryBtnText}>Utility tile</Text>
            </View>
            <Text style={styles.tokenLabel}>tileSurface · the quiet tier below secondary</Text>
          </Section>

          <Section title="Tab icons">
            <View style={styles.iconRow}>
              {TAB_ICON_SAMPLES.map((s) => (
                <View key={s.label} style={styles.iconCell}>
                  <View style={styles.iconStates}>
                    <View style={styles.iconStateBox}>{s.render(false)}</View>
                    <View style={styles.iconStateBox}>{s.render(true)}</View>
                  </View>
                  <Text style={styles.tokenLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.tokenLabel}>resting · selected (fills + brightens on focus)</Text>
          </Section>

          <Section title="Glass">
            <View style={styles.glassDemo}>
              <Text style={styles.glassUnder}>Content behind the glass</Text>
              <GlassSurface intensity={20} />
            </View>
            <Text style={styles.tokenLabel}>GlassSurface · liquid glass → blur → wash</Text>
          </Section>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 40 },
  title: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  scroll: { paddingTop: 8, paddingBottom: 20 },

  section: { marginTop: 26 },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: 14,
  },
  tokenLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11.5,
    color: colors.textTagline,
    marginTop: 6,
  },

  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchCell: { width: '30%' },
  swatch: {
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  swatchName: { fontFamily: 'Poppins-Medium', fontSize: 11, color: colors.textSubtitle, marginTop: 5 },
  swatchValue: { fontFamily: 'Poppins-Light', fontSize: 9.5, color: colors.textTagline },

  typeRow: { marginBottom: 16 },

  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' },
  radiusCell: { alignItems: 'center' },
  radiusBox: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  spaceCell: { alignItems: 'flex-start' },
  spaceBar: { height: 16, borderRadius: 4, backgroundColor: 'rgba(143,168,232,0.6)' },

  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  secondaryBtnText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: colors.textPrimary },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14 },
  chipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { fontFamily: 'Poppins-Light', fontSize: 14, color: colors.textPrimary, letterSpacing: 0.2 },
  chipTextOn: { fontFamily: 'Poppins-Medium', color: '#7C40B0' },

  tileDemo: {
    alignSelf: 'flex-start',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.control,
  },

  // Tab icons: each in its two states, on a night tile so the moonlit fill reads.
  iconRow: { flexDirection: 'row', gap: 18 },
  iconCell: { alignItems: 'center' },
  iconStates: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: radius.control,
    backgroundColor: 'rgba(10, 8, 16, 0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconStateBox: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  glassDemo: {
    height: 72,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(143,168,232,0.25)',
  },
  glassUnder: { fontFamily: 'Poppins-Medium', fontSize: 13, color: colors.textPrimary },
});
