// "Breathe" — one of the settling activities. A plain paced breath: a soft
// circle that swells on the in-breath and eases on the out, four counts in and
// six out so the exhale is the longer half (the app's calm 4:6). No claims about
// the body, just a rhythm to follow. Done marks it finished.

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { BeginButton } from '@/components/begin-button';
import { markActivityDone } from '@/lib/hold-activities';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const INK = colors.paper.ink;
const IN = 4;
const OUT = 6;

export default function BreatheScreen() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const scale = useSharedValue(0.72);

  // Walk the 4:6 cycle: swell to full on the in-breath, ease back on the out.
  useEffect(() => {
    if (reduce) return;
    const secs = phase === 'in' ? IN : OUT;
    scale.value = withTiming(phase === 'in' ? 1 : 0.72, { duration: secs * 1000 });
    const id = setTimeout(() => setPhase((p) => (p === 'in' ? 'out' : 'in')), secs * 1000);
    return () => clearTimeout(id);
  }, [phase, reduce, scale]);

  const ballStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  const done = () => {
    markActivityDone('breath');
    leave();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
          </Pressable>
          <Text style={styles.title}>Breathe</Text>
          <View style={styles.close} />
        </View>
        <View style={styles.center}>
          <View style={styles.ballBox}>
            <Animated.View style={[styles.ball, ballStyle]} />
          </View>
          <Text style={styles.cue}>{phase === 'in' ? 'Breathe in' : 'Breathe out'}</Text>
        </View>
        <View style={styles.footer}>
          <BeginButton fullWidth label="Done" onPress={done} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper.bg },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper.control,
  },
  title: { fontFamily: fonts.semibold, fontSize: fontScale.cardTitle, color: INK },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 40 },
  ballBox: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  ball: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#B9BCEC' },
  cue: {
    fontFamily: fonts.light,
    fontSize: fontScale.technique,
    color: colors.paper.inkSoft,
    letterSpacing: 0.3,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
