// Activity experience screen. Reached from the result deck when she taps BEGIN
// on an activity card. Shows the activity's living scene as a full-bleed
// background, then the tap-in experience for its card type (nudge / write /
// read / action). Ends on a brief closure that checks how she feels now, then
// sends her off with the calm, then home.

import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { CardScene } from '@/components/CardScene';
import { Scrim } from '@/components/activity/ui';
import { NudgeView } from '@/components/activity/NudgeView';
import { WriteView } from '@/components/activity/WriteView';
import { ReadView } from '@/components/activity/ReadView';
import { ActionView } from '@/components/activity/ActionView';
import { UnderstandReadView } from '@/components/activity/UnderstandReadView';
import { colors } from '@/theme/colors';
import { getActivity, isPmsFeeling, type PmsFeeling } from '@/models/activities';
import { understandForFeeling, type UnderstandCard } from '@/models/understand';
import { resolveUnderstandContext } from '@/lib/understand-context';
import type { RecCard } from '@/models/recommend';

export default function ActivityScreen() {
  const { id, feeling } = useLocalSearchParams<{ id: string; feeling?: string }>();
  const activity = id ? getActivity(id) : undefined;
  const pmsFeeling = isPmsFeeling(feeling) ? feeling : undefined;

  const [done, setDone] = useState(false);
  const onComplete = useCallback(() => setDone(true), []);

  // Unknown id: bounce straight back.
  useEffect(() => {
    if (!activity) router.back();
  }, [activity]);

  if (!activity) return <View style={styles.root} />;

  // Writes get the plain ambient gradient (no "I feel..." scene competing with
  // her own words); the rest get their living scene.
  const isWrite = activity.cardType === 'write';
  const sceneCard: RecCard = {
    id: `act-${activity.id}`,
    source: 'activity',
    title: activity.title,
    feelings: activity.fits,
    needs: [],
    timeSeconds: activity.timeSeconds,
    fast: activity.fast,
    score: 0,
    activityId: activity.id,
  };

  return (
    <View style={styles.root}>
      {isWrite ? (
        <BackgroundGradient />
      ) : (
        <>
          <View style={StyleSheet.absoluteFill}>
            <CardScene card={sceneCard} active />
          </View>
          <Scrim />
        </>
      )}

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

        <View style={styles.content}>
          {activity.cardType === 'nudge' && (
            <NudgeView activity={activity} onComplete={onComplete} />
          )}
          {activity.cardType === 'write' && (
            <WriteView activity={activity} onComplete={onComplete} />
          )}
          {activity.cardType === 'read' && (
            <ReadView activity={activity} onComplete={onComplete} />
          )}
          {activity.cardType === 'action' && (
            <ActionView activity={activity} onComplete={onComplete} />
          )}
        </View>
      </SafeAreaView>

      {done ? <Closure onClose={() => router.back()} feeling={pmsFeeling} /> : null}
    </View>
  );
}

// The graded felt-check we already use elsewhere, reused as the post-activity
// beat (a positive option, "light", is what makes it a real before/after).
const LEVELS = [
  { label: 'light', hue: 215 },
  { label: 'okay', hue: 260 },
  { label: 'heavy', hue: 335 },
];

// Closure: how do you feel now? -> take the calm with you -> home. At the carry
// beat, if we know the feeling she came in with, we offer the matching
// Understand reframe ("why this happens") as a gentle, optional read before she
// leaves. (The felt level isn't stored yet; the delta wiring is #236.)
function Closure({ onClose, feeling }: { onClose: () => void; feeling?: PmsFeeling }) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'feel' | 'carry' | 'understand'>('feel');

  // Resolve the reframe for her feeling in the right context (general vs PMS).
  // Null until resolved, or when there's no feeling to key off.
  const [card, setCard] = useState<UnderstandCard | null>(null);
  useEffect(() => {
    if (!feeling) return;
    let alive = true;
    resolveUnderstandContext().then((context) => {
      if (!alive) return;
      const reframe = understandForFeeling(feeling, context).find((c) => c.scope === 'feeling');
      setCard(reframe ?? null);
    });
    return () => {
      alive = false;
    };
  }, [feeling]);

  // The carry line drifts to home on its own only when there's no read to offer;
  // when there is, we hold so she can choose to open it or close out herself.
  useEffect(() => {
    if (phase !== 'carry' || card) return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [phase, card, onClose]);

  const showClose = phase === 'carry' || phase === 'understand';

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.closure}>
      {showClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.closeX, { top: insets.top + 8 }]}
        >
          <SymbolView name="xmark" tintColor={colors.textSubtitle} size={16} weight="medium" />
        </Pressable>
      ) : null}

      {phase === 'feel' ? (
        <View style={styles.closeAsk}>
          <Text style={styles.closeLead}>How are you feeling now?</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => (
              <Pressable
                key={l.label}
                style={styles.levelPill}
                onPress={() => setPhase('carry')}
                accessibilityRole="button"
                accessibilityLabel={l.label}
              >
                <Text style={[styles.levelLabel, { color: `hsl(${l.hue}, 62%, 72%)` }]}>
                  {l.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : phase === 'understand' && card ? (
        <View style={[styles.understandWrap, { paddingTop: insets.top + 44 }]}>
          <UnderstandReadView card={card} onDone={onClose} />
        </View>
      ) : (
        <View style={styles.closeCarryWrap}>
          <Animated.Text entering={FadeIn.duration(600)} style={styles.closeCarry}>
            Take the calm with you.
          </Animated.Text>
          {card ? (
            <Pressable
              onPress={() => setPhase('understand')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Why this happens"
            >
              <Text style={styles.carryOffer}>why this happens ›</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', height: 24, marginBottom: 4 },
  content: { flex: 1 },
  closure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  closeAsk: { alignItems: 'center', gap: 18 },
  closeLead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  closeX: { position: 'absolute', right: 24 },
  understandWrap: { flex: 1, alignSelf: 'stretch', paddingBottom: 8 },
  closeCarryWrap: { alignItems: 'center', gap: 22 },
  carryOffer: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: 'rgba(196, 178, 255, 0.85)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  levelRow: { flexDirection: 'row', gap: 12 },
  levelPill: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  levelLabel: { fontFamily: 'Poppins-Light', fontSize: 15, letterSpacing: 0.3 },
  closeCarry: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
