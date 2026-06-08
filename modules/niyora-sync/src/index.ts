import { requireNativeModule } from 'expo-modules-core';

export { QRScannerView } from './QRScannerView';

export type SyncState =
  | { state: 'unpaired' }
  | { state: 'connecting' }
  | { state: 'paired'; serverId: string }
  | { state: 'failed'; message: string };

/** Mac-side soul progression, sent after auth and after each recorded session. */
export type SyncStatus = {
  soulTier: string;
  completedSessions: number;
};

export type MacSoulLabel = 'calm' | 'normal' | 'dense' | 'heavy';

/**
 * Mac situational day reading (DayLabel). Schema v1.
 * Ignore if `ts` is older than 90 minutes -- the Mac only re-sends on label change.
 */
export type MacSoulState = {
  label: MacSoulLabel;
  index: number;   // 0-100
  source: 'mac' | 'phone' | 'self' | 'hrv';
  ts: string;      // ISO 8601
};

/** A completed (or abandoned) session to report to the paired Mac. */
export type SyncSession = {
  techniqueName: string;
  /** "breathing" or "mindfulness". */
  techniqueKind: string;
  durationSec: number;
  /** Intended length; equals durationSec for a completed session. */
  intendedDurationSec: number;
  completed: boolean;
  /** ISO 8601 timestamp. */
  recordedAt: string;
};

/**
 * Mac reminder schedule. The phone schedules a matching local notification
 * unless the Mac is the active device (active-device rule).
 */
export type ReminderState = {
  /** ISO 8601 — when the next reminder fires. */
  fireAt: string;
  /** True when the Mac app is in the foreground. Phone stays silent in that case. */
  macActive: boolean;
  title: string;
  body: string;
};

export type Subscription = { remove: () => void };

type NiyoraSyncEvents = {
  onStateChanged: (state: SyncState) => void;
  onServerDiscovered: (event: { name: string }) => void;
  onStatusUpdate: (status: SyncStatus) => void;
  onSoulStateUpdate: (state: MacSoulState) => void;
  onReminderState: (state: ReminderState) => void;
};

// Load the native module defensively. If it isn't present in this binary
// (e.g. a build where the local module didn't link), requireNativeModule throws
// at import time — which would crash every screen that imports niyora-sync
// (My Soul, the session screen). Catch it and fall back to a no-op so the app
// still runs with sync simply disabled, rather than crashing.
let NativeModule: any = null;
let emitter: any = null;
try {
  NativeModule = requireNativeModule('NiyoraSync');
  // In expo-modules-core 2.x (SDK 52+) the native module IS the event
  // emitter; the legacy `new EventEmitter(module)` wrapper produces a
  // JS-only emitter that never receives native events. Subscribe directly.
  emitter = NativeModule;
} catch {
  NativeModule = null;
  emitter = null;
}

/** True when the native sync module is available in this build. */
export const isSyncAvailable = NativeModule !== null;

const NOOP_SUB: Subscription = { remove: () => {} };

export const NiyoraSync = {
  startDiscovery(): void {
    NativeModule?.startDiscovery();
  },

  stopDiscovery(): void {
    NativeModule?.stopDiscovery();
  },

  async pairWithQR(qrString: string): Promise<void> {
    if (!NativeModule) return;
    return NativeModule.pairWithQR(qrString);
  },

  isPaired(): boolean {
    return NativeModule ? NativeModule.isPaired() : false;
  },

  /** Report a finished session to the Mac (no-op when not paired). */
  recordSession(session: SyncSession): void {
    NativeModule?.recordSession(
      session.techniqueName,
      session.techniqueKind,
      session.durationSec,
      session.intendedDurationSec,
      session.completed,
      session.recordedAt,
    );
  },

  addStateListener(cb: (s: SyncState) => void): Subscription {
    return emitter ? emitter.addListener('onStateChanged', cb) : NOOP_SUB;
  },

  addServerDiscoveredListener(cb: (e: { name: string }) => void): Subscription {
    return emitter ? emitter.addListener('onServerDiscovered', cb) : NOOP_SUB;
  },

  /** Mac-side tier + session count, for showing paired progression. */
  addStatusListener(cb: (s: SyncStatus) => void): Subscription {
    return emitter ? emitter.addListener('onStatusUpdate', cb) : NOOP_SUB;
  },

  /** Mac situational day reading; check `ts` freshness before displaying. */
  addSoulStateListener(cb: (s: MacSoulState) => void): Subscription {
    return emitter ? emitter.addListener('onSoulStateUpdate', cb) : NOOP_SUB;
  },

  /**
   * Request iOS notification permission. Should be called once on first launch.
   * Returns true if the user granted access.
   */
  async requestNotificationPermission(): Promise<boolean> {
    return NativeModule ? NativeModule.requestNotificationPermission() : false;
  },

  /**
   * Mac reminder schedule; fires whenever the Mac sends updated timing or copy.
   * The native layer already handles scheduling/cancellation automatically; this
   * listener is exposed so the React layer can mirror the state if needed (e.g.
   * showing an in-app countdown or suppressing its own UI prompts).
   */
  addReminderStateListener(cb: (s: ReminderState) => void): Subscription {
    return emitter ? emitter.addListener('onReminderState', cb) : NOOP_SUB;
  },
};
