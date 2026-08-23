import { scaleResult } from './scale-card';

// The line under her mark (copy per Neha, 2026-08-21). It names her own word
// against where she actually put it. The important rule is at the top of the
// scale: if she placed it at 100 she has found no daylight, and telling her the
// world is not black and white there would be the app arguing with the answer it
// just asked her for.
describe('scaleResult', () => {
  it('names her own word and offers the middle', () => {
    expect(scaleResult('always', 30)).toBe(
      'You said always, but not everything is black and white.',
    );
  });

  it('does not argue with her when she puts it at 100', () => {
    const top = scaleResult('always', 100);
    expect(top).not.toMatch(/black and white/i);
    expect(top).toContain('100');
    expect(top).toContain('always');
  });

  it('does not celebrate a low mark', () => {
    expect(scaleResult('never', 10)).not.toMatch(/\b(see|proof|good|great|actually)\b/i);
  });

  it('still says something useful when the word did not come back', () => {
    expect(scaleResult('', 40)).toBe('Not everything is black and white.');
    expect(scaleResult('', 100)).toContain('100');
  });

  it('never uses a dash of any kind, because she reads this one', () => {
    for (const m of [0, 30, 100]) expect(scaleResult('always', m)).not.toMatch(/[-–—]/);
  });
});
