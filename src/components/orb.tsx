import { StyleSheet, View, type ViewStyle } from 'react-native';

const RING_COLOR = '#D966A8';
const ORB_DEEP = '#1A1030';
const ORB_MID = '#4A2F7A';
const ORB_GLOW = '#7B4FB8';
const ORB_HIGHLIGHT = '#B88FD8';
const ORB_BORDER = '#6B4FA0';

interface TierRingProps {
  size: number;
  index: number;
  total: number;
}

function TierRing({ size, index, total }: TierRingProps) {
  const ringW = Math.round(size * 1.45);
  const ringH = Math.round(size * 0.2);
  const spacing = size * 0.07;
  const midOffset = ((total - 1) / 2) * spacing;
  const topOffset = (size - ringH) / 2 + index * spacing - midOffset;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: ringW,
        height: ringH,
        borderRadius: ringH / 2,
        borderWidth: 1.5,
        borderColor: RING_COLOR,
        left: -Math.round((ringW - size) / 2),
        top: Math.round(topOffset),
        opacity: 0.72,
      }}
    />
  );
}

export interface OrbProps {
  size?: number;
  /**
   * Number of Saturn-style rings to draw at the equator.
   * Default 0 leaves the orb ring-free (home screen orb stays unaffected).
   * Port of Mac `tierRingCount(tier)`.
   */
  tierRingCount?: number;
  style?: ViewStyle;
}

/**
 * Sphere orb with optional tier-accent rings rendered behind the sphere body
 * so they appear to pass through it at the equator.
 */
export function Orb({ size = 140, tierRingCount = 0, style }: OrbProps) {
  const r = size / 2;
  const glowSize = size * 1.32;
  const glowOffset = -(glowSize - size) / 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Ambient glow halo behind everything */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: ORB_MID,
          opacity: 0.14,
          top: glowOffset,
          left: glowOffset,
        }}
      />

      {/* Tier rings drawn first so sphere body occludes their centre */}
      {tierRingCount > 0 &&
        Array.from({ length: tierRingCount }).map((_, i) => (
          <TierRing key={i} size={size} index={i} total={tierRingCount} />
        ))}

      {/* Sphere body — solid background to occlude ring centres */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: r, backgroundColor: ORB_DEEP, overflow: 'hidden' },
        ]}>
        {/* Mid-sphere volume glow */}
        <View
          style={{
            position: 'absolute',
            width: size * 0.68,
            height: size * 0.68,
            borderRadius: size * 0.34,
            backgroundColor: ORB_GLOW,
            opacity: 0.48,
            top: size * 0.16,
            left: size * 0.16,
          }}
        />
        {/* Specular highlight lobe */}
        <View
          style={{
            position: 'absolute',
            width: size * 0.38,
            height: size * 0.38,
            borderRadius: size * 0.19,
            backgroundColor: ORB_HIGHLIGHT,
            opacity: 0.22,
            top: size * 0.07,
            left: size * 0.1,
          }}
        />
        {/* Bright specular point */}
        <View
          style={{
            position: 'absolute',
            width: size * 0.11,
            height: size * 0.11,
            borderRadius: size * 0.055,
            backgroundColor: '#FFFFFF',
            opacity: 0.2,
            top: size * 0.12,
            left: size * 0.19,
          }}
        />
      </View>

      {/* Sphere rim */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: r, borderWidth: 1, borderColor: ORB_BORDER, opacity: 0.45 },
        ]}
      />
    </View>
  );
}
