// The week's gentle suggestions, opened from the luteal card. Carries the
// factors she kept (from pms-factors) as soft, no-pressure prompts for the
// premenstrual window, plus a standing permission to rest. No checkboxes, no
// targets, no numbers: each line states the thing and its why, and that is all.
// Slice 4 turns each row into a tap-through to fuller content.

import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import {
  getPmsFactors,
  PMS_FACTOR_IDS,
  PMS_FACTOR_CONTENT,
  DEFAULT_PMS_FACTORS,
  type PmsFactors,
} from '@/store/pms-factors';

export default function PmsWeekScreen() {
  const [factors, setFactors] = useState<PmsFactors>(DEFAULT_PMS_FACTORS);
  useEffect(() => {
    let alive = true;
    getPmsFactors()
      .then((f) => alive && setFactors(f))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const chosen = PMS_FACTOR_IDS.filter((id) => factors[id]);

  const goBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient luteal />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Gentle this week</Text>
          <Text style={styles.intro}>Your body is in the days before your period. A few small things help.</Text>

          {chosen.map((id) => (
            <View key={id} style={styles.row}>
              <Text style={styles.rowTitle}>{PMS_FACTOR_CONTENT[id].label}</Text>
              <Text style={styles.rowWhy}>{PMS_FACTOR_CONTENT[id].why}</Text>
            </View>
          ))}

          <View style={styles.row}>
            <Text style={styles.rowTitle}>Rest</Text>
            <Text style={styles.rowWhy}>
              The days before your period ask more of you. Resting is doing something.
            </Text>
          </View>
        </ScrollView>
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
  },
  topBar: {
    height: 32,
    justifyContent: 'center',
  },
  content: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  intro: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 10,
    marginBottom: 26,
  },
  row: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  rowTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    lineHeight: 23,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  rowWhy: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
