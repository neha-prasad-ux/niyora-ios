// The page model for the therapist/doctor export. Pure data, no rendering: the
// review screen and the PDF both read this, so neither can show something the
// other does not.
//
// Two rules the shape enforces:
//   1. Every phase claim carries its `source`. A phase we measured from two
//      logged period starts and a phase we back-projected are not the same
//      claim, and the page has to show which is which.
//   2. Every count carries its denominator. Her entries are event-driven, not
//      daily, so "3 entries in PMS days" without "wrote on 3 of 7 days" lets a
//      clinician read the blanks as symptom-free days we never observed.

import type { BandPhase } from './phase-band';
import type { PhaseSource } from './phase-for-date';

export type { BandPhase, PhaseSource };

/** Header strip: what this document covers and how much of it is real. */
export type Provenance = {
  /** YYYY-MM-DD, oldest and newest moment included. */
  from: string;
  to: string;
  /** Calendar days spanned, inclusive. */
  spanDays: number;
  /** Cycles with a logged start inside the span. */
  cyclesCovered: number;
  /** Distinct days she wrote on. The denominator for everything below. */
  daysLogged: number;
  entries: number;
};

/** One row of the cycle map: her logged starts and how long each ran. */
export type CycleRow = {
  /** Logged period start, YYYY-MM-DD. */
  start: string;
  /** Measured length, or null when the cycle is still open / the next start was
   *  never logged. */
  lengthDays: number | null;
  daysLogged: number;
  entries: number;
};

/** One phase of one cycle, with the coverage that makes the counts readable. */
export type PhaseRow = {
  cycleStart: string;
  phase: BandPhase;
  /** Days in this phase of this cycle: the coverage denominator. */
  daysInPhase: number;
  /** Distinct days inside this phase that she wrote on. */
  daysLogged: number;
  entries: number;
  /** What she named, most-named first. Her labels, never re-grouped. */
  feelings: { feeling: string; count: number }[];
  source: PhaseSource;
};

/** A thread she returns to, in her own words. */
export type TopicRow = {
  subject: string;
  count: number;
  byPhase: Record<BandPhase, number>;
  /** YYYY-MM-DD of the most recent entry on this thread. */
  lastSeen: string;
};

/** A candidate excerpt. She picks which of these ship; the model offers, the
 *  review screen chooses. `text` is already scrubbed. */
export type Excerpt = {
  /** MomentRecord.at, the stable key the review screen selects by. */
  at: string;
  date: string;
  cycleDay: number | null;
  phase: BandPhase | null;
  source: PhaseSource | null;
  feeling: string;
  subject?: string;
  text: string;
  /** True when crisis-scan flags it. Never silently dropped, never silently
   *  included: the review screen offers it, defaulted by who the doc is for. */
  crisis: boolean;
};

/** Something she already tried, so the appointment is not spent re-suggesting
 *  it. Scrubbed. */
export type TriedRow = {
  at: string;
  date: string;
  subject?: string;
  phase: BandPhase | null;
  text: string;
  /** Same promise as Excerpt.crisis: flagged, never silently dropped. A crisis
   *  moment's drafted response can carry the content too, so it is scanned. */
  crisis: boolean;
};

export type TherapistExport = {
  provenance: Provenance;
  cycles: CycleRow[];
  phases: PhaseRow[];
  topics: TopicRow[];
  excerpts: Excerpt[];
  tried: TriedRow[];
  /** Written by her at export time. The only thing the flow asks her for. */
  questions: string[];
};

export type ExportOptions = {
  /** MomentRecord.at keys she chose to leave out (crisis entries she declined,
   *  or anything she struck in review). */
  exclude?: readonly string[];
  questions?: readonly string[];
};
