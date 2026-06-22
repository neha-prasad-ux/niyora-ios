// The result swipe deck. The ranked hero + list arrive as cards; the first is
// the recommendation. A calm two-way swipe: drag left to send the front card
// back and reveal the next, drag right to bring the last one back. Tap a dot to
// jump. Motion is an inhale, not a bounce -- the front card glides under the
// finger, then settles over ~0.75s on a soft eased curve. Ports the approved
// prototype docs/pms/niyora-pms-cards-animated.html.
//
// Card visuals are placeholders (a solid tinted scene); the living scenes layer
// onto the backgrounds in a later task.

import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { getActivity, type Modality } from '@/models/activities';
import { getTechnique } from '@/models/techniques';
import type { RecCard } from '@/models/recommend';

const { width: SCREEN_W } = Dimensions.get('window');
const THRESHOLD = 100; // px past which a swipe commits
const SETTLE = { duration: 750, easing: Easing.bezier(0.22, 0.61, 0.31, 1) };
const FLY = { duration: 520, easing: Easing.bezier(0.22, 0.61, 0.31, 1) };
const SPRING_BACK = { duration: 300, easing: Easing.out(Easing.cubic) };

type Props = {
  cards: readonly RecCard[];
  onBegin: (card: RecCard) => void;
};

export function ResultDeck({ cards, onBegin }: Props) {
  // `order` holds card indices, front-to-back. The parent remounts this deck
  // (via a key) when the time toggle re-ranks the list, so the initial order is
  // always fresh -- no reset effect needed.
  const [order, setOrder] = useState<number[]>(() => cards.map((_, i) => i));

  const dragX = useSharedValue(0);

  const commitAdvance = () => {
    setOrder((o) => [...o.slice(1), o[0]]);
    dragX.value = 0; // flown card is now at the back, hidden -- reset is invisible
  };

  const commitRewind = () => {
    setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);
    // The brought-back card is now the front; slide it in from the right.
    dragX.value = SCREEN_W * 1.4;
    dragX.value = withTiming(0, SETTLE);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]) // let taps (Begin, dots) through
    .onUpdate((e) => {
      dragX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -THRESHOLD) {
        dragX.value = withTiming(-SCREEN_W * 1.6, FLY, (done) => {
          if (done) runOnJS(commitAdvance)();
        });
      } else if (e.translationX > THRESHOLD) {
        runOnJS(commitRewind)();
      } else {
        dragX.value = withTiming(0, SPRING_BACK);
      }
    });

  const jumpTo = (cardIndex: number) => {
    const n = cards.length;
    setOrder(Array.from({ length: n }, (_, j) => (cardIndex + j) % n));
    dragX.value = 0;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => jumpTo(i)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Jump to card ${i + 1}`}
          >
            <Dot active={order[0] === i} />
          </Pressable>
        ))}
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.deck}>
          {cards.map((card, idx) => (
            <DeckCard
              key={card.id}
              card={card}
              pos={order.indexOf(idx)}
              dragX={dragX}
              onBegin={onBegin}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  return <View style={[styles.dot, active && styles.dotActive]} />;
}

function DeckCard({
  card,
  pos,
  dragX,
  onBegin,
}: {
  card: RecCard;
  pos: number;
  dragX: SharedValue<number>;
  onBegin: (card: RecCard) => void;
}) {
  const posSV = useSharedValue(pos);
  useEffect(() => {
    posSV.value = withTiming(pos, SETTLE);
  }, [pos, posSV]);

  const animStyle = useAnimatedStyle(() => {
    const p = posSV.value;
    const front = p < 0.5;
    const tx = front ? dragX.value : 0;
    return {
      opacity: interpolate(p, [0, 2, 3], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: tx },
        { translateY: p * 14 },
        { rotateZ: `${tx * 0.025}deg` },
        { scale: 1 - p * 0.05 },
      ],
    };
  });

  const [c1, c2] = sceneTint(card);
  const tag = cardTag(card);
  const benefit = cardBenefit(card);
  const time = formatTime(card.timeSeconds);

  return (
    <Animated.View
      style={[styles.card, animStyle, { zIndex: 100 - pos }]}
      pointerEvents={pos === 0 ? 'auto' : 'none'}
    >
      <LinearGradient colors={[c1, c2]} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(8,6,14,0.12)', 'transparent', 'rgba(9,6,16,0.72)', 'rgba(8,5,14,0.92)']}
        locations={[0, 0.3, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.tag}>{tag}</Text>
        <Text style={styles.title}>{card.title}</Text>
        {benefit ? <Text style={styles.benefit}>{benefit}</Text> : null}
        {time ? <Text style={styles.time}>{time}</Text> : null}
        <Pressable
          onPress={() => onBegin(card)}
          accessibilityRole="button"
          accessibilityLabel={`Begin ${card.title}`}
        >
          <LinearGradient
            colors={[colors.beginStart, colors.beginEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.begin}
          >
            <Text style={styles.beginText}>BEGIN</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
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

// Placeholder scene tints by flavour. The living scenes replace these later.
function sceneTint(card: RecCard): [string, string] {
  if (card.techniqueId) {
    const t = getTechnique(card.techniqueId);
    return t?.category === 'mindfulness'
      ? ['#1c2a26', '#0a1110']
      : ['#241c3a', '#0c0a16'];
  }
  const modality = card.activityId ? getActivity(card.activityId)?.modality : undefined;
  switch (modality) {
    case 'sensory':
      return ['#1b2a3a', '#0a0d14'];
    case 'movement':
      return ['#1c2e2a', '#0a1110'];
    case 'nourish':
      return ['#2e2418', '#140d0a'];
    case 'read':
      return ['#251c3a', '#0e0a18'];
    case 'repair':
      return ['#2a1d2e', '#120a14'];
    case 'withdraw':
      return ['#1a1726', '#08060e'];
    default:
      return ['#241c3a', '#0c0a16'];
  }
}

function formatTime(seconds: number): string {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.round(seconds / 60)} min`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', width: '100%' },
  dots: { flexDirection: 'row', gap: 7, marginBottom: 16, height: 8, alignItems: 'center' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(190, 170, 255, 0.30)',
  },
  dotActive: { width: 16, backgroundColor: 'rgba(190, 170, 255, 0.95)' },
  deck: { flex: 1, width: 300, alignSelf: 'center' },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 26,
    paddingBottom: 30,
    alignItems: 'center',
  },
  tag: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    letterSpacing: 1,
    color: 'rgba(255, 255, 255, 0.55)',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 29,
  },
  benefit: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.72)',
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 21,
  },
  time: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginVertical: 14,
  },
  begin: {
    borderRadius: 26,
    paddingHorizontal: 46,
    paddingVertical: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.beginBorder,
  },
  beginText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 2,
    color: '#fff',
  },
});
