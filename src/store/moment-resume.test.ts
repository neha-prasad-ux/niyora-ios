jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMomentCheckpoint, type MomentCheckpoint } from './moment-resume';

const getItem = AsyncStorage.getItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

const CP: MomentCheckpoint = {
  current: 'reframe_small',
  history: ['raw_entry', 'intensity_in', 'acknowledge'],
  herText: 'he ignored me at dinner',
  chosenFeeling: 'hurt',
  baseline: 7,
  verdict: null,
  chosenAct: null,
  skippedHold: false,
  readyLow: false,
  savedAt: Date.now(),
};

beforeEach(() => {
  getItem.mockReset();
  removeItem.mockReset();
});

describe('getMomentCheckpoint', () => {
  it('returns a fresh checkpoint intact', async () => {
    getItem.mockResolvedValue(JSON.stringify(CP));
    expect(await getMomentCheckpoint()).toEqual(CP);
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('drops and clears a stale one', async () => {
    getItem.mockResolvedValue(JSON.stringify({ ...CP, savedAt: Date.now() - 48 * 3600 * 1000 }));
    expect(await getMomentCheckpoint()).toBeNull();
    expect(removeItem).toHaveBeenCalled();
  });

  it('returns null on nothing or junk', async () => {
    getItem.mockResolvedValue(null);
    expect(await getMomentCheckpoint()).toBeNull();
    getItem.mockResolvedValue('not json');
    expect(await getMomentCheckpoint()).toBeNull();
  });
});
