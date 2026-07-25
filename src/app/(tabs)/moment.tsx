// The AI "in the moment" tab: a calm threshold into the moon's in-the-moment
// chat. Tapping starts a fresh session — a full-screen flow that opens over the
// bar (src/app/in-the-moment.tsx). Kept as a launcher, not the session itself,
// because a session is disposable (backgrounding for 5 min discards it), and a
// tab must not hold that transient state.
//
// Dev/experiment only: the tab is hidden in store builds — its href is gated on
// FM_EXPERIMENT in (tabs)/_layout, matching the flow's own gate.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';

export default function MomentTab() {
  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <View style={styles.halo} />
          <Text style={styles.title}>here when you need me</Text>
          <Text style={styles.sub}>
            something sitting heavy? tell me what&rsquo;s going on — we&rsquo;ll take it a step at a time.
          </Text>
          <Pressable
            style={styles.begin}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/in-the-moment' as Href);
            }}
            accessibilityRole="button"
            accessibilityLabel="Start an in-the-moment session"
          >
            <Text style={styles.beginText}>i&rsquo;m having a moment</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, gap: 16 },
  halo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    marginBottom: 18,
    backgroundColor: 'rgba(140, 170, 245, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(160, 185, 250, 0.28)',
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  begin: {
    marginTop: 14,
    borderRadius: 26,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: colors.beginStart,
    borderWidth: 1,
    borderColor: colors.beginBorder,
  },
  beginText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    letterSpacing: 1,
    color: colors.textPrimary,
  },
});
