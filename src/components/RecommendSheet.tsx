// "Recommend me based on how I feel" sheet. Two quick steps -- feeling, then
// duration -- both as chips. Fully on-device: it only reads the static
// recommender map and hands a technique back to the caller. No history, no
// soul-state, nothing leaves the phone.

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import {
  DURATIONS,
  FEELINGS,
  recommend,
  type Recommendation,
} from '@/models/recommend';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (rec: Recommendation) => void;
};

export function RecommendSheet({ visible, onClose, onPick }: Props) {
  const [feelingId, setFeelingId] = useState<string | null>(null);

  const reset = useCallback(() => setFeelingId(null), []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFeeling = useCallback((id: string) => {
    Haptics.selectionAsync();
    setFeelingId(id);
  }, []);

  const handleDuration = useCallback(
    (minutes: number) => {
      if (!feelingId) return;
      const rec = recommend(feelingId, minutes);
      if (!rec) return;
      Haptics.selectionAsync();
      reset();
      onPick(rec);
    },
    [feelingId, reset, onPick],
  );

  const step = feelingId ? 'duration' : 'feeling';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={handleClose}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['#1b1430', '#0e0b14', colors.backgroundBottom]}
            locations={[0, 0.55, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.headerRow}>
            {step === 'duration' ? (
              <Pressable
                onPress={reset}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back to feelings"
              >
                <SymbolView
                  name="chevron.left"
                  tintColor={colors.textSubtitle}
                  size={15}
                  weight="medium"
                />
              </Pressable>
            ) : (
              <View style={styles.headerSpacer} />
            )}
            <Text style={styles.title}>
              {step === 'feeling' ? "What's here right now?" : 'How long?'}
            </Text>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <SymbolView
                name="xmark"
                tintColor={colors.textSubtitle}
                size={15}
                weight="medium"
              />
            </Pressable>
          </View>

          {step === 'feeling' ? (
            <View style={styles.chipWrap}>
              {FEELINGS.map((f) => (
                <Chip key={f.id} label={f.label} onPress={() => handleFeeling(f.id)} />
              ))}
            </View>
          ) : (
            <View style={styles.chipWrap}>
              {DURATIONS.map((d) => (
                <Chip
                  key={d.minutes}
                  label={d.label}
                  onPress={() => handleDuration(d.minutes)}
                />
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundBottom,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 22,
    paddingBottom: 44,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 22,
  },
  headerSpacer: {
    width: 15,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 24,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  chipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
