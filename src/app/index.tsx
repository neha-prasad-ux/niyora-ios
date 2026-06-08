// Home screen. The pre-session info screen described in DESIGN.md.
//
// Two states, gated on whether the user has ever completed a practice:
// - First time (0 sessions): orb + Box Breath + Begin. One tap, no choices.
// - Returning (>=1 session): orb + a "suggest based on how I'm feeling" card
//   (primary Begin opens the feeling flow) + a quiet "Choose from the list".
//   No standalone default technique, so there is exactly one Begin on screen.

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
import { RecommendSheet } from '@/components/RecommendSheet';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import type { Recommendation } from '@/models/recommend';
import {
  isBreathing,
  isMindfulness,
  TECHNIQUES,
  type Technique,
} from '@/models/techniques';
import {
  getCheckInRecords,
  todayCheckIn,
  type CheckInRecord,
  type CheckInLevel,
} from '@/store/checkin-history';
import { getSessionCount } from '@/store/session-history';

const ORB_SIZE = 220;
const ORB_CANVAS = Math.round(ORB_SIZE * 1.8); // 396
const ORB_RIPPLE_INSET = (ORB_CANVAS - ORB_SIZE) / 2; // 88

const LEVEL_WEIGHT: Record<CheckInLevel, number> = { light: 0, okay: 1, heavy: 2 };

function yesterdayCheckIn(records: CheckInRecord[]): CheckInRecord | null {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yStr = d.toDateString();
  for (let i = records.length - 1; i >= 0; i--) {
    if (new Date(records[i].recordedAt).toDateString() === yStr) return records[i];
  }
  return null;
}

function soulInsight(records: CheckInRecord[]): string | null {
  const today = todayCheckIn(records);
  const yesterday = yesterdayCheckIn(records);
  if (!today || !yesterday) return null;
  const diff = LEVEL_WEIGHT[today.level] - LEVEL_WEIGHT[yesterday.level];
  if (diff > 0) return 'carrying more than yesterday';
  if (diff < 0) return 'lighter than yesterday, nice';
  return 'feeling steady today';
}

