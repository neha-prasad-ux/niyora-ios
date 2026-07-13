jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingCrossings,
  getPendingCrossings,
  materialCrossing,
  parsePendingCrossings,
  pushPendingCrossing,
  ringCrossing,
} from './pending-crossing';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;
const removeItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  removeItem.mockReset();
});

describe('constructors', () => {
  it('builds a ring crossing from a tier and a material crossing from a material', () => {
    expect(ringCrossing({ id: 'glow', name: 'Glow', threshold: 100, hue: 335 })).toEqual({
      kind: 'ring',
      label: 'Glow',
      hue: 335,
    });
    expect(materialCrossing('gold')).toEqual({ kind: 'material', label: 'Gold', hue: 45 });
  });
});

describe('parsePendingCrossings', () => {
  it('degrades junk to empty and drops malformed entries', () => {
    expect(parsePendingCrossings(null)).toEqual([]);
    expect(parsePendingCrossings('not json')).toEqual([]);
    const raw = JSON.stringify([
      { kind: 'ring', label: 'Glow', hue: 335 },
      { kind: 'bogus', label: 'x', hue: 1 },
      { kind: 'material', label: 'Gold' },
    ]);
    expect(parsePendingCrossings(raw)).toEqual([{ kind: 'ring', label: 'Glow', hue: 335 }]);
  });
});

describe('push / get / clear', () => {
  it('appends a crossing', async () => {
    getItem.mockResolvedValue(null);
    await pushPendingCrossing(materialCrossing('gold'));
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual([{ kind: 'material', label: 'Gold', hue: 45 }]);
  });

  it('reads back what was stored', async () => {
    getItem.mockResolvedValue(JSON.stringify([{ kind: 'ring', label: 'Spark', hue: 180 }]));
    expect(await getPendingCrossings()).toEqual([{ kind: 'ring', label: 'Spark', hue: 180 }]);
  });

  it('clears everything', async () => {
    await clearPendingCrossings();
    expect(removeItem).toHaveBeenCalledTimes(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('clears one kind, keeping the rest', async () => {
    getItem.mockResolvedValue(
      JSON.stringify([
        { kind: 'ring', label: 'Glow', hue: 335 },
        { kind: 'material', label: 'Gold', hue: 45 },
      ]),
    );
    await clearPendingCrossings('ring');
    expect(JSON.parse(setItem.mock.calls[0][1])).toEqual([{ kind: 'material', label: 'Gold', hue: 45 }]);
  });

  it('removes the key when clearing a kind empties it', async () => {
    getItem.mockResolvedValue(JSON.stringify([{ kind: 'ring', label: 'Glow', hue: 335 }]));
    await clearPendingCrossings('ring');
    expect(removeItem).toHaveBeenCalledTimes(1);
  });
});
