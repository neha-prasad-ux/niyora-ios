import { recommend, roundsForTarget } from '@/lib/recommendation';
import { getTechnique, isBreathing } from '@/models/techniques';
import type { MoodRecord } from '@/store/mood-history';

describe('roundsForTarget', () => {
  it('box breath: 60s target fits 3 rounds at 16s each', () => {
    const box = getTechnique('box');
    if (!box || !isBreathing(box)) throw new Error('expected breathing');
    // phases: 4+4+4+4 = 16s per round; floor(60/16) = 3
    expect(roundsForTarget(box, 60)).toBe(3);
  });

  it('belly breath: 60s target equals technique default (10s/round * 6)', () => {
    const belly = getTechnique('belly');
    if (!belly || !isBreathing(belly)) throw new Error('expected breathing');
    // phases: 4+6 = 10s per round; floor(60/10) = 6 = belly.rounds
    expect(roundsForTarget(belly, 60)).toBe(6);
  });

  it('clamps to minimum 1 round on very short targets', () => {
    const box = getTechnique('box');
    if (!box || !isBreathing(box)) throw new Error('expected breathing');
    expect(roundsForTarget(box, 5)).toBe(1);
  });

  it('clamps to technique.rounds on very long targets', () => {
    const box = getTechnique('box');
    if (!box || !isBreathing(box)) throw new Error('expected breathing');
    expect(roundsForTarget(box, 3000)).toBe(box.rounds);
  });
});

describe('recommend', () => {
  const empty = { moods: [], checkins: [], sessions: [] } as const;

  it('cold start returns box (always-unlocked fallback)', () => {
    const rec = recommend(empty);
    expect(rec.techniqueId).toBe('box');
    expect(rec.source).toBe('fallback');
    expect(rec.rounds).toBeNull();
  });

  it('anxious emotion maps to wind-down (long exhale)', () => {
    const rec = recommend({ ...empty, emotion: 'anxious' });
    expect(rec.techniqueId).toBe('wind-down');
    expect(rec.source).toBe('emotion');
  });

  it('frustrated emotion falls back to box (cooling is locked)', () => {
    const rec = recommend({ ...empty, emotion: 'frustrated' });
    expect(rec.techniqueId).toBe('box');
    expect(rec.source).toBe('emotion');
  });

  it('lonely emotion maps to bring-someone (unlocked)', () => {
    const rec = recommend({ ...empty, emotion: 'lonely' });
    expect(rec.techniqueId).toBe('bring-someone');
    expect(rec.source).toBe('emotion');
  });

  it('helpless emotion maps to five-senses (grounding)', () => {
    const rec = recommend({ ...empty, emotion: 'helpless' });
    expect(rec.techniqueId).toBe('five-senses');
    expect(rec.source).toBe('emotion');
  });

  it('overwhelmed emotion maps to five-senses (grounding)', () => {
    const rec = recommend({ ...empty, emotion: 'overwhelmed' });
    expect(rec.techniqueId).toBe('five-senses');
    expect(rec.source).toBe('emotion');
  });

  it('scattered emotion falls back to box (alternate-nostril is locked)', () => {
    const rec = recommend({ ...empty, emotion: 'scattered' });
    expect(rec.techniqueId).toBe('box');
    expect(rec.source).toBe('emotion');
  });

  it('personalization: picks highest-rated unlocked technique after threshold', () => {
    const moods: MoodRecord[] = [
      { techniqueId: 'box',   mood: 3, recordedAt: '2026-06-01T10:00:00Z' },
      { techniqueId: 'box',   mood: 3, recordedAt: '2026-06-02T10:00:00Z' },
      { techniqueId: 'belly', mood: 5, recordedAt: '2026-06-03T10:00:00Z' },
      { techniqueId: 'belly', mood: 5, recordedAt: '2026-06-04T10:00:00Z' },
      { techniqueId: 'belly', mood: 4, recordedAt: '2026-06-05T10:00:00Z' },
    ];
    const rec = recommend({ moods, checkins: [], sessions: [] });
    expect(rec.techniqueId).toBe('belly');
    expect(rec.source).toBe('personalized');
  });

  it('emotion input overrides personalized ranking', () => {
    const moods: MoodRecord[] = Array.from({ length: 5 }, (_, i) => ({
      techniqueId: 'belly',
      mood: 5 as const,
      recordedAt: `2026-06-0${i + 1}T10:00:00Z`,
    }));
    const rec = recommend({ moods, checkins: [], sessions: [], emotion: 'anxious' });
    expect(rec.techniqueId).toBe('wind-down');
    expect(rec.source).toBe('emotion');
  });

  it('targetSeconds produces a rounds override for breathing techniques', () => {
    // wind-down: 4+7+8 = 19s per round; floor(60/19) = 3; default rounds = 4
    const rec = recommend({ ...empty, emotion: 'anxious', targetSeconds: 60 });
    expect(rec.rounds).toBe(3);
  });

  it('targetSeconds leaves rounds null when technique equals its default', () => {
    // belly: 4+6 = 10s per round; floor(60/10) = 6 = belly.rounds
    const rec = recommend({ ...empty, emotion: 'helpless', targetSeconds: 60 });
    // five-senses is mindfulness, so no rounds apply
    expect(rec.rounds).toBeNull();
  });

  it('targetSeconds leaves rounds null for mindfulness techniques', () => {
    const rec = recommend({ ...empty, emotion: 'lonely', targetSeconds: 60 });
    // bring-someone is mindfulness
    expect(rec.rounds).toBeNull();
  });
});
