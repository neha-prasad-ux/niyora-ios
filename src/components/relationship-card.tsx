// The Relationship card: the "us" jobs, as a heads-up plus fight topics. Each
// button routes to an existing couples screen (which scores itself on
// completion). Grouped so the one calm-moment action (heads-up) reads apart
// from the in-conflict tools.

import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
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
    padding: 18,
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupGap: { marginTop: 20 },
  intro: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
