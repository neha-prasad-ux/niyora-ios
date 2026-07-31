// The top-of-Train phase card: the cycle guidance that used to ride Today's
// coached-action card, moved here so Today stays the moon home and Train leads
// with where she is in the cycle.
//
//   · build phase  -> "Your PMS preparedness" + readiness fill, opening the
//                     PrepSheet (a map of what still helps).
//   · period phase -> "Period days · take it light", opening Reflect.
//   · pms phase     -> nothing (the in-the-moment Steady flow owns that window).
//
// Self-loading: it reads prefs + readiness + today's calm session on focus and
// derives the phase itself, so Train needs to know nothing about the cycle.

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { CycleBar } from '@/components/cycle-bar';
import { PrepSheet } from '@/components/prep-sheet';
import { derivePhaseBand, type PhaseBand } from '@/lib/phase-band';
import { preparednessScore, prepBand } from '@/lib/preparedness';
import { prepItemsFor, type PrepItem, type PrepItemKey } from '@/lib/prep-items';
import { getPmsPrefs } from '@/store/pms-prefs';
import { getReadiness, isReadyDone, todayYmd } from '@/store/pms-readiness';
import { getSessionsToday } from '@/store/session-history';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Loaded =
  | { mode: 'build'; band: PhaseBand; score: number; items: PrepItem[] }
  | { mode: 'period'; band: PhaseBand };

export function PrepCard({ onCalm }: { onCalm: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const now = new Date();
      Promise.all([getPmsPrefs(), getReadiness(todayYmd(now)), getSessionsToday()])
        .then(([prefs, readiness, sessionsToday]) => {
          if (!alive) return;
          const band = derivePhaseBand(prefs, now);
          if (band == null) {
            setData(null);
          } else if (band.current === 'build') {
            const calmDone = sessionsToday > 0;
            const checklistDone = isReadyDone(readiness.checks, calmDone, readiness.doneForToday);
            setData({
              mode: 'build',
              band,
              score: preparednessScore(readiness.checks, calmDone),
              items: prepItemsFor('build', { checklistDone, calmDone }),
            });
          } else if (band.current === 'period') {
            setData({ mode: 'period', band });
          } else {
            setData(null);
          }
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  if (data == null) return null;

  // Period days: a light card that opens Reflect. No sheet, no readiness fill.
  if (data.mode === 'period') {
    return (
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          router.push('/reflect' as Href);
        }}
        accessibilityRole="button"
        accessibilityLabel="Period days, take it light. Reflect on the cycle."
      >
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            Period days · take it light
          </Text>
          <View style={styles.bandWrap}>
            <Text style={styles.band} numberOfLines={1}>
              Reflect
            </Text>
            <SymbolView
              name="chevron.right"
              tintColor={colors.textOnDark.tertiary}
              size={12}
              weight="semibold"
            />
          </View>
        </View>
        <CycleBar band={data.band} periodEmphasized={false} />
      </Pressable>
    );
  }

  const onSelect = (key: PrepItemKey) => {
    setSheetOpen(false);
    Haptics.selectionAsync().catch(() => {});
    // 'build' is this very page — the sheet just closes.
    if (key === 'checklist') router.push('/pms-readiness' as Href);
    else if (key === 'calm') onCalm();
    else if (key === 'steady') router.push('/steady-yourself' as Href);
    else if (key === 'care') router.push('/periods-care' as Href);
  };

  return (
    <>
      <Pressable
        style={styles.card}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setSheetOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="See your PMS preparedness"
      >
        <View style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            Your PMS preparedness
          </Text>
          <View style={styles.bandWrap}>
            <Text style={styles.band} numberOfLines={1}>
              {prepBand(data.score)}
            </Text>
            <SymbolView
              name="chevron.right"
              tintColor={colors.textOnDark.tertiary}
              size={12}
              weight="semibold"
            />
          </View>
        </View>
        <CycleBar band={data.band} periodEmphasized={false} readiness={data.score} />
      </Pressable>

      <PrepSheet
        visible={sheetOpen}
        phaseLabel="Before PMS"
        band={prepBand(data.score)}
        items={data.items}
        onClose={() => setSheetOpen(false)}
        onSelect={onSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  bandWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textOnDark.secondary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  band: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.caption,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
});
