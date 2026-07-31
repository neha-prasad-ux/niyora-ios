// The "when did your period start?" calendar sheet, reused everywhere a period
// date is picked (onboarding's own sheet aside: the readiness page, My Soul) so
// she always sees the same Niyora calendar, never the OS one.
//
// Tapping a day she has not logged starts a new period: that day plus the next
// few (periodLength) light up as the glowing moon range, and "Save period"
// commits the start. Tapping any day inside a logged period selects that whole
// period and the button turns into "Remove period". A small length control lets
// her set how many days a period is; it is one shared value and only changes how
// the calendar draws the range, never the predicted window (which reads starts).

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BeginButton } from '@/components/begin-button';
import { PeriodCalendar, rangeDays, toYmd } from '@/components/period-calendar';
import {
  DEFAULT_CYCLE_LENGTH,
  DEFAULT_PERIOD_LENGTH,
  MAX_CYCLE_LENGTH,
  MAX_PERIOD_LENGTH,
  MIN_CYCLE_LENGTH,
  MIN_PERIOD_LENGTH,
} from '@/store/pms-prefs';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';

export function PeriodSheet({
  visible,
  onClose,
  onConfirm,
  onRemove,
  onPeriodLengthChange,
  onCycleLengthChange,
  markedDates = [],
  periodLength = DEFAULT_PERIOD_LENGTH,
  cycleLength = DEFAULT_CYCLE_LENGTH,
  title = 'When did your period start?',
  confirmExisting = false,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  // Sheet heading; overridable per caller.
  title?: string;
  // When true, Save can confirm an already-marked date (no fresh tap needed), so
  // re-opening with a date pre-filled still lets you proceed. Onboarding only.
  confirmExisting?: boolean;
  // Tapping a logged period and confirming removal; absent callers keep the
  // sheet add-only (no period is removable).
  onRemove?: (startYmd: string) => void;
  // Nudging the shared period length; absent callers hide the control.
  onPeriodLengthChange?: (length: number) => void;
  // Nudging the cycle length; absent callers hide the control.
  onCycleLengthChange?: (length: number) => void;
  markedDates?: string[];
  periodLength?: number;
  cycleLength?: number;
}) {
  const today = useMemo(() => new Date(), []);
  // The day she just tapped to start a new (unsaved) period, and the logged
  // start she tapped to remove. Only one is ever set at a time.
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [armedStart, setArmedStart] = useState<string | null>(null);

  // Map every day to the logged start that owns it, so a tap anywhere in a
  // period resolves to that period.
  const startByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const start of markedDates) {
      for (const day of rangeDays(start, periodLength)) map.set(day, start);
    }
    return map;
  }, [markedDates, periodLength]);

  // Every day that should glow: the saved periods plus the pending one.
  const moonDays = useMemo(() => {
    const set = new Set(startByDay.keys());
    if (pendingStart) for (const day of rangeDays(toYmd(pendingStart), periodLength)) set.add(day);
    return set;
  }, [startByDay, pendingStart, periodLength]);

  const reset = () => {
    setPendingStart(null);
    setArmedStart(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // The date Save will commit: a fresh tap, or (when allowed) the already-marked
  // date so re-opening a pre-filled sheet can still proceed.
  const existingStart =
    confirmExisting && markedDates.length > 0 ? new Date(`${markedDates[0]}T00:00:00`) : null;
  const effectiveStart = pendingStart ?? existingStart;

  const handleConfirm = () => {
    if (!effectiveStart) return;
    onConfirm(effectiveStart);
    reset();
  };

  const handleRemove = () => {
    if (!armedStart) return;
    onRemove?.(armedStart);
    reset();
  };

  const handleTap = (d: string | number | Date) => {
    const tapped = new Date(d);
    const owning = startByDay.get(toYmd(tapped));
    if (owning && onRemove) {
      setArmedStart(owning);
      setPendingStart(null);
    } else {
      setPendingStart(tapped);
      setArmedStart(null);
    }
    Haptics.selectionAsync();
  };

  const adjustLength = (delta: number) => {
    const next = Math.min(MAX_PERIOD_LENGTH, Math.max(MIN_PERIOD_LENGTH, periodLength + delta));
    if (next === periodLength) return;
    Haptics.selectionAsync();
    onPeriodLengthChange?.(next);
  };

  const adjustCycle = (delta: number) => {
    const next = Math.min(MAX_CYCLE_LENGTH, Math.max(MIN_CYCLE_LENGTH, cycleLength + delta));
    if (next === cycleLength) return;
    Haptics.selectionAsync();
    onCycleLengthChange?.(next);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['#2b2142', '#181226', '#0e0b14']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.calendarWrap}>
            <PeriodCalendar moonDays={moonDays} onDayPress={handleTap} maxDate={today} />
          </View>

          {onPeriodLengthChange && (
            <View style={styles.lengthRow}>
              <Text style={styles.lengthLabel}>Period length</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustLength(-1)}
                  hitSlop={8}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Shorter period"
                >
                  <SymbolView name="minus" tintColor={colors.textPrimary} size={14} weight="medium" />
                </Pressable>
                <Text style={styles.stepperValue}>{periodLength} days</Text>
                <Pressable
                  onPress={() => adjustLength(1)}
                  hitSlop={8}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Longer period"
                >
                  <SymbolView name="plus" tintColor={colors.textPrimary} size={14} weight="medium" />
                </Pressable>
              </View>
            </View>
          )}

          {onCycleLengthChange && (
            <View style={styles.lengthRow}>
              <Text style={styles.lengthLabel}>Cycle length</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => adjustCycle(-1)}
                  hitSlop={8}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Shorter cycle"
                >
                  <SymbolView name="minus" tintColor={colors.textPrimary} size={14} weight="medium" />
                </Pressable>
                <Text style={styles.stepperValue}>{cycleLength} days</Text>
                <Pressable
                  onPress={() => adjustCycle(1)}
                  hitSlop={8}
                  style={styles.stepperBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Longer cycle"
                >
                  <SymbolView name="plus" tintColor={colors.textPrimary} size={14} weight="medium" />
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.footer}>
            {armedStart ? (
              <Pressable
                onPress={handleRemove}
                style={styles.removeBtn}
                accessibilityRole="button"
                accessibilityLabel="Remove this period"
              >
                <Text style={styles.removeLabel}>Remove period</Text>
              </Pressable>
            ) : effectiveStart ? (
              <BeginButton fullWidth label="Save period" onPress={handleConfirm} />
            ) : markedDates.length > 0 ? (
              // A period is saved and nothing new is selected: the sheet's job
              // is done, so the button says so. Without this the save left a
              // disabled button behind and the sheet read as stuck.
              <BeginButton fullWidth label="Done" onPress={handleClose} />
            ) : (
              <BeginButton fullWidth label="Save period" disabled onPress={handleConfirm} />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.light,
    fontSize: fontScale.title,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: spacing.sm,
  },
  calendarWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: spacing.md,
  },
  lengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    marginTop: spacing.lg,
  },
  lengthLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textPrimary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    minWidth: 72,
    textAlign: 'center',
  },
  footer: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  removeBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: 44,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(214, 130, 170, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: 'rgba(232, 154, 184, 0.96)',
  },
});
