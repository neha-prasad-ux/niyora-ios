// The PMS preparedness serial — "Neha's life" (niyora-pms-preparedness-spec.md).
// A content-driven engine: each Chapter is data (ordered story beats, a moment
// to reflect, a build-your-kit list) and the reader flow in
// src/app/pms-story.tsx renders whatever chapters live here. Story 2+ plug in as
// more entries in CHAPTERS; the engine never changes.
//
// The story is a warm, relatable life story where you would never guess it is
// "about PMS." The PMS lens surfaces only in the reflect step (the ONLY place
// PMS is named). The story prose and the reflect/kit copy are LOCKED spec
// content, reproduced verbatim — do not reword. Voice: DESIGN.md neutrally warm,
// no exclamation points, no em dashes.

// --- Types ------------------------------------------------------------------

// One faceless painterly scene sits behind each beat. Real assets come later; the
// reader stubs a text-safe dark scene keyed by `image`. `moon` places the
// storybook moon (most scenes carry it); `alt` is the scene recipe, kept both for
// accessibility and to guide the eventual art swap. `warm` tints a scene toward
// lamp/tea warmth where the recipe calls for it over moonlight.
export interface Scene {
  image: string;
  moon: boolean;
  warm?: boolean;
  alt: string;
}

export interface Beat {
  text: string;
  scene: Scene;
}

// A reflect option. Exactly one option per question is `correct`. Nothing here
// can fail her — a wrong tap shows the warm redirect and reveals the true answer,
// it never blocks or scolds.
export interface ReflectOption {
  label: string;
  correct: boolean;
}

export interface ReflectQuestion {
  prompt: string;
  options: readonly ReflectOption[];
  // The one-line learning revealed after she answers (right or wrong). The
  // question stays short; this is where the richness lives. Never a scold.
  takeaway: string;
}

// A build-your-kit item. Correct items become her checklist and tick the prep
// score; exactly one item per chapter is wrong (with a soft `redirect`). A
// `live` item is a real door — 'steady' opens the Steady-yourself breath.
export interface KitItem {
  id: string;
  label: string;
  correct: boolean;
  redirect?: string;
  live?: 'steady';
}

export interface Chapter {
  id: string;
  // The shelf/entry title. Kept life-flavoured, never "PMS lesson 1."
  title: string;
  // A one-line lead-in shown on the opening card before the first beat.
  intro: string;
  beats: readonly Beat[];
  // "A moment to reflect" — the only place PMS is named.
  reflect: readonly ReflectQuestion[];
  kit: readonly KitItem[];
}

// --- Story 1 · Neha moves across the world ----------------------------------
// Story prose verbatim from the spec (5 beats). Backtick strings so the story's
// own apostrophes and quote marks survive untouched.

