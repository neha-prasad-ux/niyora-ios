// The Relationship card: the "us" jobs, as a heads-up plus fight topics. Each
// button routes to an existing couples screen (which scores itself on
// completion). Grouped so the one calm-moment action (heads-up) reads apart
// from the in-conflict tools.

import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { spacing, radius } from '@/theme/spacing';
import { fontScale } from '@/theme/typography';
import { RELATIONSHIP_GROUPS } from '@/models/relationship';

export function RelationshipCard() {
  const go = (route: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(route as Href);
  };

  return (
    <View style={styles.card}>
      {RELATIONSHIP_GROUPS.map((g, i) => (
        <View key={g.id} style={i > 0 ? styles.groupGap : undefined}>
          <Text style={styles.intro}>{g.intro}</Text>
          <View style={styles.pills}>
            {g.buttons.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => go(b.route)}
                style={styles.pill}
                accessibilityRole="button"
                accessibilityLabel={b.label}
              >
                <Text style={styles.pillText}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
  },
  groupGap: { marginTop: spacing.xl },
  intro: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    backgroundColor: colors.fill.base,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
