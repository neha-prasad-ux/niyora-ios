/**
 * Niyora typography — font families (design-system source of truth).
 *
 * DESIGN SYSTEM RULE: every piece of text in the app renders in Poppins. We
 * never fall back to the platform system font (SF Pro). This is enforced two
 * ways, so it cannot be forgotten:
 *
 *   1. When writing a Text style, prefer a semantic family from `fonts.*`
 *      (or a token from `typography`).
 *   2. As a safety net, `src/theme/apply-poppins.ts` — imported once at the app
 *      root — maps every <Text>/<TextInput>'s `fontWeight` to the matching
 *      Poppins family at render time. So even a style that forgets `fontFamily`
 *      still renders Poppins at the correct weight.
 *
 * Each Poppins file already carries its weight, so a named family does not need
 * an accompanying `fontWeight` (a matching one is redundant but harmless; a
 * heavier `fontWeight` than the family would trigger ugly synthetic bolding —
 * so map to the right family instead of leaning on `fontWeight`).
 */

export const fonts = {
  light: 'Poppins-Light',       // weight 300
  regular: 'Poppins-Regular',   // weight 400
  medium: 'Poppins-Medium',     // weight 500
  semibold: 'Poppins-SemiBold', // weight 600
  bold: 'Poppins-Bold',         // weight 700+
} as const;

/**
 * Map any React Native `fontWeight` (number | string | undefined) to its
 * Poppins family. Unset / 'normal' → Regular; 'bold' and 700+ → Bold.
 */
export function weightToFamily(weight?: number | string): string {
  const w = String(weight ?? '400');
  if (w === '100' || w === '200' || w === '300') return fonts.light;
  if (w === '500') return fonts.medium;
  if (w === '600') return fonts.semibold;
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return fonts.bold;
  return fonts.regular; // '400' | 'normal' | anything else
}
