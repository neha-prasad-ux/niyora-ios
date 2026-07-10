// "How to reconnect": a checklist for repairing after a rough patch. Ruptures
// that get repaired actually build security, so the reconnection matters more
// than the rupture (Gottman's aftermath-of-a-fight + bids-for-connection work).
// Tick each step as you move through it together.

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { Checklist, type ChecklistItem } from '@/components/checklist';
import { colors } from '@/theme/colors';
import { RECONNECT_STEPS } from '@/models/couples-content';

const HEART = 'hsl(330, 68%, 72%)'; // pink, matching the hub's reconnect heart

const ITEMS: readonly ChecklistItem[] = RECONNECT_STEPS.map((s) => ({
  id: s.id,
  label: s.label,
  examples: s.examples,
}));

export default function CouplesReconnectScreen() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setChecks((cur) => ({ ...cur, [id]: !cur[id] }));
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
          <SymbolView name="heart.fill" tintColor={HEART} size={24} weight="semibold" />
          <Text style={styles.title}>How to reconnect</Text>
          <Text style={styles.subhead}>
            The repair matters more than the rupture. Work through these together, in any order.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Checklist items={ITEMS} isChecked={(id) => !!checks[id]} onToggle={toggle} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 18, gap: 10 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scroll: { paddingBottom: 28 },
});
