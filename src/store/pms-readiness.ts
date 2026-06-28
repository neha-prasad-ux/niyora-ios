import AsyncStorage from '@react-native-async-storage/async-storage';

// The daily PMS-readiness check state, for the luteal "get ready" page. Resets
// every morning (keyed by calendar day) so each day starts fresh, never a
// streak. Holds the five self-check cards plus the "done for today" flag. The
// sixth card (a calming activity) is not stored here: it reads as done from the
// session history (did she practice today), so it can never be falsely ticked.
// Stays entirely on device.
export type ReadinessCheckId =
  | 'calcium'
  | 'micronutrient'
  | 'steady'
  | 'antiInflammatory'
  | 'woundDown';

export type ReadinessChecks = Record<ReadinessCheckId, boolean>;

export const READINESS_CHECK_IDS: readonly ReadinessCheckId[] = [
  'calcium',
  'micronutrient',
  'steady',
  'antiInflammatory',
  'woundDown',
];

// Plain names with examples inline, ordered easiest -> hardest so quick wins
// build momentum. The calming activity (the sixth card) lives in the page.
export const READINESS_CHECK_CONTENT: Record<
  ReadinessCheckId,
  { title: string; examples: string }
> = {
  calcium: { title: 'I had calcium-rich food', examples: 'yogurt, cheese, greens' },
  micronutrient: { title: 'I had micronutrient-rich food', examples: 'nuts, seeds, dried fruit' },
  steady: { title: 'I ate steadily today', examples: 'no big sugar crash' },
  antiInflammatory: {
    title: 'I had anti-inflammatory food',
    examples: 'greens, ginger, turmeric, oily fish, berries, olive oil',
  },
  woundDown: { title: 'I wound down early', examples: 'screens off, dim lights' },
};

// The "Know why" content that sits below the buttons: one plain-language reason
// per check, with a link to the real source. Honesty about how strong the
// evidence is lives in the prose itself (warm, not a clinical grade tag), so a
// soft finding reads soft. Sources trace to niyora-pms-research-appendix.md.
export const READINESS_WHY: Record<
  ReadinessCheckId,
  { name: string; teaser: string; why: string; sourceLabel: string; sourceUrl: string }
> = {
  calcium: {
    name: 'Calcium',
    teaser: 'The strongest one',
    why: 'This is the one with the strongest research behind it. In a proper trial, women who took more calcium had clearly less of the lows, the mood swings, and the cramps. A glass of milk, some yogurt, cheese, or a plate of greens covers it.',
    sourceLabel: 'Thys-Jacobs calcium trial',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/2656936/',
  },
  micronutrient: {
    name: 'Micronutrients',
    teaser: 'A small handful',
    why: 'Nuts, seeds, and dried fruit are rich in magnesium, and women with PMS tend to run a little low on it inside their cells. Topping it up is gentle and may take some edge off. A small handful does it.',
    sourceLabel: 'Magnesium in PMS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/3800293/',
  },
  steady: {
    name: 'Eating steadily',
    teaser: 'Keeps you even',
    why: "When you skip meals or crash off sugar, your blood sugar drops and your body can read that dip as stress. This week you're already sensitive, so it can feel like the mood dip itself. The science here is still light, but eating something every few hours keeps you even.",
    sourceLabel: 'Blood sugar and PMS',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/23875163/',
  },
  antiInflammatory: {
    name: 'Anti-inflammatory food',
    teaser: 'Takes the edge off',
    why: 'Women with more inflammation in their blood tend to report rougher premenstrual symptoms. It is a link, not proof, but greens, ginger, oily fish, berries, and olive oil are an easy way to lean the other direction.',
    sourceLabel: 'SWAN inflammation study',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/27135720/',
  },
  woundDown: {
    name: 'Winding down early',
    teaser: 'More room to cope',
    why: 'Your sleep clock shifts before your period, and in small studies, helping it back into rhythm eased symptoms. Screens off, dimmer lights, an earlier night gives your system more room.',
    sourceLabel: 'PMDD and melatonin',
    sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8664575/',
  },
};

export type ReadinessState = {
  date: string; // YYYY-MM-DD this state belongs to
  checks: ReadinessChecks;
  doneForToday: boolean;
};

const STORAGE_KEY = 'niyora:pms-readiness';

function freshChecks(): ReadinessChecks {
  return {
    calcium: false,
    micronutrient: false,
    steady: false,
    antiInflammatory: false,
    woundDown: false,
  };
}

export function todayYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function freshReadiness(date: string): ReadinessState {
  return { date, checks: freshChecks(), doneForToday: false };
}

// Parse stored state for a given day. Anything from an earlier day resets to
// fresh, so the loop starts clean each morning.
export function parseReadiness(raw: string | null, today: string): ReadinessState {
  if (!raw) return freshReadiness(today);
  try {
    const parsed = JSON.parse(raw) as Partial<ReadinessState>;
    if (parsed == null || typeof parsed !== 'object' || parsed.date !== today) {
      return freshReadiness(today);
    }
    const checks = freshChecks();
    const stored = (parsed.checks ?? {}) as Partial<Record<ReadinessCheckId, unknown>>;
    for (const id of READINESS_CHECK_IDS) checks[id] = stored[id] === true;
    return { date: today, checks, doneForToday: parsed.doneForToday === true };
  } catch {
    return freshReadiness(today);
  }
}

export async function getReadiness(today: string = todayYmd()): Promise<ReadinessState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseReadiness(raw, today);
}

export async function setReadiness(state: ReadinessState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Shared softening state, so the home orb and the readiness orb show the same
// thing. The orb is her: as she does today's things, it eases rose -> calm.
export const READINESS_TOTAL = 6; // five checks + the calming activity

export function readinessDoneCount(checks: ReadinessChecks, calmDone: boolean): number {
  return READINESS_CHECK_IDS.filter((id) => checks[id]).length + (calmDone ? 1 : 0);
}

// The orb stays rose in hue and fades its saturation toward white as she acts,
// so the moon visibly eases from rose-red to white (the "light into the moon").
export const LUTEAL_ROSE_HUE = 350;

export function lutealOrbSat(done: number): number {
  const t = Math.min(Math.max(done, 0), READINESS_TOTAL) / READINESS_TOTAL;
  return 1 - t; // 1 = full rose, 0 = white
}

// The card goes green (and the home settles calm) when she taps "Done for
// today" OR when all six are done. Auto-green on all six is the little reward.
export function isReadyDone(
  checks: ReadinessChecks,
  calmDone: boolean,
  doneForToday: boolean,
): boolean {
  return doneForToday || readinessDoneCount(checks, calmDone) >= READINESS_TOTAL;
}

// A word under the orb, no numbers. Index 0..6.
export const READINESS_STATE_WORDS = [
  'tender',
  'easing',
  'softening',
  'softening',
  'steadier',
  'steadier',
  'calm',
] as const;
