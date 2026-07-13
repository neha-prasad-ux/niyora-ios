// The Life Style card: sleep and food, the body-basics that soften the week.
// Two habits (sleep enough, never run hungry) and a short "add these to your
// food" list. Tapping a row ticks it; ticks live in the readiness store and feed
// the daily ring, so this stays the checklist's ring input. Labels are the
// simple, glanceable versions; the research sits in the "Know why" grid below.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import type { ReadinessCheckId, ReadinessChecks } from '@/store/pms-readiness';

type Item = { id: ReadinessCheckId; label: string };

// The two standalone habits, then the food list, in glanceable form.
const HABITS: readonly Item[] = [
  { id: 'woundDown', label: 'Sleep 8 hours' },
  { id: 'steady', label: 'Never stay hungry' },
];
const FOODS: readonly Item[] = [
  { id: 'calcium', label: 'Yogurt, cheese, greens' },
  { id: 'micronutrient', label: 'Dried fruit, nuts, seeds' },
  { id: 'antiInflammatory', label: 'Greens, ginger, turmeric, fish, berries, olive oil' },
];

function CheckRow({ item, on, onToggle }: { item: Item; on: boolean; onToggle: (id: ReadinessCheckId) => void }) {
  return (
    <Pressable
      onPress={() => onToggle(item.id)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={item.label}
    >
      <View style={[styles.box, on && styles.boxOn]}>
        {on && <SymbolView name="checkmark" tintColor="#3a2d52" size={13} weight="bold" />}
      </View>
      <Text style={styles.label}>{item.label}</Text>
    </Pressable>
  );
}

export function LifeStyleCard({
  checks,
  onToggle,
}: {
  checks: ReadinessChecks;
  onToggle: (id: ReadinessCheckId) => void;
}) {
  return (
    <View style={styles.card}>
      {HABITS.map((it) => (
        <CheckRow key={it.id} item={it} on={checks[it.id]} onToggle={onToggle} />
      ))}

      <Text style={styles.foodIntro}>Add these to your food</Text>
      {FOODS.map((it) => (
        <CheckRow key={it.id} item={it} on={checks[it.id]} onToggle={onToggle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0,
  },
  boxOn: { borderColor: '#ffffff', backgroundColor: '#ffffff' },
  label: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 15.5,
    lineHeight: 21,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  foodIntro: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginTop: 16,
    marginBottom: 4,
  },
});
