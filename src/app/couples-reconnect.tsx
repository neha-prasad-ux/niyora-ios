// "How to reconnect": a checklist for repairing after a rough patch, using the
// shared Checklist (titles emphasized for hierarchy). Ruptures that get repaired
// build security, so the reconnection matters more than the rupture (Gottman's
// aftermath-of-a-fight + bids-for-connection). When every step is checked, the
// page turns into the shared "Go fall in love again" finale.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundGradient } from '@/components/background-gradient';
import { Checklist, type ChecklistItem } from '@/components/checklist';
import { CouplesFinale } from '@/components/couples-finale';
import { colors } from '@/theme/colors';
import { RECONNECT_STEPS } from '@/models/couples-content';

const ITEMS: readonly ChecklistItem[] = RECONNECT_STEPS.map((s) => ({
  id: s.id,
  label: s.label,
  examples: s.examples,
}));

export default function CouplesReconnectScreen() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const allChecked = useMemo(() => ITEMS.every((it) => checks[it.id]), [checks]);

  const toggle = (id: string) => {
    const next = { ...checks, [id]: !checks[id] };
    if (ITEMS.every((it) => next[it.id])) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
    setChecks(next);
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {!allChecked && (
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
          </View>
        )}

        {allChecked ? (
          <CouplesFinale line="Go fall in love again" onDone={goBack} />
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.title}>How to reconnect</Text>
              <Text style={styles.subhead}>
                The repair matters more than the rupture. Work through these together, in any order.
              </Text>
            </View>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Checklist items={ITEMS} isChecked={(id) => !!checks[id]} onToggle={toggle} emphasizeTitle />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  back: { fontFamily: 'Poppins-Light', fontSize: 30, lineHeight: 34, color: colors.textSubtitle },
  topBar: { minHeight: 34, justifyContent: 'center', marginTop: 4 },
  head: { alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 16 },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  scroll: { paddingBottom: 28 },
});
