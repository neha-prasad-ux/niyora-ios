// "Us vs. the PMS": the couples hub. Mirrors the Train-your-mind chapters page
// exactly (left-aligned header, then one big gradient card per activity with a
// floating tag, title, blurb, chevron), so the couples shelf reads as a sibling
// of Train. Each card sits in the warm rose/red heart family instead of Train's
// violet, and its backdrop carries faint hearts where Train carries soul-moons.
// The partner can be any gender, so every activity's copy is neutral.

import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';

type Activity = {
  id: string;
  route: Href;
  tag: string;
  title: string;
  sub: string;
  gradient: readonly [string, string, string];
  heart: string;
};

// Each card its own warm field + heart tone: coral, rose, violet-rose, pink.
const ACTIVITIES: readonly Activity[] = [
  {
    id: 'quiz',
    route: '/couples-quiz',
    tag: 'Reflect',
    title: 'Is it PMS or real?',
    sub: 'Reflect on a fight, together or solo',
    gradient: ['hsl(2, 46%, 30%)', 'hsl(10, 46%, 31%)', 'hsl(20, 44%, 32%)'],
    heart: 'hsl(8, 74%, 70%)',
  },
  {
    id: 'texts',
    route: '/couples-texts',
    tag: 'Words',
    title: 'Texts you can share',
    sub: 'The right words, in your own tone',
    gradient: ['hsl(338, 44%, 30%)', 'hsl(348, 44%, 31%)', 'hsl(358, 42%, 32%)'],
    heart: 'hsl(345, 80%, 72%)',
  },
  {
    id: 'prep',
    route: '/couples-prep',
    tag: 'Plan',
    title: 'Prep well together',
    sub: 'A shared plan for PMS',
    gradient: ['hsl(300, 42%, 30%)', 'hsl(315, 40%, 31%)', 'hsl(330, 40%, 32%)'],
    heart: 'hsl(305, 62%, 74%)',
  },
  {
    id: 'reconnect',
    route: '/couples-reconnect',
    tag: 'Repair',
    title: 'How to reconnect',
    sub: 'Repair after a rough patch',
    gradient: ['hsl(326, 44%, 31%)', 'hsl(336, 42%, 32%)', 'hsl(346, 42%, 33%)'],
    heart: 'hsl(330, 72%, 74%)',
  },
];

export default function CouplesScreen() {
  const open = (route: Href) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(route);
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
          <Text style={styles.title}>Us vs. the PMS</Text>
          <Text style={styles.sub}>Small things that keep you on the same side.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {ACTIVITIES.map((a, i) => (
            <Animated.View key={a.id} entering={FadeInDown.delay(60 + i * 70).duration(500)}>
              <View style={styles.chapterWrap}>
                <View style={styles.chapterTag}>
                  <Text style={styles.tagText}>{a.tag}</Text>
                </View>
                <Pressable
                  style={styles.chapterCard}
                  onPress={() => open(a.route)}
                  accessibilityRole="button"
                  accessibilityLabel={`${a.title}. ${a.sub}.`}
                >
                  <LinearGradient
                    colors={a.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={styles.chapterBackdrop}>
                    <SymbolView
                      name="heart.fill"
                      tintColor="rgba(255, 255, 255, 0.15)"
                      size={104}
                      weight="semibold"
                      style={styles.heartTopRight}
                    />
                    <SymbolView
                      name="heart.fill"
                      tintColor="rgba(255, 255, 255, 0.1)"
                      size={58}
                      weight="semibold"
                      style={styles.heartBotLeft}
                    />
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.chapterTitle}>{a.title}</Text>
                      <Text style={styles.cardSub}>{a.sub}</Text>
                    </View>
                    <SymbolView
                      name="chevron.right"
                      tintColor={colors.textOnDark.secondary}
                      size={15}
                      weight="semibold"
                      style={styles.cardChevron}
                    />
                  </View>
                </Pressable>
              </View>
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

  // Shared card interior (matches Train's chapter cards).
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardTextCol: { flex: 1 },
  cardChevron: { opacity: 0.55, marginRight: -2 },
  tagText: { fontFamily: fonts.medium, fontSize: fontScale.caption, color: colors.textOnDark.primary, letterSpacing: 0.5 },
  cardSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 19,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },
  chapterWrap: { marginBottom: spacing.xs },
  chapterTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    marginLeft: spacing.sm,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: colors.accentRose,
  },
  chapterCard: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chapterBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  heartTopRight: { position: 'absolute', top: -18, right: -12, transform: [{ rotate: '16deg' }] },
  heartBotLeft: { position: 'absolute', bottom: -16, left: -12, transform: [{ rotate: '-12deg' }] },
  chapterTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 26,
    color: colors.textOnDark.primary,
    letterSpacing: 0.15,
  },
});
