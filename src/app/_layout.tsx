import '../../global.css';
// Design-system rule: enforce Poppins on every <Text>/<TextInput>. Side-effect
// import — must run before any text renders.
import '../theme/apply-poppins';

import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/error-boundary';
import * as Notifications from 'expo-notifications';
import { COMEBACK_NUDGE_ID } from '../lib/notifications';
import {
  STRESS_NUDGE_ID,
  registerStressNudgeCategory,
  answerFromAction,
} from '../lib/stress-nudge';
import { recordAnswer } from '../store/nudge-history';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Register the stress-nudge action buttons once, before any nudge can fire.
  useEffect(() => {
    registerStressNudgeCategory().catch(() => {});
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (id === COMEBACK_NUDGE_ID) {
        router.push({ pathname: '/session', params: { id: 'quick-calm' } });
        return;
      }
      if (id === STRESS_NUDGE_ID) {
        // Yes / No / Not now is the ground truth. Record it; a Yes also offers
        // a calming session, the natural next step (the action flow is C1).
        const answer = answerFromAction(response.actionIdentifier);
        if (answer) {
          recordAnswer(answer).catch(() => {});
        }
        if (answer === 'yes') {
          router.push({ pathname: '/session', params: { id: 'quick-calm' } });
        }
        return;
      }
    });
    return () => sub.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen
            name="onboarding"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="session"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="my-soul"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          {__DEV__ && <Stack.Screen name="health-probe" />}
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
