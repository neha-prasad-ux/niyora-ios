// Photograph-the-sky, an in-app calm activity (Rung 1 of the hold).
//
// She takes a photo (the sky, a window, anything up and out) and it fills a
// picture, here, a ball gown becomes her sky. Two mechanisms at once:
// grounding (attention outward, up and out, without leaving) and a keepsake she
// made. The dress is just a mask; her photo shows through it.
//
// The illustration is a placeholder silhouette (art/dress); a real Cinderella
// dress SVG drops in the same way the flower did.

import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Fill,
  Group,
  Image as SkiaImage,
  Path,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

import { BeginButton } from '@/components/begin-button';
import { DRESS } from '@/components/moment/art/dress';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const PAPER = '#FFFFFF';
const OUTLINE = '#2B2632';
const EMPTY = '#F3EFEA';

export function PhotoFill() {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 16, 460);
  const h = w * 1.3;

  const [uri, setUri] = useState<string | null>(null);
  const image = useImage(uri);

  const dress = Skia.Path.MakeFromSVGString(DRESS.d);
  // Fit the dress to the canvas, centred.
  const s = Math.min((w * 0.82) / DRESS.vbW, (h * 0.9) / DRESS.vbH);
  const tx = (w - DRESS.vbW * s) / 2;
  const ty = (h - DRESS.vbH * s) / 2;

  // Lazily loaded: expo-image-picker is a NATIVE module, so importing it at the
  // top of the file crashes the whole bundle until the app is rebuilt with it.
  // Requiring it inside the handler keeps the screen loadable now; the camera
  // itself lights up after the next `build:dev`. Guarded so a tap before that
  // is a quiet no-op, not a crash.
  const take = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
      const ImagePicker = require('expo-image-picker');
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!res.canceled && res.assets[0]) {
        setUri(res.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      // Native module not built into this binary yet, needs build:dev.
    }
  };
  const choose = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose, see above
      const ImagePicker = require('expo-image-picker');
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (!res.canceled && res.assets[0]) setUri(res.assets[0].uri);
    } catch {
      // Native module not built into this binary yet, needs build:dev.
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {uri ? 'Your sky.' : 'Photograph the sky, and it fills the dress.'}
      </Text>

      <View style={{ width: w, height: h }}>
        <Canvas style={{ width: w, height: h }}>
          <Fill color={PAPER} />
          {dress && (
            <Group transform={[{ translateX: tx }, { translateY: ty }, { scale: s }]}>
              {/* The dress, filled by her photo (or a soft empty tint). */}
              <Group clip={dress}>
                {image ? (
                  <SkiaImage
                    image={image}
                    x={0}
                    y={0}
                    width={DRESS.vbW}
                    height={DRESS.vbH}
                    fit="cover"
                  />
                ) : (
                  <Path path={dress} color={EMPTY} />
                )}
              </Group>
              <Path path={dress} color={OUTLINE} style="stroke" strokeWidth={2.6 / s} strokeJoin="round" />
            </Group>
          )}
        </Canvas>
      </View>

      <View style={styles.actions}>
        <BeginButton fullWidth label={uri ? 'Take another' : 'Take a photo'} onPress={take} />
        <Text onPress={choose} style={styles.choose} accessibilityRole="button">
          or choose a photo
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.xl },
  title: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    lineHeight: 23,
    color: '#6B6570',
    textAlign: 'center',
    maxWidth: 300,
  },
  actions: { alignItems: 'center', gap: spacing.md, alignSelf: 'stretch', paddingHorizontal: spacing.xl },
  choose: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: '#8A8590',
    paddingVertical: spacing.sm,
  },
});
