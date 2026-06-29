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
import { COMEBACK_NUDGE_ID, PMS_AHEAD_ID, PMS_START_ID } from '../lib/notifications';
import {
  STRESS_NUDGE_ID,
  registerStressNudgeCategory,
  answerFromAction,
} from '../lib/stress-nudge';
import { recordAnswer } from '../store/nudge-history';
import { useStressTick } from '../hooks/use-stress-tick';
import { STRESS_EXPERIMENT } from '../config/features';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Poppins-Light': require('../../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Regular': require('../../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('../../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('../../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('../../assets/fonts/Poppins-Bold.ttf'),
    // Handwriting face, used for the journaling "I feel..." scene.
    PatrickHand: require('../../assets/fonts/PatrickHand-Regular.ttf'),
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

  // Run a stress tick on launch and each foreground (experiment builds only).
  useStressTick(STRESS_EXPERIMENT);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const id = response.notification.request.identifier;
      if (id === COMEBACK_NUDGE_ID) {
        router.push({ pathname: '/session', params: { id: 'quick-calm' } });
        return;
      }
      // The PMS window doorbell lands her on home, where the luteal signature
      // (warm orb + card) and the "How are you?" entry do the teaching.
      if (id === PMS_AHEAD_ID || id === PMS_START_ID) {
        router.replace('/');
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
            name="result"
            options={{
              animation: 'fade',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="activity"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="session"
            options={{
              // A soft cross-dissolve into (and out of) the breath, rather than
              // a hard sideways slide -- the calm entrance the session deserves,
              // and consistent with the faded onboarding/result screens.
              animation: 'fade',
              animationDuration: 420,
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
          <Stack.Screen
            name="pms-week"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="pms-readiness"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="pms-factor"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="distress-loop"
            options={{
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="crisis"
            options={{
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
          {STRESS_EXPERIMENT && <Stack.Screen name="health-probe" />}
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
