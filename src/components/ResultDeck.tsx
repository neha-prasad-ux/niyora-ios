// The result options as a Letterboxd-style poster grid: every matched practice
// shown at once in a calm 3-column scroll, newest-effort-first (the recommend()
// rank). No swipe, no carousel to figure out, just see everything and tap one.
// Each cell is the practice's living scene (frozen for the grid) with its name
// over a soft gradient; tapping a cell begins it.

import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import { getActivity, type Modality } from '@/models/activities';
import { getTechnique } from '@/models/techniques';
import { CardScene } from '@/components/CardScene';
import type { RecCard } from '@/models/recommend';

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 2;
const H_PADDING = 22; // matches the result screen's safe-area horizontal padding
const GAP = 12;
const CELL_W = Math.floor((SCREEN_W - H_PADDING * 2 - GAP * (COLS - 1)) / COLS);
const CELL_H = Math.round(CELL_W * 1.4); // tall poster, roomy for the title
const TEAL = 'hsl(180, 58%, 72%)';

type Props = {
  cards: readonly RecCard[];
  onBegin: (card: RecCard) => void;
};

export function ResultDeck({ cards, onBegin }: Props) {
  return (
    <FlatList
      data={cards as RecCard[]}
      keyExtractor={(c) => c.id}
      numColumns={COLS}
      style={styles.list}
      columnWrapperStyle={styles.column}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <GridCard card={item} onPress={() => onBegin(item)} />}
    />
  );
}

function GridCard({ card, onPress }: { card: RecCard; onPress: () => void }) {
  // The reframe ("why this happens") reads as a read, not a do: a calm violet
  // wash instead of a living scene, so it stands apart from the practices.
  const isReframe = card.source === 'understand';
  const label = isReframe ? `Why this happens. ${card.title}` : `${card.title}. ${cardBenefit(card)}`;
  return (
    <Pressable
      style={styles.cell}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isReframe ? (
        <LinearGradient
          colors={['#3a2a5c', '#241a3c', '#0e0b14']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <>
          <View style={StyleSheet.absoluteFill}>
            {/* Frozen scene (active=false) so a full grid of them stays light. */}
            <CardScene card={card} active={false} />
          </View>
          <LinearGradient
            colors={['rgba(8,6,14,0.05)', 'transparent', 'rgba(9,6,16,0.82)', 'rgba(8,5,14,0.96)']}
            locations={[0, 0.32, 0.74, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      )}
      <View style={styles.cellText}>
        <Text style={styles.tag}>{isReframe ? 'why this' : cardTag(card)}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {isReframe ? 'Why this happens' : card.title}
        </Text>
        {isReframe ? (
          <Text style={styles.benefit} numberOfLines={2}>
            {card.title}
          </Text>
        ) : cardBenefit(card) ? (
          <Text style={styles.benefit} numberOfLines={1}>
            {cardBenefit(card)}
          </Text>
        ) : null}
        <Text style={styles.time}>{isReframe ? 'a short read' : formatTime(card.timeSeconds)}</Text>
      </View>
    </Pressable>
  );
}

// --- card -> display helpers ---

function cardBenefit(card: RecCard): string {
  if (card.activityId) return getActivity(card.activityId)?.benefit ?? '';
  if (card.techniqueId) return getTechnique(card.techniqueId)?.subtitle ?? '';
  return '';
}

const MODALITY_TAG: Record<Modality, string> = {
  sensory: 'soothe',
  movement: 'move',
  nourish: 'nourish',
  express: 'let it out',
  read: 'read',
  smallwin: 'small win',
  repair: 'repair',
  withdraw: 'retreat',
  breath: 'breathe',
  mind: 'ground',
};

function cardTag(card: RecCard): string {
  if (card.activityId) {
    const a = getActivity(card.activityId);
    return a ? MODALITY_TAG[a.modality] : 'activity';
  }
  const t = card.techniqueId ? getTechnique(card.techniqueId) : undefined;
  return t?.category === 'mindfulness' ? 'ground' : 'breathe';
}

function formatTime(seconds: number): string {
  if (!seconds) return 'anytime';
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.round(seconds / 60)} min`;
}

const styles = StyleSheet.create({
  list: { flex: 1, width: '100%' },
  column: { gap: GAP },
  content: { gap: GAP, paddingBottom: 28 },
  cell: {
    width: CELL_W,
    height: CELL_H,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    backgroundColor: colors.backgroundBottom,
  },
  cellText: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  tag: {
    fontFamily: 'Poppins-Light',
    fontSize: 10,
    letterSpacing: 1,
    color: TEAL,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  benefit: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.68)',
    marginTop: 3,
  },
  time: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 5,
  },
});
