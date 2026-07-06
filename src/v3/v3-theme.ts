// Palette for the V3 flow, mapped onto the app's real design system (DESIGN.md)
// rather than the dark-plum Figma exploration. Backgrounds, text, and the CTA
// come from src/theme/colors. This file only names the graph semantics: the
// "regulated" and "activated" states and the spectrum, using app-native hues.
//
// Regulated = the calm orb's cool blue (steady). Activated = a soft warm amber
// (DESIGN.md: warnings use soft variants of red/amber; never alarm red). The
// spectrum runs the Soul tier arc, warm to cool, so it reads as part of the
// same product.

import { colors } from '@/theme/colors';

export const v3 = {
  // Text and surfaces, straight from the app tokens.
  text: colors.textPrimary,
  textSoft: colors.textSubtitle,
  textFaint: colors.textTagline,

  // Graph line + panel treatments, tuned to the near-black background.
  line: 'rgba(255, 255, 255, 0.16)',
  panel: 'rgba(255, 255, 255, 0.05)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',

  // The two brain states and the diverging-bar directions.
  // Regulated: cool blue (the calm orb). Activated: soft amber.
  regulated: 'hsl(220, 55%, 75%)',
  activated: 'hsl(35, 70%, 62%)',

  // Accent for hormone/curve lines and the neutral fork trunk: violet, the
  // app's Shine tier and Begin-button family.
  accent: 'hsl(275, 55%, 68%)',

  // Spectrum gradient stops: Soul tier arc (Spark warm -> cool blue), so the
  // mild -> PMDD bar belongs to the same visual world as My Soul.
  spectrumStops: ['hsl(30, 70%, 60%)', 'hsl(280, 60%, 65%)', 'hsl(210, 60%, 68%)'],

  // Meter fill (progress) uses the Begin-button violet so gamification reads as
  // app chrome, not arcade.
  meterFrom: 'hsl(270, 50%, 55%)',
  meterTo: 'hsl(280, 55%, 68%)',
} as const;
