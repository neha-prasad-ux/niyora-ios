// The cycle tables of the therapist export: which cycles this document covers,
// and how much of each phase we actually observed.
//
// The number that carries the weight here is the denominator, not the count. Her
// entries are event-driven, so a PMS stretch clipped by the edge of the export
// span holds 3 days, not 7. Printing 7 lets a clinician read 4 days we never
// looked at as symptom-free days, which is the one failure this file exists to
// prevent.
//
// Nothing below re-implements the phase rule. Every day is classified by
// lib/phase-for-date, which shares its rule with lib/phase-band, so the export
// and the Now-card strip can never disagree about what phase a day was in.

import { phaseForDate } from './phase-for-date';
import { parseDayNumber } from './pms-window';
import type {
  BandPhase,
  CycleRow,
  PhaseRow,
  PhaseSource,
  Provenance,
} from './therapist-export-types';
import { feelingCounts, type MomentRecord } from '../store/moment-history';

// The same bounds lib/phase-for-date uses. A gap outside them is not one cycle,
// it is a stretch where she stopped logging, and an open cycle stops being
// attributable past MAX_CYCLE days.
const MIN_CYCLE = 20;
const MAX_CYCLE = 40;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Inverse of pms-window.parseDayNumber. Both anchor on UTC midnight, so this
// round-trips a calendar day exactly, with no timezone drift to reintroduce.
function ymd(dayNumber: number): string {
  return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

type Span = { fromDay: number; toDay: number };

/** Oldest and newest moment we hold, as day numbers. This is the export span,
 *  and the only stretch of calendar we are allowed to make claims about. */
function spanOf(moments: readonly MomentRecord[]): Span | null {
  let fromDay: number | null = null;
  let toDay: number | null = null;
  for (const m of moments) {
    const d = parseDayNumber(m.date);
    if (d == null) continue;
    if (fromDay == null || d < fromDay) fromDay = d;
    if (toDay == null || d > toDay) toDay = d;
  }
  return fromDay == null ? null : { fromDay, toDay: toDay as number };
}

function startDays(periodStarts: readonly string[]): number[] {
  return [
    ...new Set(periodStarts.map((s) => (s ? parseDayNumber(s) : null)).filter((n) => n != null)),
  ].sort((a, b) => a - b);
}

type CycleRange = {
  startDay: number;
  /** Last day still attributable to this start, inclusive. */
  endDay: number;
  /** Measured length, or null when this is not a closed cycle. */
  lengthDays: number | null;
};

/**
 * Her logged starts turned into day ranges, using the identical bracketing
 * lib/phase-for-date applies: a start owns every day up to the next logged start,
 * and an unclosed one stops at MAX_CYCLE. Keeping the two in step is what stops
 * the cycle table and the phase table from reporting different entry counts for
 * the same moment.
 */
function cycleRanges(periodStarts: readonly string[]): CycleRange[] {
  const starts = startDays(periodStarts);
  return starts.map((startDay, i) => {
    const next = i + 1 < starts.length ? starts[i + 1] : null;
    const gap = next == null ? null : next - startDay;
    const closed = gap != null && gap >= MIN_CYCLE && gap <= MAX_CYCLE;
    const endDay = closed
      ? startDay + (gap as number) - 1
      : Math.min(next != null ? next - 1 : Infinity, startDay + MAX_CYCLE);
    return { startDay, endDay, lengthDays: closed ? gap : null };
  });
}

/** The cycle a calendar day belongs to, or null when no logged start brackets it.
 *  ponytail: linear scan over her logged starts. A handful of cycles per export,
 *  so a lookup index would be more code than the scan it replaces. */
function rangeFor(ranges: readonly CycleRange[], day: number): CycleRange | null {
  for (const r of ranges) if (day >= r.startDay && day <= r.endDay) return r;
  return null;
}

/** Moments with a usable date, newest-first ordering irrelevant. Anything we
 *  cannot place on the calendar is dropped rather than counted, because a moment
 *  in the total but in none of the rows reads as a missing row. */
function datedMoments(moments: readonly MomentRecord[]): { day: number; m: MomentRecord }[] {
  const out: { day: number; m: MomentRecord }[] = [];
  for (const m of moments) {
    const day = parseDayNumber(m.date);
    if (day != null) out.push({ day, m });
  }
  return out;
}

/**
 * The header strip: what this document covers and how much of it is real.
 *
 * null with no moments (a span with no entries is a page about nothing) and null
 * with no logged period start, because every table under this header is keyed to
 * a cycle and a header promising cycle coverage we cannot produce is worse than
 * no document.
 */
export function buildProvenance(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
): Provenance | null {
  const dated = datedMoments(moments);
  const span = spanOf(moments);
  if (span == null) return null;
  const starts = startDays(periodStarts);

  const days = new Set(dated.map((d) => ymd(d.day)));
  const cyclesCovered = starts.filter((s) => s >= span.fromDay && s <= span.toDay).length;

  return {
    from: ymd(span.fromDay),
    to: ymd(span.toDay),
    spanDays: span.toDay - span.fromDay + 1,
    cyclesCovered,
    daysLogged: days.size,
    entries: dated.length,
  };
}

/**
 * One row per cycle the export span touches, newest first.
 *
 * A cycle that started before the span is still listed: her moments from its
 * first covered day onward belong to it, and dropping the row would strand them.
 * That is why this count can run one above provenance.cyclesCovered, which by
 * definition only counts starts logged inside the span.
 */
export function buildCycleRows(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
): CycleRow[] {
  const span = spanOf(moments);
  if (span == null) return [];
  const ranges = cycleRanges(periodStarts);
  if (ranges.length === 0) return [];

  const dated = datedMoments(moments);
  const rows: CycleRow[] = [];
  for (const r of ranges) {
    // Only cycles with at least one day inside the span. Anything else is a
    // cycle this document did not look at.
    if (r.endDay < span.fromDay || r.startDay > span.toDay) continue;
    const mine = dated.filter((d) => d.day >= r.startDay && d.day <= r.endDay);
    rows.push({
      start: ymd(r.startDay),
      lengthDays: r.lengthDays,
      daysLogged: new Set(mine.map((d) => ymd(d.day))).size,
      entries: mine.length,
    });
  }
  return rows.sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0));
}

