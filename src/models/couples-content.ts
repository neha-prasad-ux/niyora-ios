// "Us vs. the PMS": the couples shelf. Four activities that help a couple stay
// on the same side through PMS, framed as us-against-the-PMS (narrative
// externalization) rather than partner-against-partner.
//
// Voice: a frank, warm 30-year-old Californian friend. Simple words, specific
// over vague, no jargon, no shame. Two registers live here:
//   - App voice (quiz, prep, reconnect, headers): no em dashes, no exclamation
//     points, no emoji. Guarded by couples-content.test.ts.
//   - Shareable texts (COUPLES_TEXTS): casual messages the user sends her
//     partner; these keep emoji and a lighter tone, so they are exempt from the
//     app-voice copy guard.
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
//   - Prep: deciding what you need while calm beats sorting it out mid-fight
//     (adapted from DBT crisis-planning); it also heads off the walking-on-
//     eggshells pattern.
//   - Desire text + prep line: sexual desire shifts across the cycle, often
//     dipping premenstrually as progesterone rises (Roney & Simmons 2013). Saying
//     so stops a partner reading a low-desire week as rejection (Basson's
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
  { id: 'q-timing', question: 'Is your period about a week out right now?', yesLeansTo: 'pms' },
  { id: 'q-recurs', question: 'Does this same feeling tend to show up around the same time each cycle?', yesLeansTo: 'pms' },
  { id: 'q-eases', question: 'Once your period starts, does this usually fade in a day or two?', yesLeansTo: 'pms' },
  { id: 'q-size', question: 'Is this way bigger than whatever set it off?', yesLeansTo: 'pms' },
  { id: 'q-calm', question: 'Does this still bug you in your calm weeks, not just right now?', yesLeansTo: 'real' },
  { id: 'q-persists', question: 'Would this still bug you next week even if nothing changed?', yesLeansTo: 'real' },
  { id: 'q-concrete', question: 'Is this a real thing that keeps happening, not just a mood?', yesLeansTo: 'real' },
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

// One-line takeaway + three skimmable moves, no paragraphs. The pms points end
// on a retest ("still there in a calm week, treat it as real") so the quiz never
// becomes a way to dismiss a genuine issue.
export const QUIZ_RESULT: Record<QuizSide, { title: string; takeaway: string; points: readonly string[] }> = {
  pms: {
    title: 'Probably the cycle talking',
    takeaway: 'The feeling is real. The size of it is mostly the wave.',
    points: [
      'Let it pass before you decide anything',
      'Blame the PMS out loud, not each other',
      'Still there in a calm week? Treat it as real',
    ],
  },
  real: {
    title: 'Probably a real thing',
    takeaway: 'This looks like a real issue, not the cycle turning it up.',
    points: [
      'It deserves a real talk, not a mid-fight one',
      'Pick a calm week, when you are both steady',
      'Bring one specific thing, not everything at once',
    ],
  },
};

// One line, shown small under both results.
export const QUIZ_FOOTER = 'Either way, make the big calls when you are calm.';

// --- 2. Texts you can share (casual, emoji allowed) ---------------------

export type ShareText = { id: string; tone: string; text: string };
export type TextGroup = { id: string; title: string; items: readonly ShareText[] };

export const COUPLES_TEXTS: readonly TextGroup[] = [
  {
    id: 'heads-up',
    title: 'A heads-up',
    items: [
      { id: 'hu-warm', tone: 'Warm', text: "Heads up, my PMS is starting. If I get short, it's the hormones and not you. Bear with me 💛" },
      { id: 'hu-playful', tone: 'Playful', text: 'Incoming: gremlin week. Same me, worse signal. Snacks and patience appreciated.' },
      { id: 'hu-direct', tone: 'Direct', text: "My PMS is here. I might need more space than usual. Nothing's wrong between us." },
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
      { id: 'd-lowbattery', tone: 'Low-battery', text: "My body's in low-battery mode this week, including the desire. It's the cycle, not you. Still want you close." },
      { id: 'd-raincheck', tone: 'Rain check', text: "Not much in the mood this week, and it's nothing about us. It usually comes back. Cuddles very much still on the table." },
    ],
  },
];

// --- 3. Prep well together (one quick reflection -> a note to send) ------

export type PrepQuestion = {
  id: string;
  question: string;
  // The note line this "yes" adds, written in her voice to her partner.
  ifYes: string;
};

