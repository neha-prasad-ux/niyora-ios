// The PMS preparedness serial, "Neha's life" (niyora-pms-preparedness-spec.md).
// A content-driven engine: each Chapter is data (ordered story beats, a moment
// to reflect, a build-your-kit list) and the reader flow in
// src/app/pms-story.tsx renders whatever chapters live here. Story 2+ plug in as
// more entries in CHAPTERS; the engine never changes.
//
// The story is a warm, relatable life story where you would never guess it is
// "about PMS." The PMS lens surfaces only in the reflect step (the ONLY place
// PMS is named). The story prose and the reflect/kit copy are LOCKED spec
// content, reproduced verbatim, do not reword. Voice: DESIGN.md neutrally warm,
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

// A reflect option. Nothing here can fail her.
//   pick-one: exactly one option is `correct`; a wrong tap shows its `redirect`
//     (or the shared takeaway) and reveals the true answer.
//   tap-each: every option is `correct` (all valid), and each teaches its own
//     `detail` line when tapped.
export interface ReflectOption {
  label: string;
  correct: boolean;
  // The one-line learning shown when this option is tapped. Required on tap-each
  // options; optional on a pick-one correct option (it can stand in for takeaway).
  detail?: string;
  // A softer line for a wrong pick-one option, revealed with the true answer.
  redirect?: string;
}

export interface ReflectQuestion {
  prompt: string;
  options: readonly ReflectOption[];
  // 'pick-one' (default): choose the right answer, a wrong tap is met warmly.
  // 'tap-each': explore every option, all valid, each teaching its own line.
  mode?: 'pick-one' | 'tap-each';
  // The shared one-line learning for pick-one questions whose options do not each
  // carry a line (Story 1). Optional now that options can carry their own detail.
  takeaway?: string;
}

// A build-your-kit item. Correct items become her checklist and tick the prep
// score; exactly one item per chapter is wrong (with a soft `redirect`). A
// `live` item is a real door, 'steady' opens the Steady-yourself breath.
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
  // "A moment to reflect", the only place PMS is named.
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
// The refined Story 2 (Neha's copy), in first person to match Story 1. Four
// beats, ending on a cliffhanger ("To be continued"). Beat 3's yogurt / humming
// / writing-strengths are exactly the moves Reflect Q1 teaches, and the kit is
// built from those same takeaways. Scenes wire assets/images/stories/story-2
// (the cold meeting-room scene, s2-room, is now unused).

const STORY2: Chapter = {
  id: 'story-2',
  title: 'The callback',
  intro: 'A story about a second shot at something she wanted.',
  beats: [
    {
      text: `A few months into a new country, I crushed the first interview for a job I really wanted. They called me back for round two. What if they don't like me this time.`,
      scene: {
        image: 's2-boxes',
        moon: true,
        alt: 'A small new apartment at night, a couple of moving boxes still stacked in a corner, a laptop open on a desk, a mug beside it, the moon in the window.',
      },
    },
    {
      text: `The interview was in the morning, and of course I couldn't sleep. What if the first one was a fluke. I knew this spiral. Alright, drama queen. I got the callback. And that thesis a classmate called the best thing he saw all year. Yeah, I'm kind of great. I drifted off in the good memories.`,
      scene: {
        image: 's2-bed',
        moon: true,
        alt: 'A bed in a new apartment at night, sheets rumpled, a phone face-down on the nightstand, city lights and a large moon out the window.',
      },
    },
    {
      text: `Morning of, still shaky. So I gave myself twenty minutes. Yogurt, a handful of nuts, and long humming. My mom always swore it helps. Annoyingly, it did. Then something new. I wrote down three things I'd actually pulled off. The project I shipped. The team I led. The interview I nailed. Reading it back, I landed. Right. I'm good at this.`,
      scene: {
        image: 's2-desk',
        moon: true,
        alt: 'A desk by a window in soft early light, an open notebook and a pen, yogurt and a small bowl of nuts, the pale moon fading into morning.',
      },
    },
    {
      text: `The interview didn't go great. I walked home sad, and my husband took one look at me. "Hey. You'll get the next call." "That's a lot of pressure right now. I would never do that to you." It came out sharp. "You did, though," he said. "Four years back, when I wanted to leave for the startup. You said I could only go if I lined up another job first." And there it went. Every unspoken thing from the years between, out on the table. We went at it a while. Then my phone buzzed. An email. Subject line: we'd love to have you. To be continued.`,
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
      // tap-each: all three helped, each teaches its own line. No wrong answer.
      // These three moves (yogurt, humming, writing strengths) are what beat 3
      // shows. Each detail still needs a source link, same bar as Understand.
      prompt: 'Neha did a few things to steady herself. Which ones actually work?',
      mode: 'tap-each',
      options: [
        {
          label: 'Yogurt and nuts for breakfast',
          correct: true,
          detail: 'Calcium and magnesium take the edge off and steady your mood.',
        },
        {
          label: 'Humming',
          correct: true,
          detail: "Humming lengthens your exhale and tells your body it's safe to calm down.",
        },
        {
          label: 'Writing down her strengths',
          correct: true,
          detail:
            'Reading back real wins is a self-affirmation trick that quiets the stress response.',
        },
      ],
    },
    {
      // pick-one myth-bust. The premise is the myth; only the reframe is right.
      prompt:
        '"She\'s always overthinking. She should just be quiet and let it go." Fair?',
      options: [
        {
          label: 'Yeah, she needs to quiet down',
          correct: false,
          redirect:
            "Telling yourself to just stop rarely works. Some days the volume's turned all the way up.",
        },
        {
          label:
            "The days before her period crank the volume on everything. The move isn't to silence it, it's to notice it and let it pass.",
          correct: true,
        },
        {
          label: "She should keep it in so she doesn't snap",
          correct: false,
          redirect: 'Bottling tends to come out sideways.',
        },
      ],
    },
  ],
  kit: [
    {
      id: 'strengths',
      label: "Write down three real things you've pulled off, and read them back.",
      correct: true,
    },
    {
      id: 'hum',
      label: "Hum, or breathe out long and slow, to tell your body it's safe.",
      correct: true,
      live: 'steady',
    },
    {
      id: 'eat',
      label: 'Eat something with calcium and magnesium, like yogurt and nuts.',
      correct: true,
    },
    {
      id: 'recall',
      label: 'When the spiral starts, pull up a real win to land on.',
      correct: true,
    },
    {
      id: 'push-down',
      label: 'Tell yourself to stop overthinking and push it down.',
      correct: false,
      redirect: 'Telling yourself to stop rarely works, and pushing it down tends to come out sideways.',
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

// The count of correct (score-ticking) kit items in a chapter, the most rings a
// chapter can land. Drives the payoff moon and the prep ring target.
export function correctKitCount(chapter: Chapter): number {
  return chapter.kit.filter((k) => k.correct).length;
}
