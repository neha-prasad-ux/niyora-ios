import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_ANSWERS, type V3Answers } from '@/v3/v3-content';

// Saved progress for the V3 PMS onboarding, so she can leave partway and pick up
// exactly where she left off (the "finish setting up" card on the home screen).
// Stays entirely on device, like the rest of the PMS state. This is separate
// from the first-launch `onboarding-complete` flag (that gates the old intro);
// V3 tracks its own progress so the two flows never interfere.
export type OnboardingV3Progress = {
  stepIndex: number;
  answers: V3Answers;
  done: boolean; // true once she finishes the plan hand-off
};

const KEY = 'niyora:onboarding-v3';

export const EMPTY_V3_PROGRESS: OnboardingV3Progress = {
  stepIndex: 0,
  answers: EMPTY_ANSWERS,
  done: false,
};

// Which setup card the home shows. The rule: as long as the app does not have
// her PMS read (onboarding never finished), the home keeps a way back in
// pinned at the top — no matter how she left (closed the app, swiped back, or
// never started). 'resume' when there is a saved step to return to, 'start'
// when nothing is saved yet, null only once the read is done.
export type SetupCard = 'start' | 'resume';
export function setupCardFor(
  p: OnboardingV3Progress | null,
  hasCompletedRead = false,
): SetupCard | null {
  // A recorded PMS read is proof onboarding was finished at least once, so it
  // wins over the `done` flag: the flag can desync (e.g. a step-change autosave
  // firing after commit), but a read only exists once she has genuinely
  // completed. Trusting it here also self-heals any install left with a stale
  // done:false after such a desync.
  if (hasCompletedRead || p?.done) return null;
  return p && p.stepIndex > 0 ? 'resume' : 'start';
}

export async function getOnboardingV3Progress(): Promise<OnboardingV3Progress | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<OnboardingV3Progress>;
    if (typeof p.stepIndex !== 'number') return null;
    return {
      stepIndex: p.stepIndex,
      answers: { ...EMPTY_ANSWERS, ...(p.answers ?? {}) },
      done: p.done === true,
    };
  } catch {
    return null;
  }
}

export async function setOnboardingV3Progress(p: OnboardingV3Progress): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

export async function clearOnboardingV3Progress(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
