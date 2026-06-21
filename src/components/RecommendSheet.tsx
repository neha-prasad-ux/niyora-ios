// "How are you feeling?" sheet. Two steps -- feeling (multi-select, up to 3),
// then duration -- both as chips. Fully on-device: reads the static recommender
// map and hands a technique back to the caller. No history, no soul-state,
// nothing leaves the phone.
//
// Feeling step: tap chips to toggle (first tap is primary, sets orb color and
// need pre-fill). A Continue button appears once at least one feeling is
// selected; tapping it advances to duration. Duration step auto-advances after
// a brief hold so the choice registers. A two-dot indicator tracks the step.

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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

// How long a tapped duration chip stays lit before the sheet closes.
const SELECT_HOLD_MS = 180;

export function RecommendSheet({ visible, onClose, onPick }: Props) {
  // Ordered selection; first element is primary (drives orb color + need pre-fill).
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  // Set when the user taps Continue; drives the step transition.
  const [confirmedFeelings, setConfirmedFeelings] = useState<readonly string[] | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = confirmedFeelings ? 'duration' : 'feeling';

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSelectedFeelings([]);
    setConfirmedFeelings(null);
    setPendingDuration(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleBack = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPendingDuration(null);
    setConfirmedFeelings(null);
    // selectedFeelings is preserved so the user sees their choices on return
  }, []);

  const handleFeeling = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedFeelings((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const handleContinue = useCallback(() => {
    if (selectedFeelings.length === 0) return;
    Haptics.selectionAsync();
    setConfirmedFeelings(selectedFeelings);
  }, [selectedFeelings]);

  const handleDuration = useCallback(
    (minutes: number) => {
      if (timer.current || !confirmedFeelings || confirmedFeelings.length === 0) return;
      Haptics.selectionAsync();
      setPendingDuration(minutes);
      timer.current = setTimeout(() => {
        timer.current = null;
        const rec = recommend(confirmedFeelings, minutes);
        reset();
        if (rec) onPick(rec);
      }, SELECT_HOLD_MS);
    },
    [confirmedFeelings, reset, onPick],
  );

  // Animate the chip set in on every step change, and slide the progress.
  const enter = useSharedValue(1);
  const prog = useSharedValue(0);
  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    prog.value = withTiming(step === 'duration' ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, enter, prog]);

  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateX: (1 - enter.value) * 18 }],
  }));
  const dot1Style = useAnimatedStyle(() => ({ opacity: 0.3 + (1 - prog.value) * 0.7 }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: 0.3 + prog.value * 0.7 }));

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
                onPress={handleBack}
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
              {step === 'feeling' ? 'How are you feeling?' : 'How much time do you have?'}
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

          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
          </View>

          <Animated.View style={[styles.chipWrap, enterStyle]}>
            {step === 'feeling'
              ? FEELINGS.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.label}
                    selected={selectedFeelings.includes(f.id)}
                    onPress={() => handleFeeling(f.id)}
                  />
                ))
              : DURATIONS.map((d) => (
                  <Chip
                    key={d.minutes}
                    label={d.label}
                    selected={pendingDuration === d.minutes}
                    onPress={() => handleDuration(d.minutes)}
                  />
                ))}
          </Animated.View>

          {step === 'feeling' && selectedFeelings.length > 0 && (
            <Pressable
              onPress={handleContinue}
              style={styles.continueButton}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const press = useSharedValue(0);

  useEffect(() => {
    if (selected) {
      scale.value = withSequence(
        withTiming(1.09, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 220, easing: Easing.out(Easing.sin) }),
      );
    }
  }, [selected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * (1 - press.value * 0.04) }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withTiming(1, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 140 });
        }}
        style={[styles.chip, selected && styles.chipSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={label}
      >
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Pressable>
    </Animated.View>
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
    marginBottom: 14,
  },
  headerSpacer: {
    width: 15,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(190, 170, 255, 0.9)',
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
  chipSelected: {
    borderColor: 'rgba(196, 178, 255, 0.65)',
    backgroundColor: 'rgba(150, 120, 235, 0.92)',
  },
  chipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  chipTextSelected: {
    fontFamily: 'Poppins-Medium',
    color: '#fff',
  },
  continueButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 36,
    paddingVertical: 13,
    borderRadius: 24,
    backgroundColor: 'rgba(150, 120, 235, 0.92)',
  },
  continueText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
