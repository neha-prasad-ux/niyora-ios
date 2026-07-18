// Color tokens derived from DESIGN.md. HSL values from the design doc are
// converted to hex/rgba once here so every component pulls from a single
// source. Do not introduce ad-hoc colors in components.

export const colors = {
  // Background gradient (top to bottom).
  // hsl(250, 30%, 6%), hsl(260, 20%, 3%), black.
  backgroundTop: '#0e0b14',
  backgroundMid: '#070609',
  backgroundBottom: '#000000',

  // Orb stops (calm palette, default home orb).
  // hsl(220, 25%, 92%) mid, hsl(220, 40%, 72%) edge, hsl(220, 55%, 75%) halo.
  orbHighlight: 'rgba(255, 255, 255, 0.97)',
  orbMid: 'rgba(231, 233, 238, 0.95)',
  orbEdge: 'rgba(165, 184, 213, 0.90)',
  orbHalo: 'rgba(140, 169, 213, 0.50)',
  orbShadow: 'rgba(0, 0, 0, 0.55)',
  orbCrescent: 'rgba(255, 255, 255, 0.55)',

  // Begin button. hsla(270,50%,45%,.8) -> hsla(280,40%,35%,.8) per Mac spec.
  beginStart: 'rgba(115, 57, 172, 0.8)',
  beginEnd: 'rgba(101, 54, 125, 0.8)',
  beginBorder: 'rgba(150, 110, 187, 0.30)',
  beginGlow: 'rgba(104, 58, 172, 0.45)',

  // The flat solid-purple primary used by the smaller in-card buttons (You,
  // Reflect) and the switch "on" track. One token so it can't drift from the
  // copy-pasted `hsl(270,50%,45%)` it replaces.
  primarySolid: 'hsl(270, 50%, 45%)',
  // The off state of a Switch track, so the toggles stop hardcoding it.
  switchTrackOff: '#2a2433',

  // Text colors. White at varying opacities per DESIGN.md home anatomy.
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textWordmark: 'rgba(255, 255, 255, 0.70)',
  textTagline: 'rgba(255, 255, 255, 0.40)',
  textSubtitle: 'rgba(255, 255, 255, 0.55)',
  textTertiary: 'rgba(255, 255, 255, 0.60)',

  // Chrome icons (header).
  iconChrome: 'rgba(255, 255, 255, 0.85)',

  // Phase strip on the Now card. Build wears the moon's cool blue, PMS and
  // period warm to rose; the active segment is a tint, never an inversion,
  // so the moon stays the brightest thing on screen.
  bandBuildActive: 'rgba(143, 168, 232, 0.38)',
  bandBuildDim: 'rgba(143, 168, 232, 0.13)',
  bandPmsActive: 'rgba(237, 147, 177, 0.42)',
  bandPmsDim: 'rgba(237, 147, 177, 0.15)',
  bandPeriodActive: 'rgba(237, 147, 177, 0.60)',
  bandPeriodDim: 'rgba(255, 255, 255, 0.07)',
  bandPearl: '#E2E7F2',
  bandLabel: 'rgba(255, 255, 255, 0.95)',
  bandLabelDim: 'rgba(255, 255, 255, 0.45)',
  bandBlueText: 'rgba(169, 184, 232, 0.95)',
  bandRoseText: 'rgba(244, 192, 209, 0.95)',
  bandRoseBorder: 'rgba(237, 147, 177, 0.5)',
} as const;
