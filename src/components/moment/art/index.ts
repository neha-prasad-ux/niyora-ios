// The colouring drawings she can pick from on the Colour screen. Each is ONE
// filled evenodd SVG path (the black ink), scaled to fit the card — see
// penguin.ts for the format. Giraffe is intentionally absent: its source is
// multi-path stroked line-art, which this filled renderer does not handle yet.

import { PENGUIN } from './penguin';
import { TEDDY } from './teddy';
import { CAT } from './cat';
import { ELEPHANT } from './elephant';

export type Drawing = {
  message: string;
  vbW: number;
  vbH: number;
  cx: number;
  cy: number;
  d: string;
};

export type DrawingChoice = { id: string; label: string; art: Drawing };

// Order she cycles through in the picker; penguin first (the original).
export const DRAWINGS: DrawingChoice[] = [
  { id: 'penguin', label: 'Penguin', art: PENGUIN },
  { id: 'teddy', label: 'Teddy', art: TEDDY },
  { id: 'cat', label: 'Cat', art: CAT },
  { id: 'elephant', label: 'Elephant', art: ELEPHANT },
];

export const DEFAULT_DRAWING: Drawing = PENGUIN;
