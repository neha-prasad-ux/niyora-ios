// The "Learn through stories" page: Neha's story serial as a list of cards,
// reached from the Training shelf (mirrors the /train chapters page pattern).
// Each card opens the reader on its own chapter. Reads nothing; writes nothing.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { GlassCardBg } from '@/components/glass-card-bg';
import { colors } from '@/theme/colors';
import { glass } from '@/theme/glass';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { CHAPTERS } from '@/v3/chapter-content';

// The storybook field: the same deep indigo-to-violet the shelf card used.
const STORY_GRADIENT = colors.shelfGradients.story;

export default function StoriesScreen() {
  const openChapter = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/pms-story', params: { chapter: id } } as Href);
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
          <Text style={styles.title}>Learn through stories</Text>
          <Text style={styles.sub}>Neha's story, one chapter at a time.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {CHAPTERS.map((chapter, i) => (
            <Animated.View key={chapter.id} entering={FadeInDown.delay(60 + i * 70).duration(500)}>
              <Pressable
                style={styles.card}
                onPress={() => openChapter(chapter.id)}
                accessibilityRole="button"
                accessibilityLabel={chapter.title}
              >
                <GlassCardBg gradient={STORY_GRADIENT} />
                <View style={styles.cardRow}>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{chapter.title}</Text>
                    <Text style={styles.cardSub}>{chapter.intro}</Text>
                  </View>
                  <SymbolView name="chevron.right" tintColor="rgba(255,255,255,0.6)" size={15} weight="semibold" />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: pageGutter },
  topBar: { height: 32, justifyContent: 'center', marginTop: spacing.xs },
  header: { paddingHorizontal: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.md },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    color: colors.textPrimary,
    letterSpacing: 0.15,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },
  scroll: { paddingTop: spacing.sm, paddingBottom: spacing.xxxl, gap: spacing.md },
  card: {
    minHeight: 96,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardText: { flex: 1, gap: spacing.xs },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  cardSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
