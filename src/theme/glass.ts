// The one glass look for every card and panel in the app. Change it here and the
// whole app follows. Neutral (no colour) so all cards read as one calm system.
//
// The key Liquid Glass rule: glass only reads as glass when there is bright,
// varied content BEHIND it to refract and frost. So the card pages put a soft
// AmbientGlow (components/ambient-glow) behind their content, and `fill` here is
// only a light darkening over the frost for text legibility — NOT an opaque
// panel (an opaque fill smothers the frost and the card goes flat grey).

export const glass = {
  /** A light darkening over the frost (legibility). Kept low so the frosted glow
   *  behind the card still reads — that glow is what makes it look like glass. */
  fill: 'rgba(12, 10, 20, 0.22)',
  /** The hairline rim around a glass card. */
  border: 'rgba(255, 255, 255, 0.16)',
  /** A heavier darkening, for a sheet with something BRIGHT behind it that text
   *  has to sit on top of. `fill` is tuned for a quiet background; over the lit
   *  core of the moon it leaves a headline at 4.2:1, under the 4.5:1 floor.
   *  This measures 7.3:1 there and still lets the moon and its halo read. */
  scrim: 'rgba(20, 17, 28, 0.52)',
  /** The gloss on a glass sheet: light catching it from the top-left and
   *  falling away toward the bottom-right, so the top-right corner stays quiet
   *  rather than washing white. Home draws this inline (app/(tabs)/now.tsx) and
   *  should move onto this token next time that file is opened. */
  sheen: ['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.03)', 'transparent'] as const,
  /** The fade under a pinned footer, so content scrolls away instead of being
   *  cut off by it. It has to reach FULLY opaque: earlier versions stopped at
   *  0.94 and merely dimmed what passed underneath, so fine print still read
   *  through the footer's own text. The long transparent run keeps the
   *  transition soft, so a solid end reads as a fade, not as a band. */
  fade: ['transparent', 'rgba(14, 11, 20, 0.85)', 'rgb(14, 11, 20)'] as const,
  /** The solid ground under a pinned footer. Opaque on purpose: a translucent
   *  footer lets whatever scrolls beneath it read through its own text. */
  footer: 'rgb(14, 11, 20)',
} as const;
