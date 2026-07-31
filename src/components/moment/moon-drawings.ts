// The gift-scratch reward drawings + their captions (M9-14). Awarded one by one
// IN ORDER (Neha 2026-07-31), saved to the Soul "Your badges" grid; the caption
// shows on the reveal. Captions approved by Neha 2026-07-31.
//
// PLACEHOLDER art: the PNGs are background-removed generations. Replace each file
// in assets/images/moon-drawings/ with a cleaner transparent version, same
// filename, and the reveal picks it up with no code change.
import type { ImageSourcePropType } from 'react-native';

export type MoonDrawing = { src: ImageSourcePropType; caption: string };

export const MOON_DRAWINGS: MoonDrawing[] = [
  { src: require('../../../assets/images/moon-drawings/duck.png'), caption: 'You kept yourself afloat.' },
  { src: require('../../../assets/images/moon-drawings/dragon.png'), caption: "You felt the fire and didn't let it lead." },
  { src: require('../../../assets/images/moon-drawings/bird.png'), caption: 'You found your voice again.' },
  { src: require('../../../assets/images/moon-drawings/sailboat.png'), caption: 'You held your course through the rough water.' },
  { src: require('../../../assets/images/moon-drawings/bow.png'), caption: 'You took aim, then let it go.' },
  { src: require('../../../assets/images/moon-drawings/peacock.png'), caption: 'You let yourself be seen.' },
];
