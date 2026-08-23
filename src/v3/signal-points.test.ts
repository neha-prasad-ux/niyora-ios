import { SIGNAL_POINTS } from './moment-copy';
import { FEELING_SET } from './moment-analyse';

// Every feeling she can name must point somewhere authored. A missing entry means
// the signal card falls back to inventing her interior, which is the failure this
// map exists to end.
describe('signal points', () => {
  const constellations = [...new Set(FEELING_SET.map((f) => f.constellation).filter(Boolean))];

  it('covers every constellation a feeling can light', () => {
    expect(constellations.filter((c) => !SIGNAL_POINTS[c]?.length)).toEqual([]);
  });

  it('points at a THING, never back at the feeling', () => {
    const feelingWord = /\b(feel|feeling|angry|hurt|sad|scared|anxious|ashamed|guilty|lonely|jealous|numb|overwhelmed)\b/i;
    for (const points of Object.values(SIGNAL_POINTS)) {
      for (const p of points) {
        // "hurt" as a verb is allowed ("you hurt someone"), naming her state is not.
        if (/you hurt someone/.test(p)) continue;
        expect(p).not.toMatch(feelingWord);
      }
    }
  });

  it('never tells her what to do', () => {
    for (const points of Object.values(SIGNAL_POINTS))
      for (const p of points) expect(p).not.toMatch(/^(try|you should|remember|just )/i);
  });

  it('never uses a dash', () => {
    for (const points of Object.values(SIGNAL_POINTS))
      for (const p of points) expect(p).not.toMatch(/[-–—]/);
  });
});
