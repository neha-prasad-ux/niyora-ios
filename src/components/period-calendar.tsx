// The shared moon calendar: a dark Niyora month grid where the chosen period
// glows as a range of full moons. Used by PeriodSheet (manage history) and by
// onboarding's first-period step, so the calendar looks identical everywhere.
// The parent decides which days glow (moonDays) and what a tap means.

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';
import type { CalendarDay } from 'react-native-ui-datepicker';

import { colors } from '@/theme/colors';

const pad = (n: number) => String(n).padStart(2, '0');
export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// CalendarDay.date is a Dayjs at runtime; reduce it to the local YYYY-MM-DD so
// it can be matched against the logged history without pulling in dayjs here.
function dayToYmd(date: CalendarDay['date']): string {
  const value = date as unknown as { toDate?: () => Date };
  const js = value?.toDate ? value.toDate() : new Date(date as unknown as string);
  return toYmd(js);
}

// Expand one start into the local calendar days it covers (start plus the
// following length - 1 days), as YYYY-MM-DD strings.
export function rangeDays(startYmd: string, length: number): string[] {
  const [y, m, d] = startYmd.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(toYmd(new Date(y, m - 1, d + i)));
  }
  return out;
}

export function PeriodCalendar({
  moonDays,
  onDayPress,
  maxDate,
}: {
  moonDays: Set<string>;
  onDayPress: (date: Date) => void;
  maxDate?: Date;
}) {
  const base = useDefaultStyles('dark');

  // We draw the moon ourselves inside each cell, so the library's own selected /
  // today backgrounds are switched off.
  const pickerStyles = useMemo(
    () => ({
      ...base,
      today: { borderWidth: 0, backgroundColor: 'transparent' },
      selected: { backgroundColor: 'transparent' },
      selected_label: { color: colors.textPrimary },
    }),
    [base],
  );

  const components = useMemo(
    () => ({
      Day: (day: CalendarDay) => {
        const isMoon = moonDays.has(dayToYmd(day.date));
        return (
          <View style={styles.cell}>
            <View style={[styles.pill, isMoon && styles.moon]}>
              <Text
                style={[
                  styles.label,
                  !day.isCurrentMonth && styles.labelOutside,
                  isMoon && styles.labelMoon,
                ]}
              >
                {day.text}
              </Text>
            </View>
          </View>
        );
      },
    }),
    [moonDays],
  );

  return (
    <DateTimePicker
      mode="single"
      maxDate={maxDate}
      components={components}
      onChange={({ date: d }) => {
        if (d) onDayPress(new Date(d as string | number | Date));
      }}
      styles={pickerStyles}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    minWidth: 34,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moon: {
    backgroundColor: 'rgba(228, 233, 255, 0.96)',
    shadowColor: 'rgb(206, 214, 255)',
    shadowOpacity: 0.9,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
  },
  labelOutside: {
    color: 'rgba(255, 255, 255, 0.28)',
  },
  labelMoon: {
    color: '#1b1430',
    fontFamily: 'Poppins-Medium',
  },
});
