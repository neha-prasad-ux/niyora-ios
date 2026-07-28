// The colouring activity as its own screen — Rung 1 of the hold, an in-app calm
// task for when moving out is too much to ask. A white page, like real paper.
// Prototype: one hand-built illustration to judge the scrub-to-fill feel; real
// illustrations feed in later. Reached from the hold's activity grid ("Colour").

import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { BeginButton } from '@/components/begin-button';
import { ColorFill } from '@/components/moment/color-fill';

const INK = '#2B2632';

export default function PaintScreen() {
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
          </Pressable>
        </View>
        <View style={styles.center}>
          <ColorFill />
        </View>
        <View style={styles.footer}>
          <BeginButton fullWidth label="Done" onPress={leave} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 4 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 22, paddingBottom: 16 },
});
