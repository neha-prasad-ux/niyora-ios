// The gift-scratch reward drawings + their captions (M9-14). Each drawing is
// claimed by one of the first six constellations she works through (badgesFrom in
// store/moment-history), so the captions are emotion-NEUTRAL by design: the dragon
// can land on sadness. They praise the act of working a feeling through, never the
// feeling itself: they celebrate finishing a hard thing (Neha 2026-08-19).
//
// PLACEHOLDER art: the PNGs are background-removed generations. Replace each file
// in assets/images/moon-drawings/ with a cleaner transparent version, same
// filename, and the reveal picks it up with no code change.
import type { ImageSourcePropType } from 'react-native';

export type MoonDrawing = { src: ImageSourcePropType; caption: string };

export const MOON_DRAWINGS: MoonDrawing[] = [
  { src: require('../../../assets/images/moon-drawings/duck.png'), caption: 'You did that. Start to finish.' },
  { src: require('../../../assets/images/moon-drawings/dragon.png'), caption: 'That took guts.' },
  { src: require('../../../assets/images/moon-drawings/bird.png'), caption: 'Hard one, and you did it anyway.' },
  { src: require('../../../assets/images/moon-drawings/sailboat.png'), caption: 'You came out the other side.' },
  { src: require('../../../assets/images/moon-drawings/bow.png'), caption: 'You stayed in charge of it.' },
  { src: require('../../../assets/images/moon-drawings/peacock.png'), caption: 'You worked it all the way through.' },
];
