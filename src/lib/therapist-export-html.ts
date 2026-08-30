// The therapist record as a printable document.
//
// Deliberately NOT the app's night palette. This is read on paper or on a
// clinician's screen in a bright room, and a dark PDF prints as a black page.
// So: white ground, real margins, one typographic hierarchy, tables where the
// numbers are tabular.
//
// VOICE, and it is deliberately two:
//   - Niyora's own labels and chart captions ADDRESS her: "when do you talk to
//     Moon", "what you feel". They are the app pointing at her data.
//   - Anything SHE is saying to whoever reads this stays first person: "my own
//     record", "what I already tried", "what I want to ask", and every line of
//     the closing caveats. Those are hers, not ours, and a clinician needs to
//     hear them in her voice.
// When adding a string, decide which of the two it is before writing it.
//
// Every honesty rule from the text version survives here, because they are the
// document, not decoration: every count sits next to its denominator, a
// predicted phase is marked as estimated, and the closing section says plainly
// what the record is not. A clinician who reads a blank day as a calm day has
// been misled by us, not by her.

import type {
  BandPhase,
  PhaseRow,
  TherapistExport,
} from './therapist-export-types';

// The app's copy rule: never "window", that is forecast jargon.
const PHASE_LABEL: Record<BandPhase, string> = {
  build: 'Rest of cycle',
  pms: 'PMS days',
  period: 'Period days',
};

