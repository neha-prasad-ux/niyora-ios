// Activity experience screen. Reached from the result deck when she taps an
// activity card. Shows the activity's living scene as a full-bleed background,
// then the tap-in experience for its card type (nudge / write / read / action).
// Ends on the shared close (PostSessionMood): a "Nicely done" burst, then "I
// feel good" or "Reflect", then home -- the same ending a breath gets.

import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';

import { BackgroundGradient } from '@/components/background-gradient';
import { CardScene } from '@/components/CardScene';
import { Scrim } from '@/components/activity/ui';
import { MusicControl } from '@/components/activity/MusicControl';
import { CloseButton } from '@/components/CloseButton';
import { NudgeView } from '@/components/activity/NudgeView';
import { WriteView } from '@/components/activity/WriteView';
import { ReadView } from '@/components/activity/ReadView';
import { ActionView } from '@/components/activity/ActionView';
import { PostSessionMood } from '@/components/PostSessionMood';
import { colors } from '@/theme/colors';
import { getActivity, isPmsFeeling } from '@/models/activities';
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

      {done ? (
        <View style={styles.closureBackdrop}>
          <PostSessionMood
            variant="activity"
            techniqueId={`activity:${activity.id}`}
            feeling={pmsFeeling}
            earnedTier={null}
            onDone={() => router.back()}
          />
        </View>
      ) : null}
    </View>
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
  // A near-opaque settle behind the shared close, so the activity scene fades
  // away while the "Nicely done" burst owns the screen.
  closureBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.94)',
  },
});
