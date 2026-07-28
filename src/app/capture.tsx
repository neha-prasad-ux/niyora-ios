// Photograph-the-sky as its own screen — Rung 1 of the hold. A white page, like
// paper. Reached from the hold's activity grid ("Sky").

import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { PhotoFill } from '@/components/moment/photo-fill';

const INK = '#2B2632';

export default function CaptureScreen() {
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
          <PhotoFill />
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
});
