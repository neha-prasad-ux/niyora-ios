// A saved "later" move, opened from the Later list on the Moon home. Shows the
// exact task she parked, its label and the message/plan she or the moon drafted
//, so she can read it back, share it, or mark it done. Reached by tapping an
// item in <PlannedActions />, which passes the move's `at` (its stable key).

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { getPlannedActions, removePlannedAction, type PlannedAction } from '@/store/moment-plan';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export default function SavedTaskScreen() {
  const { at } = useLocalSearchParams<{ at?: string }>();
  const [item, setItem] = useState<PlannedAction | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getPlannedActions()
        .then((list) => {
          if (!alive) return;
          setItem(list.find((a) => a.at === at) ?? null);
          setLoaded(true);
        })
        .catch(() => {
          if (alive) setLoaded(true);
        });
      return () => {
        alive = false;
      };
    }, [at]),
  );

  const onShare = async () => {
    if (!item?.draft) return;
    Haptics.selectionAsync().catch(() => {});
    await Share.share({ message: item.draft }).catch(() => {});
  };

  const onDone = async () => {
    Haptics.selectionAsync().catch(() => {});
    if (item) await removePlannedAction(item.at).catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.back}>Done</Text>
          </Pressable>
          <Text style={styles.title}>Saved for later</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loaded && item == null ? (
            <Text style={styles.empty}>This one is no longer here.</Text>
          ) : item != null ? (
            <>
              <Text style={styles.label}>{item.label}</Text>
              {item.draft ? (
                <View style={styles.draftCard}>
                  <Text style={styles.draftText}>{item.draft}</Text>
                </View>
              ) : (
                <Text style={styles.noDraft}>You saved this move to come back to.</Text>
              )}
            </>
          ) : null}
        </ScrollView>

        {item != null && (
          <View style={styles.footer}>
            {item.draft ? (
              <BeginButton fullWidth label="Share" onPress={onShare} />
            ) : null}
            <Pressable onPress={onDone} style={styles.doneBtn} accessibilityRole="button" accessibilityLabel="Mark done">
              <Text style={styles.doneText}>Mark done</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  headerSpacer: { width: 44 },
  back: { fontFamily: fonts.medium, fontSize: fontScale.body, color: colors.textTertiary, width: 44 },
  title: { fontFamily: fonts.semibold, fontSize: fontScale.emphasis, color: colors.textPrimary },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl },
  label: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading,
    lineHeight: 32,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  draftCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  draftText: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 26,
    color: colors.textOnDark.primary,
  },
  noDraft: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textOnDark.secondary,
  },
  empty: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textOnDark.secondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  doneBtn: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  doneText: { fontFamily: fonts.medium, fontSize: fontScale.body, color: colors.textOnDark.secondary },
});
