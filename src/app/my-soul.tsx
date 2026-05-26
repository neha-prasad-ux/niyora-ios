import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Orb } from '@/components/orb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ── Design tokens ──────────────────────────────────────────────────────────
const ACCENT = '#D966A8';
const ACCENT_SOFT = 'rgba(217, 102, 168, 0.18)';
const ACCENT_NEXT = 'rgba(217, 102, 168, 0.4)';
const CARD_TOP_EDGE = 'rgba(200, 160, 230, 0.22)';
const MARKER_REACHED = ACCENT;
const MARKER_UNREACHED = 'rgba(160, 140, 180, 0.28)';
const SPARKLINE_COLOR = ACCENT;

// ── Mock data (replaced by practice store when it lands) ───────────────────
const TIER_NAME = 'Glow';
const TIER_RING_COUNT = 1;
const LEVEL_TOTAL = 15;
const LEVEL_CURRENT = 10;
const LEVEL_NEXT_TIER = 15;
const SPARKLINE_VALUES = [3, 5, 2, 6, 4, 7, 5, 8, 6, 9, 7, 10, 8, 6];

// ── Sub-components ─────────────────────────────────────────────────────────

function LevelMarker({ n, current, nextTier }: { n: number; current: number; nextTier: number }) {
  const isReached = n <= current;
  const isNextTier = n === nextTier;
  const isCurrent = n === current;

  if (isNextTier) {
    return (
      <View style={styles.markerNext}>
        <View style={styles.markerNextInner} />
        <View style={styles.markerNextRing} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.marker,
        isReached && styles.markerReached,
        isCurrent && styles.markerCurrent,
      ]}
    />
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const barH = 28;

  return (
    <View style={styles.sparklineRow}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.sparklineBar,
            {
              height: Math.round((v / max) * barH),
              opacity: 0.5 + (v / max) * 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function MySoulScreen() {
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const contentInsets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: contentInsets.top,
      paddingLeft: contentInsets.left,
      paddingRight: contentInsets.right,
      paddingBottom: contentInsets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={contentInsets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.inner}>

        {/* Page title */}
        <ThemedText type="subtitle" style={styles.pageTitle}>
          My Soul
        </ThemedText>

        {/* Orb + level label */}
        <View style={styles.orbSection}>
          <Orb size={148} tierRingCount={TIER_RING_COUNT} />
          <ThemedText themeColor="textSecondary" style={styles.orbLabel}>
            Level {LEVEL_CURRENT}
          </ThemedText>
        </View>

        {/* Level Glow card */}
        <View style={[styles.card, { borderColor: ACCENT_SOFT, backgroundColor: theme.backgroundElement }]}>
          {/* Softer top-edge inner highlight (simulates Mac inner-gradient) */}
          <View style={styles.cardTopEdge} />

          <View style={styles.cardBody}>
            {/* Tier name in serif — Source Serif 4 when font asset is added (#5) */}
            <ThemedText style={styles.tierName}>Level {TIER_NAME}</ThemedText>

            <ThemedText themeColor="textSecondary" style={styles.progressLabel}>
              {LEVEL_CURRENT} / {LEVEL_NEXT_TIER} to next tier
            </ThemedText>

            {/* Level markers */}
            <View style={styles.markerRow}>
              {Array.from({ length: LEVEL_TOTAL }, (_, i) => i + 1).map((n) => (
                <LevelMarker key={n} n={n} current={LEVEL_CURRENT} nextTier={LEVEL_NEXT_TIER} />
              ))}
            </View>
          </View>
        </View>

        {/* Sessions sparkline card */}
        <View style={[styles.card, { borderColor: ACCENT_SOFT, backgroundColor: theme.backgroundElement }]}>
          <View style={styles.cardTopEdge} />
          <View style={styles.cardBody}>
            <ThemedText style={styles.cardLabel}>Sessions</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.sparklineSubtitle}>
              Last {SPARKLINE_VALUES.length} days
            </ThemedText>
            <Sparkline values={SPARKLINE_VALUES} />
          </View>
        </View>

      </ThemedView>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  pageTitle: {
    textAlign: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },

  // Orb
  orbSection: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  orbLabel: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  // Cards — generous padding, soft border, top-edge highlight
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTopEdge: {
    height: 1.5,
    backgroundColor: CARD_TOP_EDGE,
  },
  cardBody: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },

  // Level Glow card text
  tierName: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Marker row
  markerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: MARKER_UNREACHED,
  },
  markerReached: {
    backgroundColor: MARKER_REACHED,
    opacity: 0.6,
  },
  markerCurrent: {
    opacity: 1,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.7,
    elevation: 4,
  },
  // Next-tier marker: filled circle at 0.4 opacity with glowing ring
  markerNext: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerNextInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ACCENT_NEXT,
    position: 'absolute',
  },
  markerNextRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: ACCENT,
    opacity: 0.7,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.6,
    elevation: 2,
  },

  // Sparkline card
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sparklineSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 36,
    marginTop: Spacing.one,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: 3,
    backgroundColor: SPARKLINE_COLOR,
    minHeight: 4,
  },
});
