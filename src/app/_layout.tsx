import '../../global.css';
// Design-system rule: enforce Poppins on every <Text>/<TextInput>. Side-effect
// import — must run before any text renders.
import '../theme/apply-poppins';

import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/error-boundary';
import * as Notifications from 'expo-notifications';
import {
  COMEBACK_NUDGE_ID,
  cancelCombackNudge,
  notificationRoute,
  scheduleCombackNudge,
} from '../lib/notifications';
import {
  STRESS_NUDGE_ID,
  registerStressNudgeCategory,
  answerFromAction,
} from '../lib/stress-nudge';
import { recordAnswer } from '../store/nudge-history';
import { getReminder } from '../store/reminder-prefs';
import { useStressTick } from '../hooks/use-stress-tick';
import { FM_EXPERIMENT, STRESS_EXPERIMENT } from '../config/features';

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
      // The day-specific PMS beats and the break-over nudge open the surface
      // their copy promised, so a tap lands on the feature, not the last screen.
      const route = notificationRoute(id);
      if (route) {
        router.push(route);
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

  // The comeback nudge is armed when she leaves and disarmed when she returns:
  // scheduling on background means a user who never comes back still hears from
  // us COMEBACK_LAPSE_DAYS later, and foregrounding cancels a nudge meant only
  // for someone who drifted. Gated on the daily-reminder consent she granted.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        cancelCombackNudge().catch(() => {});
      } else if (state === 'background') {
        getReminder()
          .then((r) => (r.enabled ? scheduleCombackNudge() : undefined))
          .catch(() => {});
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
            name="onboarding-v3"
            options={{
              animation: 'fade',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="result"
            options={{
              animation: 'fade',
              gestureEnabled: true,
            }}
          />
          {/* The three-tab shell (Now / Grow / You). Every other screen below
              stays on this root stack and pushes full-screen over the bar. */}
          <Stack.Screen
            name="(tabs)"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="game-v3"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="train"
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
          {/* Neha's story — the PMS preparedness reader, opened from the Grow
              PMS shelf and the Now readiness chip. */}
          <Stack.Screen
            name="pms-story"
            options={{
              animation: 'slide_from_right',
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
          {/* Couples: the "Us vs. the PMS" shelf and its four activities. */}
          <Stack.Screen name="couples" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          <Stack.Screen name="couples-quiz" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          <Stack.Screen name="couples-texts" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          <Stack.Screen name="couples-prep" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          <Stack.Screen name="couples-reconnect" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
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
          {/* The cycle-end reflection, opened from the Now tab. */}
          <Stack.Screen
            name="reflect"
            options={{ animation: 'slide_from_right', gestureEnabled: true }}
          />
          {/* The in-the-moment "Steady yourself" flow and its 20-minute break,
              opened from the Now PMS card and the Grow PMS shelf. A calm fade,
              like the breath session. */}
          <Stack.Screen
            name="steady-yourself"
            options={{ animation: 'fade', animationDuration: 420, gestureEnabled: true }}
          />
          <Stack.Screen
            name="steady-break"
            options={{ animation: 'fade', animationDuration: 420, gestureEnabled: true }}
          />
          {/* The reflect ("start fresh") session, reached from the flow. Ships
              scripted (no AI in v1), so it is always registered — only the dev
              spike probe stays behind the experiment flag. */}
          <Stack.Screen
            name="rough-moment"
            options={{
              // Same calm fade as the breath session: an 11pm spiral does not
              // deserve a hard sideways slide.
              animation: 'fade',
              animationDuration: 420,
              gestureEnabled: true,
            }}
          />
          {STRESS_EXPERIMENT && <Stack.Screen name="health-probe" />}
          {FM_EXPERIMENT && <Stack.Screen name="fm-probe" />}
          {/* Dev-only material preview, reached by long-pressing the Now moon. */}
          {__DEV__ && (
            <Stack.Screen
              name="moon-probe"
              options={{ animation: 'fade', animationDuration: 300, gestureEnabled: true }}
            />
          )}
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
