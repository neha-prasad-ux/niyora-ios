// The Now card's cycle bar: a calm, non-interactive progress bar. The cycle is
// three proportional zones (build -> PMS -> period) with soft phase-tinted
// gradients; the elapsed part of the cycle glows a shade brighter, and a
// luminous pearl marks today at the fill's leading edge. Display only — the
// doors it used to hold now live on the card button and the utility row.

import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { BandPhase, PhaseBand } from '@/lib/phase-band';
import { colors } from '@/theme/colors';

const LABEL: Record<BandPhase, string> = {
  build: 'Build',
  pms: 'PMS',
  period: 'Periods',
};

// Per-phase vertical gradient pairs — a dim resting wash and a lit elapsed wash,
// each with a soft top-to-bottom shade so the bar reads as glass. On-brand: it
// leads with the app's signature violet (build, the Calm-now purple) and warms
// to rose (PMS) then a deeper period rose.
const ZONE: Record<BandPhase, { dim: [string, string]; lit: [string, string] }> = {
  build: {
    dim: ['hsla(270, 55%, 66%, 0.28)', 'hsla(270, 55%, 58%, 0.14)'],
    lit: ['hsla(272, 68%, 72%, 0.95)', 'hsla(268, 60%, 58%, 0.78)'],
  },
  pms: {
    dim: ['hsla(330, 60%, 68%, 0.26)', 'hsla(330, 60%, 60%, 0.13)'],
    lit: ['hsla(335, 70%, 72%, 0.9)', 'hsla(332, 62%, 60%, 0.72)'],
  },
  period: {
    dim: ['hsla(342, 58%, 64%, 0.2)', 'hsla(342, 58%, 58%, 0.1)'],
    lit: ['hsla(344, 72%, 70%, 0.95)', 'hsla(342, 64%, 58%, 0.8)'],
  },
};

type CycleBarProps = {
  band: PhaseBand;
  /** The Periods zone glows a touch brighter when a period is predicted due. */
  periodEmphasized: boolean;
};

export function CycleBar({ band, periodEmphasized }: CycleBarProps) {
  const curIdx = band.segments.findIndex((s) => s.phase === band.current);

  // Today's position across the whole bar (0..1): full zones behind, plus the
  // pearl's place inside the current one.
  let elapsed = 0;
  for (let i = 0; i < curIdx; i++) elapsed += band.segments[i].fraction;
  elapsed += (band.segments[curIdx]?.fraction ?? 0) * band.pearl;
  const showPearl = elapsed > 0.015 && elapsed < 0.985;

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {band.segments.map((seg, i) => {
          const fill = i < curIdx ? 1 : i > curIdx ? 0 : band.pearl;
          const z = ZONE[seg.phase];
          const emphasized = seg.phase === 'period' && periodEmphasized;
          return (
            <View
              key={seg.phase}
              style={[styles.zone, { flex: seg.fraction }, i > 0 && styles.seam]}
            >
              <LinearGradient
                colors={z.dim}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {fill > 0 && (
                <View style={[styles.fill, { width: `${fill * 100}%` }]}>
                  <LinearGradient
                    colors={z.lit}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
              {emphasized && <View pointerEvents="none" style={styles.emphasize} />}
            </View>
          );
        })}
        {/* Glass sheen across the whole bar — brightest along the top edge. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Today: a luminous pearl on the fill edge, drawn in the unclipped wrap
          so its glow isn't cut off by the bar's rounded mask. */}
      {showPearl && (
        <View pointerEvents="none" style={[styles.pearl, { left: `${elapsed * 100}%` }]}>
          <View style={styles.pearlCore} />
        </View>
      )}

      {/* A legend under the bar — Build left, PMS centre, Periods right — so the
          narrow Periods zone never has to hold its own word. */}
      <View style={styles.legend}>
        {band.segments.map((seg, i) => (
          <Text
            key={seg.phase}
            style={[styles.legendLabel, i === curIdx ? styles.legendOn : styles.legendDim]}
            numberOfLines={1}
          >
            {LABEL[seg.phase]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const BAR_HEIGHT = 12;
const PEARL = 16;

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  zone: {
    overflow: 'hidden',
  },
  seam: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(9, 8, 14, 0.4)',
  },
  fill: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  emphasize: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: colors.bandRoseBorder,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 7,
    paddingHorizontal: 2,
  },
  legendLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  legendOn: { color: 'rgba(255, 255, 255, 0.92)' },
  legendDim: { color: 'rgba(255, 255, 255, 0.42)' },
  // The pearl sits centered on the bar height; marginLeft pulls it onto the edge.
  pearl: {
    position: 'absolute',
    top: (BAR_HEIGHT - PEARL) / 2,
    width: PEARL,
    height: PEARL,
    marginLeft: -PEARL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pearlCore: {
    width: PEARL,
    height: PEARL,
    borderRadius: PEARL / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: 'rgba(226, 231, 242, 0.9)',
    shadowColor: '#eaf0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 5,
  },
});
