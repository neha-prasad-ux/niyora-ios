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
  calcium: { title: 'Calcium-rich food', examples: 'yogurt, cheese, greens' },
  micronutrient: { title: 'Micronutrient-rich food', examples: 'nuts, seeds, dried fruit' },
  steady: { title: 'Ate steadily today', examples: 'no big sugar crash' },
  antiInflammatory: { title: 'Anti-inflammatory food', examples: 'greens, ginger, soup' },
  woundDown: { title: 'Wound down early', examples: 'screens off, dim lights' },
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
