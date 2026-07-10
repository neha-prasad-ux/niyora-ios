// "Us vs. the PMS": the couples hub. A heart-themed shelf of four activities
// that help a couple stay on the same side through the hard week. The framing is
// deliberate (narrative externalization): the opponent is the PMS, never each
// other. The partner can be any gender, so every activity's copy is neutral.
//
// Reuses the home card / readiness list language: translucent rows, a colored
// heart per activity (brand hues), a chevron, whole-row tap into a sub-route.

import * as Haptics from 'expo-haptics';
import { router, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';

type Activity = {
  id: string;
  route: Href;
  heart: string; // a brand hue, one per activity
  heartBg: string; // the same hue as a soft tinted chip behind the heart
  title: string;
  sub: string;
};

// Each heart a different brand tone: coral, rose, violet, pink. Cute, warm, and
// still in the app's jewel-toned family.
const ACTIVITIES: readonly Activity[] = [
  { id: 'quiz', route: '/couples-quiz', heart: 'hsl(8, 72%, 68%)', heartBg: 'hsla(8, 72%, 68%, 0.16)', title: 'Is it PMS or real?', sub: 'Reflect on a fight, together or solo' },
  { id: 'texts', route: '/couples-texts', heart: 'hsl(345, 78%, 70%)', heartBg: 'hsla(345, 78%, 70%, 0.16)', title: 'Texts you can share', sub: 'The right words, in your own tone' },
  { id: 'prep', route: '/couples-prep', heart: 'hsl(275, 55%, 70%)', heartBg: 'hsla(275, 55%, 70%, 0.16)', title: 'Prep well together', sub: 'A shared plan for the hard week' },
  { id: 'reconnect', route: '/couples-reconnect', heart: 'hsl(330, 68%, 72%)', heartBg: 'hsla(330, 68%, 72%, 0.16)', title: 'How to reconnect', sub: 'Repair after a rough patch' },
];

export default function CouplesScreen() {
  const nav = useRouter();

  const open = (route: Href) => {
    Haptics.selectionAsync().catch(() => {});
    nav.push(route);
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

        <View style={styles.head}>
          <SymbolView name="heart.fill" tintColor="hsl(345, 80%, 70%)" size={26} weight="semibold" />
          <Text style={styles.title}>Us vs. the PMS</Text>
          <Text style={styles.subhead}>Small things that keep the two of you on the same side.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {ACTIVITIES.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => open(a.route)}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`${a.title}. ${a.sub}.`}
            >
              <View style={[styles.heartWrap, { backgroundColor: a.heartBg }]}>
                <SymbolView name="heart.fill" tintColor={a.heart} size={18} weight="semibold" />
              </View>
              <View style={styles.text}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <Text style={styles.rowSub}>{a.sub}</Text>
              </View>
              <SymbolView name="chevron.right" tintColor="rgba(255, 255, 255, 0.5)" size={14} weight="semibold" />
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 22, gap: 10 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scroll: { paddingBottom: 28, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  heartWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  rowTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  rowSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
