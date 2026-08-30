// Her words on the therapist export: the threads she keeps returning to, the
// entries she can hand over, and what she already tried.
//
// One rule runs through the whole file: nothing leaves here unscrubbed. Every
// string that lands in a return value goes through scrubForExport first, so a
// caller cannot reach raw entry text through this module at all. The failure
// that prevents is the obvious one, a name or a phone number printed into a PDF
// that gets emailed, filed, and photocopied.
//
// The second rule is the opposite of it: scanForCrisis runs on the RAW entry,
// before scrubbing, because scrubbing rewrites text and a rewrite must never be
// able to erase a flag. Flagged entries are still returned. Dropping them here
// would hide the most clinically important thing she wrote from the one person
// qualified to read it, and the choice is hers to make on the review screen.

import { scanForCrisis } from './crisis-scan';
import { phaseForDate } from './phase-for-date';
import { scrubForExport } from './pii';
import type { BandPhase, Excerpt, TopicRow, TriedRow } from './therapist-export-types';
import { subjectCount, type MomentRecord } from '@/store/moment-history';

// ponytail: ceiling. store/moment-history caps history at 300, so this cap never
// actually bites today, it is a guard against a future uncapped store handing the
// review screen an unbounded list. Raise it with that cap, never below it.
const MAX_CANDIDATES = 300;

/** Newest-first by `at`, the same order history is stored in. Re-sorted rather
 *  than assumed: a caller filtering or merging lists must not silently reorder
 *  the document. */
function newestFirst(moments: readonly MomentRecord[]): MomentRecord[] {
  return [...moments].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** phaseForDate for one moment, flattened to the nullable fields the page model
 *  uses. Null everywhere when she has logged no period: an invented cycle day is
 *  worse on a clinician's desk than a blank column. */
function phaseOf(
  m: MomentRecord,
  periodStarts: readonly string[],
  cycleLength: number,
): { cycleDay: number | null; phase: BandPhase | null; source: Excerpt['source'] } {
  const p = phaseForDate(m.date, periodStarts, cycleLength);
  return p
    ? { cycleDay: p.cycleDay, phase: p.phase, source: p.source }
    : { cycleDay: null, phase: null, source: null };
}

/**
 * The threads she returns to, grouped by `MomentRecord.subject` exactly as
 * stored.
 *
 * Her subject strings are the grouping, verbatim. Nothing here merges, renames,
 * translates or files them under a tidy category, because the moment "mom"
 * becomes "Family" the document stops being hers and starts being our reading of
 * her. Moments with no subject are skipped rather than bucketed into "other".
 *
 * byPhase can sum to less than `count`: a moment whose date has no usable cycle
 * position contributes to the count and to no phase. That gap is the honest one.
 */
export function buildTopics(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
  cycleLength: number,
): TopicRow[] {
  const rows = new Map<string, TopicRow>();

  for (const m of moments) {
    if (!m.subject) continue;
    let row = rows.get(m.subject);
    if (!row) {
      row = {
        subject: m.subject,
        count: subjectCount(moments, m.subject),
        byPhase: { build: 0, pms: 0, period: 0 },
        lastSeen: m.date,
      };
      rows.set(m.subject, row);
    }
    const { phase } = phaseOf(m, periodStarts, cycleLength);
    if (phase) row.byPhase[phase] += 1;
    if (m.date > row.lastSeen) row.lastSeen = m.date;
  }

  // Most-returned-to first, most recent breaking the tie: the threads worth the
  // first minutes of a short appointment.
  return [...rows.values()].sort(
    (a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1),
  );
}

/**
 * Every entry she could hand over, newest first, scrubbed.
 *
 * These are CANDIDATES, not a curated three. Picking a "best" handful here would
 * mean this file deciding which of her words a clinician sees, which is the one
 * judgement it has no standing to make. The review screen selects; this only
 * offers, with the phase, feeling and crisis flag it needs to offer well.
 */
export function buildExcerpts(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
  cycleLength: number,
): Excerpt[] {
  return newestFirst(moments)
    .filter((m) => m.entry.trim())
    .slice(0, MAX_CANDIDATES)
    .map((m) => ({
      at: m.at,
      date: m.date,
      ...phaseOf(m, periodStarts, cycleLength),
      feeling: m.feeling,
      ...(m.subject ? { subject: m.subject } : {}),
      text: scrubForExport(m.entry),
      // Raw, deliberately. Scanning the scrubbed text would let a scrub that
      // rewrote a sentence quietly clear the flag on it.
      crisis: scanForCrisis(m.entry),
    }));
}

/**
 * What she already tried: the move she drafted on each moment, scrubbed.
 *
 * This exists so the appointment is not spent suggesting the thing she has been
 * doing for three months. Moments with no response are skipped, there is nothing
 * to report about a moment she never acted on.
 */
export function buildTried(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
  cycleLength: number,
): TriedRow[] {
  const rows: TriedRow[] = [];
  for (const m of newestFirst(moments)) {
    const response = m.response?.trim();
    if (!response) continue;
    if (rows.length >= MAX_CANDIDATES) break;
    rows.push({
      at: m.at,
      date: m.date,
      ...(m.subject ? { subject: m.subject } : {}),
      phase: phaseOf(m, periodStarts, cycleLength).phase,
      text: scrubForExport(response),
      // Raw, before the scrub, so a redaction can never hide a flag.
      crisis: scanForCrisis(response),
    });
  }
  return rows;
}
