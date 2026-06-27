// A single factor's content card, opened from the week page. Reads ?id= and
// shows the hardcoded "one thing that helps + why" content. Gentle, no
// checkboxes, no targets: it states the thing, the why, and the honest level
// of evidence, and that is all.

import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { PMS_FACTOR_CONTENT_CARDS, type PmsContentFactorId } from '@/lib/pms-factor-content';

export default function PmsFactorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const content =
    id && id in PMS_FACTOR_CONTENT_CARDS
      ? PMS_FACTOR_CONTENT_CARDS[id as PmsContentFactorId]
      : null;

  // An unknown or missing id has nothing to show; step back rather than render
  // a blank page. Done in an effect so the bail-out is not a render-time nav.
  useEffect(() => {
    if (!content) router.back();
  }, [content]);

  const goBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  if (!content) {
    return (
      <View style={styles.root}>
        <BackgroundGradient luteal />
      </View>
    );
  }

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
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.lead}>{content.lead}</Text>

          <View style={styles.points}>
            {content.points.map((p) => (
              <View key={p} style={styles.pointRow}>
                <View style={styles.dot} />
                <Text style={styles.pointText}>{p}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.evidence}>{content.evidence}</Text>
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
    paddingBottom: 36,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 28,
    lineHeight: 36,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  lead: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 25,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 14,
  },
  points: {
    marginTop: 26,
    gap: 16,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSubtitle,
    marginTop: 9,
  },
  pointText: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  evidence: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textTagline,
    letterSpacing: 0.2,
    marginTop: 30,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
});
