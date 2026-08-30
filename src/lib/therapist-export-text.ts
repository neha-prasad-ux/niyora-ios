// The export, rendered for a human to read. Plain text on purpose: it goes out
// through the share sheet, so it lands in Notes, Mail, or a printout without the
// app taking a native PDF dependency and a rebuild for a document she may send
// twice a year.
//
// ponytail: text, not PDF. Upgrade path is expo-print with an HTML template, the
// section order below is already the page layout. Add it when she wants one page
// with the app's type on it, not before.
//
// The closing section is not boilerplate. Counts without their limits invite a
// clinician to read blank days as calm days, and a predicted phase as a measured
// one. It stays.

import type {
  BandPhase,
  PhaseRow,
  TherapistExport,
} from './therapist-export-types';

// The app's copy rule: never "window", that is forecast jargon.
const PHASE_LABEL: Record<BandPhase, string> = {
  build: 'Build days',
  pms: 'PMS days',
  period: 'Period days',
};

const line = (...parts: (string | number | null | undefined)[]) =>
  parts.filter((p) => p != null && p !== '').join(' · ');

function phaseLine(row: PhaseRow): string {
  const label = PHASE_LABEL[row.phase].padEnd(11);
  const coverage = `wrote ${row.daysLogged} of ${row.daysInPhase} days`;
  const feelings = row.feelings.map((f) => `${f.feeling} ${f.count}`).join(', ');
  return `  ${label}${coverage}${feelings ? `   ${feelings}` : ''}`;
}

/** Render the reviewed model. `doc` is already filtered: anything she struck in
 *  review is gone before it reaches here, so this never decides what to hide. */
export function renderTherapistExport(doc: TherapistExport): string {
  const p = doc.provenance;
  const out: string[] = [];

  out.push('NIYORA RECORD');
  out.push(line(`${p.from} to ${p.to}`, `${p.spanDays} days`, `${p.cyclesCovered} cycles`));
  out.push(line(`Wrote on ${p.daysLogged} of ${p.spanDays} days`, `${p.entries} entries`));
  out.push('My own record, written in the moment. Self-reported. Not a diagnosis.');

  if (doc.cycles.length > 0) {
    out.push('', 'CYCLES');
    for (const c of doc.cycles) {
      const len = c.lengthDays == null ? 'still open' : `${c.lengthDays} days`;
      out.push(`  ${c.start}   ${len.padEnd(12)}wrote ${c.daysLogged} days`);
    }
  }

  if (doc.phases.length > 0) {
    out.push('', 'BY PHASE');
    let cycle = '';
    for (const row of doc.phases) {
      if (row.cycleStart !== cycle) {
        cycle = row.cycleStart;
        const measured = row.source === 'logged' ? 'measured' : 'estimated';
        out.push(`Cycle from ${cycle} (${measured})`);
      }
      out.push(phaseLine(row));
    }
  }

  if (doc.topics.length > 0) {
    out.push('', 'WHAT KEEPS COMING BACK');
    for (const t of doc.topics) {
      const spread = (Object.keys(PHASE_LABEL) as BandPhase[])
        .filter((ph) => t.byPhase[ph] > 0)
        .map((ph) => `${PHASE_LABEL[ph].toLowerCase()} ${t.byPhase[ph]}`)
        .join(', ');
      out.push(`  ${line(t.subject, `${t.count} times`, spread, `last ${t.lastSeen}`)}`);
    }
  }

  if (doc.excerpts.length > 0) {
    out.push('', 'IN MY WORDS');
    for (const e of doc.excerpts) {
      const where =
        e.phase == null
          ? null
          : line(`cycle day ${e.cycleDay}`, PHASE_LABEL[e.phase].toLowerCase(),
              e.source === 'predicted' ? 'estimated' : null);
      out.push(`  ${line(e.date, where, e.feeling)}`);
      out.push(`  "${e.text}"`);
    }
  }

  if (doc.tried.length > 0) {
    out.push('', 'WHAT I ALREADY TRIED');
    for (const t of doc.tried) out.push(`  ${line(t.date, t.subject)}: ${t.text}`);
  }

  if (doc.questions.length > 0) {
    out.push('', 'WHAT I WANT TO ASK');
    doc.questions.forEach((q, i) => out.push(`  ${i + 1}. ${q}`));
  }

  out.push('', 'WHAT THIS RECORD IS NOT');
  out.push('  A day with no entry is a day I did not write, not a day without symptoms.');
  out.push('  Phases marked estimated come from my typical cycle length, not a logged period.');
  out.push('  There are no daily severity ratings here, so this is not a DRSP chart.');

  return out.join('\n');
}
