// One emotion's "Train your mind" card: its colour field, the current level's own
// pattern on top, a progress tag, the emotion name, and a one-line blurb. Shared
// so the chapters page (src/app/train.tsx), the home summary, and the onboarding
// plan preview all render the exact same card and stay recognisable.

import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Orb } from '@/components/orb';
import { SOUL_RING_HUES } from '@/models/tiers';
import { type Chapter } from '@/v3/game-content';
import { type TrainingState } from '@/store/training-v3';

// The card's texture is the CURRENT level's own intro backdrop, so each chapter
// card previews what she is walking into and shifts as she advances:
//   L1 ringed soul-moons · L2 coloured moons · L3 edge particles ·
//   L4 a soul in the right corner · L5 a zoomed-in ringed soul in the corner.
const CARD_PARTICLES: { top: `${number}%`; left: `${number}%`; size: number; opacity: number }[] = [
  { top: '14%', left: '8%', size: 5, opacity: 0.5 },
  { top: '20%', left: '90%', size: 4, opacity: 0.4 },
  { top: '10%', left: '52%', size: 3, opacity: 0.35 },
  { top: '70%', left: '6%', size: 4, opacity: 0.4 },
  { top: '82%', left: '40%', size: 5, opacity: 0.45 },
  { top: '76%', left: '92%', size: 3, opacity: 0.3 },
  { top: '46%', left: '95%', size: 4, opacity: 0.4 },
  { top: '50%', left: '3%', size: 3, opacity: 0.3 },
  { top: '88%', left: '70%', size: 4, opacity: 0.4 },
  { top: '30%', left: '30%', size: 3, opacity: 0.3 },
];

function CardPattern({ level }: { level: number }) {
  if (level === 2) {
    return (
      <View pointerEvents="none" style={styles.chapterBackdrop}>
        <View style={styles.patTopRight}>
          <Orb size={78} hue={8} still />
        </View>
        <View style={styles.patBotLeft}>
          <Orb size={58} hue={330} still />
        </View>
      </View>
    );
  }
  if (level === 3) {
    return (
      <View pointerEvents="none" style={styles.chapterBackdrop}>
        {CARD_PARTICLES.map((p, i) => (
          <View
            key={i}
            style={[
              styles.cardParticle,
              { top: p.top, left: p.left, width: p.size, height: p.size, borderRadius: p.size / 2, opacity: p.opacity },
            ]}
          />
        ))}
      </View>
    );
  }
  if (level === 4) {
    return (
      <View pointerEvents="none" style={styles.chapterBackdrop}>
        <View style={styles.patRightCorner}>
          <Orb size={124} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
        </View>
      </View>
    );
  }
  if (level === 5) {
    return (
      <View pointerEvents="none" style={styles.chapterBackdrop}>
        <View style={styles.patZoom}>
          <Orb size={300} tierRingCount={4} ringHues={SOUL_RING_HUES} still />
        </View>
      </View>
    );
  }
  // Level 1 (and the default): ringed soul-moons.
  return (
    <View pointerEvents="none" style={styles.chapterBackdrop}>
      <View style={styles.patTopRight}>
        <Orb size={82} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
      </View>
      <View style={styles.patBotLeft}>
        <Orb size={60} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
      </View>
    </View>
  );
}

