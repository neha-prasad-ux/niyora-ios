import { StyleSheet, type ViewStyle } from 'react-native';

// Shared control surfaces, so buttons and chips read as one system instead of
// each screen inventing its own opacity. Plain style objects (not StyleSheet
// ids) so callers compose them in a style array — or spread them — alongside
// their own padding, radius, and text.

// The emphasized secondary ("ghost") button fill + stroke. It drifted across
// Pill.ghost (0.30/0.12), PhaseActionCard.cta (0.40/0.14), and PostSessionMood
// .btnPrimary (0.30/0.10); unified here. Each site keeps its own radius and
// padding — only the surface is shared. (PostSessionMood's quieter base button
// stays a distinct, lighter tier on purpose.)
export const secondaryButtonSurface: ViewStyle = {
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.28)',
  backgroundColor: 'rgba(255, 255, 255, 0.10)',
};

// The quieter tier below the secondary button: the flat "tile" used by utility
// rows, list cells, and unselected chips (Now's Add-periods/Reflect utilities,
// the readiness "Know why" cells, checklist rows). One surface so these stop
// each inventing their own ~0.12–0.18 border over a 0.05 fill; a selected state
// still overrides the border + fill with its own accent.
export const tileSurface: ViewStyle = {
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.14)',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
};

// Soft-clay chip: a matte, pillowy pill — rounder, a faint rim, and a low soft
// drop shadow for a gentle raised feel. No gloss. Callers add padding + text;
// the selected state fills the same clay in with its own colour.
export const clayChipSurface: ViewStyle = {
  borderRadius: 22,
  borderCurve: 'continuous',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(255, 255, 255, 0.16)',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.22,
  shadowRadius: 5,
};
