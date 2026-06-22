// Result page: the hero + ranked list as a calm swipe deck. Reached from the
// recommend sheet with the chosen feelings + needs. Time is not a question and
// not a toggle -- every option shows its own length on the card, and that is
// what the user reads to decide. Fully on-device.

import { useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { ResultDeck } from '@/components/ResultDeck';
import { colors } from '@/theme/colors';
import { getFeeling, recommend, type Need, type RecCard } from '@/models/recommend';

export default function ResultScreen() {
  const params = useLocalSearchParams<{ feelings?: string; needs?: string }>();
  const feelings = useMemo(
    () => (params.feelings ? params.feelings.split(',') : []),
    [params.feelings],
  );
  const needs = useMemo(
    () => (params.needs ? (params.needs.split(',') as Need[]) : []),
    [params.needs],
  );

  // No time budget: show every option at its authored length.
  const result = useMemo(() => recommend(feelings, needs), [feelings, needs]);
  const cards = useMemo(() => (result ? [result.hero, ...result.list] : []), [result]);

  const primaryLabel = getFeeling(feelings[0])?.label?.toLowerCase();

  const onBegin = useCallback((card: RecCard) => {
    if (card.techniqueId) {
      const p: Record<string, string> = { id: card.techniqueId };
      if (card.feelingId) p.feeling = card.feelingId;
      if (card.rounds != null) p.rounds = String(card.rounds);
      router.push({ pathname: '/session', params: p });
      return;
    }
    // The activity experience screens (nudge/write/read/action) arrive in a
    // later task. For now a nudge is a real-world action, so we dismiss home.
    router.back();
  }, []);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <SymbolView name="xmark" tintColor={colors.textSubtitle} size={16} weight="medium" />
          </Pressable>
        </View>

        {primaryLabel ? <Text style={styles.ctx}>Feeling {primaryLabel}</Text> : null}

        {cards.length > 0 ? (
          <ResultDeck cards={cards} onBegin={onBegin} />
        ) : (
          <View style={{ flex: 1 }} />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', height: 24, marginBottom: 4 },
  ctx: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 18,
  },
});
