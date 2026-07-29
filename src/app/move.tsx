// "Move your body" — one of the settling activities. Neha's prompt: a single
// nudge to leave the room, breathe, and come back. Off the phone, out of the
// spot she is stuck in. Nothing to perform; Done marks it finished.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { BeginButton } from '@/components/begin-button';
import { markActivityDone } from '@/lib/hold-activities';

const INK = '#2B2632';

export default function MoveScreen() {
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  const done = () => {
    markActivityDone('move');
    leave();
  };
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
          </Pressable>
          <Text style={styles.title}>Move your body</Text>
          <View style={styles.close} />
        </View>
        <View style={styles.center}>
          <SymbolView name="figure.walk" tintColor="#8A8FD6" size={56} />
          <Text style={styles.prompt}>Go out of the room.{'\n'}Take a slow breath.{'\n'}Come back when you're ready.</Text>
        </View>
        <View style={styles.footer}>
          <BeginButton fullWidth label="I'm back" onPress={done} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  title: { fontFamily: 'Poppins-SemiBold', fontSize: 16, color: INK },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 28 },
  prompt: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    lineHeight: 36,
    color: '#3E3947',
    textAlign: 'center',
  },
  footer: { paddingHorizontal: 22, paddingBottom: 16 },
});
