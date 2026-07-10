// "Us vs. the PMS": the couples shelf. Four activities that help a couple stay
// on the same side through the hard week, framed as us-against-the-PMS (narrative
// externalization) rather than partner-against-partner.
//
// Two voices live here:
//   - App voice (quiz, prep, reconnect, headers): the same frank, warm register
//     as game-content.ts. No em dashes, no exclamation points, no emoji. Guarded
//     by couples-content.test.ts.
//   - Shareable texts (COUPLES_TEXTS): casual messages the user sends to their
//     partner. These intentionally keep emoji and a lighter tone, so they are
//     exempt from the app-voice copy guard.
//
// The partner can be any gender. All copy is gender-neutral (you / I / we / they),
// enforced by a test: no standalone he/she/him/his/her.
//
// Science behind each piece:
//   - PMS-or-real: confirming something is cyclical clinically needs prospective
//     daily tracking across >=2 cycles (the DRSP). The quiz stands in for that
//     with timing + amplification + persistence checks; ties resolve to "real" so
//     a genuine issue is never dismissed as "just hormones".
//   - Reconnect: Gottman's aftermath-of-a-fight + bids-for-connection work.
//   - Prep: pre-committing preferences while calm beats in-the-moment negotiation
//     (adapted from DBT crisis-planning); targets the demand-withdraw "eggshells"
//     pattern.
//   - Desire text + prep item: sexual desire shifts across the cycle, often
//     dipping premenstrually as progesterone rises (Roney & Simmons 2013). Naming
//     it stops a partner misreading a low-desire week as rejection (Basson's
//     responsive-desire model).

// --- 1. Is it PMS or a real issue? (yes/no quiz) -------------------------

export type QuizSide = 'pms' | 'real';

export type PmsOrRealQuestion = {
  id: string;
  question: string;
  // Which side a "yes" points to. A "no" points to the opposite side, so every
  // answer contributes a vote (see scoreQuiz).
  yesLeansTo: QuizSide;
};

export const COUPLES_QUIZ: readonly PmsOrRealQuestion[] = [
  { id: 'q-timing', question: 'Are you in the week or so before your period right now?', yesLeansTo: 'pms' },
  { id: 'q-recurs', question: 'Has this same feeling shown up around this point in past cycles?', yesLeansTo: 'pms' },
  { id: 'q-eases', question: 'When your period starts, does this usually ease off within a day or two?', yesLeansTo: 'pms' },
  { id: 'q-size', question: 'Does how big this feels seem out of proportion to what set it off?', yesLeansTo: 'pms' },
  { id: 'q-calm', question: 'Does this still bother you in the calm weeks, not just now?', yesLeansTo: 'real' },
  { id: 'q-persists', question: 'If nothing about your partner changed, would this still feel like a problem next week?', yesLeansTo: 'real' },
  { id: 'q-concrete', question: 'Is this about something concrete that keeps happening, more than a mood?', yesLeansTo: 'real' },
];

// Every answer votes: a "yes" for its side, a "no" for the other side. Higher
// side wins. On a tie we return "real" on purpose, so a genuine issue is never
// waved away as the cycle.
export function scoreQuiz(answers: Readonly<Record<string, boolean>>): QuizSide {
  let pms = 0;
  let real = 0;
  for (const q of COUPLES_QUIZ) {
    const yes = answers[q.id];
    const side: QuizSide = yes ? q.yesLeansTo : q.yesLeansTo === 'pms' ? 'real' : 'pms';
    if (side === 'pms') pms += 1;
    else real += 1;
  }
  return pms > real ? 'pms' : 'real';
}

export const QUIZ_RESULT: Record<QuizSide, { title: string; body: string }> = {
  pms: {
    title: 'Likely the cycle talking',
    body: 'This one looks cycle amplified. The feeling is real, but the size of it is probably the wave. Let it pass before you draw any conclusions.',
  },
  real: {
    title: 'Likely a real issue',
    body: 'This looks like a real issue, not just the cycle. It deserves a calm, honest talk when you are both regulated, not in the middle of the hard week.',
  },
};

// Shown under both results, verbatim.
export const QUIZ_FOOTER =
  'Never resolve a big relationship question during the flooded moment or the luteal peak. Feelings in the moment are real; conclusions drawn in the moment are unreliable. Decide when calm.';

// --- 2. Texts you can share (casual, emoji allowed) ---------------------

export type ShareText = { id: string; tone: string; text: string };
export type TextGroup = { id: string; title: string; items: readonly ShareText[] };

