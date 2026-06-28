// The luteal signature: how the app warms during the premenstrual window. The
// shift is calmer and warmer, like the lights lowering in a calm room, never
// redder or alarming. Kept here as a separate source so the shared colors.ts
// (the everyday palette) is never touched by PMS mode.

// Orb body hue during luteal. A soft rose, warmer than the calm blue (220) but
// well short of red. The Orb already documents "warming toward rose reads as
// soft and warm, never an alarm".
export const LUTEAL_ORB_HUE = 332;

// Warm replacements for the two ambient background blobs. Kept low-saturation
// and dim so the home only hints warmer during luteal, never a red wash.
export const LUTEAL_BLOB_TOP = 'hsl(300, 26%, 19%)';
export const LUTEAL_BLOB_BOTTOM = 'hsl(326, 24%, 13%)';

// Soft warm fill + border for the luteal card and the week page accents.
export const LUTEAL_CARD_FILL = 'rgba(190, 110, 150, 0.16)';
export const LUTEAL_CARD_BORDER = 'rgba(214, 150, 180, 0.34)';
