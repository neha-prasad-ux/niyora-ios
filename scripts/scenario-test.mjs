// Scenario harness for the Reflect + Respond prompts.
//
// Runs the REAL prompts (src/lib/moment-prompts.ts) against the REAL model and
// backend the app uses (Firebase AI Logic -> Vertex, gemini-2.5-pro), off the
// phone, so a prompt change can be judged by reading its output instead of
// rebuilding the app and typing into it.
//
// It replays the app's own user turns verbatim (see moment.tsx: the card fetch,
// moreReads, draftAct), including the "already offered" clause, so the repetition
// you see here is the repetition she gets.
//
//   node --experimental-strip-types scripts/scenario-test.mjs [--out FILE] [--tag NAME]
//
// Auth: the Firebase API key from GoogleService-Info.plist, exactly what the app
// ships with. No extra secret to manage.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REFLECT_CARDS,
  detectSignals,
  detectTimeframe,
  routeCards,
} from '../src/v3/reflect-cards.ts';
import { SLOT_INSTRUCTION, TIME_NOTE, VOICE } from '../src/lib/moment-prompts.ts';
// The app does NOT send the bare act label. moment.tsx line ~1047 sends
// personalisedLabel(act, herText), so the real act_help turn reads "her move: Tell
// your mum what's not okay". The harness sent the bare "Say what's not okay" until
// 2026-08-20, which means every respond draft measured before that date was
// produced WITHOUT the one piece of relationship information the app actually
// supplies. Fixed here: the harness now replays the app's turn.
import { ACTS } from '../src/v3/moment-copy.ts';
import { personalisedLabel } from '../src/v3/option-plan.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// FLASH BY DEFAULT (2026-08-21). This harness is not free: a single full run is
// about 120 calls, and a session of before/after comparisons quietly ran up most
// of a month's Vertex bill on a product with no paying users yet. Flash is around
// a tenth the price and is fine for exploring whether a prompt change does
// anything at all.
//
// Pass --model gemini-2.5-pro for the FINAL check only, once a change looks
// worth confirming against what actually ships. Never for exploratory arms.
const MODEL = process.argv.includes('--model')
  ? process.argv[process.argv.indexOf('--model') + 1]
  : 'gemini-2.5-flash';
const LOCATION = 'us-central1';

// Same plist the app is built with, so the harness cannot drift onto a different
// project or model than the one she actually talks to.
const plist = execFileSync('python3', [
  '-c',
  "import plistlib,sys;p=plistlib.load(open(sys.argv[1],'rb'));print(p['PROJECT_ID']);print(p['API_KEY'])",
  resolve(ROOT, 'GoogleService-Info.plist'),
])
  .toString()
  .trim()
  .split('\n');
