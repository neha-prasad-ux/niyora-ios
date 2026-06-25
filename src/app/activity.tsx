// Activity experience screen. Reached from the result deck when she taps BEGIN
// on an activity card. Shows the activity's living scene as a full-bleed
// background, then the tap-in experience for its card type (nudge / write /
// read / action). Ends on a brief closure that asks whether she'd recommend it,
// then sends her off with the calm, then home.
//
// The recommend answer isn't persisted yet -- that's the social/rating loop
// (V2). For now it's a soft beat that closes the moment warmly.

import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { CardScene } from '@/components/CardScene';
import { Orb } from '@/components/orb';
import { RingCelebration } from '@/components/RingCelebration';
import { Scrim } from '@/components/activity/ui';
import { MusicControl } from '@/components/activity/MusicControl';
import { CloseButton } from '@/components/CloseButton';
import { Pill } from '@/components/Pill';
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
  // Activities are calming and often done with eyes closed; don't let the
  // screen sleep partway through.
  useKeepAwake();
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
          {/* Movement activities get a soundtrack (with a track picker / mute),
              like a breathing session. Other activities stay quiet. */}
          {activity.modality === 'movement' ? <MusicControl /> : <View />}
          <CloseButton onPress={() => router.back()} />
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

// The soft Soul violet, used for the celebration burst + orb so the moment
// reads as the same app that lights up after a breath.
const CELEBRATE_HUE = 265;

// The graded felt-check we already use elsewhere, reused as the post-activity
// beat (a positive option, "light", is what makes it a real before/after).
const LEVELS = [
  { label: 'light', hue: 215 },
  { label: 'okay', hue: 260 },
  { label: 'heavy', hue: 335 },
];

// Closure: how do you feel now? -> would you recommend this? -> take the calm
// with you -> home. At the carry beat, if we know the feeling she came in with,
// we offer the matching Understand reframe ("why this happens") as a gentle,
// optional read before she leaves. (The felt level isn't stored yet; the delta
// wiring is #236.)
function Closure({ onClose, feeling }: { onClose: () => void; feeling?: PmsFeeling }) {
  const insets = useSafeAreaInsets();
  // Open on a brief celebration burst (light floods out from the Soul, the same
  // beat a breath earns), then settle into the felt-check. Starting on
  // 'celebrate' avoids flipping phase synchronously inside an effect.
  const [phase, setPhase] = useState<'celebrate' | 'feel' | 'ask' | 'carry' | 'understand'>(
    'celebrate',
  );

  // The celebration is a held moment, not a tap gate: a warm success haptic,
  // then it drifts on to "How are you feeling now?".
  useEffect(() => {
    if (phase !== 'celebrate') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => setPhase('feel'), 2300);
    return () => clearTimeout(t);
  }, [phase]);

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
        <View style={[styles.closeX, { top: insets.top + 8 }]}>
          <CloseButton onPress={onClose} />
        </View>
      ) : null}

      {phase === 'celebrate' ? (
        <>
          <RingCelebration hue={CELEBRATE_HUE} />
          <Animated.View entering={FadeIn.duration(500)} style={styles.celebrateCard}>
            <Orb size={120} hue={CELEBRATE_HUE} />
            <Text style={styles.celebrateLead}>Nicely done.</Text>
            <Text style={styles.celebrateSub}>You took a moment for yourself.</Text>
          </Animated.View>
        </>
      ) : phase === 'feel' ? (
        <View style={styles.closeAsk}>
          <Text style={styles.closeLead}>How are you feeling now?</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((l) => (
              <Pressable
                key={l.label}
                style={styles.levelPill}
                onPress={() => setPhase('ask')}
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
      ) : phase === 'ask' ? (
        <View style={styles.closeAsk}>
          <Text style={styles.closeQ}>Would you recommend this activity to a friend?</Text>
          <Text style={styles.closeSub}>Helps us recommend you better.</Text>
          <View style={styles.closeRow}>
            <Pill label="Yes" onPress={() => setPhase('carry')} />
            <Pill label="Not for me" variant="ghost" onPress={() => setPhase('carry')} />
          </View>
        </View>
      ) : phase === 'understand' && card ? (
        <>
          {/* Full-bleed Niyora gradient behind the reframe so it reads as its
              own calm page, not transparent text over the activity scene. Kept
              outside the padded wrap and pinned to the screen (only the
              horizontal padding is cancelled, top/bottom stay at 0) so the
              gradient's ambient blobs align to the real screen and cover it
              edge to edge. */}
          <View style={styles.understandBackdrop}>
            <BackgroundGradient />
          </View>
          <View style={[styles.understandWrap, { paddingTop: insets.top + 44 }]}>
            <UnderstandReadView card={card} onDone={onClose} />
          </View>
        </>
      ) : (
        <View style={styles.closeCarryWrap}>
          <Animated.Text entering={FadeIn.duration(600)} style={styles.closeCarry}>
            Take the calm with you.
          </Animated.Text>
          {card ? (
            <Pressable
              style={styles.whyCard}
              onPress={() => setPhase('understand')}
              accessibilityRole="button"
              accessibilityLabel={`Why this happens. ${card.title}`}
            >
              <View style={styles.whyCardText}>
                <Text style={styles.whyCardTitle}>Why this happens</Text>
                <Text style={styles.whyCardBody} numberOfLines={2}>
                  {card.title}
                </Text>
              </View>
              <SymbolView
                name="chevron.right"
                tintColor={colors.textSubtitle}
                size={14}
                weight="semibold"
              />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
    marginBottom: 4,
    // Lift above the activity body so the music picker popover isn't clipped
    // behind it.
    zIndex: 20,
  },
  content: { flex: 1 },
  closure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  celebrateCard: { alignItems: 'center', gap: 18 },
  celebrateLead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 24,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 8,
  },
  celebrateSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: -8,
  },
  closeAsk: { alignItems: 'center', gap: 16 },
  closeLead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  closeQ: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    lineHeight: 25,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  closeSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: -6,
  },
  closeRow: { flexDirection: 'row', gap: 12 },
  closeX: { position: 'absolute', right: 24 },
  understandWrap: { flex: 1, alignSelf: 'stretch', paddingBottom: 8 },
  understandBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // Closure has only horizontal padding, so top/bottom 0 already reach the
    // screen edges; cancel the 32px horizontal padding to bleed full width.
    left: -32,
    right: -32,
    backgroundColor: colors.backgroundBottom,
    overflow: 'hidden',
  },
  closeCarryWrap: { alignSelf: 'stretch', alignItems: 'center', gap: 22, paddingHorizontal: 8 },
  // "Why this happens" reads as one of the app's list cards (title + teaser +
  // chevron), not a faint text link.
  whyCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  whyCardText: { flex: 1, gap: 4 },
  whyCardTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  whyCardBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSubtitle,
  },
  levelRow: { flexDirection: 'row', gap: 12 },
  // The felt-check is a real answer, not a tertiary action: heavier label and a
  // more solid fill set it apart from the ghost buttons used elsewhere.
  levelPill: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
  },
  levelLabel: { fontFamily: 'Poppins-Medium', fontSize: 15, letterSpacing: 0.3 },
  closeCarry: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
