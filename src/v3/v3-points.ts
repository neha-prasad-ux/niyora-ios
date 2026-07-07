// Gamification constants for the V3 flow.
//
// Points accrue per completed step and animate up to a running total. They are
// derived from the current step position in the flow, not accumulated on tap,
// so the total stays exact no matter how the buttons are pressed. Kept quiet on
// purpose (per DESIGN.md): points reinforce progress, they do not turn the
// health content into an arcade.

export const POINTS_PER_STEP = 10;
export const FACT_BONUS = 5; // reading a fact screen is worth a touch more
