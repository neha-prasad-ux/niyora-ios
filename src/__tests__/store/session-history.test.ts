import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendSession, getSessionCount } from '@/store/session-history';

const STORAGE_KEY = 'niyora:sessions';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('getSessionCount (read)', () => {
  it('returns 0 when no data is stored', async () => {
    expect(await getSessionCount()).toBe(0);
  });

  it('reflects the count after appending sessions', async () => {
    await appendSession('box');
    await appendSession('belly');
    expect(await getSessionCount()).toBe(2);
  });

  it('returns 0 for corrupt stored JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');
    expect(await getSessionCount()).toBe(0);
  });
});

describe('appendSession (append)', () => {
  it('persists a single session so count becomes 1', async () => {
    await appendSession('box');
    expect(await getSessionCount()).toBe(1);
  });

  it('preserves earlier records on subsequent appends', async () => {
    await appendSession('box');
    await appendSession('belly');
    await appendSession('wind-down');
    expect(await getSessionCount()).toBe(3);
  });

  it('stores the correct techniqueId', async () => {
    await appendSession('box');
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const records = JSON.parse(raw!);
    expect(records[0].techniqueId).toBe('box');
    expect(typeof records[0].completedAt).toBe('string');
  });
});

describe('corrupt-data handling', () => {
  it('appendSession recovers from corrupt existing data without throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{bad json}');
    await expect(appendSession('box')).resolves.toBeUndefined();
    expect(await getSessionCount()).toBe(1);
  });

  it('getSessionCount returns 0 for a corrupt store without throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '[[[[invalid');
    await expect(getSessionCount()).resolves.toBe(0);
  });
});

describe('restart persistence', () => {
  it('starts fresh after clearing storage', async () => {
    await appendSession('box');
    await appendSession('belly');
    expect(await getSessionCount()).toBe(2);
    await AsyncStorage.clear();
    expect(await getSessionCount()).toBe(0);
  });

  it('accumulates across multiple append-read cycles', async () => {
    await appendSession('box');
    expect(await getSessionCount()).toBe(1);
    await appendSession('belly');
    expect(await getSessionCount()).toBe(2);
    await appendSession('wind-down');
    expect(await getSessionCount()).toBe(3);
  });
});
