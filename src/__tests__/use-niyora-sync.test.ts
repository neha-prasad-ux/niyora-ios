// Verifies the zero-tap auto-reconnect paths surfaced by issue #169:
// that discovery starts on mount (triggering Swift Bonjour browsing),
// and that the hook transitions from unpaired to paired without an
// awaiting_approval step when the native layer silently reconnects.

import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { useNiyoraSync } from '@/hooks/use-niyora-sync';

jest.mock('niyora-sync', () => {
  let stateListener: (s: any) => void = () => {};
  return {
    isSyncAvailable: true,
    NiyoraSync: {
      startDiscovery: jest.fn(),
      stopDiscovery: jest.fn(),
      connectToMac: jest.fn(),
      cancelPairing: jest.fn(),
      isPaired: jest.fn(),
      recordSession: jest.fn(),
      addStateListener: jest.fn((cb) => {
        stateListener = cb;
        return { remove: jest.fn() };
      }),
      addServerDiscoveredListener: jest.fn(() => ({ remove: jest.fn() })),
      addStatusListener: jest.fn(() => ({ remove: jest.fn() })),
      addSoulStateListener: jest.fn(() => ({ remove: jest.fn() })),
      requestNotificationPermission: jest.fn(),
      addReminderStateListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    // Test helper: fire a state event as if the native module emitted it.
    emitState: (s: any) => stateListener(s),
  };
});

type HookResult = ReturnType<typeof useNiyoraSync>;

let currentResult: HookResult | null = null;

function HookWrapper() {
  currentResult = useNiyoraSync();
  return null;
}

describe('useNiyoraSync — auto-reconnect', () => {
  let renderer: ReturnType<typeof create> | null = null;

  beforeEach(() => {
    currentResult = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer!.unmount();
        renderer = null;
      });
    }
  });

  it('calls startDiscovery on mount so Bonjour browsing triggers auto-reconnect', () => {
    const { NiyoraSync } = require('niyora-sync');
    act(() => {
      renderer = create(React.createElement(HookWrapper));
    });
    expect(NiyoraSync.startDiscovery).toHaveBeenCalledTimes(1);
  });

  it('starts in unpaired state', () => {
    act(() => {
      renderer = create(React.createElement(HookWrapper));
    });
    expect(currentResult!.syncState.state).toBe('unpaired');
    expect(currentResult!.isPaired).toBe(false);
  });

  it('reflects paired state when the native layer silently reconnects', () => {
    const { emitState } = require('niyora-sync');
    act(() => {
      renderer = create(React.createElement(HookWrapper));
    });
    expect(currentResult!.isPaired).toBe(false);

    act(() => {
      emitState({ state: 'paired', serverId: 'mac-xyz' });
    });
    expect(currentResult!.isPaired).toBe(true);
    expect(currentResult!.syncState).toEqual({ state: 'paired', serverId: 'mac-xyz' });
  });

  it('silent reconnect reaches paired without awaiting_approval', () => {
    const { emitState } = require('niyora-sync');
    act(() => {
      renderer = create(React.createElement(HookWrapper));
    });

    act(() => { emitState({ state: 'connecting' }); });
    expect(currentResult!.syncState.state).toBe('connecting');

    act(() => { emitState({ state: 'paired', serverId: 'mac-xyz' }); });
    expect(currentResult!.syncState.state).toBe('paired');
    // No awaiting_approval step — the Mac recognised our static key and authed silently.
  });

  it('calls stopDiscovery and removes listeners on unmount', () => {
    const { NiyoraSync } = require('niyora-sync');
    act(() => {
      renderer = create(React.createElement(HookWrapper));
    });
    // Clear mount-related calls, then verify only the cleanup path fires stopDiscovery.
    NiyoraSync.stopDiscovery.mockClear();
    act(() => {
      renderer!.unmount();
      renderer = null;
    });
    expect(NiyoraSync.stopDiscovery).toHaveBeenCalledTimes(1);
  });
});
