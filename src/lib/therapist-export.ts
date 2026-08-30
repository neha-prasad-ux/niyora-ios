// The therapist/doctor export, assembled. One page model, built once, read by
// both the review screen and the PDF so the two can never disagree.
//
// Composition only. The honesty rules live where the work happens:
// therapist-export-cycles keeps every count next to its denominator, and
// therapist-export-content scrubs every piece of text and flags crisis entries
// without dropping them.

import {
  buildExcerpts,
  buildTopics,
  buildTried,
} from './therapist-export-content';
import {
  buildCycleRows,
  buildPhaseRows,
  buildProvenance,
} from './therapist-export-cycles';
import type { ExportOptions, TherapistExport } from './therapist-export-types';
import { getMoments, type MomentRecord } from '@/store/moment-history';
import { getPeriodHistory } from '@/store/period-history';
import { getPmsPrefs } from '@/store/pms-prefs';

/**
 * Build the page model.
 *
 * `options.exclude` is applied BEFORE anything is counted, not just before the
 * excerpts are listed. A moment she struck in review has to vanish from the
 * coverage numbers too, otherwise the page reports days logged that it never
 * shows, and the denominators stop describing the document a clinician is
 * holding.
 *
 * Returns null only when there is nothing to show. No logged period is fine:
 * her words, her threads, and her questions are a useful document on their own,
 * they just arrive with an empty cycle map.
 */
export function buildTherapistExport(
  moments: readonly MomentRecord[],
  periodStarts: readonly string[],
  cycleLength: number,
  options: ExportOptions = {},
): TherapistExport | null {
  const struck = new Set(options.exclude ?? []);
  const kept = struck.size === 0 ? moments : moments.filter((m) => !struck.has(m.at));

  const provenance = buildProvenance(kept, periodStarts);
  if (provenance == null) return null;

  return {
    provenance,
    cycles: buildCycleRows(kept, periodStarts),
    phases: buildPhaseRows(kept, periodStarts, cycleLength),
    topics: buildTopics(kept, periodStarts, cycleLength),
    excerpts: buildExcerpts(kept, periodStarts, cycleLength),
    tried: buildTried(kept, periodStarts, cycleLength),
    questions: (options.questions ?? []).map((q) => q.trim()).filter(Boolean),
  };
}

/** Read every on-device source and build the model. The only async surface, so
 *  the builder above stays pure and testable. */
export async function loadTherapistExport(
  options: ExportOptions = {},
): Promise<TherapistExport | null> {
  const [moments, history, prefs] = await Promise.all([
    getMoments(),
    getPeriodHistory(),
    getPmsPrefs(),
  ]);
  // pms-prefs holds the single most-recent start the prediction reads;
  // period-history holds the rest. phaseForDate dedupes, so pass both and let
  // the real logged starts win wherever they exist.
  const starts = [prefs.lastPeriodStart, ...history].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  );
  return buildTherapistExport(moments, starts, prefs.cycleLength, options);
}
