jest.mock('@react-native-async-storage/async-storage', () => ({
  removeItem: jest.fn(),
}));

import { execSync } from 'node:child_process';
import path from 'node:path';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CONTENT_KEYS, SETTINGS_KEYS, deleteHerContent } from './delete-her-data';

const removeItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  removeItem.mockReset();
  removeItem.mockResolvedValue(undefined);
});

describe('deleteHerContent', () => {
  it('removes every content key', async () => {
    const r = await deleteHerContent();
    expect(r.failed).toEqual([]);
    expect(r.deleted.sort()).toEqual([...CONTENT_KEYS].sort());
    expect(removeItem).toHaveBeenCalledTimes(CONTENT_KEYS.length);
  });

  it('removes her moment history and her reflect memory', async () => {
    await deleteHerContent();
    const removed = removeItem.mock.calls.map((c) => c[0]);
    expect(removed).toContain('niyora:moment-history');
    expect(removed).toContain('niyora:reflect-memory');
  });

  it('never touches a settings key, so deleting her diary does not reset the app', async () => {
    await deleteHerContent();
    const removed = removeItem.mock.calls.map((c) => c[0]);
    for (const k of SETTINGS_KEYS) expect(removed).not.toContain(k);
  });

  it('never deletes her AI consent answer', async () => {
    await deleteHerContent();
    expect(removeItem.mock.calls.map((c) => c[0])).not.toContain('niyora:moon-consent');
  });

  it('keeps going when one key fails, and reports it honestly', async () => {
    removeItem.mockImplementation((k: string) =>
      k === 'niyora:moods' ? Promise.reject(new Error('nope')) : Promise.resolve(),
    );
    const r = await deleteHerContent();
    expect(r.failed).toEqual(['niyora:moods']);
    // The other twenty-five still went. A partial delete beats an abandoned one.
    expect(r.deleted).toHaveLength(CONTENT_KEYS.length - 1);
  });

  it('lists no key twice, and never in both groups', () => {
    const all = [...CONTENT_KEYS, ...SETTINGS_KEYS];
    expect(new Set(all).size).toBe(all.length);
  });

  /**
   * The guard that gives this file its value. A new store lands, nobody thinks
   * about deletion, and its key quietly survives a delete she explicitly asked
   * for. That is a broken privacy promise, not a missing feature, so it should
   * fail here rather than ship. Add the new key to CONTENT_KEYS if it holds
   * anything about her, or to SETTINGS_KEYS if it is app setup.
   */
  it('accounts for every niyora storage key in the codebase', () => {
    const src = path.resolve(__dirname, '..');
    // Keys as they are written in source, always a 'niyora:'-prefixed literal.
    const found = execSync(`grep -rhoE "'niyora:[a-z0-9:-]+'" ${JSON.stringify(src)} || true`)
      .toString()
      .split('\n')
      .map((s) => s.trim().replace(/'/g, ''))
      .filter(Boolean);
    const known = new Set<string>([...CONTENT_KEYS, ...SETTINGS_KEYS]);
    const unaccounted = [...new Set(found)].filter((k) => !known.has(k));
    expect(unaccounted).toEqual([]);
  });
});