/** Her words reach this file verbatim, so anything that looks like markup has to
 *  stop being markup before it lands in the document. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const row = (cells: string[], tag: 'td' | 'th' = 'td') =>
  `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;

function phaseRows(phases: PhaseRow[]): string {
  const out: string[] = [];
  let cycle = '';
  for (const p of phases) {
    if (p.cycleStart !== cycle) {
      cycle = p.cycleStart;
      const kind = p.source === 'logged' ? 'measured' : 'estimated';
      out.push(
        `<tr class="group"><td colspan="3">Cycle from ${esc(cycle)} <span class="tag ${p.source}">${kind}</span></td></tr>`,
      );
    }
    const feelings = p.feelings.map((f) => `${esc(f.feeling)} ${f.count}`).join(', ');
    const pct = p.daysInPhase > 0 ? (p.daysLogged / p.daysInPhase) * 100 : 0;
    out.push(
      row([
        `<span class="phase">${PHASE_LABEL[p.phase]}</span>`,
        `<span class="meter"><span class="track"><span class="fill" style="width:${pct.toFixed(0)}%;background:${PHASE_FILL[p.phase]}"></span></span><span class="num">${p.daysLogged} of ${p.daysInPhase} days</span></span>`,
        feelings || '<span class="quiet">nothing written</span>',
      ]),
    );
  }
  return out.join('');
}


// ── The one chart ────────────────────────────────────────────────────────────
// The question a clinician actually has is "does this cluster before her
// period?", and a table makes them hunt for it. So: one row per cycle, the
// phases drawn to scale behind, and one ink dot per entry at the cycle day she
// wrote it. Position carries the answer; the bands only say where she was.
//
// Colours are the validated categorical slots 1-3 (blue/orange/aqua), assigned
// in fixed order to build/PMS/period. Aqua sits under 3:1 on white, so the
// bands are directly labelled AND the phase table below repeats every number
// exactly: that is the relief the contrast warning requires, not a dismissal.
//
// Entries are ink, never coloured by feeling. Colouring them would need six more
// hues and would bury the thing the chart exists to show, which is WHERE they
// fall. Emphasis, not identity.
//
// No hover, no script: this is printed. The table underneath is the accessible
// equivalent, which a paper document needs anyway.
// Brand hues, RE-STEPPED for a white page. theme/colors.ts is tuned for the app's
// near-black ground, and its own phaseHues fail outright here: violet #b373d3 and
// pink #cf6eae measure ΔE 7.3 to normal vision on white, under the floor of 15,
// so even a full-colour reader cannot tell the two bands apart. Same hue family,
// darker step, validated on the light surface instead of assumed.
//
// build is accentViolet's periwinkle sibling (bandBuildActive), pms is accentRose
// itself at hsl(342, 64%) stepped from 66% to 46% lightness. period keeps aqua:
// the brand's third phase colour is orange, which Neha ruled out, and the brand's
// violet sits ΔE 15.3 from the blue, right on the floor. A palette on the line is
// one photocopy away from unreadable, so period takes the hue with real daylight
// between it and the rest.
const PHASE_FILL: Record<BandPhase, string> = {
  build: '#3b71ce',
  pms: '#c02a57',
  period: '#1baf7a',
};

// Chronological within a cycle: day 1 is the period start, PMS is the run-up to
// the next one. The x axis IS cycle day, so this order is not a choice.
const CHART_ORDER: BandPhase[] = ['period', 'build', 'pms'];

const GUTTER = 66;
const PLOT = 424;
const ROW_H = 22;
const ROW_GAP = 15; // room for a stack of same-day entries to rise into

export function cycleChart(doc: TherapistExport): string {
  const byCycle = new Map<string, PhaseRow[]>();
  for (const r of doc.phases) {
    const list = byCycle.get(r.cycleStart) ?? [];
    list.push(r);
    byCycle.set(r.cycleStart, list);
  }
  if (byCycle.size === 0) return '';

  const total = (rows: PhaseRow[]) => rows.reduce((n, r) => n + r.daysInPhase, 0);
  const maxDays = Math.max(...[...byCycle.values()].map(total), 1);
  const x = (day: number) => GUTTER + (day / maxDays) * PLOT;

  const rows = [...byCycle.entries()];
  const height = rows.length * (ROW_H + ROW_GAP) + 34;

  const bands = rows
    .map(([start, phases], i) => {
      const y = i * (ROW_H + ROW_GAP) + 16;
      let day = 0;
      const segs = CHART_ORDER.map((ph) => {
        const r = phases.find((q) => q.phase === ph);
        if (!r || r.daysInPhase === 0) return '';
        const x0 = x(day);
        const w = (r.daysInPhase / maxDays) * PLOT;
        day += r.daysInPhase;
        // 2px surface gap between adjacent fills, per the mark spec.
        return `<rect x="${x0.toFixed(1)}" y="${y}" width="${Math.max(w - 2, 1).toFixed(1)}" height="${ROW_H}" rx="3" fill="${PHASE_FILL[ph]}" fill-opacity="0.18"/>`;
      }).join('');

      // Her entries, placed at the cycle day she wrote them. Two entries on one
      // day used to land on identical coordinates and read as a single dot, so a
      // day she wrote three times looked like a day she wrote once, which is the
      // opposite of what this chart is for. Coincident entries stack upward
      // instead, which is also the honest shape: a taller stack is a heavier day.
      const perDay = new Map<number, number>();
      const dots = doc.excerpts
        .filter((e) => e.cycleDay != null && e.phase != null && inCycle(e.date, start, rows, i))
        .map((e) => {
          const day = e.cycleDay as number;
          const n = perDay.get(day) ?? 0;
          perDay.set(day, n + 1);
          const cx = x(day - 0.5);
          const cy = y + ROW_H / 2 - n * 7.5;
          return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.6" fill="#1c1a22" stroke="#ffffff" stroke-width="1.4"/>`;
        })
        .join('');

      return `<text x="0" y="${y + ROW_H / 2 + 4}" class="rowlab">${esc(start)}</text>${segs}${dots}`;
    })
    .join('');

  // A legend, not just the in-band labels. Those only render where a band is wide
  // enough, so on a short or still-open cycle they silently vanish, and with them
  // the relief that the aqua contrast warning requires. Identity cannot depend on
  // whether the data happened to be roomy.
  const legend = `<p class="legend">${CHART_ORDER.map(
    (ph) =>
      `<span class="key"><span class="sw" style="background:${PHASE_FILL[ph]}"></span>${PHASE_LABEL[ph]}</span>`,
  ).join('')}</p>`;

  return `<figure class="chart">${legend}<svg viewBox="0 0 ${GUTTER + PLOT} ${height}" width="100%" role="img"
    aria-label="Each row is one cycle. Bands show period days, the rest of the cycle, and PMS days. Each dot is an entry, on the day of the cycle you wrote it.">
    ${bands}
    <text x="${GUTTER}" y="${height - 4}" class="axlab">day 1</text>
    <text x="${GUTTER + PLOT}" y="${height - 4}" class="axlab" text-anchor="end">day ${maxDays}</text>
  </svg>
  <figcaption class="chartcap">Each dot is one entry, on the day of the cycle you wrote it. Bands are drawn to the days this record actually covers, so a short band means less was covered, not a short phase.</figcaption>
  </figure>`;
}

/** A moment belongs to the cycle whose start is the latest one on or before it. */
function inCycle(
  date: string,
  start: string,
  rows: [string, PhaseRow[]][],
  i: number,
): boolean {
  const next = rows[i - 1]?.[0]; // rows are newest-first, so the previous row starts later
  return date >= start && (next === undefined || date < next);
}


