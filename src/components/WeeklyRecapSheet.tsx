import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

// Matches MOOD_DOT_HUES in my-soul.tsx and PostSessionMood.tsx.
const MOOD_DOT_HUES = [295, 278, 260, 240, 215] as const;

function weekDateRange(): string {
  const now = new Date();
  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
  return `${fmt(mon)}-${sun.getDate()}`;
}

export type MoodValue = 1 | 2 | 3 | 4 | 5;

interface Props {
  sessionsThisWeek: number;
  streak: number;
  // techniqueId with most sessions this week (null if no sessions).
  mostUsedTechniqueName: string | null;
  // techniqueId with highest average mood this week (null if no mood data).
  calmestTechniqueName: string | null;
  // Mood values for each mood record this week, in chronological order.
  weeklyMoods: MoodValue[];
  tierName: string;
  toNext: number;
  nextTierName: string | null;
  onDone: () => void;
}

export function WeeklyRecapSheet({
  sessionsThisWeek,
  streak,
  mostUsedTechniqueName,
  calmestTechniqueName,
  weeklyMoods,
  tierName,
  toNext,
  nextTierName,
  onDone,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 });
    translateY.value = withTiming(0, { duration: 420 });
  }, [opacity, translateY]);

  function dismiss() {
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(onDone, 300);
  }

  function handleDone() {
    Haptics.selectionAsync();
    dismiss();
  }

  function handleBackdrop() {
    Haptics.selectionAsync();
    dismiss();
  }

  async function handleShare() {
    Haptics.selectionAsync();
    const lines: string[] = ['Your week in breath'];
    lines.push(`${sessionsThisWeek} ${sessionsThisWeek === 1 ? 'session' : 'sessions'} this week`);
    if (streak > 0) {
      lines.push(`${streak}-day streak`);
    }
    const practiceName = calmestTechniqueName ?? mostUsedTechniqueName;
    if (practiceName) {
      lines.push(`Favorite: ${practiceName}`);
    }
    lines.push(`Level ${tierName}`);
    lines.push('via Niyora');
    Share.share({ message: lines.join('\n') }).catch(() => {});
  }

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const moodStops =
    weeklyMoods.length >= 2
      ? (weeklyMoods.map((m) => `hsl(${MOOD_DOT_HUES[m - 1]}, 62%, 60%)`) as [
          string,
          string,
          ...string[],
        ])
      : null;

  const practiceLabel = calmestTechniqueName
    ? `Calmest: ${calmestTechniqueName}`
    : mostUsedTechniqueName
      ? `Most used: ${mostUsedTechniqueName}`
      : null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={handleBackdrop} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>your week in breath</Text>
          <Text style={styles.weekRange}>{weekDateRange()}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{sessionsThisWeek}</Text>
            <Text style={styles.statLabel}>
              {sessionsThisWeek === 1 ? 'session' : 'sessions'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLabel}>{streak === 1 ? 'day streak' : 'day streak'}</Text>
          </View>
        </View>

        {practiceLabel && (
          <Text style={styles.practiceRow}>{practiceLabel}</Text>
        )}

        {moodStops && (
          <View style={styles.moodSection}>
            <LinearGradient
              colors={moodStops}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.moodRibbon}
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            />
            <View style={styles.moodEnds}>
              <Text style={styles.moodEndLabel}>older</Text>
              <Text style={styles.moodEndLabel}>now</Text>
            </View>
          </View>
        )}

        <Text style={styles.soulLine}>
          Level {tierName}
          {nextTierName && toNext > 0 ? `  ·  ${toNext} to ${nextTierName}` : ''}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={handleShare}
            style={styles.shareButton}
            accessibilityRole="button"
            accessibilityLabel="Share this week"
          >
            <Text style={styles.shareLabel}>Share</Text>
          </Pressable>
          <Pressable
            onPress={handleDone}
            style={styles.doneButton}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.50)',
  },
  sheet: {
    backgroundColor: '#13101a',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    paddingTop: 32,
    paddingBottom: 56,
    paddingHorizontal: 32,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  weekRange: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.40)',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 40,
    fontWeight: '300',
    color: colors.textPrimary,
    lineHeight: 46,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  practiceRow: {
    fontSize: 13,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
    marginBottom: spacing.xl,
    letterSpacing: 0.2,
  },
  moodSection: {
    marginBottom: spacing.xl,
  },
  moodRibbon: {
    height: 12,
    borderRadius: 6,
  },
  moodEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  moodEndLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.30)',
    letterSpacing: 0.3,
  },
  soulLine: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: spacing.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  shareLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  doneButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: 'hsl(270, 50%, 45%)',
    alignItems: 'center',
  },
  doneLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
});
