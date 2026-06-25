// Pose illustrations for the movement activities, keyed by activity id. These
// are lavender line-art figures on transparent backgrounds (the brand accent),
// shown as the visual body of a movement nudge instead of the ambient scene.
//
// A single wide drawing (child's pose, legs up the wall) carries both the side
// and front view in one image. The desk stretches are eight separate figures
// the user pages through. Activities not listed here have no poses and fall
// back to the plain text nudge.

import type { ImageSourcePropType } from 'react-native';

const POSES: Record<string, ImageSourcePropType[]> = {
  'childs-pose': [require('../../../assets/images/poses/child-pose.png')],
  'legs-up-the-wall': [require('../../../assets/images/poses/legs-up-wall.png')],
  'slow-stretches': [
    require('../../../assets/images/poses/desk/side-stretch.png'),
    require('../../../assets/images/poses/desk/torso-stretch.png'),
    require('../../../assets/images/poses/desk/triangle-stretch.png'),
    require('../../../assets/images/poses/desk/forward-fold.png'),
    require('../../../assets/images/poses/desk/cow-pose.png'),
    require('../../../assets/images/poses/desk/cat-pose.png'),
    require('../../../assets/images/poses/desk/downward-dog.png'),
    require('../../../assets/images/poses/desk/low-lunge.png'),
  ],
};

// The pose set for an activity, or undefined when it has none.
export function posesFor(activityId: string): ImageSourcePropType[] | undefined {
  return POSES[activityId];
}
