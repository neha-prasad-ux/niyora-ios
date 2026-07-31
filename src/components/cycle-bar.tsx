// The Now card's cycle bar: a calm, non-interactive progress bar. The cycle is
// three proportional zones (build -> PMS -> period) with soft phase-tinted
// gradients; the elapsed part of the cycle glows a shade brighter, and a
// luminous pearl marks today at the fill's leading edge. Display only — the
// doors it used to hold now live on the card button and the utility row.

import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { BandPhase, PhaseBand } from '@/lib/phase-band';
import { colors } from '@/theme/colors';

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
  /**
   * When set (0..1), the bar switches to preparedness mode: a single violet fill
   * grows across the whole bar to this fraction (her PMS readiness), and the tick
   * marks where she is in the cycle. The phase zones stay as a dim context track.
   * When null (default), the elapsed cycle fills the zones as before.
   */
  readiness?: number | null;
};

export function CycleBar({ band, periodEmphasized, readiness = null }: CycleBarProps) {
  const curIdx = band.segments.findIndex((s) => s.phase === band.current);
  const prepMode = readiness != null;

  // Today's position across the whole bar (0..1): full zones behind, plus the
  // pearl's place inside the current one.
  let elapsed = 0;
  for (let i = 0; i < curIdx; i++) elapsed += band.segments[i].fraction;
  elapsed += (band.segments[curIdx]?.fraction ?? 0) * band.pearl;
  const showPearl = elapsed > 0.015 && elapsed < 0.985;
  const readyPct = Math.max(0, Math.min(1, readiness ?? 0)) * 100;

  // Internal phase boundaries (0..1), drawn as seams on top of the readiness
  // fill so the true proportions stay visible — Build is the long stretch, PMS a
  // short slice near the end, Period shorter still.
  const boundaries: number[] = [];
  let acc = 0;
  for (let i = 0; i < band.segments.length - 1; i++) {
    acc += band.segments[i].fraction;
    boundaries.push(acc);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        {band.segments.map((seg, i) => {
          // Prep mode leaves the zones as a dim track — the readiness overlay
          // below is the only fill; otherwise the elapsed cycle lights the zones.
          const fill = prepMode ? 0 : i < curIdx ? 1 : i > curIdx ? 0 : band.pearl;
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
        {/* Preparedness fill: one violet sweep across the whole bar to her
            readiness, sitting over the dim zone track. */}
        {prepMode && readyPct > 0 && (
          <View pointerEvents="none" style={[styles.fill, { width: `${readyPct}%` }]}>
            <LinearGradient
              colors={READY_FILL}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
        {/* Glass sheen across the whole bar — brightest along the top edge. */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Phase seams on top, so the readiness fill never hides the true zone
            widths (Build long, PMS short, Period shorter). */}
        {prepMode &&
          boundaries.map((f, i) => (
            <View key={i} pointerEvents="none" style={[styles.boundary, { left: `${f * 100}%` }]} />
          ))}
      </View>

      {/* Today: a luminous pearl on the elapsed edge (cycle mode only). In prep
          mode the fill is preparedness, not time, so there is no today marker.
          Drawn in the unclipped wrap so the glow isn't cut by the bar's mask. */}
      {showPearl && !prepMode && (
        <View pointerEvents="none" style={[styles.pearl, { left: `${elapsed * 100}%` }]}>
          <View style={styles.pearlCore} />
        </View>
      )}
    </View>
  );
}

// The preparedness fill: the app's signature violet, lit along the top edge so
// it reads as the same glass as the rest of the bar.
const READY_FILL: [string, string] = ['hsla(268, 72%, 72%, 0.96)', 'hsla(262, 62%, 60%, 0.82)'];

const BAR_HEIGHT = 12;
// The today marker sits *within* the bar height (never protruding) and carries
// no knob border — so it reads as a luminous position mark, not a draggable thumb.
const PEARL = 9;

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
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
  // Boundary seam: a thin dark divider spanning the bar, marking a phase edge on
  // top of the readiness fill.
  boundary: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    marginLeft: -StyleSheet.hairlineWidth / 2,
    backgroundColor: 'rgba(8, 7, 12, 0.55)',
  },
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
    shadowColor: '#eaf0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
});
