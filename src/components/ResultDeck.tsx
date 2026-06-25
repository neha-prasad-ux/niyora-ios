// The result deck as a peek-row carousel (Neha's "Option C", ported from
// peek-row-deck.html, in teal). One card owns the centre; the edges of the
// neighbouring cards peek in from left and right so it's obvious there are more
// options without any swiping. Tap a peeking edge to bring it to centre; tap the
// centre card to begin that practice. Position dots sit below. The ranked
// recommend() order is preserved, so the top pick is the centred default.
//
// Replaces the old two-way swipe deck: swiping felt like too much effort in a
// bad moment. Respects reduce motion (jump-cut between cards, no slide).

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { getActivity, type Modality } from '@/models/activities';
import { getTechnique } from '@/models/techniques';
import { CardScene } from '@/components/CardScene';
import type { RecCard } from '@/models/recommend';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_H = Math.min(Math.round(SCREEN_H * 0.5), 410);
const CENTER_W = Math.min(266, SCREEN_W - 92);
const PEEK_W = 44; // peek card width; ~28px shows after it tucks under centre
const PEEK_H = Math.round(CARD_H * 0.84);
// Spark teal accent (matches the first Soul ring), per Neha's note on the mockup.
const TEAL = 'hsl(180, 58%, 72%)';
const SLIDE = { duration: 340, easing: Easing.out(Easing.cubic) };

type Props = {
  cards: readonly RecCard[];
  onBegin: (card: RecCard) => void;
};

export function ResultDeck({ cards, onBegin }: Props) {
  const [center, setCenter] = useState(0);
  const reduced = useReducedMotion();
  // Subtle settle slide when the centre changes; dir is -1 (went left) or +1.
  const tx = useSharedValue(0);

  const goTo = useCallback(
    (i: number, dir: number) => {
      if (i < 0 || i >= cards.length) return;
      Haptics.selectionAsync().catch(() => {});
      setCenter(i);
      if (reduced) return;
      tx.value = dir * 26;
      tx.value = withTiming(0, SLIDE);
    },
    [cards.length, reduced, tx],
  );

  const centerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));

  const left = center > 0 ? cards[center - 1] : undefined;
  const right = center < cards.length - 1 ? cards[center + 1] : undefined;
  const card = cards[center];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {left ? (
          <Peek card={left} side="left" onPress={() => goTo(center - 1, -1)} />
        ) : (
          <View style={styles.peekSlot} />
        )}

        <Animated.View style={[styles.centerWrap, centerStyle]}>
          <Pressable
            style={styles.center}
            onPress={() => onBegin(card)}
            accessibilityRole="button"
            accessibilityLabel={`Begin ${card.title}`}
          >
            <View style={StyleSheet.absoluteFill}>
              <CardScene card={card} active />
            </View>
            <LinearGradient
              colors={['rgba(8,6,14,0.10)', 'transparent', 'rgba(9,6,16,0.74)', 'rgba(8,5,14,0.94)']}
              locations={[0, 0.3, 0.72, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.content}>
              <Text style={styles.tag}>{cardTag(card)}</Text>
              <Text style={styles.title}>{card.title}</Text>
              {cardBenefit(card) ? <Text style={styles.benefit}>{cardBenefit(card)}</Text> : null}
              {formatTime(card.timeSeconds) ? (
                <Text style={styles.time}>{formatTime(card.timeSeconds)}</Text>
              ) : null}
              <View style={styles.begin}>
                <Text style={styles.beginText}>BEGIN</Text>
              </View>
            </View>
          </Pressable>
        </Animated.View>

        {right ? (
          <Peek card={right} side="right" onPress={() => goTo(center + 1, 1)} />
        ) : (
          <View style={styles.peekSlot} />
        )}
      </View>

      <View
        style={styles.dots}
        accessibilityLabel={`Option ${center + 1} of ${cards.length}`}
      >
        {cards.map((c, i) => (
          <View key={c.id} style={[styles.dot, i === center && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

// A neighbour card's edge, tucked partly behind the centre card. Tapping it
// brings it to centre. The living scene shows through, dimmed.
function Peek({
  card,
  side,
  onPress,
}: {
  card: RecCard;
  side: 'left' | 'right';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.peek, side === 'left' ? styles.peekLeft : styles.peekRight]}
      accessibilityRole="button"
      accessibilityLabel={`See ${card.title}`}
      hitSlop={10}
    >
      <View style={StyleSheet.absoluteFill}>
        <CardScene card={card} active={false} />
      </View>
      <View style={styles.peekVeil} />
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: CARD_H,
  },
  peekSlot: { width: PEEK_W - 16 },
  peek: {
    width: PEEK_W,
    height: PEEK_H,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: colors.backgroundBottom,
  },
  // Tuck each peek partly behind the centre card so only its edge shows.
  peekLeft: { marginRight: -16 },
  peekRight: { marginLeft: -16 },
  peekVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8,6,14,0.45)',
  },
  centerWrap: { zIndex: 2 },
  center: {
    width: CENTER_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 210, 0.45)', // teal frame
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingBottom: 26,
    alignItems: 'center',
  },
  tag: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    letterSpacing: 1,
    color: TEAL,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 28,
  },
  benefit: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  time: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 13,
  },
  begin: {
    borderRadius: 24,
    paddingHorizontal: 42,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 220, 210, 0.6)',
    backgroundColor: 'rgba(120, 220, 210, 0.16)',
  },
  beginText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 2,
    color: '#fff',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotOn: { backgroundColor: TEAL, width: 18 },
});