export const PREP_QUESTIONS: readonly PrepQuestion[] = [
  {
    id: 'quiet',
    question: 'During PMS, do you go quiet sometimes?',
    ifYes: "When I go quiet, I'm giving myself space. It is not to hurt you.",
  },
  {
    id: 'space',
    question: "When you're low, do you want space before closeness?",
    ifYes: "Give me a little space first. I'll come to you when I want to be close.",
  },
  {
    id: 'senses',
    question: "Do you think your partner can feel your irritation even when you're trying to hide it, and ends up tiptoeing?",
    ifYes: "You can probably feel my irritation even when I'm hiding it. That's the PMS leaking out, not you. You don't have to tiptoe.",
  },
  {
    id: 'small',
    question: "When you're only a little annoyed, does it help if your partner nudges you toward a lighter, more practical way to see it?",
    ifYes: "When I'm just a little annoyed, help me reframe it. A lighter, practical take usually pulls me out.",
  },
  {
    id: 'big',
    question: "When you're really worked up, would it help if your partner kindly gives you 20 minutes to breathe and settle, without taking it personally?",
    ifYes: "When I'm really worked up, kindly give me 20 minutes to breathe and settle. Me stepping back is how I come back, not me leaving.",
  },
  {
    id: 'headsup',
    question: 'Want a heads-up to go out when your PMS starts?',
    ifYes: "I'll send you a heads-up when my PMS is starting.",
  },
  {
    id: 'desire',
    question: 'Does your sex drive usually dip during PMS?',
    ifYes: "My drive dips during PMS. It's the hormones, not you. Still want you close.",
  },
];

// Always in the note, whatever the answers.
export const CORE_PREP_ITEMS: readonly { id: string; label: string }[] = [
  { id: 'core-team', label: "We're on the same team. The problem is the PMS, not each other. And I'm working on it, finding ways to own it and get better." },
  { id: 'core-bury', label: "If something is really bothering me, I'll bring it up in a calm week, not sit on it." },
  { id: 'core-break', label: 'If either of us needs a breather mid-fight, we say so and come back to it.' },
];

export type PrepPlanItem = { id: string; label: string };

// Assemble the note: core lines first, then one line per "yes".
export function buildPrepChecklist(answers: Readonly<Record<string, boolean>>): PrepPlanItem[] {
  const items: PrepPlanItem[] = CORE_PREP_ITEMS.map((c) => ({ id: c.id, label: c.label }));
  for (const q of PREP_QUESTIONS) {
    if (answers[q.id]) items.push({ id: q.id, label: q.ifYes });
  }
  return items;
}

// The note goes out as a warm, ready-to-send message: a greeting, a one-line
// intro, the numbered pointers, and a signoff. Sent through the native share
// sheet, so she fires it off via Messages, WhatsApp, wherever.
export const PREP_MESSAGE = {
  greeting: 'Hi love,',
  intro: "I've been reflecting on us and how PMS affects us. Here are some pointers.",
  signoff: 'Love you.',
};

export function buildPrepMessage(answers: Readonly<Record<string, boolean>>): string {
  const lines = buildPrepChecklist(answers).map((it, idx) => `${idx + 1}. ${it.label}`);
  return [PREP_MESSAGE.greeting, '', PREP_MESSAGE.intro, '', ...lines, '', PREP_MESSAGE.signoff].join('\n');
}

// --- 4. How to reconnect (checklist) ------------------------------------

export type ReconnectStep = { id: string; label: string; examples: string };

export const RECONNECT_STEPS: readonly ReconnectStep[] = [
  {
    id: 'rc-repair',
    label: 'Get close before you fix anything',
    examples: 'Reconnect first, sort it out later. Try: can we start over, I miss you.',
  },
  {
    id: 'rc-felt',
    label: 'Share how you felt, not who did what',
    examples: "You both get to feel what you felt. \"I felt shut out\" isn't up for debate.",
  },
  {
    id: 'rc-own',
    label: 'Each own a little of it',
    examples: 'Even just: I could have said that softer.',
  },
  {
    id: 'rc-bids',
    label: 'Take the small openings',
    examples: 'A joke, a question, a cup of tea. Say yes to a little one, that is the repair.',
  },
  {
    id: 'rc-pressure',
    label: 'Keep it low-key',
    examples: 'Sit together, take a walk. Being close beats hashing it out.',
  },
  {
    id: 'rc-loop',
    label: 'Say out loud that you are good',
    examples: 'Ask "we good?", hear "we good". The all-clear lets you both breathe.',
  },
];
