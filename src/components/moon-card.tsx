// A card with the shared moon-surface texture, tinted to a given colour.
// Reused across onboarding ("How Niyora helps"), the luteal home card, and the
// readiness page so the textured look and feel is identical everywhere.
//
// The texture is a soft grayscale value-noise PNG laid over the tint at low
// opacity, so the lighter speckle reads as a lit moon surface and the darker
// speckle as shadow, without an external/licensed image.

import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

const MOON_TEXTURE = require('../../assets/images/moon-texture.png');

export function MoonCard({
  color,
  style,
  textureOpacity = 0.16,
  children,
}: {
  color: string;
  style?: StyleProp<ViewStyle>;
  textureOpacity?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: color }, style]}>
      <View style={styles.texture} pointerEvents="none">
        <Image
          source={MOON_TEXTURE}
          style={[styles.textureImage, { opacity: textureOpacity }]}
          resizeMode="cover"
          accessible={false}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  texture: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textureImage: {
    width: '100%',
    height: '100%',
  },
});
