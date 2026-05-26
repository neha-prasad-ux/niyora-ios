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

  // Begin button. hsl(270, 50%, 45%) -> hsl(280, 40%, 35%).
  beginStart: '#683aac',
  beginEnd: '#5e3580',
  beginBorder: 'rgba(150, 110, 187, 0.30)',
  beginGlow: 'rgba(104, 58, 172, 0.45)',

  // Text colors. White at varying opacities per DESIGN.md home anatomy.
  textPrimary: 'rgba(255, 255, 255, 0.95)',
  textWordmark: 'rgba(255, 255, 255, 0.70)',
  textTagline: 'rgba(255, 255, 255, 0.40)',
  textSubtitle: 'rgba(255, 255, 255, 0.55)',
  textTertiary: 'rgba(255, 255, 255, 0.60)',

  // Chrome icons (header).
  iconChrome: 'rgba(255, 255, 255, 0.85)',
} as const;
