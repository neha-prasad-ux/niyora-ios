// The "Train your mind" chapters page: one card per emotion, trained one at a
// time. Reached from the home's summary card. Keeps the home uncluttered and
// gives the chapter list room to grow (each card shows its own progress; future
// emotions append here). Reads the training store on focus; writes nothing.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { ChapterCard } from '@/components/chapter-card';
import { colors } from '@/theme/colors';
import { CHAPTERS } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';

export default function TrainScreen() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);

  // Reload on focus so returning from a chapter shows fresh progress.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTraining().then((t) => {
        if (alive) setTraining(t);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const openChapter = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/game-v3', params: { chapter: id } });
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Train your mind</Text>
          <Text style={styles.sub}>Master one emotion at a time.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {CHAPTERS.map((chapter, i) => (
            <Animated.View key={chapter.id} entering={FadeInDown.delay(60 + i * 70).duration(500)}>
              <ChapterCard chapter={chapter} training={training} onOpen={() => openChapter(chapter.id)} />
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 20 },
  topBar: { height: 32, justifyContent: 'center', marginTop: 4 },
  header: { paddingHorizontal: 2, paddingTop: 4, paddingBottom: 14 },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  sub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: 4,
  },
  scroll: { paddingTop: 6, paddingBottom: 28, gap: 14 },
});
