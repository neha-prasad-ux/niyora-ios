// The app's three destinations: Now (the daily loop — the home, carrying her
// live moon), Grow (the library of programs and tools), You (progress, identity,
// settings). Everything else in src/app/ stays a stack screen and pushes
// full-screen over this bar.
//
// The bar itself is the bottom of the night sky (night-tab-bar.tsx): content
// scrolls under a sky-fade + glass, the home (Moon) tab's icon is the live moon
// (tab-moon.tsx), and earned light flies into it via the mote overlay
// (light-motes.tsx) mounted above the navigator — the moon that talks to her is
// visibly the one she fed.
//
// Tab ORDER here is the order in the bar and therefore `state.index`, which
// light-motes uses to aim. The moon is the first tab now (MOON_TAB_INDEX there).

import { View } from 'react-native';
import { Tabs } from 'expo-router';

import { LightMotes } from '@/components/light-motes';
import { NightTabBar } from '@/components/night-tab-bar';
import { TabMoon } from '@/components/tab-moon';
import { SunIcon, StarIcon } from '@/components/tab-icons';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="now"
        tabBar={(props) => <NightTabBar {...props} />}
        // Screens cross-fade so a tab switch is one soft dissolve, matched by
        // the selection pill gliding along the bar. (The bottom-tab navigator
        // fades at its own fixed speed · only full-screen stack pushes take a
        // tunable duration, the calm fade in the root _layout.)
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Tabs.Screen
          name="now"
          options={{
            title: 'Moon',
            // The home tab carries her actual moon — real brightness, material
            // and ring count, the one icon that stays lit at rest because it is a
            // readout of her state rather than a symbol. The separate Moon page
            // is gone; this is where the moon lives and where light lands.
            tabBarIcon: ({ focused }) => <TabMoon focused={focused} />,
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
      </Tabs>
      <LightMotes />
    </View>
  );
}
