// Grow: the library. Every program and tool lives here as a shelf — training,
// the calm toolkit, the couples section — so the Now tab can stay a single
// coached action. Future verticals (CBT, workplace, family) land as new
// shelves on this page, never as new home cards.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { Header } from '@/components/header';
import { Orb } from '@/components/orb';
import { RecommendSheet } from '@/components/RecommendSheet';
import { TechniquePicker } from '@/components/technique-picker';
import { type RecResult } from '@/models/recommend';
import { SOUL_RING_HUES } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { trainSummary } from '@/v3/game-content';
import { DEFAULT_TRAINING, getTraining, type TrainingState } from '@/store/training-v3';

export default function GrowScreen() {
  const [training, setTraining] = useState<TrainingState>(DEFAULT_TRAINING);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getTraining().then((t) => {
        if (alive) setTraining(t);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const openTrain = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/train');
  };

  const openCouples = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/couples');
  };

  // The calm shelf leads with the coached entry (the same feeling-first sheet
  // as everywhere else); the quiet link below it opens the full list.
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const openCalm = () => {
    Haptics.selectionAsync().catch(() => {});
    setRecommendVisible(true);
  };
  const onRecommendPick = (result: RecResult) => {
    setRecommendVisible(false);
    router.push({
      pathname: '/result',
      params: { feelings: result.feelingIds.join(','), needs: result.needIds.join(',') },
    });
  };
  const onPickerSelect = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPickerVisible(false);
    router.push({ pathname: '/session', params: { id } });
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TrainCard training={training} onOpen={openTrain} />
          <CalmCard onBegin={openCalm} />
          <View style={styles.browseWrap}>
            <Pressable
              onPress={() => setPickerVisible(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Browse all techniques"
            >
              <Text style={styles.browseText}>Browse all techniques</Text>
            </Pressable>
          </View>
          <CouplesCard onOpen={openCouples} />
          <View style={{ height: 12 }} />
        </ScrollView>
      </SafeAreaView>

      <RecommendSheet
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        onPick={onRecommendPick}
      />
      <TechniquePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onPickerSelect}
      />
    </View>
  );
}

// --- Shelves -------------------------------------------------------------
// The card language carries over from the old home unchanged: floating tag,
// two-stop gradient field, SemiBold title, whole-card tap with a chevron.

const TRAIN_GRADIENT: readonly [string, string, string] = [
  'hsl(258, 44%, 28%)',
  'hsl(276, 42%, 30%)',
  'hsl(292, 40%, 31%)',
];

function TrainCard({ training, onOpen }: { training: TrainingState; onOpen: () => void }) {
  const { statusWord, detail } = trainSummary(training);
  return (
    <View style={styles.chapterWrap}>
      <View style={styles.chapterTag}>
        <Text style={styles.tagText}>{statusWord}</Text>
      </View>
      <Pressable
        style={styles.chapterCard}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Train your mind. ${detail}. ${statusWord}.`}
      >
        <LinearGradient
          colors={TRAIN_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.chapterBackdrop}>
          <View style={styles.patTopRight}>
            <Orb size={82} tierRingCount={2} ringHues={SOUL_RING_HUES} still />
          </View>
          <View style={styles.patBotLeft}>
            <Orb size={60} tierRingCount={1} ringHues={SOUL_RING_HUES} still />
          </View>
        </View>
        <View style={styles.cardRow}>
          <View style={styles.cardTextCol}>
            <Text style={styles.chapterTitle}>Train your mind</Text>
            <Text style={styles.cardSub}>{detail}</Text>
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

const CALM_GRADIENT: readonly [string, string, string] = [
  'hsl(206, 48%, 30%)',
  'hsl(232, 44%, 31%)',
  'hsl(258, 42%, 33%)',
];

function CalmCard({ onBegin }: { onBegin: () => void }) {
  return (
    <View style={styles.calmWrap}>
      <View style={styles.calmTag}>
        <Text style={styles.tagText}>Practice</Text>
      </View>
      <Pressable
        style={styles.calmCard}
        onPress={onBegin}
        accessibilityRole="button"
        accessibilityLabel="Calm toolkit. Breathing and mindfulness picked for how you feel. Open."
      >
        <LinearGradient
          colors={CALM_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.calmBody, styles.cardRow]}>
          <View style={styles.cardTextCol}>
            <Text style={styles.calmTitle}>Calm toolkit</Text>
            <Text style={styles.cardSub}>Breathing and mindfulness, picked for how you feel.</Text>
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

const COUPLES_GRADIENT: readonly [string, string, string] = [
  'hsl(340, 44%, 30%)',
  'hsl(352, 46%, 31%)',
  'hsl(6, 44%, 32%)',
];

function CouplesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <View style={styles.couplesWrap}>
      <View style={styles.couplesTag}>
        <Text style={styles.tagText}>Together</Text>
      </View>
      <Pressable
        style={styles.couplesCard}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Us vs. the PMS. Get through PMS as a team. Open."
      >
        <LinearGradient
          colors={COUPLES_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.couplesBackdrop}>
          <SymbolView
            name="heart.fill"
            tintColor="rgba(255, 255, 255, 0.14)"
            size={120}
            weight="semibold"
            style={styles.couplesHeartBig}
          />
          <SymbolView
            name="heart.fill"
            tintColor="rgba(255, 255, 255, 0.1)"
            size={62}
            weight="semibold"
            style={styles.couplesHeartSmall}
          />
        </View>
        <View style={[styles.calmBody, styles.cardRow]}>
          <View style={styles.cardTextCol}>
            <Text style={styles.calmTitle}>Us vs. the PMS</Text>
            <Text style={styles.cardSub}>Get through PMS as a team.</Text>
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
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 14 },

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
  chapterTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 21,
    lineHeight: 26,
    color: '#ffffff',
    letterSpacing: 0.15,
  },

  calmWrap: { marginBottom: 4 },
  calmTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(110, 150, 205, 0.95)',
  },
  calmCard: {
    minHeight: 104,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
  },
  calmBody: { paddingHorizontal: 20, paddingVertical: 18 },
  calmTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
  browseWrap: { alignItems: 'center', marginTop: -2, marginBottom: 2 },
  browseText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },

  couplesWrap: { marginBottom: 4 },
  couplesTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
    backgroundColor: 'rgba(205, 90, 120, 0.95)',
  },
  couplesCard: {
    minHeight: 104,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
  },
  couplesBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  couplesHeartBig: { position: 'absolute', top: -22, right: -14, transform: [{ rotate: '14deg' }] },
  couplesHeartSmall: { position: 'absolute', bottom: -18, right: 58, transform: [{ rotate: '-10deg' }] },
});