// Chronological within the cycle, matching the strip in lib/phase-band.
const PHASE_ORDER: BandPhase[] = ['build', 'pms', 'period'];

type PhaseBucket = {
  daysInPhase: number;
  loggedDays: Set<string>;
  entries: MomentRecord[];
  source: PhaseSource;
};

/**
 * One row per phase per cycle, newest cycle first, build then pms then period
 * inside each cycle.
 *
 * `daysInPhase` counts only days of that phase that fall inside the export span,
 * so a cycle clipped at either edge reports the coverage we really have rather
 * than the length the phase would have had. `daysLogged` is distinct calendar
 * days she wrote on; `entries` is the raw count, and the two differ whenever she
 * wrote twice in a day.
 *
 * `source` is propagated from lib/phase-for-date, never assumed: 'logged' only
 * where both ends of the cycle are real logged starts. A phase row is emitted
 * even with nothing written in it, because zero of seven days is a finding.
 */
export function buildPhaseRows(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
  cycleLength: number,
): PhaseRow[] {
  const span = spanOf(moments);
  if (span == null) return [];
  const ranges = cycleRanges(periodStarts);
  if (ranges.length === 0) return [];

  const buckets = new Map<string, PhaseBucket>();
  const key = (startDay: number, phase: BandPhase) => `${startDay}|${phase}`;
  const bucket = (startDay: number, phase: BandPhase, source: PhaseSource): PhaseBucket => {
    const k = key(startDay, phase);
    let b = buckets.get(k);
    if (!b) {
      b = { daysInPhase: 0, loggedDays: new Set(), entries: [], source };
      buckets.set(k, b);
    }
    // Never let one measured day upgrade a phase we mostly guessed at.
    if (source === 'predicted') b.source = 'predicted';
    return b;
  };

  // Walk the span day by day, not moment by moment. The denominator is days we
  // covered, and the days she wrote nothing on are exactly the ones that have to
  // land in it.
  //
  // ponytail: one phaseForDate call per calendar day of the span, O(span x
  // starts). A year of history is ~365 tiny calls; index the starts only if an
  // export ever spans years.
  for (let day = span.fromDay; day <= span.toDay; day++) {
    const r = rangeFor(ranges, day);
    if (r == null) continue; // predates her first logged period, or an unlogged stretch
    const at = phaseForDate(ymd(day), periodStarts, cycleLength);
    if (at == null) continue;
    bucket(r.startDay, at.phase, at.source).daysInPhase += 1;
  }

  for (const { day, m } of datedMoments(moments)) {
    const r = rangeFor(ranges, day);
    if (r == null) continue;
    const at = phaseForDate(m.date, periodStarts, cycleLength);
    if (at == null) continue;
    const b = bucket(r.startDay, at.phase, at.source);
    b.loggedDays.add(ymd(day));
    b.entries.push(m);
  }

  const rows: PhaseRow[] = [];
  for (const r of [...ranges].sort((a, b) => b.startDay - a.startDay)) {
    for (const phase of PHASE_ORDER) {
      const b = buckets.get(key(r.startDay, phase));
      if (!b || b.daysInPhase === 0) continue;
      rows.push({
        cycleStart: ymd(r.startDay),
        phase,
        daysInPhase: b.daysInPhase,
        daysLogged: b.loggedDays.size,
        entries: b.entries.length,
        feelings: feelingCounts(b.entries),
        source: b.source,
      });
    }
  }
  return rows;
}
