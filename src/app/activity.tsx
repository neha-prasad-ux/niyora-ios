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
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { CardScene } from '@/components/CardScene';
import { Scrim, Pill } from '@/components/activity/ui';
import { NudgeView } from '@/components/activity/NudgeView';
import { WriteView } from '@/components/activity/WriteView';
import { ReadView } from '@/components/activity/ReadView';
import { ActionView } from '@/components/activity/ActionView';
import { colors } from '@/theme/colors';
import { getActivity } from '@/models/activities';
import type { RecCard } from '@/models/recommend';

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = id ? getActivity(id) : undefined;

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

      {done ? <Closure onClose={() => router.back()} /> : null}
    </View>
  );
}

// Closure: a soft "would you recommend this?", then "take the calm with you",
// then home.
function Closure({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<'ask' | 'carry'>('ask');
  useEffect(() => {
    if (phase !== 'carry') return;
    const t = setTimeout(onClose, 1800);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  return (
    <Animated.View entering={FadeIn.duration(500)} style={styles.closure}>
      {phase === 'ask' ? (
        <View style={styles.closeAsk}>
          <Text style={styles.closeQ}>Would you recommend this to a friend?</Text>
          <View style={styles.closeRow}>
            <Pill label="Yes" onPress={() => setPhase('carry')} />
            <Pill label="Not for me" variant="ghost" onPress={() => setPhase('carry')} />
          </View>
        </View>
      ) : (
        <Animated.Text entering={FadeIn.duration(600)} style={styles.closeCarry}>
          Take the calm with you.
        </Animated.Text>
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
  closeAsk: { alignItems: 'center', gap: 22 },
  closeQ: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  closeRow: { flexDirection: 'row', gap: 12 },
  closeCarry: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
