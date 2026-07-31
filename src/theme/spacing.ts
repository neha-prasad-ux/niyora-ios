// Spacing scale and radii. Single source so card padding and the gaps
// between cards stay consistent across the app. Pull from here · no ad-hoc
// pixel values in components. 4-based steps.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// The horizontal gutter every screen aligns its content to. One value so
// screens stop drifting across 16 / 20 / 24. Use for the outer padding of a
// screen's scroll container.
export const pageGutter = 20;

export const radius = {
  // Small inset controls: inputs, tiles, list cells, utility rows.
  control: 14,
  // Buttons and soft-cornered chips (the old `pill`, which was really a button
  // radius). Rounded, not fully round.
  button: 18,
  // The card radius the app draws everywhere (Grow shelves, phase-action card,
  // chapter cards, onboarding). One value so every rounded card matches instead
  // of splitting into 16 / 18 / 22.
  card: 22,
  // A true pill / capsule: fully round. Chips, tags, the Begin capsule ends.
  pill: 9999,
  // Alias for fully round (circles, avatars).
  full: 9999,
} as const;
