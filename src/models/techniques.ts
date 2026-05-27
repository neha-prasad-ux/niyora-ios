/**
 * Breath technique definitions.
 *
 * Each technique describes the per-phase timing, the background HSL colour
 * targets that the breath-cycle hook interpolates between, and the particle
 * visual overrides (e.g. brightnessBoost) that BreathingParticles uses to
 * match the Mac rendering.
 */

export type PhaseName = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

export interface BreathPhase {
  name: PhaseName;
  /** Duration in seconds. */
  duration: number;
  /** Target HSL hue for this phase (0-360). */
  hue: number;
  /** Target HSL saturation (0-100). */
  saturation: number;
  /** Target HSL lightness (0-100). */
  lightness: number;
}

export interface TechniqueVisual {
  /**
   * Additional lightness fraction added to particle brightness.
   * Mirrors `visual.brightnessBoost` from the Mac render.
   * 0 = no boost, 1 = +100 lightness units (clamped to 85 max).
   */
  brightnessBoost: number;
}

export interface BreathTechnique {
  id: string;
  name: string;
  phases: BreathPhase[];
  particleCount: number;
  visual: TechniqueVisual;
}

export const COOLING_BREATH: BreathTechnique = {
  id: 'cooling-breath',
  name: 'Cooling Breath',
  phases: [
    { name: 'inhale',    duration: 4, hue: 195, saturation: 70, lightness: 65 },
    { name: 'hold-in',   duration: 4, hue: 210, saturation: 70, lightness: 65 },
    { name: 'exhale',    duration: 6, hue: 225, saturation: 70, lightness: 65 },
    { name: 'hold-out',  duration: 2, hue: 240, saturation: 70, lightness: 60 },
  ],
  particleCount: 60,
  visual: {
    brightnessBoost: 0.15,
  },
};

export const TECHNIQUES: BreathTechnique[] = [COOLING_BREATH];
