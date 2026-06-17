import { requireNativeModule } from 'expo-modules-core';

/** A single heart-rate reading from HealthKit. */
export type HeartRateSample = {
  /** Beats per minute. */
  bpm: number;
  /** ISO-8601 timestamp (sample end date). */
  date: string;
};

/** Steps + active energy summed over one fixed time bucket. */
export type ActivityBucket = {
  /** ISO-8601 bucket start. Buckets are contiguous and anchored at the window start. */
  start: string;
  /** Steps in this bucket. */
  steps: number;
  /** Active energy (kcal) in this bucket. */
  kcal: number;
};

/** A workout overlapping the queried window. */
export type Workout = {
  /** Raw HKWorkoutActivityType value (e.g. 37 = running, 52 = walking). */
  activityType: number;
  /** ISO-8601 start. */
  start: string;
  /** ISO-8601 end. */
  end: string;
  /** True when the workout is still in progress (end is now or later). */
  isActive: boolean;
};

// Load defensively: if the native module isn't in this binary, fall back to a
// no-op so the app still runs with stress features simply disabled (mirrors the
// pattern in niyora-sync).
let Native: any = null;
try {
  Native = requireNativeModule('NiyoraHealth');
} catch {
  Native = null;
}

/** True when the native HealthKit module is available in this build. */
export const isHealthAvailable = Native !== null;

export const NiyoraHealth = {
  /** Whether HealthKit data is available on this device. */
  async isAvailable(): Promise<boolean> {
    return Native ? Native.isAvailable() : false;
  },

  /**
   * Show the HealthKit permission dialog for read access to heart rate,
   * steps, active energy, and workouts.
   */
  async requestAuthorization(): Promise<boolean> {
    return Native ? Native.requestAuthorization() : false;
  },

  /**
   * Recent heart-rate samples, newest first.
   * @param sinceIso ISO-8601 start; defaults to one hour ago.
   * @param limit max samples (default 200).
   */
  async getHeartRateSamples(sinceIso?: string, limit = 200): Promise<HeartRateSample[]> {
    return Native ? Native.getHeartRateSamples(sinceIso ?? null, limit) : [];
  },

  /**
   * Total steps over the window (activity-gating signal).
   * @param sinceIso ISO-8601 start; defaults to 10 minutes ago.
   */
  async getStepCount(sinceIso?: string): Promise<number> {
    return Native ? Native.getStepCount(sinceIso ?? null) : 0;
  },

  /**
   * Total active energy burned in kcal over the window (activity-gating signal).
   * @param sinceIso ISO-8601 start; defaults to 10 minutes ago.
   */
  async getActiveEnergy(sinceIso?: string): Promise<number> {
    return Native ? Native.getActiveEnergy(sinceIso ?? null) : 0;
  },

  /**
   * Workouts overlapping the window, newest first. Used to exclude exercise
   * from the stress trigger (a running workout is not stress).
   * @param sinceIso ISO-8601 start; defaults to one hour ago.
   * @param limit max workouts (default 20).
   */
  async getRecentWorkouts(sinceIso?: string, limit = 20): Promise<Workout[]> {
    return Native ? Native.getRecentWorkouts(sinceIso ?? null, limit) : [];
  },

  /**
   * Steps + active energy summed into fixed time buckets across the window,
   * for building an activity-aware resting baseline (B1).
   * @param sinceIso ISO-8601 start; defaults to 7 days ago.
   * @param intervalMinutes bucket size in minutes (default 5).
   */
  async getActivityBuckets(sinceIso?: string, intervalMinutes = 5): Promise<ActivityBucket[]> {
    return Native ? Native.getActivityBuckets(sinceIso ?? null, intervalMinutes) : [];
  },
};
