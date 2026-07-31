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

  // ── Semantic ramps (prefer these in new/migrated code) ─────────────────────
  // The audit found 51 distinct white-opacity values in the app. These four
  // text steps, three fill steps, and three border steps are the whole
  // sanctioned set. Everything else rounds to the nearest step here.

  // Text on the dark background. `faint` is below WCAG AA (~2.5:1) · use it only
  // for decorative / non-essential text, never for anything the user must read.
  textOnDark: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: 'rgba(255, 255, 255, 0.70)',
    tertiary: 'rgba(255, 255, 255, 0.55)',
    faint: 'rgba(255, 255, 255, 0.40)',
  },

  // Translucent surface fills, low to high (glass cards, tiles, selected rows).
  fill: {
    faint: 'rgba(255, 255, 255, 0.05)',
    base: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
  },

  // Hairline / 1px strokes. `base` matches controls.ts tileSurface,
  // `strong` matches secondaryButtonSurface.
  border: {
    faint: 'rgba(255, 255, 255, 0.10)',
    base: 'rgba(255, 255, 255, 0.14)',
    strong: 'rgba(255, 255, 255, 0.28)',
  },

  // Solid dark card surface, for the few opaque (non-glass) cards. Collapses
  // the drift across #1a1526 / #1b1430 / #181226 / #14101c.
  surfaceRaised: '#161221',

  // Canonical accent hues. The audit found 6 drifting violets and ~10 drifting
  // roses · these are the one-each they collapse to.
  // Violet = the Begin/brand family (matches primarySolid, tuned lighter for
  // lines/accents). Rose = the PMS/period family (matches bandPms).
  accentViolet: 'hsl(275, 55%, 68%)',
  accentRose: 'hsl(342, 64%, 66%)',

  // Selected / active state on chips, segments, radios, cells. The migration
  // found this translucent-violet tint hand-rolled across many screens with no
  // token (the solid accentViolet/primarySolid couldn't carry the alpha).
  selectedFill: 'rgba(150, 120, 235, 0.22)',
  selectedBorder: 'rgba(150, 120, 235, 0.45)',

  // Scrims behind sheets / modals / full-screen overlays (translucent black).
  scrim: 'rgba(0, 0, 0, 0.6)',
  scrimSoft: 'rgba(0, 0, 0, 0.45)',
  // A translucent raised surface: popovers, pickers, floating sheets that sit
  // over content (the opaque surfaceRaised is for flat cards).
  surfaceOverlay: 'rgba(20, 17, 28, 0.94)',

  // ── Paper (light theme) ────────────────────────────────────────────────────
  // The five settling-activity screens (story, paint, move, breathe, capture)
  // are deliberately a white "sheet of paper", not the dark app. They share no
  // colors with the dark ramps above · this is their small dedicated palette.
  paper: {
    bg: '#FFFFFF',
    ink: '#2B2632',                    // primary text on paper
    inkSoft: '#3E3947',                // secondary text
    inkFaint: 'rgba(43, 38, 50, 0.55)', // muted text
    control: 'rgba(0, 0, 0, 0.05)',    // faint control fill (e.g. close button)
  },
} as const;
