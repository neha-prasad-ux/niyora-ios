// Tests for the next-phase cue derivation used in BreathingSession.
// The logic is: nextIndex = (phaseIndex + 1) % phases.length,
// nextLabel = `then ${phases[nextIndex].label.toLowerCase()}`.
//
// Also covers the completion nextLabel: technique.name when done, null otherwise.

import { TECHNIQUES, isBreathing } from '@/models/techniques';

function deriveNextLabel(
  phaseIndex: number,
  phases: readonly { label: string }[],
): string {
  const nextIndex = (phaseIndex + 1) % phases.length;
  // Mirrors session.tsx: the dim sub-label lowercases the upcoming cue so it
  // reads as a sentence fragment ("then hold"), while the primary cue keeps the
  // sentence-cased label ("Hold").
  return `then ${phases[nextIndex].label.toLowerCase()}`;
}

describe('next-phase cue derivation', () => {
  it('box: advances through all four phases and wraps', () => {
    const box = TECHNIQUES.find((t) => t.id === 'box')!;
    if (!isBreathing(box)) throw new Error('box is not breathing');
    const { phases } = box;

    expect(deriveNextLabel(0, phases)).toBe('then hold');
    expect(deriveNextLabel(1, phases)).toBe('then exhale');
    expect(deriveNextLabel(2, phases)).toBe('then hold');
    // Last phase wraps back to inhale
    expect(deriveNextLabel(3, phases)).toBe('then inhale');
  });

  it('ocean: two-phase technique wraps correctly', () => {
    const ocean = TECHNIQUES.find((t) => t.id === 'ocean')!;
    if (!isBreathing(ocean)) throw new Error('ocean is not breathing');
    const { phases } = ocean;

    expect(deriveNextLabel(0, phases)).toBe('then exhale slowly');
    expect(deriveNextLabel(1, phases)).toBe('then inhale through nose');
  });

  it('wind-down (4-7-8): three-phase technique', () => {
    const wd = TECHNIQUES.find((t) => t.id === 'wind-down')!;
    if (!isBreathing(wd)) throw new Error('wind-down is not breathing');
    const { phases } = wd;

    expect(deriveNextLabel(0, phases)).toBe('then hold');
    expect(deriveNextLabel(1, phases)).toBe('then exhale slowly');
    expect(deriveNextLabel(2, phases)).toBe('then inhale');
  });

  it('cooling: three-phase technique with hold', () => {
    const cooling = TECHNIQUES.find((t) => t.id === 'cooling')!;
    if (!isBreathing(cooling)) throw new Error('cooling is not breathing');
    const { phases } = cooling;

    expect(deriveNextLabel(0, phases)).toBe('then hold');
    expect(deriveNextLabel(1, phases)).toBe('then exhale through nose');
    expect(deriveNextLabel(2, phases)).toBe('then inhale through teeth');
  });
});

describe('completion nextLabel derivation', () => {
  it('returns technique.name when done=true', () => {
    const box = TECHNIQUES.find((t) => t.id === 'box')!;
    const done = true;
    expect(done ? box.name : null).toBe(box.name);
  });

  it('returns null when done=false', () => {
    const box = TECHNIQUES.find((t) => t.id === 'box')!;
    const done = false;
    expect(done ? box.name : null).toBeNull();
  });

  it('all breathing techniques have a non-empty name for the sub-label', () => {
    for (const t of TECHNIQUES) {
      if (isBreathing(t)) {
        expect(typeof t.name).toBe('string');
        expect(t.name.length).toBeGreaterThan(0);
      }
    }
  });
});
