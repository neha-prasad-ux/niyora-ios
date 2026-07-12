jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_ANSWERS } from '@/v3/v3-content';

import { getOnboardingV3Progress, setupCardFor } from './onboarding-v3-progress';

const getItem = AsyncStorage.getItem as jest.Mock;

// The loop the setup card closes: until the app has her PMS read, the home
// always offers a way into onboarding, however she left it.
describe('setupCardFor', () => {
  it('invites a first read when onboarding was never started', () => {
    expect(setupCardFor(null)).toBe('start');
  });

  it('invites a first read when she backed out before answering anything', () => {
    expect(setupCardFor({ stepIndex: 0, answers: EMPTY_ANSWERS, done: false })).toBe('start');
  });

  it('resumes when she left partway', () => {
    expect(setupCardFor({ stepIndex: 5, answers: EMPTY_ANSWERS, done: false })).toBe('resume');
  });

  it('shows nothing once the read is done', () => {
    expect(setupCardFor({ stepIndex: 13, answers: EMPTY_ANSWERS, done: true })).toBeNull();
  });
});

describe('getOnboardingV3Progress', () => {
  it('treats corrupt or missing storage as never-started (so the card still shows)', async () => {
    getItem.mockResolvedValueOnce(null);
    expect(await getOnboardingV3Progress()).toBeNull();

    getItem.mockResolvedValueOnce('not json');
    expect(await getOnboardingV3Progress()).toBeNull();

    getItem.mockResolvedValueOnce(JSON.stringify({ done: true })); // no stepIndex
    expect(await getOnboardingV3Progress()).toBeNull();
  });

  it('round-trips a partway save', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({ stepIndex: 4, done: false }));
    const p = await getOnboardingV3Progress();
    expect(p).not.toBeNull();
    expect(setupCardFor(p)).toBe('resume');
  });
});
