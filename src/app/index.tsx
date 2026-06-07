// Home screen. The pre-session info screen described in DESIGN.md.
// Anatomy: header, orb, technique name + subtitle, "Try a different one",
// Begin button anchored to the bottom safe area.

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Header } from '@/components/header';
import { Orb } from '@/components/orb';
import { QuickCheckSheet, type QuickCheckResult } from '@/components/QuickCheckSheet';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import {
  getTechnique,
  isBreathing,
  isMindfulness,
  TECHNIQUES,
  type Technique,
} from '@/models/techniques';
import { recommend, type Recommendation } from '@/lib/recommendation';
import { getMoodRecords } from '@/store/mood-history';
import { getCheckInRecords } from '@/store/checkin-history';

export default function HomeScreen() {
  // v1: all techniques are selectable (no lock gating -- Wave 4 later).
  // Grouped breathing + mindfulness, both playable.
  const breathing = useMemo(() => TECHNIQUES.filter(isBreathing), []);
  const mindful = useMemo(() => TECHNIQUES.filter(isMindfulness), []);
  const [selectedId, setSelectedId] = useState(breathing[0].id);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [checkSheetVisible, setCheckSheetVisible] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const { height } = useWindowDimensions();

  const current = getTechnique(selectedId) ?? breathing[0];

  // true only when the displayed technique is an active recommendation (not user-overridden).
  const isRecommended =
    recommendation !== null &&
    recommendation.source !== 'fallback' &&
    recommendation.techniqueId === selectedId;

  // rounds override from the recommendation (null = use technique default).
  const roundsOverride = recommendation?.rounds ?? null;

  // Displayed duration: adjusted when a rounds override is in effect.
  const displayDurationSeconds = useMemo(() => {
    if (roundsOverride == null) return current.durationSeconds;
    if (!isBreathing(current)) return current.durationSeconds;
    const perRound = current.phases.reduce((s, p) => s + p.duration, 0);
    return perRound * roundsOverride;
  }, [roundsOverride, current]);

  const displayMinutes = Math.max(1, Math.round(displayDurationSeconds / 60));

  // Load a recommendation from mood + check-in history on mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [moods, checkins] = await Promise.all([getMoodRecords(), getCheckInRecords()]);
      if (cancelled) return;
      const rec = recommend({ moods, checkins, sessions: [] });
      if (rec.source !== 'fallback') {
        setSelectedId(rec.techniqueId);
        setRecommendation(rec);
      }
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTryDifferent = useCallback(() => {
    Haptics.selectionAsync();
    setPickerVisible(true);
  }, []);

  const handlePickerSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    setSelectedId(id);
    setRecommendation(null); // user made a manual choice; clear suggestion context
    setPickerVisible(false);
  }, []);

  const handlePickerClose = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handleOpenCheck = useCallback(() => {
    Haptics.selectionAsync();
    setCheckSheetVisible(true);
  }, []);

  const handleCheckResult = useCallback((result: QuickCheckResult) => {
    setCheckSheetVisible(false);
    if (!result.emotion && !result.targetSeconds) return;
    Promise.all([getMoodRecords(), getCheckInRecords()])
      .then(([moods, checkins]) => {
        const rec = recommend({
          moods,
          checkins,
          sessions: [],
          emotion: result.emotion ?? undefined,
          targetSeconds: result.targetSeconds ?? undefined,
        });
        setSelectedId(rec.techniqueId);
        setRecommendation(rec);
      })
      .catch(() => {});
  }, []);

  const handleBegin = useCallback(() => {
    const params: Record<string, string> = { id: current.id };
    if (roundsOverride != null) params.rounds = String(roundsOverride);
    router.push({ pathname: '/session', params });
  }, [current.id, roundsOverride]);

  const handleProfile = useCallback(() => {
    router.push('/my-soul');
  }, []);

  const renderRow = (t: Technique) => (
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
  );

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
          accessibilityLabel={`${isRecommended ? 'Suggested for you. ' : ''}${current.name}. ${current.subtitle}. ${displayDurationSeconds} seconds.`}
        >
          {isRecommended && (
            <Text style={styles.suggestionLabel} accessibilityElementsHidden={true}>
              Suggested for you {'·'} {displayMinutes} min
            </Text>
          )}
          <Text style={[typography.techniqueName, { color: colors.textPrimary }]}>
            {current.name}
          </Text>
          <Text
            style={[
              typography.subtitle,
              { color: colors.textSubtitle, marginTop: 6, textAlign: 'center' },
            ]}
          >
            {current.subtitle} {'·'} {displayDurationSeconds}s
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
          <Pressable
            onPress={handleOpenCheck}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quick check: what do you need"
            style={styles.checkLink}
          >
            <Text style={styles.checkLinkLabel}>what do you need?</Text>
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

            <ScrollView
              style={{ maxHeight: height * 0.6 }}
              showsVerticalScrollIndicator={false}
            >
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

      {checkSheetVisible && <QuickCheckSheet onDone={handleCheckResult} />}
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
  suggestionLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(150, 110, 220, 0.65)',
    marginBottom: 6,
    textAlign: 'center',
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
  checkLink: {
    marginTop: 10,
  },
  checkLinkLabel: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.32)',
    letterSpacing: 0.2,
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
