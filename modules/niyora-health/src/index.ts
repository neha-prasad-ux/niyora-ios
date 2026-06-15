import { requireNativeModule } from 'expo-modules-core';

/** A single heart-rate reading from HealthKit. */
export type HeartRateSample = {
  /** Beats per minute. */
  bpm: number;
  /** ISO-8601 timestamp (sample end date). */
  date: string;
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

  /** Show the HealthKit permission dialog for heart-rate read access. */
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
};