export const COUPLES_TEXTS: readonly TextGroup[] = [
  {
    id: 'heads-up',
    title: 'A heads-up',
    items: [
      { id: 'hu-warm', tone: 'Warm', text: "Heads up, my hard week's starting. If I get short, it's the hormones and not you. Bear with me 💛" },
      { id: 'hu-playful', tone: 'Playful', text: 'Incoming: gremlin week. Same me, worse signal. Snacks and patience appreciated.' },
      { id: 'hu-direct', tone: 'Direct', text: "My hard week's here. I might need more space than usual. Nothing's wrong between us." },
      { id: 'hu-reassuring', tone: 'Reassuring', text: "Even when I'm off this week, I'm still glad it's you." },
    ],
  },
  {
    id: 'in-the-moment',
    title: 'In the moment',
    items: [
      { id: 'm-space', tone: 'Need space', text: "I'm pulling back to cool down. Not the silent treatment, I'll come find you." },
      { id: 'm-closeness', tone: 'Need closeness', text: "I'm not okay. You don't have to fix anything, I just want you near." },
    ],
  },
  {
    id: 'repair',
    title: 'After a rough moment',
    items: [
      { id: 'r-apology', tone: 'Apologetic', text: "I snapped earlier and that wasn't fair to you. I'm sorry. It's been a rough day in my head." },
      { id: 'r-tender', tone: 'Tender', text: 'Thank you for not matching my energy earlier. That helped more than you know.' },
    ],
  },
  {
    id: 'desire',
    title: 'About desire',
    items: [
      { id: 'd-lowbattery', tone: 'Low-battery', text: "My body's in low-battery mode this week, desire included. It's the cycle, not you. Still want you close." },
      { id: 'd-raincheck', tone: 'Rain check', text: "Not much in the mood this week, and it's nothing about us. It usually comes back. Cuddles very much still on the table." },
    ],
  },
];

// --- 3. Prep well together (two-track yes/no -> shared checklist) --------

export type PrepTrack = 'you' | 'partner';
export type PrepQuestion = {
  id: string;
  track: PrepTrack;
  question: string;
  // The shared-checklist line this "yes" unlocks. Written as a neutral shared
  // agreement so either partner can read it.
  ifYes: string;
};

export const PREP_QUESTIONS: readonly PrepQuestion[] = [
  {
    id: 'you-quiet',
    track: 'you',
    question: 'In your hard week, do you sometimes go quiet or pull away?',
    ifYes: 'Going quiet in the hard week is self-regulation, not the silent treatment.',
  },
  {
    id: 'you-space',
    track: 'you',
    question: 'When you feel low, do you usually want space before closeness?',
    ifYes: 'Offer space first in the hard week, then check in about closeness.',
  },
  {
    id: 'you-normal',
    track: 'you',
    question: 'Does it help when normal life keeps going, instead of being treated as fragile?',
    ifYes: 'Keep normal life going. Support is not taking over.',
  },
  {
    id: 'you-headsup',
    track: 'you',
    question: 'Do you want a heads-up sent when the hard week starts?',
    ifYes: 'A heads-up goes out when the hard week starts.',
  },
  {
    id: 'you-desire',
    track: 'you',
    question: 'Does your interest in sex usually dip in your hard week?',
    ifYes: 'A lower-desire week is the cycle, not rejection. Naming it keeps it from being misread.',
  },
  {
    id: 'partner-tiptoe',
    track: 'partner',
    question: 'Do you ever feel unsure which mood you will get, and end up tiptoeing?',
    ifYes: 'Name it together: no tiptoeing. Trust the plan instead of guessing.',
  },
  {
    id: 'partner-personally',
    track: 'partner',
    question: 'Do you take it personally when your partner pulls back?',
    ifYes: 'Pulling back is the PMS, not a verdict on the relationship.',
  },
  {
    id: 'partner-silent',
    track: 'partner',
    question: 'Do you tend to go silent when things get tense?',
    ifYes: 'Going silent reads as stonewalling. Say "I need a short break, back in 20" instead.',
  },
  {
    id: 'partner-signal',
    track: 'partner',
    question: 'Can you respond to what was asked for without needing it explained each time?',
    ifYes: 'Respond to what was asked for, not to a reading of a face.',
  },
];

// Always present on the assembled plan, regardless of answers.
export const CORE_PREP_ITEMS: readonly { id: string; label: string }[] = [
  { id: 'core-side', label: 'We are on the same side. The problem is the PMS, not each other.' },
  { id: 'core-bury', label: 'Bury nothing. Real issues get tabled for a calm week, not swept away.' },
  { id: 'core-break', label: 'A break always comes with a return time.' },
];

export type PrepPlanItem = { id: string; label: string };

// Assemble the shared checklist: core items first, then one line per "yes".
export function buildPrepChecklist(answers: Readonly<Record<string, boolean>>): PrepPlanItem[] {
  const items: PrepPlanItem[] = CORE_PREP_ITEMS.map((c) => ({ id: c.id, label: c.label }));
  for (const q of PREP_QUESTIONS) {
    if (answers[q.id]) items.push({ id: q.id, label: q.ifYes });
  }
  return items;
}

// --- 4. How to reconnect (checklist) ------------------------------------

export type ReconnectStep = { id: string; label: string; examples: string };

export const RECONNECT_STEPS: readonly ReconnectStep[] = [
  {
    id: 'rc-repair',
    label: 'Repair before you re-litigate',
    examples: 'Reconnect first. Try: can we start over, I miss you.',
  },
  {
    id: 'rc-felt',
    label: 'Share how you felt, do not argue the facts',
    examples: 'Both realities are true. "I felt shut out" is not a claim to debate.',
  },
  {
    id: 'rc-own',
    label: 'Take a small piece of responsibility each',
    examples: 'Even: I could have said that more gently.',
  },
  {
    id: 'rc-bids',
    label: 'Turn toward the small bids',
    examples: 'A joke, a question, tea. Saying yes to a small bid is the repair.',
  },
  {
    id: 'rc-pressure',
    label: 'Lower the pressure',
    examples: 'Sit together, take a walk. Presence over processing.',
  },
  {
    id: 'rc-loop',
    label: 'Close the loop',
    examples: 'Ask "we are okay?", answer "we are okay". An all-clear lets both stand down.',
  },
];
