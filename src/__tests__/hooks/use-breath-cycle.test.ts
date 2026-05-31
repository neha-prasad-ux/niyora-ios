import { renderHook, act } from '@testing-library/react-native';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import type { BreathPhase } from '@/models/techniques';

// Two 2-second phases, 2 rounds = 8 seconds total.
const TWO_PHASE: readonly BreathPhase[] = [
  { type: 'inhale', label: 'inhale', duration: 2 },
  { type: 'exhale', label: 'exhale', duration: 2 },
];

describe('useBreathCycle — phase progression', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts on the first phase with done=false and round=1', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    expect(result.current.phase.type).toBe('inhale');
    expect(result.current.done).toBe(false);
    expect(result.current.round).toBe(1);
    expect(result.current.phaseIndex).toBe(0);
  });

  it('advances to the second phase after the first phase duration', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    act(() => {
      jest.advanceTimersByTime(2050);
    });
    expect(result.current.phase.type).toBe('exhale');
    expect(result.current.phaseIndex).toBe(1);
  });

  it('phaseT is between 0 and 1 mid-phase', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    act(() => {
      jest.advanceTimersByTime(1000); // halfway through the 2s inhale
    });
    expect(result.current.phaseT).toBeGreaterThan(0);
    expect(result.current.phaseT).toBeLessThan(1);
  });

  it('sessionT increases as the session progresses', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    act(() => {
      jest.advanceTimersByTime(4000); // half of 8s total
    });
    expect(result.current.sessionT).toBeGreaterThan(0);
    expect(result.current.sessionT).toBeLessThanOrEqual(1);
  });
});

describe('useBreathCycle — done', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets done=true and sessionT=1 when all rounds finish', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    act(() => {
      jest.advanceTimersByTime(8100);
    });
    expect(result.current.done).toBe(true);
    expect(result.current.sessionT).toBe(1);
  });

  it('does not set done before all rounds finish', () => {
    const { result } = renderHook(() => useBreathCycle(TWO_PHASE, 2));
    act(() => {
      jest.advanceTimersByTime(7900);
    });
    expect(result.current.done).toBe(false);
  });
});
