// The "when did your period start?" calendar sheet, reused by the luteal card
// and the readiness page. Confirming sets that date as the cycle start, which
// rolls the predicted window forward so PMS mode eases off until next time.
// Reuses the same dark date picker as onboarding cycle setup.

import { useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { useDefaultStyles } from 'react-native-ui-datepicker';

import { BeginButton } from '@/components/begin-button';
import { colors } from '@/theme/colors';

export function PeriodSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [date, setDate] = useState<Date | null>(null);
  const base = useDefaultStyles('dark');
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

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
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
            <BeginButton
              label="That's the day"
              disabled={!date}
              onPress={() => {
                if (date) onConfirm(date);
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
