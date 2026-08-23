// A ball-gown silhouette (bell skirt + sweetheart bodice), hand-built as an SVG
// path, a placeholder for a real "Cinderella dress" SVG, which drops in the
// same way the flower did (paste the path's `d` and its viewBox size here).
//
// The dress is the SHAPE her photo gets masked into: strapless bodice down to a
// narrow waist, then flaring to a rounded hem.

export const DRESS = {
  vbW: 200,
  vbH: 270,
  d: 'M70,30 C85,21 115,21 130,30 L119,112 C132,152 176,192 186,244 C150,268 50,268 14,244 C24,192 68,152 81,112 L70,30 Z',
} as const;
