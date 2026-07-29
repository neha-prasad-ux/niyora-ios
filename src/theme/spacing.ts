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
} as const;

export const radius = {
  // The card radius the app actually draws everywhere (Grow shelves, the
  // phase-action card, chapter cards, onboarding). One value so every rounded
  // card matches instead of splitting into 16 / 18 / 22.
  card: 22,
  pill: 18,
  control: 14,
} as const;
