import { EventEmitter, requireNativeModule } from 'expo-modules-core';

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

export type Subscription = { remove: () => void };

type NiyoraSyncEvents = {
  onStateChanged: (state: SyncState) => void;
  onServerDiscovered: (event: { name: string }) => void;
  onStatusUpdate: (status: SyncStatus) => void;
};

const NativeModule = requireNativeModule('NiyoraSync');
const emitter = new EventEmitter<NiyoraSyncEvents>(NativeModule);

export const NiyoraSync = {
  startDiscovery(): void {
    NativeModule.startDiscovery();
  },

  stopDiscovery(): void {
    NativeModule.stopDiscovery();
  },

  async pairWithQR(qrString: string): Promise<void> {
    return NativeModule.pairWithQR(qrString);
  },

  isPaired(): boolean {
    return NativeModule.isPaired();
  },

  /** Report a finished session to the Mac (no-op when not paired). */
  recordSession(session: SyncSession): void {
    NativeModule.recordSession(
      session.techniqueName,
      session.techniqueKind,
      session.durationSec,
      session.intendedDurationSec,
      session.completed,
      session.recordedAt,
    );
  },

  addStateListener(cb: (s: SyncState) => void): Subscription {
    return emitter.addListener('onStateChanged', cb);
  },

  addServerDiscoveredListener(cb: (e: { name: string }) => void): Subscription {
    return emitter.addListener('onServerDiscovered', cb);
  },

  /** Mac-side tier + session count, for showing paired progression. */
  addStatusListener(cb: (s: SyncStatus) => void): Subscription {
    return emitter.addListener('onStatusUpdate', cb);
  },
};
