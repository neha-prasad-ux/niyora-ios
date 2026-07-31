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
} as const;
