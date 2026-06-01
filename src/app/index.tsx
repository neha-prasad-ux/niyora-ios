// Home screen. The pre-session info screen described in DESIGN.md.
// Anatomy: header, orb, technique name + subtitle, "Try a different one",
// Begin button anchored to the bottom safe area.

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Header } from '@/components/header';
import { Orb } from '@/components/orb';
import { Button as NwButton } from '@/components/ui/button';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { isBreathing, unlockedTechniques } from '@/models/techniques';

export default function HomeScreen() {
  // v1 session screen only supports breathing techniques. Hide mindfulness
  // entries from rotation until their session port lands.
  const techniques = useMemo(
    () => unlockedTechniques().filter(isBreathing),
    []
  );
  const [index, setIndex] = useState(0);

  const current = techniques[index];

  const handleTryDifferent = useCallback(() => {
    Haptics.selectionAsync();
    setIndex((i) => (i + 1) % techniques.length);
  }, [techniques.length]);

  const handleBegin = useCallback(() => {
    router.push({ pathname: '/session', params: { id: current.id } });
  }, [current.id]);

  const handleProfile = useCallback(() => {
    router.push('/my-soul');
  }, []);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Header
          onPressProfile={handleProfile}
        />

        <View style={styles.orbWrap} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
          <Orb size={220} />
        </View>

        <View
          style={styles.techniqueWrap}
          accessible={true}
          accessibilityLabel={`${current.name}. ${current.subtitle}. ${current.durationSeconds} seconds.`}
        >
          <Text style={[typography.techniqueName, { color: colors.textPrimary }]}>
            {current.name}
          </Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.textSubtitle, marginTop: 6, textAlign: 'center' },
            ]}
          >
            {current.subtitle} {'·'} {current.durationSeconds}s
          </Text>
        </View>

        <View style={styles.tryWrap}>
          <Pressable
            onPress={handleTryDifferent}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Try a different practice"
          >
            <Text style={[typography.tertiaryAction, { color: colors.textTertiary }]}>
              Try a different one
            </Text>
          </Pressable>
        </View>

        <View style={styles.beginWrap}>
          <BeginButton onPress={handleBegin} />
        </View>

        {/* NativeWind proof: confirms brand tokens resolve as utility classes */}
        <View style={styles.proofWrap}>
          <NwButton label="NW proof" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  orbWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tryWrap: {
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },
  beginWrap: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  proofWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
});
