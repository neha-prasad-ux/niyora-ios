// The "later" list on the Moon home: moves she parked from the flow, so they
// come back to her here (this is the Today surface the moment-plan store was
// waiting for). Each can get a reminder time; ticking one marks it done. Hidden
// when there is nothing parked, so it never clutters a clean home.
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import {
  getPlannedActions,
  setPlannedReminder,
  removePlannedAction,
  type PlannedAction,
} from '@/store/moment-plan';
import { scheduleActionReminder } from '@/lib/notifications';
import { recordLight } from '@/store/light-ledger';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';

// The when-choices, matching the flow's own reminder chooser.
function atClock(hour: number, minute: number, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
const PRESETS: { label: string; at: () => Date }[] = [
  { label: 'In 20 min', at: () => new Date(Date.now() + 20 * 60 * 1000) },
  { label: 'This evening', at: () => atClock(19, 0) },
  { label: 'Tomorrow', at: () => atClock(9, 0, 1) },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

export function PlannedActions({ onCount }: { onCount?: (n: number) => void }) {
  const [items, setItems] = useState<PlannedAction[]>([]);
  const [activeAt, setActiveAt] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    getPlannedActions()
      .then((r) => {
        if (alive) setItems(r);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  useFocusEffect(load);

  // Report the live count up so the home can hide the "waiting for you" divider
  // the instant the last parked move is ticked off (Neha 2026-08-02). Runs before
  // the empty-return below, so onCount(0) still fires when the list clears.
  useEffect(() => {
    onCount?.(items.length);
  }, [items, onCount]);

  if (items.length === 0) return null;

  const setTime = async (a: PlannedAction, when: () => Date) => {
    Haptics.selectionAsync().catch(() => {});
    const date = when();
    await scheduleActionReminder(`You planned to: ${a.label}`, date).catch(() => {});
    await setPlannedReminder(a.at, date.toISOString()).catch(() => {});
    setActiveAt(null);
    getPlannedActions().then(setItems).catch(() => {});
  };
  const markDone = async (a: PlannedAction) => {
    Haptics.selectionAsync().catch(() => {});
    await removePlannedAction(a.at).catch(() => {});
    // Following through on a parked move brightens the moon (the calm reward),
    // never confetti, the one celebration stays the moment-flow finish (Neha
    // 2026-08-02, "moon-bloom, not graffiti").
    recordLight('apply').catch(() => {});
    getPlannedActions().then(setItems).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Waiting for you</Text>
      {items.map((a) => (
        <View key={a.at} style={styles.item}>
          <View style={styles.row}>
            <Pressable onPress={() => markDone(a)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Done: ${a.label}`}>
              <SymbolView name="circle" size={18} tintColor={colors.textOnDark.faint} />
            </Pressable>
            <Pressable
              style={styles.labelWrap}
              onPress={() => router.push({ pathname: '/saved-task', params: { at: a.at } })}
              accessibilityRole="button"
              accessibilityLabel={`Open: ${a.label}`}
            >
              <Text style={styles.label} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
            {a.remindAt ? (
              <View style={styles.time}>
                <SymbolView name="bell.fill" size={12} tintColor={colors.textOnDark.secondary} />
                <Text style={styles.timeText}>{fmtTime(a.remindAt)}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => setActiveAt((cur) => (cur === a.at ? null : a.at))}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Add a reminder time"
              >
                <Text style={styles.addTime}>Add time</Text>
              </Pressable>
            )}
          </View>
          {activeAt === a.at && !a.remindAt && (
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Pressable key={p.label} onPress={() => setTime(a, p.at)} style={styles.chip} accessibilityRole="button" accessibilityLabel={p.label}>
                  <Text style={styles.chipText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', marginTop: spacing.lg, gap: spacing.sm },
  header: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textOnDark.faint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  item: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  labelWrap: { flex: 1 },
  label: { fontFamily: fonts.regular, fontSize: fontScale.body, color: colors.textOnDark.primary },
  time: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  timeText: { fontFamily: fonts.regular, fontSize: fontScale.caption, color: colors.textOnDark.secondary },
  addTime: { fontFamily: fonts.regular, fontSize: fontScale.caption, color: colors.textOnDark.secondary, letterSpacing: 0.3 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingLeft: 30 },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipText: { fontFamily: fonts.regular, fontSize: fontScale.caption, color: colors.textOnDark.primary },
});
