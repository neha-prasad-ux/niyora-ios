// The "when did your period start?" calendar sheet, reused everywhere a period
// date is picked (onboarding, the luteal card, the readiness page, My Soul) so
// she always sees the same Niyora calendar, never the OS one. Past logged starts
// are dotted on the grid so her history is visible right where she picks.
// Confirming reports that date, which rolls the predicted window forward.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import type { CalendarDay } from 'react-native-ui-datepicker';

import { BeginButton } from '@/components/begin-button';
import { colors } from '@/theme/colors';

const pad = (n: number) => String(n).padStart(2, '0');

// CalendarDay.date is a Dayjs at runtime; reduce it to the local YYYY-MM-DD so
// it can be matched against the logged history without pulling in dayjs here.
function dayToYmd(date: CalendarDay['date']): string {
  const value = date as unknown as { toDate?: () => Date };
  const js = value?.toDate ? value.toDate() : new Date(date as unknown as string);
  return `${js.getFullYear()}-${pad(js.getMonth() + 1)}-${pad(js.getDate())}`;
}

export function PeriodSheet({
  visible,
  onClose,
  onConfirm,
  markedDates = [],
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  markedDates?: string[];
}) {
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | null>(null);
  const base = useDefaultStyles('dark');
  const markedSet = useMemo(() => new Set(markedDates), [markedDates]);

  const pickerStyles = useMemo(
    () => ({
      ...base,
      today: { borderWidth: 0, backgroundColor: 'transparent' },
      selected: {
        backgroundColor: 'rgba(228, 233, 255, 0.96)',
        borderRadius: 999,
        shadowColor: 'rgb(206, 214, 255)',
        shadowOpacity: 0.9,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 0 },
      },
      selected_label: { color: '#1b1430', fontWeight: '600' as const },
    }),
    [base],
  );

  // Custom day cell so we can dot the days she has logged. The library still
  // applies the selected pill / today styling around this content, so we only
  // render the number (with the matching label colors) plus the dot.
  const components = useMemo(
    () => ({
      Day: (day: CalendarDay) => {
        const marked = markedSet.has(dayToYmd(day.date));
        return (
          <View style={dayStyles.cell}>
            <Text
              style={[
                dayStyles.label,
                !day.isCurrentMonth && dayStyles.labelOutside,
                day.isSelected && dayStyles.labelSelected,
              ]}
            >
              {day.text}
            </Text>
            {marked && !day.isSelected && <View style={dayStyles.dot} />}
          </View>
        );
      },
    }),
    [markedSet],
  );

  const handleClose = () => {
    setDate(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!date) return;
    onConfirm(date);
    setDate(null);
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
          <Text style={styles.title}>When did your period start?</Text>
          <View style={styles.calendarWrap}>
            <DateTimePicker
              mode="single"
              date={date ?? undefined}
              maxDate={today}
              components={components}
              onChange={({ date: d }) => {
                if (d) {
                  setDate(new Date(d as string | number | Date));
                  Haptics.selectionAsync();
                }
              }}
              styles={pickerStyles}
            />
          </View>
          <View style={styles.footer}>
            <BeginButton label="That's the day" disabled={!date} onPress={handleConfirm} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const dayStyles = StyleSheet.create({
  cell: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
  },
  labelOutside: {
    color: 'rgba(255, 255, 255, 0.28)',
  },
  labelSelected: {
    color: '#1b1430',
    fontFamily: 'Poppins-Medium',
  },
  dot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(214, 130, 170, 0.95)',
  },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    lineHeight: 28,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  calendarWrap: {
    width: '100%',
    maxWidth: 360,
    marginTop: 12,
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
  },
});