// Each chapter's own colour field and one-line blurb, so the cards read as a set
// but stay distinct. All sit in the violet family (between Calm's blue and
// Luteal's pink): irritability warm-violet, anxiety cool blue-violet, mood swings
// violet-magenta. Falls back to the irritability field for any future chapter.
const CHAPTER_META: Record<string, { blurb: string; gradient: readonly [string, string, string] }> = {
  irritability: {
    blurb: 'When everything gets annoying',
    gradient: ['hsl(258, 44%, 28%)', 'hsl(276, 42%, 30%)', 'hsl(292, 40%, 31%)'],
  },
  anxiety: {
    blurb: 'When your mind will not slow down',
    gradient: ['hsl(238, 44%, 30%)', 'hsl(258, 42%, 31%)', 'hsl(276, 40%, 32%)'],
  },
  'mood-swings': {
    blurb: 'When feelings hit like waves',
    gradient: ['hsl(286, 44%, 30%)', 'hsl(306, 40%, 31%)', 'hsl(326, 40%, 33%)'],
  },
  // Workplace chapters sit in the teal-green field of the Grow-at-work shelf.
  'work-anxiety': {
    blurb: 'When a big moment has you racing',
    gradient: ['hsl(196, 44%, 27%)', 'hsl(182, 42%, 28%)', 'hsl(168, 40%, 29%)'],
  },
  confidence: {
    blurb: 'When the self-doubt gets loud',
    gradient: ['hsl(184, 44%, 27%)', 'hsl(170, 42%, 28%)', 'hsl(156, 40%, 29%)'],
  },
  assertiveness: {
    blurb: 'When something needs saying',
    gradient: ['hsl(172, 44%, 27%)', 'hsl(160, 42%, 28%)', 'hsl(146, 40%, 30%)'],
  },
};
const CHAPTER_GRADIENT_FALLBACK: readonly [string, string, string] = [
  'hsl(258, 44%, 28%)',
  'hsl(276, 42%, 30%)',
  'hsl(292, 40%, 31%)',
];

// Whole-card tap opens the chapter (resuming at her first incomplete level).
// `peek` drops the progress tag so the card can sit cleanly in a stacked deck
// (used by the onboarding plan preview).
export function ChapterCard({
  chapter,
  training,
  onOpen,
  peek = false,
}: {
  chapter: Chapter;
  training: TrainingState;
  onOpen: () => void;
  peek?: boolean;
}) {
  const levels = chapter.levels;
  const doneCount = levels.filter((l) => training.completed.includes(l.id)).length;
  const currentIdx = levels.findIndex((l) => !training.completed.includes(l.id));
  const allDone = currentIdx === -1;
  const currentN = allDone ? levels.length : levels[currentIdx].n;
  const started = doneCount > 0;

  const meta = CHAPTER_META[chapter.id];
  const gradient = meta?.gradient ?? CHAPTER_GRADIENT_FALLBACK;
  const blurb = meta?.blurb ?? 'Master emotional regulation';
  const statusWord = allDone ? 'Play again' : started ? 'Continue' : 'Start';

  return (
    <View style={styles.chapterWrap}>
      {!peek && (
        <View style={styles.chapterTag}>
          <Text style={styles.tagText}>{allDone ? 'Complete' : `Level ${currentN}/${levels.length}`}</Text>
        </View>
      )}
      <Pressable
        style={styles.chapterCard}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${chapter.emotion}. ${blurb}. ${statusWord}.`}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <CardPattern level={allDone ? levels.length : currentN} />
        <View style={styles.cardRow}>
          <View style={styles.cardTextCol}>
            <Text style={styles.chapterTitle}>{chapter.emotion}</Text>
            <Text style={styles.cardSub}>{blurb}</Text>
          </View>
          <SymbolView
            name="chevron.right"
            tintColor="rgba(255, 255, 255, 0.7)"
            size={15}
            weight="semibold"
            style={styles.cardChevron}
          />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Shared card interior.
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardTextCol: { flex: 1 },
  cardChevron: { opacity: 0.55, marginRight: -2 },
  tagText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#ffffff', letterSpacing: 0.5 },
  cardSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.1,
    marginTop: 3,
  },

  // Chapter card.
  chapterWrap: { marginBottom: 4 },
  chapterTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(150, 110, 205, 0.95)',
  },
  chapterCard: {
    width: '100%',
    minHeight: 120,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  chapterBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  patTopRight: { position: 'absolute', top: -24, right: -16, opacity: 0.3, transform: [{ rotate: '18deg' }] },
  patBotLeft: { position: 'absolute', bottom: -24, left: -18, opacity: 0.24, transform: [{ rotate: '-12deg' }] },
  patRightCorner: { position: 'absolute', bottom: -34, right: -34, opacity: 0.3 },
  patZoom: { position: 'absolute', top: -96, right: -96, opacity: 0.16, transform: [{ rotate: '-18deg' }] },
  cardParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(214, 202, 246, 1)',
    shadowColor: 'rgba(200, 190, 245, 0.9)',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  chapterTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 21,
    lineHeight: 26,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
});