// ── The two insight bars ─────────────────────────────────────────────────────
// "What do I feel, and when" and "what comes up, and when", as part-to-whole
// bars split by the SAME three phase colours the timeline uses. Colour follows
// the entity across the whole document: orange is PMS everywhere, so the reader
// learns the key once.
//
// Rows are capped, because past a handful this is a table wearing a costume, and
// the exact numbers are already in the tables below.
const TOP_ROWS = 5;

type Split = { label: string; byPhase: Record<BandPhase, number>; total: number };

function splitBars(items: Split[]): string {
  if (items.length === 0) return '';
  const max = Math.max(...items.map((i) => i.total), 1);
  return `<ul class="bars">${items
    .map((it) => {
      const segs = CHART_ORDER.filter((ph) => it.byPhase[ph] > 0)
        .map(
          (ph) =>
            `<span class="seg" style="flex:${it.byPhase[ph]};background:${PHASE_FILL[ph]}" title="${PHASE_LABEL[ph]} ${it.byPhase[ph]}"></span>`,
        )
        .join('');
      return `<li>
        <span class="barlab">${esc(it.label)}</span>
        <span class="bartrack" style="width:${((it.total / max) * 100).toFixed(0)}%">${segs}</span>
        <span class="barnum num">${it.total}</span>
      </li>`;
    })
    .join('')}</ul>`;
}

const emptyPhases = (): Record<BandPhase, number> => ({ build: 0, pms: 0, period: 0 });

