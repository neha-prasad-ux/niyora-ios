import { loadResult } from './load-content';

// The line after she sorts. Counts and nothing else: the intervention already
// happened when the fog became a list, and a closing reassurance would take the
// finding off her and hand it back to us.
describe('loadResult', () => {
  it('names the total and where things landed', () => {
    expect(loadResult({ today: 2, wait: 2, notMine: 1 })).toBe(
      '5 things. 2 for today. 2 can wait. 1 not yours to carry.',
    );
  });

  it('says nothing at all when she listed nothing', () => {
    expect(loadResult({ today: 0, wait: 0, notMine: 0 })).toBe('');
  });

  it('reads naturally with one item', () => {
    expect(loadResult({ today: 1, wait: 0, notMine: 0 })).toBe('1 thing. 1 for today.');
  });

  it('leaves out empty buckets rather than saying zero', () => {
    const r = loadResult({ today: 3, wait: 0, notMine: 0 });
    expect(r).not.toContain('0');
  });

  it('never comforts, never concludes', () => {
    const r = loadResult({ today: 1, wait: 4, notMine: 2 });
    expect(r).not.toMatch(/no wonder|of course|too much|okay|fine|understandable|heavy/i);
  });

  it('never uses a dash, she reads this one', () => {
    expect(loadResult({ today: 1, wait: 1, notMine: 1 })).not.toMatch(/[-–—]/);
  });
});
