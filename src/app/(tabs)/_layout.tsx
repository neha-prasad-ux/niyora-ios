// The app's three destinations: Now (the daily loop), Grow (the library of
// programs and tools), You (progress, identity, settings). Everything else in
// src/app/ stays a stack screen and pushes full-screen over this bar.

import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';

const BAR_BG = 'rgba(10, 8, 16, 0.96)';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="now"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BAR_BG,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.38)',
        tabBarLabelStyle: { fontFamily: 'Poppins-Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="now"
        options={{
          title: 'Now',
          tabBarIcon: ({ color }) => (
            <SymbolView name="moon.stars" tintColor={color} size={22} weight="regular" />
          ),
        }}
      />
      <Tabs.Screen
        name="grow"
        options={{
          title: 'Grow',
          tabBarIcon: ({ color }) => (
            <SymbolView name="square.grid.2x2" tintColor={color} size={22} weight="regular" />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ color }) => (
            <SymbolView name="person" tintColor={color} size={22} weight="regular" />
          ),
        }}
      />
    </Tabs>
  );
}
