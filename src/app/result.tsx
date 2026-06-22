// Result page: the hero + ranked list as a calm swipe deck. Reached from the
// recommend sheet with the chosen feelings + needs. Time is not a question --
// it lives here as a light toggle that re-ranks the deck (filtering the
// activities, scaling the breathing). Fully on-device.

import { useCallback, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { ResultDeck } from '@/components/ResultDeck';
import { colors } from '@/theme/colors';
import { getFeeling, recommend, type Need, type RecCard } from '@/models/recommend';

// The two time states behind the toggle. Quick is the default 60-second route;
// longer reveals the activities that need more room.
const QUICK_MIN = 2;
const LONGER_MIN = 6;

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

  const [minutes, setMinutes] = useState(QUICK_MIN);
  const result = useMemo(() => recommend(feelings, needs, minutes), [feelings, needs, minutes]);
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

        {primaryLabel ? <Text style={styles.ctx}>for the {primaryLabel} feeling</Text> : null}

        {cards.length > 0 ? (
          <ResultDeck key={minutes} cards={cards} onBegin={onBegin} />
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={styles.timeRow}>
          <TimeChip
            label="A few minutes"
            active={minutes === QUICK_MIN}
            onPress={() => setMinutes(QUICK_MIN)}
          />
          <TimeChip
            label="I've got longer"
            active={minutes === LONGER_MIN}
            onPress={() => setMinutes(LONGER_MIN)}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function TimeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.timeChip, active && styles.timeChipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', height: 24, marginBottom: 4 },
  ctx: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginBottom: 14,
  },
  timeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 18 },
  timeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  timeChipActive: {
    borderColor: 'rgba(196, 178, 255, 0.65)',
    backgroundColor: 'rgba(150, 120, 235, 0.92)',
  },
  timeChipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  timeChipTextActive: { fontFamily: 'Poppins-Medium', color: '#fff' },
});
