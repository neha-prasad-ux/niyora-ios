// The app's four destinations: Now (the daily loop), Grow (the library of
// programs and tools), You (progress, identity, settings), Moon (the
// in-the-moment flow). Everything else in src/app/ stays a stack screen and
// pushes full-screen over this bar.
//
// The bar itself is the bottom of the night sky (night-tab-bar.tsx): content
// scrolls under a sky-fade + glass, the MOON tab's icon is the live moon
// (tab-moon.tsx), and earned light flies into it via the mote overlay
// (light-motes.tsx) mounted above the navigator. Today keeps the ring with no
// body (tab-icons: RingsIcon) — she earns in Today and Train, it flies to the
// moon, and the moon that talks to her is visibly the one she fed.
//
// Tab ORDER here is the order in the bar and therefore `state.index`, which
// light-motes uses to aim. Moving Moon means updating MOON_TAB_INDEX there.

import { View } from 'react-native';
import { Tabs } from 'expo-router';

import { LightMotes } from '@/components/light-motes';
import { NightTabBar } from '@/components/night-tab-bar';
import { TabMoon } from '@/components/tab-moon';
import { RingsIcon, SunIcon, StarIcon } from '@/components/tab-icons';

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
            title: 'Today',
            // The ring with no body: the moon itself lives on the Moon tab now,
            // and what Today keeps is the ring and the daily ask.
            tabBarIcon: ({ focused }) => <RingsIcon focused={focused} size={24} />,
          }}
        />
        <Tabs.Screen
          name="grow"
          options={{
            title: 'Train',
            // The sun — the bright, high-drive middle of the phase. Grey at rest,
            // warms to full colour on focus.
            tabBarIcon: ({ focused }) => <SunIcon focused={focused} size={24} />,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'Soul',
            // A star — your own point of light. Grey at rest, gold on focus.
            tabBarIcon: ({ focused }) => <StarIcon focused={focused} size={24} />,
          }}
        />
        <Tabs.Screen
          name="moon"
          options={{
            title: 'Moon',
            // Her actual moon, carrying her real brightness, material and ring
            // count — and the one icon that stays lit at rest, because it is a
            // readout of her state rather than a symbol.
            tabBarIcon: ({ focused }) => <TabMoon focused={focused} />,
          }}
        />
      </Tabs>
      <LightMotes />
    </View>
  );
}
