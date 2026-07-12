// The launch gate. The old v2 home that lived here is retired: the app now
// opens on the Now tab, and first-launch users go through onboarding before
// any tab paints. This screen only decides where to land and holds the bare
// background while it reads the flag, so nothing ever flashes.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { getOnboardingComplete } from '@/store/onboarding-complete';

export default function LaunchGate() {
  // undefined while we read the flag; once known, false sends the user into
  // the first-launch onboarding before any tab ever paints.
  const [onboarded, setOnboarded] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    getOnboardingComplete()
      .then((done) => alive && setOnboarded(done))
      .catch(() => alive && setOnboarded(true)); // fail open: don't trap users out of the app
    return () => {
      alive = false;
    };
  }, []);

  if (onboarded === undefined) {
    return (
      <View style={styles.root}>
        <BackgroundGradient />
      </View>
    );
  }

  return <Redirect href={onboarded ? '/now' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
});
