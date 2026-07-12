// The app's three destinations: Now (the daily loop), Grow (the library of
// programs and tools), You (progress, identity, settings). Everything else in
// src/app/ stays a stack screen and pushes full-screen over this bar.
//
// The bar itself is the bottom of the night sky (night-tab-bar.tsx): content
// scrolls under a sky-fade + glass, the Now icon is the live moon
// (tab-moon.tsx), and earned light flies into it via the mote overlay
// (light-motes.tsx) mounted above the navigator.

import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { LightMotes } from '@/components/light-motes';
import { NightTabBar } from '@/components/night-tab-bar';
import { TabMoon } from '@/components/tab-moon';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="now"
        tabBar={(props) => <NightTabBar {...props} />}
        // Screens cross-fade so a tab switch is one soft dissolve, matched by
        // the selection pill gliding along the bar.
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Tabs.Screen
          name="now"
          options={{
            title: 'Now',
            tabBarIcon: ({ focused }) => <TabMoon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="grow"
          options={{
            title: 'Grow',
            // Training weights: Grow is where she trains, and the grid read
            // as a settings sheet rather than a place to work out the mind.
            tabBarIcon: ({ color, focused }) => (
              <SymbolView
                name={focused ? 'dumbbell.fill' : 'dumbbell'}
                tintColor={color}
                size={22}
                weight="regular"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ color, focused }) => (
              <SymbolView
                name={focused ? 'person.fill' : 'person'}
                tintColor={color}
                size={22}
                weight="regular"
              />
            ),
          }}
        />
      </Tabs>
      <LightMotes />
    </View>
  );
}
