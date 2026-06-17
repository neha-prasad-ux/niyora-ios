import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  parseHistory,
  getNudgeHistory,
  recordNudgeFired,
  recordAnswer,
  latestNudgeAt,
  nudgesToday,
  type NudgeEvent,
} from '@/store/nudge-history';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockSetItem.mockResolvedValue(undefined);
});

function ev(firedAt: string, answer: NudgeEvent['answer'] = null): NudgeEvent {
  return { firedAt, answer, currentHr: 88, resting: 62 };
}

describe('parseHistory', () => {
  it('returns [] for null / malformed / non-array', () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory('not-json')).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
  });

  it('drops entries without a firedAt', () => {
    const raw = JSON.stringify([ev('2026-06-17T10:00:00.000Z'), { answer: 'yes' }]);
    expect(parseHistory(raw)).toHaveLength(1);
  });
});

describe('recordNudgeFired', () => {
  it('appends an event with a null answer', async () => {
    mockGetItem.mockResolvedValue(null);
    const e = await recordNudgeFired({
      firedAt: '2026-06-17T10:00:00.000Z',
      currentHr: 90,
      resting: 60,
    });
    expect(e.answer).toBeNull();
    const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(saved).toHaveLength(1);
    expect(saved[0].firedAt).toBe('2026-06-17T10:00:00.000Z');
  });
});

describe('recordAnswer', () => {
  it('answers the most recent unanswered nudge when no firedAt given', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify([
        ev('2026-06-17T09:00:00.000Z', 'no'),
        ev('2026-06-17T10:00:00.000Z'), // unanswered, latest
      ]),
    );
    const ok = await recordAnswer('yes');
    expect(ok).toBe(true);
    const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(saved[1].answer).toBe('yes');
    expect(saved[0].answer).toBe('no'); // untouched
  });

  it('targets a specific nudge by firedAt', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify([ev('2026-06-17T09:00:00.000Z'), ev('2026-06-17T10:00:00.000Z')]),
    );
    await recordAnswer('later', '2026-06-17T09:00:00.000Z');
    const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(saved[0].answer).toBe('later');
    expect(saved[1].answer).toBeNull();
  });

  it('returns false when there is nothing to answer', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([ev('2026-06-17T09:00:00.000Z', 'yes')]));
    expect(await recordAnswer('no')).toBe(false);
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('latestNudgeAt', () => {
  it('returns null for an empty history', () => {
    expect(latestNudgeAt([])).toBeNull();
  });

  it('returns the most recent fire time regardless of order', () => {
    const events = [ev('2026-06-17T10:00:00.000Z'), ev('2026-06-17T08:00:00.000Z')];
    expect(latestNudgeAt(events)?.toISOString()).toBe('2026-06-17T10:00:00.000Z');
  });
});

describe('nudgesToday', () => {
  it('counts only events on the same local day as now', () => {
    const now = new Date(2026, 5, 17, 15, 0, 0); // 2026-06-17 local
    const events = [
      { ...ev(new Date(2026, 5, 17, 9, 0, 0).toISOString()) },
      { ...ev(new Date(2026, 5, 17, 12, 0, 0).toISOString()) },
      { ...ev(new Date(2026, 5, 16, 23, 0, 0).toISOString()) }, // yesterday
    ];
    expect(nudgesToday(events, now)).toBe(2);
  });

  it('is 0 when nothing fired today', () => {
    const now = new Date(2026, 5, 17, 15, 0, 0);
    expect(nudgesToday([ev(new Date(2026, 5, 10, 9, 0, 0).toISOString())], now)).toBe(0);
  });
});

describe('getNudgeHistory', () => {
  it('reads and parses storage', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify([ev('2026-06-17T10:00:00.000Z', 'yes')]));
    const h = await getNudgeHistory();
    expect(h).toHaveLength(1);
    expect(h[0].answer).toBe('yes');
  });
});
