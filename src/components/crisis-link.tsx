// The quiet, persistent "need urgent support?" link. Sits on every distress
// screen, reachable from any state, and always goes straight to the crisis
// resource (never into an activity or reframe). Deliberately understated so it
// is there without alarming.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';

export function CrisisLink() {
  const onPress = () => {
    Haptics.selectionAsync();
    router.push('/crisis');
  };

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={styles.link}
      accessibilityRole="button"
      accessibilityLabel="Need urgent support?"
    >
      <Text style={styles.text}>Need urgent support?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  text: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
});
