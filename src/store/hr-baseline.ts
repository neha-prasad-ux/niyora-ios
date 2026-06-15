import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  computeBaseline,
  type BaselineModel,
  type BaselineOptions,
  type HrSample,
} from '@/lib/hr-baseline';

// Persists the latest computed resting-HR baseline (Phase B1). The model is
// cheap to recompute from HealthKit, but caching it lets detection (B2) read a
// baseline instantly without re-querying, and lets us see how it settles.

const STORAGE_KEY = 'niyora:hr-baseline';

export type StoredBaseline = {
  model: BaselineModel;
  /** ISO-8601 time the model was computed. */
  updatedAt: string;
};

function parse(raw: string | null): StoredBaseline | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.model?.byHour) &&
      parsed.model.byHour.length === 24
    ) {
      return parsed as StoredBaseline;
    }
    return null;
  } catch {
    return null;
  }
}

/** The cached baseline, or null if none has been computed yet. */
export async function readBaseline(): Promise<StoredBaseline | null> {
  return parse(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function saveBaseline(model: BaselineModel, now: Date = new Date()): Promise<void> {
  const payload: StoredBaseline = { model, updatedAt: now.toISOString() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Compute a fresh baseline from samples and persist it. Returns the new model.
 */
export async function updateBaselineFromSamples(
  samples: HrSample[],
  options?: BaselineOptions,
  now: Date = new Date(),
): Promise<BaselineModel> {
  const model = computeBaseline(samples, options);
  await saveBaseline(model, now);
  return model;
}