/** Feelings summed across every cycle, split by the phase she named them in. */
export function feelingSplit(doc: TherapistExport): Split[] {
  const by = new Map<string, Record<BandPhase, number>>();
  for (const p of doc.phases) {
    for (const f of p.feelings) {
      const rec = by.get(f.feeling) ?? emptyPhases();
      rec[p.phase] += f.count;
      by.set(f.feeling, rec);
    }
  }
  return [...by.entries()]
    .map(([label, byPhase]) => ({
      label,
      byPhase,
      total: byPhase.build + byPhase.pms + byPhase.period,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_ROWS);
}

/** Her threads, already carried per phase by the model. Her words, not ours. */
export function topicSplit(doc: TherapistExport): Split[] {
  return doc.topics
    .map((t) => ({
      label: t.subject,
      byPhase: t.byPhase,
      total: t.byPhase.build + t.byPhase.pms + t.byPhase.period,
    }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_ROWS);
}


// ── Feelings on one cycle band ───────────────────────────────────────────────
// One cycle, drawn once, and each feeling sits where in that cycle she names it.
//
// Cycles are different lengths, so the axis is normalised BY PHASE, not by raw
// day. That is the honest alignment: PMS is defined backwards from the next
// period, so day 20 of a 26-day cycle and day 26 of a 32-day cycle are the same
// place in her body and a different number on a ruler.
//
// A weighted mean alone would lie about a feeling that shows up in two phases:
// average "period" and "PMS" and you get "build", which is where it never
// happens. So each feeling also carries a thin range line across the phases it
// actually occurs in, and the dot marks the balance point within that range.
const BAND_H = 26;
const LANE_H = 20;
const LABEL_W = 88;

type PhaseGeom = { phase: BandPhase; x0: number; w: number; mid: number };

function bandGeometry(doc: TherapistExport): PhaseGeom[] {
  const days = { build: 0, pms: 0, period: 0 } as Record<BandPhase, number>;
  for (const p of doc.phases) days[p.phase] += p.daysInPhase;
  const total = CHART_ORDER.reduce((n, ph) => n + days[ph], 0);
  if (total === 0) return [];
  let x0 = LABEL_W;
  const width = GUTTER + PLOT - LABEL_W;
  return CHART_ORDER.map((phase) => {
    const w = (days[phase] / total) * width;
    const g = { phase, x0, w, mid: x0 + w / 2 };
    x0 += w;
    return g;
  });
}

export function feelingBand(doc: TherapistExport): string {
  const geom = bandGeometry(doc);
  const rows = feelingSplit(doc);
  if (geom.length === 0 || rows.length === 0) return '';

  const height = BAND_H + 10 + rows.length * LANE_H + 6;
  const band = geom
    .map(
      (g) =>
        `<rect x="${g.x0.toFixed(1)}" y="0" width="${Math.max(g.w - 2, 1).toFixed(1)}" height="${BAND_H}" rx="3" fill="${PHASE_FILL[g.phase]}" fill-opacity="0.18"/>` +
        (g.w > 46
          ? `<text x="${g.mid.toFixed(1)}" y="${BAND_H / 2 + 3}" class="bandlab" text-anchor="middle" fill="${PHASE_FILL[g.phase]}">${PHASE_LABEL[g.phase]}</text>`
          : ''),
    )
    .join('');

  const lanes = rows
    .map((r, i) => {
      const y = BAND_H + 16 + i * LANE_H;
      const present = geom.filter((g) => r.byPhase[g.phase] > 0);
      if (present.length === 0) return '';
      const lo = Math.min(...present.map((g) => g.mid));
      const hi = Math.max(...present.map((g) => g.mid));
      const balance =
        present.reduce((n, g) => n + g.mid * r.byPhase[g.phase], 0) /
        present.reduce((n, g) => n + r.byPhase[g.phase], 0);
      const dominant = present.reduce((a, b) =>
        r.byPhase[b.phase] > r.byPhase[a.phase] ? b : a,
      ).phase;
      const range =
        hi > lo
          ? `<line x1="${lo.toFixed(1)}" y1="${y}" x2="${hi.toFixed(1)}" y2="${y}" stroke="${PHASE_FILL[dominant]}" stroke-width="2" stroke-opacity="0.35" stroke-linecap="round"/>`
          : '';
      const ticks = present
        .map(
          (g) =>
            `<circle cx="${g.mid.toFixed(1)}" cy="${y}" r="2.5" fill="${PHASE_FILL[g.phase]}" fill-opacity="0.75"/>`,
        )
        .join('');
      return `<text x="${LABEL_W - 10}" y="${y + 3.5}" class="lanelab" text-anchor="end">${esc(r.label)}</text>${range}${ticks}<circle cx="${balance.toFixed(1)}" cy="${y}" r="4.5" fill="#1c1a22" stroke="#ffffff" stroke-width="1.4"/><text x="${(GUTTER + PLOT).toFixed(0)}" y="${y + 3.5}" class="lanenum" text-anchor="end">${r.total}</text>`;
    })
    .join('');

  return `<figure class="chart"><svg viewBox="0 0 ${GUTTER + PLOT} ${height}" width="100%" role="img"
    aria-label="One cycle across the width. Each feeling sits where in the cycle you name it, with a line across the phases it appears in.">
    ${band}${lanes}
  </svg>
  <figcaption class="chartcap">The band is one cycle. A dot is where a feeling balances out across the cycle; the line behind it shows the phases it really turns up in, so a feeling that happens at both ends is not read as happening in the middle.</figcaption>
  </figure>`;
}

// ── Topics as bubbles ────────────────────────────────────────────────────────
// Size is AREA, not radius: r scales with the square root of the count, or a
// thread mentioned twice as often looks four times as big. Colour is the phase
// it turns up in most, so the key stays the same one used everywhere else.
// The count is printed inside, because area is read approximately at best.
export function topicBubbles(doc: TherapistExport): string {
  const rows = topicSplit(doc);
  if (rows.length === 0) return '';
  const max = Math.max(...rows.map((r) => r.total), 1);
  const R_MAX = 30;
  const R_MIN = 13;

  let x = 0;
  const items = rows.map((r) => {
    const rad = Math.max(R_MIN, R_MAX * Math.sqrt(r.total / max));
    const dominant = CHART_ORDER.reduce((a, b) => (r.byPhase[b] > r.byPhase[a] ? b : a));
    const cx = x + rad;
    x += rad * 2 + 22;
    return { r: rad, cx, dominant, ...r };
  });
  // Same canvas width as the other two charts. A narrow viewBox at width:100%
  // upscales, so three threads would render as three enormous discs while five
  // rendered small: the same data would change size with the count.
  const CANVAS = GUTTER + PLOT;
  const used = Math.max(x - 22, 1);
  const shift = Math.max((CANVAS - used) / 2, 0);
  for (const it of items) it.cx += shift;
  const height = R_MAX * 2 + 26;
  const cy = R_MAX;

  const circles = items
    .map(
      (it) =>
        `<circle cx="${it.cx.toFixed(1)}" cy="${cy}" r="${it.r.toFixed(1)}" fill="${PHASE_FILL[it.dominant]}" fill-opacity="0.22" stroke="${PHASE_FILL[it.dominant]}" stroke-opacity="0.55" stroke-width="1.5"/>` +
        `<text x="${it.cx.toFixed(1)}" y="${cy + 4}" class="bubblenum" text-anchor="middle">${it.total}</text>` +
        `<text x="${it.cx.toFixed(1)}" y="${cy + R_MAX + 16}" class="bubblelab" text-anchor="middle">${esc(it.label)}</text>`,
    )
    .join('');

  return `<figure class="chart"><svg viewBox="0 0 ${CANVAS} ${height}" width="100%" role="img"
    aria-label="Each circle is a thread you keep returning to. Bigger means more often. Colour is the phase it comes up in most.">
    ${circles}
  </svg>
  <figcaption class="chartcap">Bigger means more often. The colour is the phase it comes up in most, and the number is the count, because size is read roughly at best.</figcaption>
  </figure>`;
}

const section = (title: string, body: string) =>
  body ? `<section><h2>${title}</h2>${body}</section>` : '';

/** Render the reviewed model as a self-contained HTML document, ready for
 *  expo-print. `doc` is already filtered: anything she struck in review is gone
 *  before it arrives, so this never decides what to hide. */
export function renderTherapistExportHtml(doc: TherapistExport): string {
  const p = doc.provenance;

  const cycles = doc.cycles.length
    ? `<table class="grid">${row(['Period started', 'Cycle length', 'Days written'], 'th')}${doc.cycles
        .map((c) =>
          row([
            esc(c.start),
            c.lengthDays == null
              ? '<span class="quiet">still open</span>'
              : `<span class="chip">${c.lengthDays}</span> <span class="unit">days</span>`,
            `<span class="chip">${c.daysLogged}</span>`,
          ]),
        )
        .join('')}</table>`
    : '';

  const phases = doc.phases.length
    ? `<table class="grid phases">${phaseRows(doc.phases)}</table>`
    : '';

  const topics = doc.topics.length
    ? `<ul class="topics">${doc.topics
        .map((t) => {
          const spread = (Object.keys(PHASE_LABEL) as BandPhase[])
            .filter((ph) => t.byPhase[ph] > 0)
            .map((ph) => `${PHASE_LABEL[ph].toLowerCase()} ${t.byPhase[ph]}`)
            .join(', ');
          return `<li><strong>${esc(t.subject)}</strong> <span class="chip">${t.count}</span> <span class="unit">times</span>${
            spread ? `<span class="meta">${esc(spread)}</span>` : ''
          }<span class="meta">last ${esc(t.lastSeen)}</span></li>`;
        })
        .join('')}</ul>`
    : '';

  const words = doc.excerpts.length
    ? doc.excerpts
        .map((e) => {
          const where =
            e.phase == null
              ? ''
              : ` · cycle day ${e.cycleDay} · ${PHASE_LABEL[e.phase].toLowerCase()}${
                  e.source === 'predicted' ? ' (estimated)' : ''
                }`;
          return `<figure><figcaption>${esc(e.date)}${where} · ${esc(e.feeling)}</figcaption><blockquote>${esc(
            e.text,
          )}</blockquote></figure>`;
        })
        .join('')
    : '';

  const tried = doc.tried.length
    ? `<ul class="tried">${doc.tried
        .map(
          (t) =>
            `<li><span class="meta">${esc(t.date)}${t.subject ? ` · ${esc(t.subject)}` : ''}</span>${esc(
              t.text,
            )}</li>`,
        )
        .join('')}</ul>`
    : '';

  const questions = doc.questions.length
    ? `<ol class="questions">${doc.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Niyora report</title><style>
  @page { margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  /* Pin the surface. A printable document must never inherit the viewer's theme:
     with only a text colour set, a dark-mode WebView renders dark ink on a dark
     ground and the whole record disappears (seen on device 2026-08-30). Both the
     colour-scheme opt-out and an explicit white background are needed, because
     the first stops the UA restyling and the second stops it inheriting. */
  :root {
    color-scheme: light;
    /* Four sizes, like the app's moon scale. Weight and colour do the rest. */
    --t-head: 21pt; --t-body: 11.5pt; --t-meta: 10pt; --t-micro: 8.5pt;
    /* 4-based, like theme/spacing. */
    --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s6: 24px; --s8: 32px;
    --ink: #1c1a22; --ink-2: #46424f; --ink-3: #6f6a79; --ink-4: #9b96a3;
    --rule: #e2dfe7; --rule-soft: #efedf2; --wash: #faf9fb;
  }
  html, body { background: #ffffff; }
  body {
    font: var(--t-body)/1.6 -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: var(--ink); margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* Gutters for the on-screen read. @page margins only exist when it is actually
     printed, so without this the document runs edge to edge in a browser and in
     the share-sheet preview. Capped so a wide viewport does not stretch a line of
     prose past a comfortable measure. */
  .page { max-width: 700px; margin: 0 auto; padding: var(--s8) var(--s6); }
  @media print { .page { max-width: none; margin: 0; padding: 0; } }

  header { padding-bottom: var(--s3); margin-bottom: var(--s6); border-bottom: 2px solid var(--ink); }
  h1 { font-size: var(--t-head); margin: 0 0 var(--s1); letter-spacing: -0.3px; font-weight: 600; }
  .span { font-size: var(--t-meta); color: var(--ink-2); }
  .coverage { font-size: var(--t-meta); color: var(--ink-2); margin-top: 1px; }
  .stated { font-size: var(--t-meta); color: var(--ink-3); margin-top: var(--s2); font-style: italic; }

  /* A rule between sections, so hierarchy is visible without more type sizes. */
  section { margin: 0 0 var(--s6); padding-top: var(--s4); border-top: 1px solid var(--rule-soft); page-break-inside: avoid; }
  section:first-of-type { padding-top: 0; border-top: 0; }
  h2 {
    font-size: var(--t-micro); text-transform: uppercase; letter-spacing: 1.3px;
    color: var(--ink); margin: 0 0 var(--s3); font-weight: 800;
  }
  /* The rule under a heading gives the section a top edge the eye can catch. */
  h2::after {
    content: ''; display: block; width: 26px; height: 2px; margin-top: 5px;
    background: var(--ink); opacity: 0.85;
  }

  table.grid { width: 100%; border-collapse: collapse; }
  .grid th {
    text-align: left; font-size: var(--t-micro); text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--ink-3); padding: 0 var(--s2) var(--s1) 0; border-bottom: 1px solid var(--rule);
  }
  .grid td { padding: var(--s2) var(--s2) var(--s2) 0; border-bottom: 1px solid var(--rule-soft); vertical-align: top; }
  .grid tr.group td { padding-top: var(--s4); border-bottom: 1px solid var(--rule); font-weight: 600; font-size: var(--t-body); }
  .phase { color: var(--ink-2); }
  .num { font-variant-numeric: tabular-nums; }
  /* Numbers wear a chip so a reader scanning for quantities finds them without
     reading the sentence around them. */
  .chip {
    display: inline-block; font-variant-numeric: tabular-nums; font-weight: 650;
    font-size: 0.94em; line-height: 1.35; padding: 1px 7px; border-radius: 999px;
    background: #eeecf3; color: var(--ink);
  }
  .unit { color: var(--ink-3); font-size: var(--t-meta); }
  .quiet { color: var(--ink-4); }
  .tag {
    font-size: var(--t-micro); text-transform: uppercase; letter-spacing: 0.6px;
    padding: 1px var(--s1); border-radius: 3px; margin-left: var(--s2); font-weight: 700;
  }
  .tag.logged { background: #e6efe7; color: #2f5d3a; }
  .tag.predicted { background: #f4efe4; color: #6b5a2e; }

  figure.chart { margin: 0; }
  .legend { margin: 0 0 var(--s3); font-size: var(--t-meta); color: var(--ink-2); }
  .key { margin-right: var(--s4); white-space: nowrap; }
  .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; opacity: 0.9; }
  .rowlab { font-size: var(--t-micro); fill: var(--ink-3); }
  .axlab { font-size: var(--t-micro); fill: var(--ink-4); }
  .chartcap { font-size: var(--t-meta); color: var(--ink-3); margin-top: var(--s2); line-height: 1.45; }

  /* Part-to-whole rows: label, bar, count. 2px gaps between segments. */
  .lanelab { font-size: var(--t-meta); fill: var(--ink); font-weight: 600; }
  .lanenum { font-size: var(--t-micro); fill: var(--ink-3); }
  .bandlab { font-size: var(--t-micro); font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase; }
  .bubblenum { font-size: var(--t-meta); font-weight: 600; fill: var(--ink); }
  .bubblelab { font-size: var(--t-meta); fill: var(--ink); font-weight: 600; }
  ul.bars { list-style: none; margin: 0; padding: 0; }
  ul.bars li { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s2); }
  .barlab { flex: 0 0 96px; font-size: var(--t-meta); color: var(--ink); font-weight: 600; }
  .bartrack { display: flex; gap: 2px; height: 11px; border-radius: 3px; overflow: hidden; min-width: 8px; }
  .seg { display: block; }
  .barnum { flex: 0 0 auto; font-size: var(--t-meta); color: var(--ink-3); }

  .meter { display: block; }
  .meter .track { display: block; height: 4px; border-radius: 2px; background: var(--rule-soft); margin-bottom: 3px; max-width: 120px; overflow: hidden; }
  .meter .fill { display: block; height: 100%; border-radius: 2px; }

  ul.topics, ul.tried, ol.questions { margin: 0; padding-left: var(--s4); }
  ul.topics li, ul.tried li, ol.questions li { margin-bottom: var(--s2); }
  .meta { color: var(--ink-3); font-size: var(--t-meta); margin-right: var(--s2); }

  figure { margin: 0 0 var(--s3); }
  figcaption { font-size: var(--t-meta); color: var(--ink-3); margin-bottom: 3px; }
  blockquote { margin: 0; padding: var(--s2) var(--s3); border-left: 3px solid var(--rule); background: var(--wash); }

  footer {
    margin-top: var(--s6); padding: var(--s3) var(--s4); border: 1px solid var(--rule);
    border-radius: 4px; background: var(--wash); page-break-inside: avoid;
  }
  footer h2 { margin-bottom: var(--s2); }
  footer ul { margin: 0; padding-left: var(--s4); }
  footer li { font-size: var(--t-meta); color: var(--ink-2); margin-bottom: var(--s1); }
</style></head><body><div class="page">
  <header>
    <h1>Niyora report</h1>
    <div class="span">${esc(p.from)} to ${esc(p.to)} · ${p.spanDays} days · ${p.cyclesCovered} cycles</div>
    <div class="coverage">Wrote on <span class="chip">${p.daysLogged} of ${p.spanDays}</span> days · <span class="chip">${p.entries}</span> entries</div>
    <div class="stated">Written by me, in the moment. Self-reported. Not a diagnosis.</div>
  </header>
  ${section('When do you talk to Moon?', cycleChart(doc))}
  ${section('What you feel, and when', feelingBand(doc))}
  ${section('What keeps coming up', topicBubbles(doc))}
  ${section('Cycles', cycles)}
  ${section('By phase', phases)}
  ${section('Threads in detail', topics)}
  ${section('In my words', words)}
  ${section('What I already tried', tried)}
  ${section('What I want to ask', questions)}
  <footer>
    <h2>What this report is not</h2>
    <ul>
      <li>A day with no entry is a day I did not write, not a day without symptoms.</li>
      <li>Phases marked estimated come from my typical cycle length, not a logged period.</li>
      <li>There are no daily severity ratings here, so this is not a DRSP chart.</li>
    </ul>
  </footer>
</div></body></html>`;
}
