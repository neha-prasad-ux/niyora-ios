// A slim countdown for the hold activity pages (colouring, sky). Those pages are
// white paper, so the clock is a quiet ink line at the top, not the moon ball —
// the ball would compete with the thing she is meant to be absorbed in. mm:ss on
// the left, a hairline progress track filling underneath. It is the challenge
// made visible: the minutes run while she colours.

import { StyleSheet, Text, View } from 'react-native';

import { useHoldCountdown } from '@/lib/hold-clock';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const FAINT = 'rgba(43,38,50,0.12)';

function mmss(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function HoldClockBar({ onComplete }: { onComplete: () => void }) {
  const { remaining, pct } = useHoldCountdown(onComplete);
  return (
    <View style={styles.wrap} accessibilityRole="timer">
      <Text style={styles.label}>Beat the urge · {mmss(remaining)} left</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: spacing.sm },
  label: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.paper.ink,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: FAINT,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: colors.paper.ink },
});
