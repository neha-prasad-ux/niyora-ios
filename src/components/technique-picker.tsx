// The full practice list as a bottom sheet: breathing on top, mindfulness
// below, one tap starts the session. Extracted from the retired v2 home so the
// Grow tab's "browse all techniques" path keeps the exact same sheet.

import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';

import { colors } from '@/theme/colors';
import { isBreathing, isMindfulness, TECHNIQUES, type Technique } from '@/models/techniques';

type TechniquePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (techniqueId: string) => void;
};

export function TechniquePicker({ visible, onClose, onSelect }: TechniquePickerProps) {
  const breathing = useMemo(() => TECHNIQUES.filter(isBreathing), []);
  const mindful = useMemo(() => TECHNIQUES.filter(isMindfulness), []);
  const { height } = useWindowDimensions();

  const renderRow = (t: Technique) => (
    <Pressable
      key={t.id}
      style={styles.pickerRow}
      onPress={() => onSelect(t.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}. ${t.subtitle}`}
    >
      <Text style={styles.pickerRowName}>{t.name}</Text>
      <Text style={styles.pickerRowSub}>{t.subtitle}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.pickerBackdrop}
        onPress={onClose}
        accessibilityLabel="Close practice picker"
        accessibilityRole="button"
      >
        {/* Inner Pressable intercepts touches on the sheet so they don't close the modal */}
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          {/* Gradient backdrop so the practice list matches the app's look
              instead of a flat dark panel. Clipped to the sheet's rounded
              top corners via overflow: 'hidden'. */}
          <LinearGradient
            colors={['#1b1430', '#0e0b14', colors.backgroundBottom]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.pickerHeaderRow}>
            <Text style={styles.pickerTitle}>Choose a practice</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <SymbolView name="xmark" tintColor={colors.textSubtitle} size={15} weight="medium" />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: height * 0.6 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.pickerSectionLabel}>Breathing</Text>
            {breathing.map(renderRow)}
            <Text style={[styles.pickerSectionLabel, styles.pickerSectionSpaced]}>
              Mindfulness
            </Text>
            {mindful.map(renderRow)}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.backgroundBottom,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 22,
    paddingBottom: 44,
    // Clip the gradient backdrop to the rounded top corners.
    overflow: 'hidden',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 22,
  },
  pickerTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  pickerSectionLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textTertiary,
    paddingHorizontal: 24,
    marginBottom: 6,
  },
  pickerSectionSpaced: {
    marginTop: 18,
  },
  pickerRow: {
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  pickerRowName: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
  },
  pickerRowSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
});
