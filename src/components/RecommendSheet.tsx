// "How are you feeling?" sheet. Two steps -- feeling, then what you need -- both
// multi-select chips (up to 3, first tap is primary). Fully on-device: ranks the
// static library and hands a hero + ordered list back to the caller. No history,
// no soul-state, nothing leaves the phone.
//
// Feeling step: tap chips to toggle (first tap is primary, sets orb color and
// the need pre-fill). A Continue button appears once at least one feeling is
// selected; tapping it advances to the need step, which arrives pre-filled from
// the primary feeling so it's barely a gate. Time is not a question here -- it
// filters/scales downstream on the result page. A two-dot indicator tracks the
// step.

import { useCallback, useEffect, useState } from 'react';
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
import { Checklist } from '@/components/checklist';
import { Orb } from '@/components/orb';
import { Pill } from '@/components/Pill';
import {
  FEELINGS,
  NEEDS,
  defaultNeedFor,
  recommend,
  type Need,
  type RecResult,
} from '@/models/recommend';

// The Soul orb tints toward the primary selection so it reacts as she taps:
// warm for cozy/let-it-out, cool for calm/sleepy, etc.
// Feeling step now uses the shared Checklist (same rows as onboarding).
const FEELING_ITEMS = FEELINGS.map((f) => ({ id: f.id, label: f.label }));

const FEELING_HUE: Record<string, number> = {
  anxious: 220,
  irritable: 8,
  low: 275,
  foggy: 178,
  overwhelmed: 285,
};
const NEED_HUE: Record<Need, number> = {
  calm: 220,
  focused: 186,
  relaxed: 150,
  sleepy: 250,
  cozy: 28,
  'let-it-out': 295,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (result: RecResult) => void;
};

export function RecommendSheet({ visible, onClose, onPick }: Props) {
  // Ordered selection; first element is primary (drives orb color + need pre-fill).
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);
  // Set when the user taps Continue; drives the step transition.
  const [confirmedFeelings, setConfirmedFeelings] = useState<readonly string[] | null>(null);
  // Ordered need selection; pre-filled from the primary feeling on advance.
  const [selectedNeeds, setSelectedNeeds] = useState<Need[]>([]);

  const step = confirmedFeelings ? 'need' : 'feeling';

  // Orb hue follows the primary selection of the current step (need on step 2,
  // else feeling), falling back to the carried feeling, then the calm default.
  const orbHue =
    step === 'need'
      ? selectedNeeds[0]
        ? NEED_HUE[selectedNeeds[0]]
        : confirmedFeelings?.[0]
          ? FEELING_HUE[confirmedFeelings[0]]
          : undefined
      : selectedFeelings[0]
        ? FEELING_HUE[selectedFeelings[0]]
        : undefined;

  const reset = useCallback(() => {
    setSelectedFeelings([]);
    setConfirmedFeelings(null);
    setSelectedNeeds([]);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleBack = useCallback(() => {
    setConfirmedFeelings(null);
    setSelectedNeeds([]);
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
    // Pre-fill the need from the primary feeling so it's barely a gate.
    const seed = defaultNeedFor(selectedFeelings[0]);
    setSelectedNeeds(seed ? [seed] : []);
    setConfirmedFeelings(selectedFeelings);
  }, [selectedFeelings]);

  const handleNeed = useCallback((id: Need) => {
    Haptics.selectionAsync();
    setSelectedNeeds((prev) => {
      if (prev.includes(id)) return prev.filter((n) => n !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const handleDone = useCallback(() => {
    if (!confirmedFeelings || confirmedFeelings.length === 0) return;
    Haptics.selectionAsync();
    const result = recommend(confirmedFeelings, selectedNeeds);
    reset();
    if (result) onPick(result);
  }, [confirmedFeelings, selectedNeeds, reset, onPick]);

  // Animate the chip set in on every step change, and slide the progress.
  const enter = useSharedValue(1);
  const prog = useSharedValue(0);
  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    prog.value = withTiming(step === 'need' ? 1 : 0, {
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
            {step === 'need' ? (
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
              {step === 'feeling' ? 'How are you feeling?' : 'How do you want to feel?'}
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

          <View style={styles.orbWrap} pointerEvents="none">
            <Orb size={66} hue={orbHue} />
          </View>

          <View style={styles.dotsRow}>
            <Animated.View style={[styles.dot, dot1Style]} />
            <Animated.View style={[styles.dot, dot2Style]} />
          </View>

          {step === 'feeling' ? (
            <Animated.View style={[styles.listWrap, enterStyle]}>
              <Checklist
                items={FEELING_ITEMS}
                isChecked={(id) => selectedFeelings.includes(id)}
                onToggle={handleFeeling}
              />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.chipWrap, enterStyle]}>
              {NEEDS.map((n) => (
                <Chip
                  key={n.id}
                  label={n.label}
                  selected={selectedNeeds.includes(n.id)}
                  onPress={() => handleNeed(n.id)}
                />
              ))}
            </Animated.View>
          )}

          {step === 'feeling' && (
            <View style={styles.ctaRow}>
              <Pill
                label="Continue"
                onPress={handleContinue}
                disabled={selectedFeelings.length === 0}
              />
            </View>
          )}

          {step === 'need' && (
            <View style={styles.ctaRow}>
              <Pill label="Show me" onPress={handleDone} />
            </View>
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
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 104,
    marginBottom: 2,
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
  listWrap: {
    width: '100%',
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
  // Selected chip is a translucent lavender toggle with a bright rim -- a clear
  // "this is on", deliberately not the solid gradient of an action button.
  chipSelected: {
    borderColor: 'rgba(196, 178, 255, 0.85)',
    backgroundColor: 'rgba(150, 120, 235, 0.22)',
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
  ctaRow: {
    marginTop: 20,
    alignItems: 'center',
  },
});
