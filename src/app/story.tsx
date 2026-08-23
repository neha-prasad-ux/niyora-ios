// "A story", one of the settling activities. A short, wholesome, real-life
// story to get absorbed in for a minute while the urge passes. She can pull
// another, and Done marks it finished.
//
// [DRAFT] placeholder stories (Neha will rewrite in her voice). The mark of a
// good one: small, true-feeling, kind, nothing dramatic to re-activate her.

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

// All true, in Neha's order. Plain-language retellings (facts, not excerpts), so
// no on-screen attribution is needed; sources kept here for provenance.
const STORIES = [
  // Bobbie the Wonder Dog, 1923-24 (Oregon Encyclopedia)
  'A dog named Bobbie lost his family on a trip to Indiana. He walked all the way home to Oregon, 2,551 miles, over six months, in winter, all alone.',
  // Dindim the penguin & João Pereira de Souza (CNN, 2016)
  'A fisherman in Brazil found a little penguin covered in oil and nursed him back to health. Every year after that, the penguin swam all the way back just to visit him.',
  // Farallon humpback whale rescue (SF Chronicle, 2005)
  'Divers spent an hour cutting a giant whale loose from ropes off San Francisco. Once it was free, it swam to each of them, gave them a soft nudge, and went on its way.',
  // Dashrath Manjhi, the Mountain Man (BBC)
  "A man's village was cut off from the nearest doctor by a mountain. So he picked up a hammer and carved a road straight through it, by hand, over 22 years.",
  // Koko the gorilla & All Ball, 1984 (The Gorilla Foundation; TIME)
  'Koko the gorilla knew sign language, and one year she asked for a kitten. She picked a tiny grey one, named him All Ball, and carried him around like her own baby.',
  // Chilean miners rescue, 2010 (BBC)
  'Thirty-three miners got trapped half a mile underground in Chile for 69 days. One by one, every single one of them came back up alive.',
  // Miracle on the Hudson, Flight 1549, 2009 (NTSB)
  'A plane lost both engines over New York. The pilot glided it down onto the river, and all 155 people on board walked away.',
  // Smallpox eradication, declared 1980 (WHO)
  'Smallpox used to kill millions of people. In 1980 the whole world got together, wiped it out for good, and it never came back.',
  // 1925 serum run to Nome, Balto & Togo (Smithsonian)
  'A town in Alaska ran out of medicine in the middle of a blizzard. Teams of sled dogs ran it 674 miles through the snow and saved all the kids.',
  // Christian the lion reunion, 1971 (A Lion Called Christian)
  "Two guys raised a lion cub in London, then set him free in Africa. A year later they went to visit, not sure he'd remember them, and he ran straight into their arms.",
  // Jadav Payeng, the Forest Man of India (Al Jazeera)
  "A teenager in India started planting one tree a day on an empty stretch of sand. Forty years later it's a forest, with deer, rhinos, even elephants living in it.",
  // Saroo Brierley (BBC; "Lion")
  'A five year old boy got lost on a train, thousands of miles from home. Twenty five years later he traced the way back on Google Earth and found his mom.',
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
          <Pressable
            onPress={another}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Another one"
            style={({ pressed }) => [styles.another, pressed && styles.anotherPressed]}
          >
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
  // Secondary action: a quiet outline capsule that mirrors the primary Done
  // button's shape but reads as recessive against its filled gradient.
  another: {
    alignSelf: 'stretch',
    paddingVertical: spacing.md,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(43, 38, 50, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anotherPressed: { opacity: 0.6 },
  anotherText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.paper.inkSoft,
  },
});
