import { useEffect, useState } from 'react';

import { NiyoraSync, SyncState } from 'niyora-sync';

export type { SyncState };

export function useNiyoraSync() {
  const [syncState, setSyncState] = useState<SyncState>({ state: 'unpaired' });
  const [discoveredServers, setDiscoveredServers] = useState<string[]>([]);

  useEffect(() => {
    const stateSub = NiyoraSync.addStateListener(setSyncState);
    const discSub  = NiyoraSync.addServerDiscoveredListener((e) => {
      setDiscoveredServers((prev) =>
        prev.includes(e.name) ? prev : [...prev, e.name]
      );
    });

    NiyoraSync.startDiscovery();

    return () => {
      NiyoraSync.stopDiscovery();
      stateSub.remove();
      discSub.remove();
    };
  }, []);

  return {
    syncState,
    discoveredServers,
    isPaired: syncState.state === 'paired',
    pairWithQR: NiyoraSync.pairWithQR,
    pushSync: NiyoraSync.pushSync,
  };
}
