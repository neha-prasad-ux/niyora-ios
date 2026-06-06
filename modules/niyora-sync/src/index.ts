import { EventEmitter, requireNativeModule } from 'expo-modules-core';

export { QRScannerView } from './QRScannerView';

export type SyncState =
  | { state: 'unpaired' }
  | { state: 'connecting' }
  | { state: 'awaiting_response' }
  | { state: 'paired'; serverId: string }
  | { state: 'failed'; message: string };

export type Subscription = { remove: () => void };

type NiyoraSyncEvents = {
  onStateChanged: (state: SyncState) => void;
  onServerDiscovered: (event: { name: string }) => void;
  onSyncAck: () => void;
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

  pushSync(payload: string): void {
    NativeModule.pushSync(payload);
  },

  isPaired(): boolean {
    return NativeModule.isPaired();
  },

  addStateListener(cb: (s: SyncState) => void): Subscription {
    return emitter.addListener('onStateChanged', cb);
  },

  addServerDiscoveredListener(cb: (e: { name: string }) => void): Subscription {
    return emitter.addListener('onServerDiscovered', cb);
  },

  addSyncAckListener(cb: () => void): Subscription {
    return emitter.addListener('onSyncAck', cb);
  },
};
