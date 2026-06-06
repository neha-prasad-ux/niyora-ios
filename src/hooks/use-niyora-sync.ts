import { useEffect, useState } from 'react';

import { NiyoraSync, SyncState, SyncStatus } from 'niyora-sync';

export type { SyncState, SyncStatus };

export function useNiyoraSync() {
  const [syncState, setSyncState] = useState<SyncState>({ state: 'unpaired' });
  const [discoveredServers, setDiscoveredServers] = useState<string[]>([]);
  const [macStatus, setMacStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const stateSub = NiyoraSync.addStateListener(setSyncState);
    const discSub  = NiyoraSync.addServerDiscoveredListener((e) => {
      setDiscoveredServers((prev) =>
        prev.includes(e.name) ? prev : [...prev, e.name]
      );
    });
    const statusSub = NiyoraSync.addStatusListener(setMacStatus);

    NiyoraSync.startDiscovery();

    return () => {
      NiyoraSync.stopDiscovery();
      stateSub.remove();
      discSub.remove();
      statusSub.remove();
    };
  }, []);

  return {
    syncState,
    discoveredServers,
    macStatus,
    isPaired: syncState.state === 'paired',
    pairWithQR: NiyoraSync.pairWithQR,
    recordSession: NiyoraSync.recordSession,
  };
}