export default function HomeScreen() {
  // v1: all techniques are selectable (no lock gating -- Wave 4 later).
  const breathing = useMemo(() => TECHNIQUES.filter(isBreathing), []);
  const mindful = useMemo(() => TECHNIQUES.filter(isMindfulness), []);
  const { height } = useWindowDimensions();

  // The first-run default. Box Breath is the calm starting point.
  const firstRunTechnique = breathing[0];

  const [pickerVisible, setPickerVisible] = useState(false);
  const [recommendVisible, setRecommendVisible] = useState(false);

  // undefined while we read history; false = first-timer, true = returning.
  const [practiced, setPracticed] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getSessionCount()
      .then((n) => alive && setPracticed(n > 0))
      .catch(() => alive && setPracticed(false));
    return () => {
      alive = false;
    };
  }, []);

  const [checkInRecords, setCheckInRecords] = useState<CheckInRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCheckInRecords().then((r) => {
        if (active) setCheckInRecords(r);
      }).catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const tapScale = useSharedValue(1);
  const rippleScale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const insightOpacity = useSharedValue(0);
  const insightTranslateY = useSharedValue(6);

  const tapAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tapScale.value }],
  }));
  const rippleAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));
  const insightAnimStyle = useAnimatedStyle(() => ({
    opacity: insightOpacity.value,
    transform: [{ translateY: insightTranslateY.value }],
  }));

  const insight = soulInsight(checkInRecords);

  const handleTryDifferent = useCallback(() => {
    Haptics.selectionAsync();
    setPickerVisible(true);
  }, []);

  // Choosing from the list starts that practice immediately -- there is no
  // separate Begin to confirm it on the returning-user screen.
  const handlePickerSelect = useCallback((id: string) => {
    Haptics.selectionAsync();
    setPickerVisible(false);
    router.push({ pathname: '/session', params: { id } });
  }, []);

  const handlePickerClose = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handleBegin = useCallback(() => {
    router.push({ pathname: '/session', params: { id: firstRunTechnique.id } });
  }, [firstRunTechnique.id]);

  const handleRecommendOpen = useCallback(() => {
    Haptics.selectionAsync();
    setRecommendVisible(true);
  }, []);

  const handleRecommendClose = useCallback(() => {
    setRecommendVisible(false);
  }, []);

  const handleRecommendPick = useCallback((rec: Recommendation) => {
    setRecommendVisible(false);
    const params: Record<string, string> = {
      id: rec.techniqueId,
      feeling: rec.feelingId,
    };
    if (rec.rounds != null) params.rounds = String(rec.rounds);
    router.push({ pathname: '/session', params });
  }, []);

  const handleProfile = useCallback(() => {
    router.push('/my-soul');
  }, []);

  const handleOrbPress = useCallback(() => {
    Haptics.selectionAsync();
    tapScale.value = withSequence(
      withTiming(0.93, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(1.08, { duration: 220, easing: Easing.out(Easing.sin) }),
      withTiming(1.0, { duration: 380, easing: Easing.inOut(Easing.sin) })
    );
    rippleScale.value = 1;
    rippleOpacity.value = 0.5;
    rippleScale.value = withTiming(1.85, { duration: 680, easing: Easing.out(Easing.cubic) });
    rippleOpacity.value = withTiming(0, { duration: 680, easing: Easing.out(Easing.cubic) });
    if (insight) {
      insightOpacity.value = 0;
      insightTranslateY.value = 6;
      insightOpacity.value = withSequence(
        withTiming(1, { duration: 340 }),
        withDelay(2600, withTiming(0, { duration: 480 }))
      );
      insightTranslateY.value = withSequence(
        withTiming(0, { duration: 340 }),
        withDelay(2600, withTiming(4, { duration: 480 }))
      );
    }
  }, [insight, tapScale, rippleScale, rippleOpacity, insightOpacity, insightTranslateY]);

  const renderRow = (t: Technique) => (
    <Pressable
      key={t.id}
      style={styles.pickerRow}
      onPress={() => handlePickerSelect(t.id)}
      accessibilityRole="button"
      accessibilityLabel={`${t.name}. ${t.subtitle}`}
    >
      <Text style={styles.pickerRowName}>{t.name}</Text>
      <Text style={styles.pickerRowSub}>{t.subtitle}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <Header onPressProfile={handleProfile} />

        <Pressable
          style={styles.orbWrap}
          onPress={handleOrbPress}
          accessibilityRole="button"
          accessibilityLabel="Soul orb"
          accessibilityHint={insight ?? undefined}
        >
          <Animated.View
            style={tapAnimStyle}
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          >
            <Orb size={ORB_SIZE} />
            <Animated.View
              style={[styles.ripple, rippleAnimStyle]}
              pointerEvents="none"
            />
          </Animated.View>
        </Pressable>

        <View style={styles.insightRow} pointerEvents="none">
          <Animated.View style={[styles.insightPill, insightAnimStyle]}>
            <Text style={styles.insightText} numberOfLines={1}>{insight ?? ''}</Text>
          </Animated.View>
        </View>

        {/* First time: a single clear path -- Box Breath + Begin. */}
        {practiced === false && (
          <>
            <View
              style={styles.techniqueWrap}
              accessible={true}
              accessibilityLabel={`${firstRunTechnique.name}. ${firstRunTechnique.subtitle}. ${firstRunTechnique.durationSeconds} seconds.`}
            >
              <Text style={[typography.techniqueName, { color: colors.textPrimary }]}>
                {firstRunTechnique.name}
              </Text>
              <Text
                style={[
                  typography.subtitle,
                  { color: colors.textSubtitle, marginTop: 6, textAlign: 'center' },
                ]}
              >
                {firstRunTechnique.subtitle} {'·'} {firstRunTechnique.durationSeconds}s
              </Text>
            </View>

            <View style={styles.beginWrap}>
              <BeginButton onPress={handleBegin} />
            </View>
          </>
        )}

        {/* Returning: lead with the tailored path; browsing is the quiet option. */}
        {practiced === true && (
          <>
            <View style={styles.recommendCard}>
              <View style={styles.recommendCardHead}>
                <SymbolView
                  name="sparkles"
                  tintColor={colors.textSubtitle}
                  size={16}
                  weight="medium"
                />
                <Text style={styles.recommendCardTitle}>
                  Suggest a calming exercise based on how I&apos;m feeling
                </Text>
              </View>
              <BeginButton onPress={handleRecommendOpen} />
            </View>

            <View style={styles.chooseWrap}>
              <Pressable
                onPress={handleTryDifferent}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Choose from the list"
              >
                <Text style={[typography.tertiaryAction, { color: colors.textTertiary }]}>
                  Choose from the list
                </Text>
              </Pressable>
            </View>
          </>
        )}
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

      <RecommendSheet
        visible={recommendVisible}
        onClose={handleRecommendClose}
        onPick={handleRecommendPick}
      />
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

  // returning-user recommend card
  recommendCard: {
    alignItems: 'center',
    gap: 18,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  recommendCardHead: {
    alignItems: 'center',
    gap: 10,
  },
  recommendCardTitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 24,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  chooseWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  ripple: {
    position: 'absolute',
    top: ORB_RIPPLE_INSET,
    left: ORB_RIPPLE_INSET,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(180, 195, 255, 0.72)',
  },
  insightRow: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    marginTop: -4,
  },
  insightPill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  insightText: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.72)',
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
  pickerRowSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginTop: 2,
  },
});
