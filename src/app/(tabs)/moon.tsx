// The Moon tab: a top-level destination, not a feature.
//
// Named from her world rather than ours. Not "AI", because Today, Train and Soul
// are all named from hers. Not "Niyora" either, because that reads as three
// tools plus the actual product. The game layer — the points, the light, a tone
// that never claims to be a person — is itself what keeps this from reading as
// a human, which is why a warm name is safe here.
//
// The moon on this page is HER moon: the same brightness, material and ring
// count she has been growing in Today and Train, and earned light now flies
// here (light-motes.tsx) rather than into the Today icon. The loop closes —
// the moon that talks to her is visibly the one she fed.
//
// It is drawn ALWAYS FULL (`illum={1}`), decided 2026-07-27. Her earned state
// still shows, as brightness and material rather than as a silhouette. A
// crescent would carry the phase but leave nowhere for a face to sit, and the
// face is what this surface is eventually for.
//
// One flow. Cycle phase is context, not a fork: the same logic runs on a calm
// Tuesday if she is having a moment.
//
// NOTE: the word "moon" is app-facing only. It must never reach a model prompt
// (see v3/rough-moment-content.ts) — a small model free-associates on lunar
// imagery and writes poetry instead of reflection.

import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router, type Href } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { BAR_CONTENT_HEIGHT, BAR_MIN_BOTTOM_PAD } from '@/components/night-tab-bar';
import { Orb } from '@/components/orb';
import { bodyHue } from '@/models/tiers';
import { foldLedger } from '@/lib/moon-light';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState, subscribeMoonState } from '@/store/moon-state';
import type { MoonState } from '@/lib/moon-light';
import { colors } from '@/theme/colors';

// Matches the Today hero's sizing ladder so the same moon reads at the same
// weight on both pages.
function orbSizeFor(screenHeight: number): number {
  if (screenHeight >= 800) return 208;
  if (screenHeight >= 740) return 190;
  return 168;
}

export default function MoonTab() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const orbSize = orbSizeFor(screenHeight);
  const barHeight = BAR_CONTENT_HEIGHT + Math.max(insets.bottom, BAR_MIN_BOTTOM_PAD);

  const [moon, setMoon] = useState<MoonState | null>(null);
  const [lifetimeLight, setLifetimeLight] = useState(0);

  // Reload on focus, and subscribe so light landing while she is standing here
  // brightens the moon under her rather than on the next visit.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () => {
        Promise.all([getMoonState(), getLightLedger()])
          .then(([m, ledger]) => {
            if (!alive) return;
            setMoon(m);
            setLifetimeLight(foldLedger(ledger).lifetimeLight);
          })
          .catch(() => {});
      };
      load();
      const unsubscribe = subscribeMoonState(load);
      return () => {
        alive = false;
        unsubscribe();
      };
    }, []),
  );


  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: barHeight + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Moon</Text>
          </View>

          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <Orb
              size={orbSize}
              // Ringless here. The rings are her earned tiers and they still
              // read on the tab icon and on Soul; on this page they crowded the
              // moon and pulled the eye outward, away from the one thing the
              // page is for.
              tierRingCount={0}
              hue={bodyHue(lifetimeLight)}
              brightness={moon?.fullness ?? 1}
              material={moon?.material ?? 'moonstone'}
              // Always full. The phase lives in the brightness and the material.
              illum={1}
            />
          </Animated.View>

          <Text style={styles.pitch}>Regulate your emotion & respond smoothly with AI</Text>

          <View style={styles.cta}>
            {/* The flow is a top-level destination reached from here, not a
                branch of Steady-yourself. Nothing about this tab depends on
                that flow, and nothing about that flow reaches back into it. */}
            <BeginButton
              fullWidth
              label="Think with me"
              onPress={() => router.push('/moment' as Href)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  header: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 2 },
  pageTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  pageSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: 4,
  },
  hero: { alignItems: 'center', marginTop: 18, marginBottom: 18 },
  pitch: {
    fontFamily: 'Poppins-Light',
    fontSize: 19,
    lineHeight: 27,
    color: colors.textSubtitle,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 30,
  },
  cta: { gap: 12 },
});
