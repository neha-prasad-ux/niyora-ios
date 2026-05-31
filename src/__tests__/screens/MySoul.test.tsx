import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
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
jest.mock('@/components/background-gradient', () => ({
  BackgroundGradient: () => null,
}));
jest.mock('@/components/orb', () => ({ Orb: () => null }));

import MySoulScreen from '@/app/my-soul';

describe('My Soul screen smoke test', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<MySoulScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows the screen title', () => {
    const { getByText } = render(<MySoulScreen />);
    expect(getByText('My Soul')).toBeTruthy();
  });

  it('shows the tier level at 0 sessions (Spark)', () => {
    const { getByText } = render(<MySoulScreen />);
    expect(getByText(/Spark/)).toBeTruthy();
  });
});
