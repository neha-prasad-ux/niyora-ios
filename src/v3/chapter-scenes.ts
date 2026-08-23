import type { ImageSourcePropType } from 'react-native';

// Real painterly scene assets, keyed by Scene.image (see chapter-content.ts).
// The reader shows the real image full-bleed behind the beat when a key is
// present here, and falls back to the painterly stub (components/story-scene)
// otherwise, so the flow always works, art or not.
//
// To wire Story 1's scenes: drop the five files into
// assets/stories/story-1/ with these exact names, then uncomment the requires:
//   s1-suitcase.png  : beat 1, bedroom + suitcase + moon
//   s1-bed.png       : beat 2, dark window, sheer curtain, moon
//   s1-gate.png      : beat 3, airport gate, seats, suitcase, moon
//   s1-cafe.png      : beat 4, cafe table, coffee steam, book, moon
//   s1-plane.png     : beat 5, airplane window, moon over clouds
export const SCENE_IMAGES: Record<string, ImageSourcePropType> = {
  's1-suitcase': require('../../assets/stories/story-1/s1-suitcase.png'),
  's1-bed': require('../../assets/stories/story-1/s1-bed.png'),
  's1-gate': require('../../assets/stories/story-1/s1-gate.png'),
  's1-cafe': require('../../assets/stories/story-1/s1-cafe.png'),
  's1-plane': require('../../assets/stories/story-1/s1-plane.png'),
  // Story 2 · The callback (beats 1-5).
  //   s2-boxes  : beat 1, new apartment, moving boxes, laptop, moon
  //   s2-bed    : beat 2, new-apartment bed, phone face-down, city lights + moon
  //   s2-desk   : beat 3, desk by a window, notebook + coffee, moon fading to morning
  //   s2-room   : beat 4, cold meeting room, one empty chair, cool blue, moon
  //   s2-couch  : beat 5, couch corner, tea, lamp glow, phone lit with a message (warm)
  's2-boxes': require('../../assets/images/stories/story-2/scene-1.png'),
  's2-bed': require('../../assets/images/stories/story-2/scene-2.png'),
  's2-desk': require('../../assets/images/stories/story-2/scene-3.png'),
  's2-room': require('../../assets/images/stories/story-2/scene-4.png'),
  's2-couch': require('../../assets/images/stories/story-2/scene-5.png'),
};

export function sceneImage(key: string): ImageSourcePropType | undefined {
  return SCENE_IMAGES[key];
}
