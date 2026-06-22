// The "Understand" shelf: short, fact-checked reframe cards that explain why a
// feeling is happening. Where the activity cards say what to do, these say why
// you feel this way, it's real, and it passes. Read cards: tap from the shelf,
// the passage holds on screen. v1 ships the data only -- there is no UI yet.
//
// Two-level model: every card is tagged by feeling + context. The shelf shows
// the `general` card by default; a "before my period" chip (or a PMS signal)
// surfaces the matching `pms` card. No card gets rewritten between contexts, we
// just hold both alongside each other.
//
// Source of truth: docs/pms/niyora-pms-understand-content.md. Copy is
// fact-checked and used verbatim (do not reword). Every claim survived a
// 3-skeptic adversarial verification pass (deep-research, 2026-06-18). The
// `source` line is what sits behind the optional "the science" tap; it carries
// citation punctuation (em dashes, URLs) and is intentionally exempt from the
// no-em-dash rule that governs user-facing prose. Card bodies are em-dash-free,
// guarded by a test.

import type { PmsFeeling } from './activities';

export type UnderstandContext = 'general' | 'pms';

// 'core'      -- PMS science that applies across every feeling (pms context only)
// 'feeling'   -- tied to one of the five feelings
// 'universal' -- applies regardless of feeling (general context)
export type UnderstandScope = 'core' | 'feeling' | 'universal';

export type UnderstandCard = {
  id: string;
  context: UnderstandContext;
  scope: UnderstandScope;
  feeling: PmsFeeling | null; // null for core + universal cards
  title: string;
  body: string;
  source?: string; // citation behind the optional "the science" tap
};

