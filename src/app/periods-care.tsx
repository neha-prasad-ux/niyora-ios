// The Periods-care checklist: soothing things for the heavy days, opened from
// the Grow tab. A gentle list, not a program — tick what you've done today and
// it holds until tomorrow. Ticks earn no light (the period is the rest phase);
// they just let the list remember. Copy is the neutrally-warm voice per
// DESIGN.md (no em dashes, no mantras, no hype).

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { Checklist, type ChecklistItem } from '@/components/checklist';
import { colors } from '@/theme/colors';
import { todayYmd } from '@/store/pms-readiness';
import { getPeriodsCare, togglePeriodsCare } from '@/store/periods-care';

// Curated for the period itself: warmth, rest, and the low-effort soothers.
// The first several mirror activities in models/activities.ts (same voice); the
// rest are period-specific comforts that live only on this list.
const PERIOD_CARE: readonly ChecklistItem[] = [
  { id: 'heat-on-belly', label: 'Warmth on your belly', examples: 'A heat pad or a bottle eases the cramp.' },
  { id: 'legs-up-the-wall', label: 'Legs up the wall', examples: 'Calm without any effort.' },
  { id: 'warm-drink', label: 'Make something warm to drink', examples: 'Warmth your body reads as safe.' },
  { id: 'warm-to-eat', label: 'Eat something warm', examples: 'Steady energy instead of a crash.' },
  { id: 'childs-pose', label: "Curl into child's pose", examples: 'Eases your back and your belly.' },
  { id: 'slow-walk', label: 'A slow walk outside', examples: 'Lets the tension burn off.' },
  { id: 'water', label: 'Keep water close', examples: 'Hydration takes the edge off cramps and fog.' },
  { id: 'gentle-read', label: 'Read something comforting', examples: 'Somewhere soft to land.' },
  { id: 'early-night', label: 'Take the early night', examples: 'Sleep does a lot of the repair.' },
  { id: 'pull-back', label: 'Hide out for a bit', examples: 'Permission to pull back.' },
];

export default function PeriodsCareScreen() {
  const today = useMemo(() => todayYmd(), []);
  const [done, setDone] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getPeriodsCare(today)
        .then((ids) => alive && setDone(ids))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [today]),
  );

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    // Optimistic flip so the tick feels instant; the store is the source of truth.
    setDone((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    togglePeriodsCare(today, id)
      .then(setDone)
      .catch(() => {});
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.head}>
          <Text style={styles.header}>Period care</Text>
          <Text style={styles.subhead}>Small, soothing things for the heavy days. Do a few, skip the rest.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Checklist items={PERIOD_CARE} isChecked={(id) => done.includes(id)} onToggle={toggle} emphasizeTitle />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
  header: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  scroll: { paddingTop: 16, paddingBottom: 28 },
});
