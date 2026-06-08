import { useEffect, useState } from 'react';

import { NiyoraSync, SyncState, SyncStatus, MacSoulState } from 'niyora-sync';

export type { SyncState, SyncStatus, MacSoulState };

export function useNiyoraSync() {
  const [syncState, setSyncState] = useState<SyncState>({ state: 'unpaired' });
  const [discoveredServers, setDiscoveredServers] = useState<string[]>([]);
  const [macStatus, setMacStatus] = useState<SyncStatus | null>(null);
  const [macSoulState, setMacSoulState] = useState<MacSoulState | null>(null);

  useEffect(() => {
    const stateSub  = NiyoraSync.addStateListener(setSyncState);
    const discSub   = NiyoraSync.addServerDiscoveredListener((e) => {
      setDiscoveredServers((prev) =>
        prev.includes(e.name) ? prev : [...prev, e.name]
      );
    });
    const statusSub = NiyoraSync.addStatusListener(setMacStatus);
    const soulSub   = NiyoraSync.addSoulStateListener(setMacSoulState);

    NiyoraSync.startDiscovery();

    return () => {
      NiyoraSync.stopDiscovery();
      stateSub.remove();
      discSub.remove();
      statusSub.remove();
      soulSub.remove();
    };
  }, []);

  return {
    syncState,
    discoveredServers,
    macStatus,
    macSoulState,
    isPaired: syncState.state === 'paired',
    connectToMac: NiyoraSync.connectToMac,
    cancelPairing: NiyoraSync.cancelPairing,
    recordSession: NiyoraSync.recordSession,
  };
}
