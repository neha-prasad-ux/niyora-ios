import type { ImageSourcePropType } from 'react-native';

// Real painterly scene assets, keyed by Scene.image (see chapter-content.ts).
// The reader shows the real image full-bleed behind the beat when a key is
// present here, and falls back to the painterly stub (components/story-scene)
// otherwise — so the flow always works, art or not.
//
// Both stories' art lives under assets/images/stories/story-N/scene-M.png (the
// onboarding preview card reads the same files), so there is one copy, not two.
export const SCENE_IMAGES: Record<string, ImageSourcePropType> = {
  //   scene-1 bedroom + suitcase · scene-2 dark window · scene-3 airport gate
  //   scene-4 cafe table · scene-5 airplane window over clouds
  's1-suitcase': require('../../assets/images/stories/story-1/scene-1.png'),
  's1-bed': require('../../assets/images/stories/story-1/scene-2.png'),
  's1-gate': require('../../assets/images/stories/story-1/scene-3.png'),
  's1-cafe': require('../../assets/images/stories/story-1/scene-4.png'),
  's1-plane': require('../../assets/images/stories/story-1/scene-5.png'),
  // Story 2 · The callback (beats 1-5).
  //   s2-boxes  — beat 1, new apartment, moving boxes, laptop, moon
  //   s2-bed    — beat 2, new-apartment bed, phone face-down, city lights + moon
  //   s2-desk   — beat 3, desk by a window, notebook + coffee, moon fading to morning
  //   s2-room   — beat 4, cold meeting room, one empty chair, cool blue, moon
  //   s2-couch  — beat 5, couch corner, tea, lamp glow, phone lit with a message (warm)
  's2-boxes': require('../../assets/images/stories/story-2/scene-1.png'),
  's2-bed': require('../../assets/images/stories/story-2/scene-2.png'),
  's2-desk': require('../../assets/images/stories/story-2/scene-3.png'),
  's2-room': require('../../assets/images/stories/story-2/scene-4.png'),
  's2-couch': require('../../assets/images/stories/story-2/scene-5.png'),
};

export function sceneImage(key: string): ImageSourcePropType | undefined {
  return SCENE_IMAGES[key];
}
