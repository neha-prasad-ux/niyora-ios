// A legibility scrim that sits over the living scene so the activity text reads.
// (The shared action button lives in @/components/Pill.)

import { StyleSheet, View } from 'react-native';

export function Scrim() {
  return <View style={styles.scrim} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.52)',
  },
});
