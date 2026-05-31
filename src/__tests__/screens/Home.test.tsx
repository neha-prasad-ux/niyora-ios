import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
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
jest.mock('@/components/begin-button', () => ({ BeginButton: () => null }));
jest.mock('@/components/header', () => ({ Header: () => null }));

import HomeScreen from '@/app/index';

describe('Home screen smoke test', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HomeScreen />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows the first unlocked breathing technique name', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Box Breath')).toBeTruthy();
  });

  it('shows the "Try a different one" button', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Try a different one')).toBeTruthy();
  });
});
