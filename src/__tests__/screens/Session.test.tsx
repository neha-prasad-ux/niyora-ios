import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'box' }),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  const handler: Record<string, unknown> = {};
  ['activeOffsetY', 'failOffsetX', 'onUpdate', 'onEnd'].forEach((m) => {
    handler[m] = () => handler;
  });
  return {
    Gesture: { Pan: () => handler },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});
jest.mock('@/components/BreathingParticles', () => ({
  BreathingParticles: () => null,
}));
jest.mock('@/components/phase-label', () => ({
  PhaseLabel: () => null,
}));
jest.mock('@/components/session-background', () => ({
  SessionBackground: () => null,
}));

import SessionScreen from '@/app/session';

describe('Session screen smoke test', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing for a valid breathing technique id', () => {
    const { toJSON } = render(<SessionScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows the Box Breath instructions', () => {
    const { getByText } = render(<SessionScreen />);
    expect(getByText('In 4, hold 4, out 4, hold 4. Steady rhythm.')).toBeTruthy();
  });
});
