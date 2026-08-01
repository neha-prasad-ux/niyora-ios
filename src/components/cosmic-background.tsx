// The home's cosmic backdrop: mostly black, with two faint nebula patches — one
// top-left, one bottom-right — and nothing in between. Each patch is the tiled
// starfield tinted a colour (blue / violet), so its stars and faint gas read as a
// small nebula bleeding in from the corner. Pointer-safe; sits behind everything.
//
// To swap in real photographic nebula crops later, drop two .pngs in assets and
// point each <Image source> at them (drop the tintColor).

import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

const STARS = require('../../assets/images/starfield.png');

export function CosmicBackground() {
  const { width: W, height: H } = useWindowDimensions();
  const patch = Math.round(W * 0.62);
  return (
    <View style={[styles.fill, styles.base]} pointerEvents="none">
      {/* A faint full-screen starfield so stars fill the middle too, not only the
          two nebula corners — even distribution without losing the corner glow. */}
      <Image source={STARS} resizeMode="cover" style={[styles.fill, styles.spread]} />
      {/* Blue patch, bleeding in from the top-left corner. */}
      <Image
        source={STARS}
        resizeMode="cover"
        style={[
          styles.patch,
          { width: patch, height: patch, top: -patch * 0.12, left: -patch * 0.14, tintColor: '#6E8FD6' },
        ]}
      />
      {/* Violet patch, bleeding in from the bottom-right. */}
      <Image
        source={STARS}
        resizeMode="cover"
        style={[
          styles.patch,
          { width: patch, height: patch, bottom: H * 0.04, right: -patch * 0.16, tintColor: '#B074C0' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  base: { backgroundColor: '#04030A' },
  spread: { opacity: 0.28 },
  patch: { position: 'absolute', opacity: 0.6 },
});
