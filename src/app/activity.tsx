// Activity experience screen. Reached from the result deck when she taps BEGIN
// on an activity card. Shows the activity's living scene as a full-bleed
// background, then the tap-in experience for its card type (nudge / write /
// read / action). Ends on a brief calm closure, then back home.
//
// The post-activity felt-delta + "recommend to a friend" loop is a later task;
// this screen ends at the closure with an onComplete seam it can hook into.

import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CardScene } from '@/components/CardScene';
import { Scrim } from '@/components/activity/ui';
import { NudgeView } from '@/components/activity/NudgeView';
import { WriteView } from '@/components/activity/WriteView';
import { ReadView } from '@/components/activity/ReadView';
import { ActionView } from '@/components/activity/ActionView';
import { colors } from '@/theme/colors';
import { getActivity } from '@/models/activities';
import type { RecCard } from '@/models/recommend';

const CLOSE_MS = 1500;

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const activity = id ? getActivity(id) : undefined;

  const [done, setDone] = useState(false);
  const onComplete = useCallback(() => setDone(true), []);

  // Unknown id: bounce straight back.
  useEffect(() => {
    if (!activity) router.back();
  }, [activity]);

  // After the closure beat, return home.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.back(), CLOSE_MS);
    return () => clearTimeout(t);
  }, [done]);

  if (!activity) return <View style={styles.root} />;

  // CardScene wants a RecCard; only activityId is read by sceneKeyFor.
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
      <View style={StyleSheet.absoluteFill}>
        <CardScene card={sceneCard} active />
      </View>
      <Scrim />

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

      {done ? (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.closure}
          pointerEvents="none"
        >
          <Text style={styles.closureText}>that's it</Text>
        </Animated.View>
      ) : null}
    </View>
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
    backgroundColor: 'rgba(8, 6, 14, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closureText: {
    fontFamily: 'Poppins-Light',
    fontSize: 26,
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
});
