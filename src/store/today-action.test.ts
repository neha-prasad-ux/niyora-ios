jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  EMPTY_TODAY_ACTION_MEMORY,
  dismissForDay,
  parseTodayActionMemory,
  recordShownAction,
} from './today-action';

const getItem = AsyncStorage.getItem as jest.Mock;
const setItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
});

describe('parseTodayActionMemory', () => {
  it('degrades junk to the empty memory', () => {
    expect(parseTodayActionMemory(null)).toEqual(EMPTY_TODAY_ACTION_MEMORY);
    expect(parseTodayActionMemory('not json')).toEqual(EMPTY_TODAY_ACTION_MEMORY);
    expect(parseTodayActionMemory('[1,2]')).toEqual(EMPTY_TODAY_ACTION_MEMORY);
  });

  it('keeps a well-formed memory intact', () => {
    const raw = JSON.stringify({
      last: { date: '2026-07-11', id: 'prep:calcium' },
      dismissedDate: '2026-07-10',
    });
    expect(parseTodayActionMemory(raw)).toEqual({
      last: { date: '2026-07-11', id: 'prep:calcium' },
      dismissedDate: '2026-07-10',
    });
  });

  it('drops malformed fields independently', () => {
    expect(
      parseTodayActionMemory(JSON.stringify({ last: { date: 'nope', id: 'x' }, dismissedDate: '2026-07-10' })),
    ).toEqual({ last: null, dismissedDate: '2026-07-10' });
    expect(
      parseTodayActionMemory(JSON.stringify({ last: { date: '2026-07-11', id: 7 } })),
    ).toEqual(EMPTY_TODAY_ACTION_MEMORY);
  });
});

describe('mutators', () => {
  it('recordShownAction keeps the dismissal stamp', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({ last: null, dismissedDate: '2026-07-11' }));
    await recordShownAction('2026-07-11', 'prep:steady');
    const written = JSON.parse(setItem.mock.calls[0][1]);
    expect(written).toEqual({
      last: { date: '2026-07-11', id: 'prep:steady' },
      dismissedDate: '2026-07-11',
    });
  });

  it('dismissForDay keeps the last-shown action', async () => {
    getItem.mockResolvedValueOnce(
      JSON.stringify({ last: { date: '2026-07-11', id: 'checkin:remission' }, dismissedDate: null }),
    );
    await dismissForDay('2026-07-11');
    const written = JSON.parse(setItem.mock.calls[0][1]);
    expect(written).toEqual({
      last: { date: '2026-07-11', id: 'checkin:remission' },
      dismissedDate: '2026-07-11',
    });
  });
});
