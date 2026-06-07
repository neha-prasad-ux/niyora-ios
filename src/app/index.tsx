// Home screen. The pre-session info screen described in DESIGN.md.
// Anatomy: header, orb, technique name + subtitle, "Try a different one",
// Begin button anchored to the bottom safe area.

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Header } from '@/components/header';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { isBreathing, TECHNIQUES } from '@/models/techniques';

export default function HomeScreen() {
  // v1: all breathing techniques are selectable (no lock gating -- Wave 4 later).
  // Mindfulness stays hidden until its session port lands.
  const techniques = useMemo(
    () => TECHNIQUES.filter(isBreathing),
    []
  );
  const [index, setIndex] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const current = techniques[index];

  const handleTryDifferent = useCallback(() => {
    Haptics.selectionAsync();
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    const idx = techniques.findIndex((t) => t.id === id);
    if (idx !== -1) setIndex(idx);
    setPickerVisible(false);
  }, [techniques]);

  const handlePickerClose = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handleBegin = useCallback(() => {
    router.push({ pathname: '/session', params: { id: current.id } });
  }, [current.id]);

  const handleProfile = useCallback(() => {
    router.push('/my-soul');
  }, []);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Header
          onPressProfile={handleProfile}
        />

        <View style={styles.orbWrap} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
          <Orb size={220} />
        </View>

        <View
          style={styles.techniqueWrap}
          accessible={true}
          accessibilityLabel={`${current.name}. ${current.subtitle}. ${current.durationSeconds} seconds.`}
        >
          <Text style={[typography.techniqueName, { color: colors.textPrimary }]}>
            {current.name}
          </Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.textSubtitle, marginTop: 6, textAlign: 'center' },
            ]}
          >
            {current.subtitle} {'·'} {current.durationSeconds}s
          </Text>
        </View>

        <View style={styles.beginWrap}>
          <BeginButton onPress={handleBegin} />
        </View>

        <View style={styles.tryWrap}>
          <Pressable
            onPress={handleTryDifferent}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Choose a practice"
          >
            <Text style={[typography.tertiaryAction, { color: colors.textTertiary }]}>
              Try a different one
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePickerClose}
        statusBarTranslucent
      >
        <Pressable
          style={styles.pickerBackdrop}
          onPress={handlePickerClose}
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
                onPress={handlePickerClose}
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

            <Text style={styles.pickerSectionLabel}>Breathing</Text>

            {techniques.map((t) => (
              <Pressable
                key={t.id}
                style={styles.pickerRow}
                onPress={() => handlePickerSelect(t.id)}
                accessibilityRole="button"
                accessibilityLabel={`${t.name}. ${t.subtitle}`}
                accessibilityState={{ selected: t.id === current.id }}
              >
                <Text
                  style={[
                    styles.pickerRowName,
                    t.id === current.id && styles.pickerRowNameActive,
                  ]}
                >
                  {t.name}
                </Text>
                <Text style={styles.pickerRowSub}>{t.subtitle}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  orbWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  beginWrap: {
    alignItems: 'center',
    marginTop: 28,
  },
  tryWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },

  // picker overlay
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
  pickerRowNameActive: {
    color: colors.textPrimary,
    fontFamily: 'Poppins-Medium',
  },
  pickerRowSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
});