export const UNDERSTAND_CARDS: readonly UnderstandCard[] = [
  // --- Core cards: PMS context, eligible across every feeling ---
  {
    id: 'core-hormones-normal',
    context: 'pms',
    scope: 'core',
    feeling: null,
    title: 'Your hormones are normal',
    body: "Okay, here's the part nobody tells you. Your hormones are completely normal this week. Totally regular levels.\nWhen researchers measured them, women who feel awful before their period had the exact same levels as women who feel great.\nThe whole difference is in how strongly your brain responds to the normal ups and downs.\nSo this is your body being extra tuned in to the shift. Doing a lot with a normal amount.",
    source:
      'NIMH / Schmidt & Rubinow differential-sensitivity model; Hantsoo & Payne 2020 — https://www.sciencedirect.com/science/article/pii/S2352289520300035',
  },
  {
    id: 'core-brain-feels-it-more',
    context: 'pms',
    scope: 'core',
    feeling: null,
    title: 'Why your brain feels it more',
    body: "This sensitivity is built in, and a lot of it runs in families. Premenstrual sensitivity is about 56 percent heritable.\nResearchers looked at the actual cells of women who struggle before their period, and found they respond differently to the very same hormones.\nSo this comes from how you're wired. It's a real, physical trait, kind of like having sensitive skin.\nThe same shift other people barely clock, your system actually feels.",
    source:
      'Dubey et al. 2017, Molecular Psychiatry (ESC/E(Z) gene complex) — https://www.nature.com/articles/mp2016229; NIMH — https://www.nih.gov/news-events/news-releases/sex-hormone-sensitive-gene-complex-linked-premenstrual-mood-disorder',
  },
  {
    id: 'core-end-date',
    context: 'pms',
    scope: 'core',
    feeling: null,
    title: 'This has an end date',
    body: "Here's something solid to hold onto. When researchers switched these hormones off, the symptoms cleared. When they switched them back on, the symptoms came back.\nThat's the clearest proof that what you feel is tied to a passing hormonal moment, and your body moves through it.\nIt shows up with the shift, and it eases with the next one. Every single cycle.\nThink of it as weather. It rolls in, and it rolls out.",
    source:
      'NIMH GnRH-agonist add-back studies — https://www.nih.gov/news-events/news-releases/sex-hormone-sensitive-gene-complex-linked-premenstrual-mood-disorder',
  },
  {
    id: 'core-older-than-you',
    context: 'pms',
    scope: 'core',
    feeling: null,
    title: 'This is older than you',
    body: "Turns out this runs way beyond humans. The exact same hormone change creates the exact same effect in other mammals. Scientists study it in rats.\nAnd it lands harder on more sensitive nervous systems, same shift, bigger response.\nSo what you feel before your period is a biological pattern way older than you.\nYou inherited this. It's biology doing its old, familiar thing.",
    source:
      'progesterone-withdrawal rodent model; Hantsoo & Payne 2020 — https://www.sciencedirect.com/science/article/pii/S2352289520300035; https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9266311/',
  },
  {
    id: 'core-you-were-right',
    context: 'pms',
    scope: 'core',
    feeling: null,
    title: 'You were right all along',
    body: "If you've ever felt brushed off, the history is on your side.\nThis was only recognized as a real medical condition in 2013. Before that, women waited years, often more than a decade, and saw a string of doctors before anyone put a name to it.\nFor most of medical history, women's cyclic struggles got waved away or brushed off as just emotional.\nSo if no one explained this to you, that's the system catching up slowly. You were reading your own body right.",
    source:
      "Dell'Osso et al. 2024, Frontiers in Psychiatry — https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2024.1458114/full; IAPMD diagnostic timeline — https://www.iapmd.org/diagnostic-recognition-timeline",
  },

  // --- By feeling: PMS context ---
  {
    id: 'anxious-pms',
    context: 'pms',
    scope: 'feeling',
    feeling: 'anxious',
    title: 'Why everything feels like a threat',
    body: "Your body has a built-in calm, a kind of brake on fear that usually works quietly in the background.\nIn the days before your period, that brake responds differently, and it eases off.\nSo the same text, the same silence, the same small thing reads as a threat.\nYour alarm is just turned up extra sensitive today, and it settles as the shift passes.",
    source:
      'allopregnanolone / GABA-A sensitivity; Hantsoo & Payne 2020 — https://www.sciencedirect.com/science/article/pii/S2352289520300035',
  },
  {
    id: 'irritable-pms',
    context: 'pms',
    scope: 'feeling',
    feeling: 'irritable',
    title: 'Why the smallest things set you off',
    body: "That same calm that usually absorbs little frustrations is running thin this week.\nSo things you'd brush off any other day feel genuinely unbearable right now.\nThe anger is real, and it's turned all the way up this week. That's the dial, and you're still you underneath it.\nIt softens as your body moves past the shift.",
    source:
      'allopregnanolone / GABA-A sensitivity; premenstrual prefrontal serotonin shift correlates with irritability (preliminary, Eriksson 2016) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5019404/',
  },
  {
    id: 'low-pms',
    context: 'pms',
    scope: 'feeling',
    feeling: 'low',
    title: "Why you can't feel happy right now",
    body: "The part of you that reaches for joy is turned way down right now, like someone lowered the dial.\nSo forcing yourself to feel happy is like flooring a car in neutral. The engine's fine, it just needs the dial turned back up, and that happens on its own.\nYou're whole, and this passes.\nThe heaviness lifts when your hormones move on. That relief you feel after is your body coming back online.",
    source:
      "Based on the differential-sensitivity model (a plain-language description of the brain's dampened response to the normal hormonal shift, not a specific study result). Model: Schmidt & Rubinow / Hantsoo & Payne 2020 — https://www.sciencedirect.com/science/article/pii/S2352289520300035",
  },
  {
    id: 'foggy-pms',
    context: 'pms',
    scope: 'feeling',
    feeling: 'foggy',
    title: 'Why your head feels foggy',
    body: "Good news first, because you deserve it. Tested and proven, your memory and focus stay just as sharp before your period. Your brain keeps running at full strength.\nWhat actually shifts is where your attention goes. It keeps drifting toward the heavy stuff, the self-critical, the worst-case.\nSo the fog is real, and it's really about your focus getting pulled somewhere darker for a few days.\nYour mind is fully here the whole time.",
    source:
      '2025 meta-analysis, no robust cyclic cognitive change — https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0318576; negative attentional bias central to PMDD (Henderson 2025) — https://www.sciencedirect.com/science/article/pii/S0165032724018676',
  },
  {
    id: 'overwhelmed-pms',
    context: 'pms',
    scope: 'feeling',
    feeling: 'overwhelmed',
    title: 'Why everything feels like too much',
    body: "Same plate, smaller hands. Your capacity quietly shrank this week.\nThe system that helps you absorb stress is running at lower power right now, so a regular load feels impossible.\nSame week, next cycle, this'll feel totally doable again.\nYour buffer's just thin at the moment, and it refills on its own.",
    source:
      'Based on the differential-sensitivity model (reduced capacity to buffer stress is a description of that model, not a measured finding). Model: Schmidt & Rubinow / Hantsoo & Payne 2020 — https://www.sciencedirect.com/science/article/pii/S2352289520300035',
  },

  // --- By feeling: general context ---
  {
    id: 'anxious-general',
    context: 'general',
    scope: 'feeling',
    feeling: 'anxious',
    title: 'Why everything feels like a threat',
    body: "Your body has an alarm system, and right now it's turned up high.\nWhen you're worn down, the part of your brain that watches for danger starts reading ordinary things, a text, a silence, a small task, as threats.\nThe feeling is real, and it's also louder than the actual situation.\nYour alarm is just running hot, and it settles.",
  },
  {
    id: 'irritable-general',
    context: 'general',
    scope: 'feeling',
    feeling: 'irritable',
    title: 'Why the smallest things set you off',
    body: "Irritability usually means one thing: your reserves are low.\nWhen you're depleted, the small stuff you'd normally shrug off lands sharp instead.\nThe anger is real, and it's running on empty.\nIt's the low reserves talking, and they refill.",
  },
  {
    id: 'low-general',
    context: 'general',
    scope: 'feeling',
    feeling: 'low',
    title: 'Why you feel heavy',
    body: "Low moods are a state your brain moves through, not a personal failing.\nWhen you're tired or stretched, the part of you that reaches for joy goes quiet, so forcing happiness rarely lands.\nYou don't have to fix it or explain it.\nYou're whole, and the heaviness passes.",
  },
  {
    id: 'foggy-general',
    context: 'general',
    scope: 'feeling',
    feeling: 'foggy',
    title: 'Why your head feels foggy',
    body: "Brain fog feels like thinking through cotton, and your mind is still working underneath it.\nWhen you're tired or overloaded, focus gets harder to hold and your attention drifts to the heavy stuff.\nYou're not losing your edge.\nThe sharpness comes back once you've rested.",
  },
  {
    id: 'overwhelmed-general',
    context: 'general',
    scope: 'feeling',
    feeling: 'overwhelmed',
    title: 'Why everything feels like too much',
    body: "Overwhelm is usually a capacity thing, not a you thing.\nWhen your buffer is thin, an ordinary load feels impossible. Same plate, smaller hands.\nYour capacity is just low right now, and it refills.",
  },

  // --- Universal: general context, applies regardless of feeling ---
  {
    id: 'feeling-safe',
    context: 'general',
    scope: 'universal',
    feeling: null,
    title: 'Feeling safe',
    body: "Here's something your body does on its own: it decides whether you're safe before your mind even catches up.\nSo calm isn't really a thought, it's a state. Slower breath, warmth, a steady presence, and your body starts to believe the danger has passed.\nYou can't always think your way calm.\nBut your body can lead, and the mind follows.",
    source:
      'neuroception / felt safety has a measurable autonomic correlate — https://academic.oup.com/abm/article/59/1/kaaf014/8102088; Porges felt-safety substrate.',
  },
];

export function getUnderstandCard(id: string): UnderstandCard | undefined {
  return UNDERSTAND_CARDS.find((c) => c.id === id);
}

// The cards to show on the Understand shelf for a feeling in a given context:
// the feeling-specific reframe first, then the cross-cutting cards eligible in
// that context (the core PMS cards for `pms`, the universal card for `general`).
export function understandForFeeling(
  feeling: PmsFeeling,
  context: UnderstandContext,
): readonly UnderstandCard[] {
  const inContext = UNDERSTAND_CARDS.filter((c) => c.context === context);
  const feelingCard = inContext.filter(
    (c) => c.scope === 'feeling' && c.feeling === feeling,
  );
  const crossCutting = inContext.filter((c) => c.scope !== 'feeling');
  return [...feelingCard, ...crossCutting];
}
