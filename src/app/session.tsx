import { StyleSheet, Text, View } from 'react-native';

import { SessionBackground } from '@/components/session-background';
import { useBreathCycle } from '@/hooks/use-breath-cycle';

export default function SessionScreen() {
  const { phase, targetColor } = useBreathCycle();

  return (
    <View style={styles.root}>
      <SessionBackground targetColor={targetColor} />
      <Text style={styles.phase}>{phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  phase: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 18,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
