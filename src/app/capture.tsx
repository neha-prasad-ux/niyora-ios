// Photograph-the-sky as its own screen — level two of the hold, reached from the
// colouring page when she would rather ground on the real sky than fill paper. A
// white page, like paper. The 20-minute hold clock carries over from level one
// and keeps running here.

import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { PhotoFill } from '@/components/moment/photo-fill';
import { HoldClockBar } from '@/components/moment/hold-clock-bar';

const INK = '#2B2632';

export default function CaptureScreen() {
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  const onComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
          </Pressable>
          <HoldClockBar onComplete={onComplete} />
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 4 },
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
