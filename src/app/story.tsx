// "A story" — one of the settling activities. A short, wholesome, real-life
// story to get absorbed in for a minute while the urge passes. She can pull
// another, and Done marks it finished.
//
// [DRAFT] placeholder stories (Neha will rewrite in her voice). The mark of a
// good one: small, true-feeling, kind — nothing dramatic to re-activate her.

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { BeginButton } from '@/components/begin-button';
import { markActivityDone } from '@/lib/hold-activities';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const INK = colors.paper.ink;

const STORIES = [
  'A boy saved his pocket money for months to buy his mum flowers on a plain Tuesday. Not her birthday. Just because she had looked tired.',
  'An old man feeds the same three pigeons at 7 every morning. When he was in hospital for a week, a neighbour did it for him, so they would not wait for nothing.',
  'A barista spent a summer learning sign language so one regular could order his coffee the same way as everyone else.',
  "A girl left a note in a library book: 'if you are reading this on a hard day, it gets lighter.' Years later someone wrote back underneath: 'it did.'",
];

export default function StoryScreen() {
  const [i, setI] = useState(0);
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  const another = () => {
    Haptics.selectionAsync().catch(() => {});
    setI((n) => (n + 1) % STORIES.length);
  };
  const done = () => {
    markActivityDone('story');
    leave();
  };
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
          </Pressable>
          <Text style={styles.title}>A story</Text>
          <View style={styles.close} />
        </View>
        <ScrollView contentContainerStyle={styles.center} showsVerticalScrollIndicator={false}>
          <Text style={styles.story}>{STORIES[i]}</Text>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable onPress={another} hitSlop={8} accessibilityRole="button" style={styles.another}>
            <Text style={styles.anotherText}>Another one</Text>
          </Pressable>
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
  center: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xxxl, paddingVertical: spacing.xxl },
  story: {
    fontFamily: fonts.light,
    fontSize: fontScale.technique,
    lineHeight: 34,
    color: colors.paper.inkSoft,
    textAlign: 'center',
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md, alignItems: 'center' },
  another: { paddingVertical: spacing.xs },
  anotherText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.paper.inkFaint,
    textDecorationLine: 'underline',
  },
});
