// Placeholder painterly scene behind a story beat. The real faceless paintings
// (niyora-pms-preparedness-spec.md, "Image recipe") land later as assets keyed by
// scene.image; until then this stubs a text-safe dark scene in the recipe's own
// palette: a deep near-black indigo field, a soft glowing pearl moon, an optional
// warm lamp/tea bleed, and a lower-third scrim so the beat copy stays legible.
//
// It is intentionally simple and calm, no animation to compete with the reading.

import { Image, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Scene } from '@/v3/chapter-content';
import { sceneImage } from '@/v3/chapter-scenes';

// Recipe palette: deep near-black indigo (#0e0b14 → #070609 → black), cool
// moonlit whites, a faint rose in shadow, a warm amber only where a scene calls
// for lamplight over moonlight.
const FIELD_TOP = '#0e0b14';
const FIELD_MID = '#070609';
const FIELD_BOTTOM = '#000000';
const MOON_CORE = 'rgb(231, 233, 238)';
const MOON_EDGE = 'hsl(220, 30%, 78%)';
const WARM_GLOW = 'hsl(30, 55%, 55%)';
const ROSE_SHADOW = 'hsl(340, 45%, 60%)';

// A stable pseudo-position from the scene key so each beat's moon sits a little
// differently but never jumps between renders. No Math.random (would reshuffle).
function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xffff;
  return h;
}

export function StoryScene({ scene }: { scene: Scene }) {
  const { width, height } = useWindowDimensions();

  // Real painterly art when it exists (full-bleed), with the same lower-third
  // scrim over it so the beat copy stays legible. Falls back to the stub below.
  const art = sceneImage(scene.image);
  if (art != null) {
    return (
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        <Image source={art} resizeMode="cover" style={{ width, height }} accessible={false} />
        {/* A base dim over the whole painting so beat copy reads even where it
            runs up over the brighter upper art (long beats fill most of the
            screen), then a bottom-weighted gradient where the copy sits. */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(8, 6, 14, 0.34)',
          }}
        />
        <LinearGradient
          colors={['rgba(8, 6, 14, 0)', 'rgba(8, 6, 14, 0.55)', 'rgba(8, 6, 14, 0.92)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>
    );
  }

  const h = hash(scene.image);
  // Moon drifts across the upper band: x in ~0.30..0.74, y in ~0.16..0.30.
  const moonX = width * (0.30 + ((h % 100) / 100) * 0.44);
  const moonY = height * (0.16 + (((h >> 5) % 100) / 100) * 0.14);
  const moonR = Math.min(width, height) * 0.10;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <LinearGradient
        colors={[FIELD_TOP, FIELD_MID, FIELD_BOTTOM]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          {/* The moon halo, then a bright pearl core. */}
          <RadialGradient id="moonHalo" cx={moonX} cy={moonY} r={moonR * 2.6} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={MOON_EDGE} stopOpacity="0.5" />
            <Stop offset="0.5" stopColor={MOON_EDGE} stopOpacity="0.14" />
            <Stop offset="1" stopColor={MOON_EDGE} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="moonBody" cx={moonX - moonR * 0.3} cy={moonY - moonR * 0.3} r={moonR * 1.3} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="rgb(255,255,255)" stopOpacity="0.97" />
            <Stop offset="0.6" stopColor={MOON_CORE} stopOpacity="0.92" />
            <Stop offset="1" stopColor={MOON_EDGE} stopOpacity="0.9" />
          </RadialGradient>
          {/* A faint rose bleed low in the field (the recipe's shadow rose). */}
          <RadialGradient id="roseShadow" cx={width * 0.22} cy={height * 0.72} r={width * 0.7} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={ROSE_SHADOW} stopOpacity="0.10" />
            <Stop offset="1" stopColor={ROSE_SHADOW} stopOpacity="0" />
          </RadialGradient>
          {/* Warm lamp/tea glow, only for scenes that ask for warmth. */}
          {scene.warm === true && (
            <RadialGradient id="warmGlow" cx={width * 0.7} cy={height * 0.62} r={width * 0.75} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={WARM_GLOW} stopOpacity="0.20" />
              <Stop offset="1" stopColor={WARM_GLOW} stopOpacity="0" />
            </RadialGradient>
          )}
          {/* Lower-third scrim so the copy band always has a dark, safe ground. */}
          <RadialGradient id="scrim" cx={width * 0.5} cy={height * 1.02} r={height * 0.62} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.86" />
            <Stop offset="0.7" stopColor="#000000" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#roseShadow)" />
        {scene.warm === true && <Rect x={0} y={0} width={width} height={height} fill="url(#warmGlow)" />}
        {scene.moon && (
          <>
            <Circle cx={moonX} cy={moonY} r={moonR * 2.6} fill="url(#moonHalo)" />
            <Circle cx={moonX} cy={moonY} r={moonR} fill="url(#moonBody)" />
          </>
        )}
        <Rect x={0} y={0} width={width} height={height} fill="url(#scrim)" />
      </Svg>
    </View>
  );
}
