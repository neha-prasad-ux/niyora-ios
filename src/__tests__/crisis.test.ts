import { looksLikeCrisisText } from '@/lib/crisis';

describe('looksLikeCrisisText', () => {
  it('is false for empty or ordinary text', () => {
    expect(looksLikeCrisisText('')).toBe(false);
    expect(looksLikeCrisisText('I feel irritable and tired today')).toBe(false);
  });

  it('catches self-harm-adjacent phrases', () => {
    expect(looksLikeCrisisText('I want to die')).toBe(true);
    expect(looksLikeCrisisText('sometimes I think about suicide')).toBe(true);
    expect(looksLikeCrisisText('I just want to hurt myself')).toBe(true);
    expect(looksLikeCrisisText("I can't go on like this")).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(looksLikeCrisisText('I WANT TO DIE')).toBe(true);
  });

  it('matches within a longer sentence', () => {
    expect(
      looksLikeCrisisText('honestly some days I feel like there is no reason to live anymore'),
    ).toBe(true);
  });
});