const STORY1: Chapter = {
  id: 'story-1',
  title: 'Neha moves across the world',
  intro: 'A story about a big move.',
  beats: [
    {
      text: `I was moving across the world in a few days. New country, new job, new everything. I'd wanted this forever, and now that it was happening, I was equal parts thrilled and totally freaking out.`,
      scene: {
        image: 's1-suitcase',
        moon: true,
        alt: 'A bedroom corner, a half-packed open suitcase on the floor, a folded coat over a chair, soft piles of clothes, the moon glowing in the window above.',
      },
    },
    {
      text: `The night before my flight, I could not sleep. What if it's lonely there. What if I mess it all up. Okay, this is my fear talking, it always assumes the worst. I went off to boarding school, got bullied, had no friends for a while, and look at me now, flying off to a whole new country. Uncomfortable isn't the same as bad.`,
      scene: {
        image: 's1-bed',
        moon: true,
        alt: 'A quiet bedroom at night, a softly rumpled empty bed with one pillow and a folded blanket, a large moon through a paned window casting a gentle beam across the sheets.',
      },
    },
    {
      text: `The next day my mom came to see me off. I was holding it together, because the second I cried, she would too. Trying to lighten things up, she teased me about how I always complained about my tiny room. "At least now you get a place you actually like." I didn't find it funny. "Momma, I wasn't always complaining. Why would you even say that."`,
      scene: {
        image: 's1-gate',
        moon: true,
        alt: 'A dim, nearly empty airport gate at night, rows of waiting-room seats, a single suitcase standing alone, a huge moon over the runway through the glass.',
      },
    },
    {
      text: `I stepped away, didn't want to make things worse, and wandered into the airport bookshop. I grabbed a cozy romance. In the rush I'd skipped lunch, so I got some nuts and a nice coffee, found a seat in the cafe, and skimmed the book while I breathed, really slowly.`,
      scene: {
        image: 's1-cafe',
        moon: true,
        warm: true,
        alt: 'A small cafe table with a closed paperback, a little bowl of nuts, and a coffee with a wisp of steam, the moon reflected in the dark window behind.',
      },
    },
    {
      text: `Twenty minutes later, I texted my mom. "Momma, I can only imagine how hard it is to send your best friend off, and you're doing it so well. The travel plus the PMS have me feeling really weak, and I'm sorry I snapped. It's not you. I love you, and I'm going to miss you so much." I walked back over. She was already crying. It was time to go. We hugged for a long time.`,
      scene: {
        image: 's1-plane',
        moon: true,
        warm: true,
        alt: 'The view from an airplane window at night. Beyond the curved window and a sliver of wing, a smooth glowing moon hangs over a soft sea of moonlit clouds, the last city lights scattered far below and fading. A faint warm cabin light catches the edge of the window frame.',
      },
    },
  ],
  reflect: [
    {
      prompt: 'What finally settled the racing thoughts?',
      options: [
        { label: 'Scrolling on the phone', correct: false },
        { label: 'Forcing the thoughts away', correct: false },
        { label: 'Recalling a past win', correct: true },
      ],
      takeaway: 'A real past win quiets a racing mind better than forcing it to stop.',
    },
    {
      prompt:
        'Those days when everything feels too big are often the PMS window. What is the first move when it hits?',
      options: [
        { label: 'Push through it', correct: false },
        { label: 'Take a slow breath out', correct: true },
        { label: 'Bottle it up', correct: false },
      ],
      takeaway:
        'One slow breath settles your body first, so your head can catch up. It is real, not you being dramatic.',
    },
  ],
  kit: [
    {
      id: 'notice',
      label:
        "Notice the feeling and how big it really is. If it's small, reframe it. If it's big, step away for twenty and take a breath in Niyora.",
      correct: true,
      live: 'steady',
    },
    { id: 'food', label: 'Get some food in you', correct: true },
    { id: 'remember', label: "Remember something hard you've already handled", correct: true },
    {
      id: 'heads-up',
      label: "Give the people you love a heads-up that it's not them",
      correct: true,
    },
    {
      id: 'push-down',
      label: 'Just push it down and tell yourself to stop being dramatic',
      correct: false,
      redirect: 'That one usually backfires, pushing it down tends to come out sideways.',
    },
  ],
};

// --- Story 2 · The callback -------------------------------------------------
// Spec content from niyora-pms-preparedness-spec.md ("Story 2 · The callback").
// Beats are the locked spec prose, converted to first person to match STORY1's
// shipped voice. Reflect is the spec's two questions. The spec did NOT define a
// build-your-kit for Story 2, so the kit below is derived from the story's own
// coping moves in the DESIGN.md voice (four correct + one wrong, one live door)
// and is the one part open to a copy pass. Scenes wire the five painterly
// assets in assets/images/stories/story-2/ via chapter-scenes.ts.

