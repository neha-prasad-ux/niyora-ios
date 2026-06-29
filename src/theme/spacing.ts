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

// Corner radii. We use iOS continuous-curvature corners (true superellipse,
// not a plain rounded rectangle) everywhere via `borderCurve: 'continuous'`.
// Values are kept deliberately tight so corners read native and intentional,
// not the oversized uniform pills that signal a generic/auto-generated UI.
// Pair every rounded surface with `continuous` — use the `rounded()` helper.
export const radius = {
  chip: 8, // tags, badges, tiny controls
  control: 12, // buttons, inputs, segmented controls
  card: 14, // standard cards
  lg: 18, // large feature cards, hero buttons
  sheet: 20, // bottom-sheet top corners
  pill: 16, // grouped capsule controls
} as const;

// The iOS continuous-corner curve. Apply to any rounded surface so the corner
// is a real superellipse rather than a circular-arc rounded rect.
export const continuous = 'continuous' as const;

// Convenience: spread onto a style to get a continuous-corner radius in one go.
//   ...rounded(radius.card)
export const rounded = (r: number) =>
  ({ borderRadius: r, borderCurve: continuous }) as const;
