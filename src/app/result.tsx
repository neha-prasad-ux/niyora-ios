// Result page: the hero + ranked list as a calm poster grid. Reached from the
// recommend sheet with the chosen feelings + needs. Time is not a question and
// not a toggle -- every option shows its own length on the card, and that is
// what the user reads to decide. The grid fades straight in (no loading beat).
// Fully on-device.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { ResultDeck } from '@/components/ResultDeck';
import { ReframeSheet } from '@/components/reframe-sheet';
import { CloseButton } from '@/components/CloseButton';
import { colors } from '@/theme/colors';
import {
  DURATIONS,
  recommend,
  scaleRounds,
  type DurationOption,
  type Need,
  type RecCard,
} from '@/models/recommend';
import { getTechnique, isBreathing } from '@/models/techniques';
import { isPmsFeeling } from '@/models/activities';
import { understandForFeeling, type UnderstandCard } from '@/models/understand';
import { resolveUnderstandContext } from '@/lib/understand-context';

// Where the "why this happens" reframe sits in the deck: high, but never the
// lead. The hero + first couple of practices stay first (she came to act); the
// reframe rides just below as an invitation to understand, not a task.
const REFRAME_SLOT = 3;

// The header leads with where she's headed (the need), never the feeling she's
// leaving. A gentle "Let's..." invitation toward feeling better.
const NEED_HEADER: Record<Need, string> = {
  calm: "Let's find some calm",
  focused: "Let's clear your head",
  relaxed: "Let's unwind",
  sleepy: "Let's wind down",
  cozy: "Let's get cozy",
  'let-it-out': "Let's let it out",
};

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

  // The "why this happens" reframe for the feeling she came in with, resolved in
  // the right context (general vs PMS). Null until resolved, or when there's no
  // feeling to key off. Slotted into the deck below.
  const [reframe, setReframe] = useState<UnderstandCard | null>(null);
  const [openReframe, setOpenReframe] = useState<UnderstandCard | null>(null);
  const primaryFeeling = feelings[0];
  useEffect(() => {
    let alive = true;
    // Resolve in an async task so no setState runs synchronously in the effect
    // body (the lint rule, and a real cascading-render guard).
    (async () => {
      if (!isPmsFeeling(primaryFeeling)) {
        if (alive) setReframe(null);
        return;
      }
      const context = await resolveUnderstandContext();
      if (!alive) return;
      const card = understandForFeeling(primaryFeeling, context).find(
        (c) => c.scope === 'feeling',
      );
      setReframe(card ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [primaryFeeling]);

  const cards = useMemo(() => {
    if (!result) return [];
    const base: RecCard[] = [result.hero, ...result.list];
    if (!reframe) return base;
    const reframeCard: RecCard = {
      id: `understand-${reframe.id}`,
      source: 'understand',
      title: reframe.title,
      feelings: [],
      needs: [],
      timeSeconds: 0,
      fast: false,
      score: 0,
      understandId: reframe.id,
    };
    const at = Math.min(REFRAME_SLOT, base.length);
    return [...base.slice(0, at), reframeCard, ...base.slice(at)];
  }, [result, reframe]);

  const header = needs[0] ? NEED_HEADER[needs[0]] : "Let's find what helps";

  // Breathing is the only practice whose length is the user's to choose: its
  // rounds scale to any duration. Tapping one opens the length picker; mindful
  // techniques and activities run at their authored length and tap straight in.
  const [pending, setPending] = useState<RecCard | null>(null);

  // Push to the session/activity screen. `rounds` overrides the card's own when
  // the length picker has scaled a breathing technique.
  const goToCard = useCallback((card: RecCard, rounds?: number) => {
    if (card.techniqueId) {
      const p: Record<string, string> = { id: card.techniqueId };
      if (card.feelingId) p.feeling = card.feelingId;
      const r = rounds ?? card.rounds;
      if (r != null) p.rounds = String(r);
      router.push({ pathname: '/session', params: p });
      return;
    }
    if (card.activityId) {
      // Carry the primary feeling so the post-activity "why this happens" read
      // can show the matching Understand reframe.
      router.push({
        pathname: '/activity',
        params: feelings[0]
          ? { id: card.activityId, feeling: feelings[0] }
          : { id: card.activityId },
      });
    }
  }, [feelings]);

  const onBegin = useCallback((card: RecCard) => {
    // The reframe card is a read: open the half-sheet in place, never navigate.
    if (card.source === 'understand') {
      setOpenReframe(reframe);
      return;
    }
    const t = card.techniqueId ? getTechnique(card.techniqueId) : undefined;
    if (t && isBreathing(t)) {
      setPending(card);
      return;
    }
    goToCard(card);
  }, [goToCard, reframe]);

  const onPickLength = useCallback((minutes: number) => {
    const card = pending;
    if (!card?.techniqueId) return;
    const t = getTechnique(card.techniqueId);
    const rounds = t ? scaleRounds(t, minutes * 60) : undefined;
    setPending(null);
    if (card) goToCard(card, rounds);
  }, [pending, goToCard]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Title and close share one line, so the grid gets the space the old
            stacked header + big top gap used to eat. */}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {header}
          </Text>
          <View style={styles.headerSide}>
            <CloseButton onPress={() => router.back()} />
          </View>
        </View>

        <Animated.View entering={FadeIn.duration(450)} style={styles.loaded}>
          {cards.length > 0 ? (
            <ResultDeck cards={cards} onBegin={onBegin} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
        </Animated.View>
      </SafeAreaView>

      <LengthPicker
        card={pending}
        onPick={onPickLength}
        onClose={() => setPending(null)}
      />

      <ReframeSheet card={openReframe} onClose={() => setOpenReframe(null)} />
    </View>
  );
}

// The breathing length picker: tap a breathing card, choose how long. Rounds
// scale to the chosen minutes; the on-screen cue carries the per-phase timing.
function LengthPicker({
  card,
  onPick,
  onClose,
}: {
  card: RecCard | null;
  onPick: (minutes: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={card != null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.pickerBackdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <LinearGradient
            colors={['#1b1430', '#0e0b14', colors.backgroundBottom]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.pickerHeaderRow}>
            <Text style={styles.pickerTitle}>How long?</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <SymbolView name="xmark" tintColor={colors.textSubtitle} size={15} weight="medium" />
            </Pressable>
          </View>
          <View style={styles.lengthRow}>
            {DURATIONS.map((d: DurationOption) => (
              <Pressable
                key={d.minutes}
                style={styles.lengthOption}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onPick(d.minutes);
                }}
                accessibilityRole="button"
                accessibilityLabel={d.label}
              >
                <Text style={styles.lengthMinutes}>{d.minutes}</Text>
                <Text style={styles.lengthUnit}>min</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    marginBottom: 14,
  },
  headerSide: { width: 32, alignItems: 'flex-end' },
  headerTitle: {
    flex: 1,
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  loaded: { flex: 1, width: '100%' },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.backgroundBottom,
    borderTopLeftRadius: 16,
    borderCurve: 'continuous',
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 22,
    paddingBottom: 44,
    overflow: 'hidden',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 22,
  },
  pickerTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  lengthRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  lengthOption: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lengthMinutes: {
    fontFamily: 'Poppins-Medium',
    fontSize: 34,
    color: colors.textPrimary,
    lineHeight: 38,
  },
  lengthUnit: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
    marginTop: 2,
  },
});