const [PROJECT, API_KEY] = plist;
// WHERE THIS RUNS, and why it is not where the app runs (2026-08-21).
//
// The app talks to Vertex, because Vertex carries enterprise terms and her words
// are never used for training. That is the promise the privacy policy makes and
// it is not negotiable for real entries.
//
// The scenarios in this file are FICTION. Nobody's mum said any of it. So there
// is no reason to spend the Vertex budget on them, and the free Gemini Developer
// API is the right place to test: same models, same prompts, no bill.
//
// Set GEMINI_API_KEY (aistudio.google.com/apikey, free tier) and runs cost
// nothing. Without it this falls back to Vertex and bills the project, which is
// how a session of before/after comparisons quietly ran up most of a month.
//
// NEVER point the APP at this endpoint. Free-tier terms allow Google to use the
// data, which is exactly what the app promises it does not do.
// Read from the environment, or from .env.local, which is already gitignored and
// is where this repo keeps local-only secrets. Both work; the file means it
// survives a new shell, which the export does not.
function freeKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    const env = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
    return env.match(/^GEMINI_API_KEY=(.+)$/m)?.[1]?.trim();
  } catch {
    return undefined;
  }
}
const FREE_KEY = freeKey();
const URL = FREE_KEY
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${FREE_KEY}`
  : `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent?key=${API_KEY}`;
if (!FREE_KEY) {
  console.error(
    '\n  ! No GEMINI_API_KEY set, so this run bills your Vertex project.\n' +
      '    Free key: https://aistudio.google.com/apikey  then: export GEMINI_API_KEY=...\n',
  );
}

// --- the scenarios --------------------------------------------------------
//
// Built around the axes that decide whether the flow lands: WHEN it happened
// (mid-issue / just now / long-standing), how much she wrote, and which
// distortion is in play. `feeling` is what she would have tapped on the feeling
// beat. `recurring` is what her on-device history would say.

const SCENARIOS = [
  {
    id: 'acute_partner',
    when: 'acute (mid-issue)',
    feeling: 'Hurt',
    text: "we are in the middle of a fight right now. he walked out of the room while i was still talking and shut the door. i'm shaking and he's in the kitchen.",
  },
  {
    id: 'acute_work',
    when: 'acute (just happened)',
    feeling: 'Humiliated',
    text: "my manager cut me off in standup ten minutes ago, in front of the whole team, and said we don't have time for this. i have another meeting with him in an hour.",
  },
  {
    id: 'acute_short',
    when: 'acute (just happened)',
    feeling: 'Anxious',
    text: "he didn't text back",
  },
  {
    id: 'longstanding_mum',
    history: [
      '"mum asked if i had put on weight before i even sat down" (she felt Hurt)',
      '"she said the dress would look better if i lost a bit. i said nothing again" (she felt Ashamed)',
      '"dreading sunday lunch at mums already" (she felt Anxious)',
    ],
    when: 'long-standing (years)',
    feeling: 'Unappreciated',
    recurring: true,
    text: 'every single time i visit my mum she finds something to say about my weight. it has been like this for fifteen years and i still let it get to me.',
  },
  {
    id: 'longstanding_work',
    history: [
      '"they gave the lead role to someone who joined after me" (she felt Defeated)',
      '"asked for feedback and got told keep doing what you are doing" (she felt Frustrated)',
      '"second time i have been told next cycle" (she felt Unappreciated)',
    ],
    when: 'long-standing (years)',
    feeling: 'Defeated',
    recurring: true,
    text: 'i have been passed over for the lead role three times in two years. i keep telling myself next time. i am starting to think i am the problem.',
  },
  {
    id: 'longstanding_friend',
    history: [
      '"she cancelled again, third time in a row" (she felt Lonely)',
      '"our texts are all logistics now" (she felt Sad)',
    ],
    when: 'long-standing (drift)',
    feeling: 'Lonely',
    recurring: true,
    text: 'my closest friend and i have been drifting for about two years. we still text but it feels like admin now. i do not know when it changed.',
  },
  {
    id: 'longstanding_money',
    history: [
      '"argued about the credit card again" (she felt Angry)',
      '"he says he will track spending and then does not" (she felt Frustrated)',
      '"i am the only one who looks at the account" (she felt Alone)',
    ],
    when: 'long-standing (recurring fight)',
    feeling: 'Angry',
    recurring: true,
    text: 'we had the same argument about money again last night. it is always the same argument and nothing ever changes after it.',
  },
  {
    id: 'vague_mood',
    when: 'no event',
    feeling: 'Overwhelmed',
    text: 'everything is too much today',
  },
  {
    id: 'selfblame_parent',
    when: 'acute (this morning)',
    feeling: 'Guilty',
    text: 'i snapped at my daughter this morning because i was tired and she was slow getting ready. now i feel like a terrible mother.',
  },
  {
    id: 'mindreading_friend',
    when: 'acute (today)',
    feeling: 'Rejected',
    text: 'i sent my friend a long voice note about my week and she replied with one word. she is annoyed with me, i know it.',
  },
  {
    id: 'catastrophe_health',
    when: 'future-facing',
    feeling: 'Scared',
    text: 'i have a scan on friday and i keep thinking they will find something and my kids will grow up without me.',
  },
  {
    id: 'absolute_presentation',
    when: 'acute (today)',
    feeling: 'Ashamed',
    text: 'i messed up the presentation. i always ruin everything that actually matters.',
  },
  {
    id: 'long_detailed',
    history: [
      '"did her handover notes again this week" (she felt Unappreciated)',
      '"picked up two of her tickets and said nothing" (she felt Resentful)',
    ],
    when: 'long-standing (months)',
    feeling: 'Unappreciated',
    recurring: true,
    text: "i have been covering for my colleague for about four months now, doing her handover notes and picking up the tickets she drops, and today my lead thanked her in the team channel for the turnaround on the backlog. i didn't say anything. i just sat there. i keep telling myself it doesn't matter who gets named but it does, and i don't know if i am being petty or if i have let this go on too long.",
  },
];

// The Respond beat. Widened 2026-08-20 from one act on 9 scenarios to a LIST per
// scenario across all 13, because the drafts were being judged on a slice that
// never once covered a repair, a limit to a manager, or telling a third person.
// The move decides the SHAPE of the message (a request, a limit, a repair and a
// question are four different objects), so a prompt that is only ever measured on
// "Say it to them" is measured on one shape out of four.
//
// Every non-gated act in ACTS now appears at least once, and the two recipients
// that break a draft hardest, a mother and a manager, each carry a direct message.
const RESPOND_ACTS = {
  acute_partner: ['Say it to them', "Say what's not okay"],
  acute_work: ['Work out what I want', "Say what's not okay", 'Say it to them'],
  acute_short: ['Ask for the thing', 'Let it be'],
  longstanding_mum: ["Say what's not okay", 'Say it to them', 'Tell one person'],
  longstanding_work: ['Get the full story', 'Ask for the thing'],
  longstanding_friend: ['Say it to them', 'Own my part'],
  longstanding_money: ['Say it to them', 'Work out what I want'],
  vague_mood: ['Look after myself', 'Take something off my plate'],
  selfblame_parent: ['Own my part', 'Look after myself'],
  mindreading_friend: ['Get the full story', 'Ask for the thing'],
  catastrophe_health: ['Look after myself', 'Tell one person'],
  absolute_presentation: ['Own my part', 'Get the full story'],
  long_detailed: ['Say it to them', 'Bring in the right person', 'Get it ready'],
};

// --- transport ------------------------------------------------------------

// thinkingBudget is a flag here on purpose. The app shipped 0 until 2026-08-19,
// and the run that day showed the anti-echo rule ("check the line, delete it if
// she could have written it") barely holding. A check-then-delete rule needs
// somewhere to run, so the app now ships 512 and this flag re-measures the trade.
// `--thinking 512` re-runs the same scenarios with room to think, so the trade
// against latency can be judged on output rather than guessed at.
const THINKING = process.argv.includes('--thinking')
  ? Number(process.argv[process.argv.indexOf('--thinking') + 1])
  : 0;
// --cards need,signal  forces the card set instead of routeCards(), so a card the
// router almost never reaches (shame and friend never fire on any of the 13
// scenarios) can still be measured. Default is unchanged: the routed set.
const ONLY_CARDS = process.argv.includes('--cards')
  ? process.argv[process.argv.indexOf('--cards') + 1].split(',')
  : null;
let calls = 0;
let totalMs = 0;
// Tokens actually billed, so a run says what it cost instead of leaving it to be
// discovered on a billing page three weeks later.
const spent = { in: 0, out: 0 };

async function gemini(system, user) {
  const body = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: {
      temperature: 0.6,
      // maxOutputTokens covers THINKING TOKENS TOO. The first --thinking 512 run
      // returned mostly empty because the 256 cap was spent before a word of the
      // reply. Any thinking budget the app adopts has to raise this cap with it.
      maxOutputTokens: THINKING + 400,
      thinkingConfig: { thinkingBudget: THINKING },
    },
  };
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      const j = await res.json();
      const u = j?.usageMetadata ?? {};
      spent.in += u.promptTokenCount ?? 0;
      spent.out += (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
      const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      if (text.trim()) {
        calls++;
        totalMs += performance.now() - t0;
        return text.trim();
      }
    } catch {
      /* fall through to retry */
    }
    await new Promise((r) => setTimeout(r, 500 + i * 500));
  }
  return '';
}

const call = (slot, user) => gemini(`${VOICE}\n\n${SLOT_INSTRUCTION[slot]}`, user);

// Same defensive JSON parse the app uses (moment-ai.ts): slice first { to last }.
function parseJson(out) {
  try {
    return JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
}

// --- the run --------------------------------------------------------------

const CARDS_PER_SCENARIO = 3;
const PULLS = 3; // pull 1 = the card as she first sees it; 2 and 3 = "Show me more"

async function runScenario(s) {
  const rows = [];
  const tf = detectTimeframe(s.text);
  const cards = routeCards(detectSignals(s.text, s.recurring ?? false));
  const usable = (ONLY_CARDS ?? cards)
    .filter((id) => REFLECT_CARDS[id]?.slot && REFLECT_CARDS[id].mode !== 'question')
    .slice(0, ONLY_CARDS ? ONLY_CARDS.length : CARDS_PER_SCENARIO);

  for (const [cardIdx, id] of usable.entries()) {
    const card = REFLECT_CARDS[id];
    const offered = [];
    let lastChain = null;
    for (let pull = 1; pull <= PULLS; pull++) {
      // The app's user turn, verbatim (moment.tsx card fetch / moreReads /
      // themesClause / timeClause).
      const already = offered.length ? `\nalready offered: ${JSON.stringify(offered)}` : '';
      // The rule card re-rolls through its own path in the app, which now feeds the
      // last chain back (moment.tsx lastRule). Replay that here or the repeat rate
      // for `rule` is measured against a turn the app never sends.
      const shownRule =
        id === 'rule' && lastChain
          ? `\nyou already showed her this rule: "${lastChain.rule}" with these tests: ${JSON.stringify(lastChain.tests)}. She asked again, so find a DIFFERENT rule underneath this, or test the same rule from a genuinely different direction. Do not return what you returned before.`
          : '';
      const themes =
        id === 'pattern' && s.history
          ? `\nwhat she brought here before on this thread:\n${s.history.map((h) => `- ${h}`).join('\n')}`
          : '';
      const user = `she wrote: "${s.text}"\nshe feels: ${s.feeling}${themes}${already}${shownRule}${TIME_NOTE[detectTimeframe(s.text)] ?? ''}`;
      const out = await call(card.slot, user);
      if (id === 'rule') lastChain = parseJson(out);
      const lines =
        id === 'rule'
          ? ruleLines(parseJson(out))
          : card.mode === 'draft'
            ? [out.replace(/^["']|["']$/g, '').trim()].filter(Boolean)
            : (parseJson(out)?.options ?? []).map(String);
      lines.forEach((line, i) =>
        rows.push({
          scenario: s.id,
          when: s.when,
          read: tf,
          text: s.text,
          feeling: s.feeling,
          routed: cards.slice(0, 6).join(' > '),
          cardIdx: cardIdx + 1,
          card: id,
          title: card.title,
          pull,
          lineIdx: i + 1,
          line,
          words: line.split(/\s+/).filter(Boolean).length,
        }),
      );
      offered.push(...lines);
      if (lines.length === 0)
        rows.push({
          scenario: s.id,
          when: s.when,
          read: tf,
          text: s.text,
          feeling: s.feeling,
          routed: cards.slice(0, 6).join(' > '),
          cardIdx: cardIdx + 1,
          card: id,
          title: card.title,
          pull,
          lineIdx: 0,
          line: '(EMPTY, model declined or reply unparseable)',
          words: 0,
        });
    }
  }
  return rows;
}

// The rule card returns a chain, not a list. Flatten it so it lands in the sheet
// beside the other reads.
function ruleLines(j) {
  if (!j) return [];
  return [
    j.event && `[what happened] ${j.event}`,
    j.rule && `[the rule] ${j.rule}`,
    j.consequence && `[how it feels] ${j.consequence}`,
    ...(Array.isArray(j.tests) ? j.tests.map((t) => `[test] ${t}`) : []),
  ].filter(Boolean);
}

// The tap-to-open depth (reflect_expand). Takes the first read the run produced
// for this scenario and opens THAT line out, which is the thing she has no way to
// do today.
async function runExpand(s, reflectRows) {
  const first = reflectRows.find(
    (r) => r.scenario === s.id && r.line && !r.line.startsWith('(EMPTY'),
  );
  if (!first) return [];
  const time = TIME_NOTE[detectTimeframe(s.text)] ?? '';
  const user = `she wrote: "${s.text}"\nshe feels: ${s.feeling}\nthe read she tapped: "${first.line}"${time}`;
  const out = await call('reflect_expand', user);
  return [
    {
      scenario: s.id,
      when: s.when,
      text: s.text,
      card: first.card,
      read: first.line,
      expanded: out,
      words: out.split(/\s+/).filter(Boolean).length,
    },
  ];
}

async function runRespond(s) {
  const acts = RESPOND_ACTS[s.id] ?? [];
  const time = (TIME_NOTE[detectTimeframe(s.text)] ?? '').trim();
  const rows = [];
  for (const act of acts) {
    // The label the app would show and send, her person filled in where the act
    // addresses one. Falls back to the authored label when her text names nobody,
    // which is exactly the "who is this" gap the prompt has to survive.
    const found = ACTS.find((a) => a.label === act);
    const label = found ? personalisedLabel(found, s.text) : act;
    const user = `she wrote: "${s.text}"\nshe feels: ${s.feeling}\nher move: ${label}${time ? `\n${time}` : ''}`;
    const draft = await call('act_help', user);
    rows.push({
      scenario: s.id,
      when: s.when,
      text: s.text,
      feeling: s.feeling,
      act,
      label,
      draft,
      words: draft.split(/\s+/).filter(Boolean).length,
    });
  }
  return rows;
}

// Small concurrency pool: the burst that makes the app throw 429s is the same
// burst here, so keep it modest.
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const item = items[i++];
        out.push(await fn(item));
        process.stderr.write('.');
      }
    }),
  );
  return out.flat();
}

const args = process.argv.slice(2);
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'scenario-results.json';
const tag = args.includes('--tag') ? args[args.indexOf('--tag') + 1] : 'baseline';

// --only respond skips the 117 reflect calls and the expansions (2026-08-20). A
// respond-side prompt change cannot move a reflect line, and paying ~10x the calls
// and the wall clock to re-measure something that cannot have changed is the
// reason nobody runs this twice a side. Default is unchanged: everything.
const ONLY = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const reflect = ONLY === 'respond' ? [] : await pool(SCENARIOS, 3, runScenario);
const respond = await pool(SCENARIOS, 3, runRespond);
const expand = ONLY === 'respond' ? [] : await pool(SCENARIOS, 3, (s) => runExpand(s, reflect));
process.stderr.write('\n');

writeFileSync(
  outFile,
  JSON.stringify(
    {
      tag,
      model: MODEL,
      thinkingBudget: THINKING,
      avgCallMs: Math.round(totalMs / Math.max(calls, 1)),
      at: new Date().toISOString(),
      reflect,
      respond,
      expand,
    },
    null,
    2,
  ),
);
console.log(
  `${reflect.length} reflect lines, ${respond.length} respond drafts, ${expand.length} expansions -> ${outFile}`,
);
// Vertex list price per million, USD. Verify before trusting: Google moves these.
const RATE = MODEL.includes('pro') ? { in: 1.25, out: 10 } : { in: 0.3, out: 2.5 };
const usd = (spent.in / 1e6) * RATE.in + (spent.out / 1e6) * RATE.out;
console.log(
  `${MODEL} · ${calls} calls · ${spent.in} in / ${spent.out} out tokens · ` +
    (FREE_KEY ? 'free tier, no charge' : `about $${usd.toFixed(2)} billed to Vertex`),
);
