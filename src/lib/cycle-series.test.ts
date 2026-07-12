import { buildCycleSeries } from '@/lib/cycle-series';
import type { LightEvent, MintedMoon } from '@/lib/moon-light';

function moon(cycleStart: string, cycleEnd: string, over: Partial<MintedMoon> = {}): MintedMoon {
  return {
    cycleStart,
    cycleEnd,
    fullness: 0.5,
    clarity: null,
    material: 'moonstone',
    kept: false,
    ...over,
  };
}

function light(date: string): LightEvent {
  return { date, kind: 'visit', amount: 5 };
}

describe('buildCycleSeries', () => {
  it('counts distinct engaged days inside each cycle window (end exclusive)', () => {
    const shelf = [moon('2026-04-01', '2026-04-04')];
    const ledger = [
      light('2026-04-01'),
      light('2026-04-01'), // same day, counted once
      light('2026-04-03'),
      light('2026-04-04'), // the exclusive end day, not counted
      light('2026-03-31'), // before the window
    ];
    const series = buildCycleSeries(shelf, ledger);
    expect(series).toHaveLength(1);
    expect(series[0].engagedDays).toBe(2);
    expect(series[0].span).toBe(3);
    expect(series[0].label).toBe('Apr');
  });

  it('orders cycles oldest-first regardless of shelf order', () => {
    const shelf = [moon('2026-06-01', '2026-07-01'), moon('2026-04-01', '2026-05-01')];
    const series = buildCycleSeries(shelf, []);
    expect(series.map((p) => p.label)).toEqual(['Apr', 'Jun']);
  });

  it('skips malformed or empty windows', () => {
    const shelf = [
      moon('2026-04-05', '2026-04-05'), // end == start
      moon('bad', '2026-04-10'),
      moon('2026-04-01', '2026-04-03'),
    ];
    const series = buildCycleSeries(shelf, [light('2026-04-02')]);
    expect(series).toHaveLength(1);
    expect(series[0].engagedDays).toBe(1);
  });

  it('is empty when the shelf is empty', () => {
    expect(buildCycleSeries([], [light('2026-04-02')])).toEqual([]);
  });
});