const STORY2: Chapter = {
  id: 'story-2',
  title: 'The callback',
  intro: 'A story about a second shot at something she wanted.',
  beats: [
    {
      text: `A few months in, I was finding my feet. I'd crushed the first interview for a job I really wanted, and they called me back for round two. I was pumped.`,
      scene: {
        image: 's2-boxes',
        moon: true,
        alt: 'A small new apartment at night, a couple of moving boxes still stacked in a corner, a laptop open on a desk, a mug beside it, the moon in the window.',
      },
    },
    {
      text: `The interview was in the morning, and of course I couldn't sleep. My brain went straight to the worst. What if I choke. What if the first one was a fluke. I knew this spiral by now. Alright, drama queen, I thought, and pulled up the receipts. I got the callback. They liked me enough to want a second look. I've walked into harder rooms than this. I still didn't feel great, but I got a few hours.`,
      scene: {
        image: 's2-bed',
        moon: true,
        alt: 'A bed in a new apartment at night, sheets rumpled, a phone face-down on the nightstand, city lights and a large moon out the window.',
      },
    },
    {
      text: `Morning of, all that prep and I still felt shaky. So I gave myself twenty minutes. Coffee, a handful of nuts, a few slow breaths. Then I did something new. I opened my notes and wrote down three things I'd actually pulled off. The project I shipped. The team I led. The first interview I just nailed. Reading it back, I felt myself land. Right. I'm good at this.`,
      scene: {
        image: 's2-desk',
        moon: true,
        alt: 'A desk by a window in soft early light, an open notebook and a pen, a coffee and a small bowl of nuts, the pale moon fading into morning.',
      },
    },
    {
      text: `The room was cold. Not the temperature, the people. They weren't giving me much, and I could feel myself working twice as hard for half the warmth. I kept going anyway. Near the end, one of them tilted their head. "You don't seem as confident as last time. Why's that?" It stung. I took a second. "Honestly, it's a different room today, and I don't feel quite as at home in it yet. But I'm the same person you called back."`,
      scene: {
        image: 's2-room',
        moon: true,
        alt: 'A quiet modern meeting room at dusk, one empty chair on the near side of a long table, a single glass of water, cool blue light, the moon in the floor-to-ceiling window.',
      },
    },
    {
      text: `I replayed that question the whole way home. When I walked in, my husband could see it on me. "Hey. You'll get the next call," he said. And somehow that was the thing that broke me. "That's a lot of pressure to put on me right now. I would never do that to you." It came out sharp. He looked a little stung. I went quiet and walked to the other room. A few minutes later I texted him from ten feet away. "I'm sorry. That wasn't about you. I'm just fried and I need a little space to reset. It's not you. I love you." I sat with myself for a while. And somewhere in there, my phone buzzed. An email. Subject line: we'd love to have you.`,
      scene: {
        image: 's2-couch',
        moon: true,
        warm: true,
        alt: 'A cozy couch corner late at night, a mug of tea, a soft lamp glow, a phone on the cushion lit with a message, warm light with the moon just visible in the window.',
      },
    },
  ],
  reflect: [
    {
      prompt: 'The morning of, Neha felt her confidence sliding. What pulled her back?',
      options: [
        { label: 'Told herself to just calm down', correct: false },
        { label: "Wrote down three real things she'd actually accomplished", correct: true },
        { label: 'Read the job description again', correct: false },
      ],
      takeaway:
        'Anchoring to real, concrete wins steadies a sliding confidence faster than forcing calm.',
    },
    {
      prompt:
        'Neha snapped at her husband when he was only trying to help, then felt terrible. Those extra-raw days often line up with the PMS window, the stretch before your period when everything hits harder. What did she do that helped?',
      options: [
        { label: 'Insisted he had upset her', correct: false },
        { label: "Took space, then owned it and told him it wasn't about him", correct: true },
        { label: 'Pretended everything was fine', correct: false },
      ],
      takeaway:
        "Taking space and then owning it repairs faster than blaming or pretending. The raw days are real PMS, not you being difficult.",
    },
  ],
  kit: [
    {
      id: 'anchor',
      label: "Write down three real things you've actually pulled off, and read them back.",
      correct: true,
    },
    {
      id: 'breath',
      label: 'Feel the nerves climbing and give yourself twenty minutes to breathe in Niyora.',
      correct: true,
      live: 'steady',
    },
    { id: 'food', label: 'Eat something and get a coffee before the big thing', correct: true },
    {
      id: 'own-it',
      label: "When it comes out sharp, take a little space, then own it, it's not them",
      correct: true,
    },
    {
      id: 'push-through',
      label: 'Just tell yourself to be more confident and push the nerves down',
      correct: false,
      redirect: 'Pushing nerves down tends to leak out sideways. Naming them and anchoring to real wins holds better.',
    },
  ],
};

// --- The serial -------------------------------------------------------------

// Ordered chapters. Story 1 ships now (the install AHA moment); Story 2+ append
// here as data, no engine changes. The reader defaults to the first chapter.
export const CHAPTERS: readonly Chapter[] = [STORY1, STORY2];

export const FIRST_CHAPTER_ID = CHAPTERS[0].id;

export function chapterById(id: string | undefined | null): Chapter {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

// The count of correct (score-ticking) kit items in a chapter — the most rings a
// chapter can land. Drives the payoff moon and the prep ring target.
export function correctKitCount(chapter: Chapter): number {
  return chapter.kit.filter((k) => k.correct).length;
}
