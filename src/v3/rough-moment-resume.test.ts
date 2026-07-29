// The resume window is the whole reason the 20 minute hold can work, so the
// boundary gets a test rather than a hope.

import {
  clearSession,
  RESUME_WINDOW_MS,
  saveSession,
  takeSession,
  type RoughSnapshot,
} from './rough-moment-resume';
import { EMPTY_COMPACT } from './rough-moment-content';

const snap = (): Omit<RoughSnapshot, 'savedAt'> => ({
  messages: [{ id: 0, who: 'app', text: 'Do you feel any of these is true?' }],
  chips: ['I am not enough'],
  dot: 2,
  keep: null,
  pill: null,
  compact: { ...EMPTY_COMPACT, thought: 'I am not enough' },
  step: 'pattern',
  msgCount: 3,
  nextId: 3,
  lightLogged: false,
});

beforeEach(() => clearSession());

describe('rough-moment resume', () => {
  it('holds nothing until a session is saved', () => {
    expect(takeSession()).toBeNull();
  });

  it('gives the session back inside the window', () => {
    const t0 = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(t0);
    saveSession(snap());

    const held = takeSession(t0 + RESUME_WINDOW_MS - 1);
    expect(held?.step).toBe('pattern');
    expect(held?.compact.thought).toBe('I am not enough');
    expect(held?.msgCount).toBe(3);
  });

  it('survives the 20 minute hold the flow asks her to do', () => {
    const t0 = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(t0);
    saveSession(snap());

    expect(takeSession(t0 + 20 * 60 * 1000)).not.toBeNull();
  });

  it('drops the session past the window', () => {
    const t0 = 1_000_000;
    jest.spyOn(Date, 'now').mockReturnValue(t0);
    saveSession(snap());

    expect(takeSession(t0 + RESUME_WINDOW_MS + 1)).toBeNull();
    // and stays dropped, rather than reappearing on a later read
    expect(takeSession(t0)).toBeNull();
  });

  it('forgets on an explicit leave', () => {
    saveSession(snap());
    clearSession();
    expect(takeSession()).toBeNull();
  });

  it('carries the light guard, so a resumed session cannot pay out twice', () => {
    saveSession({ ...snap(), lightLogged: true });
    expect(takeSession()?.lightLogged).toBe(true);
  });

  it('holds a copy, not a live reference to the caller state', () => {
    const messages = [...snap().messages];
    saveSession({ ...snap(), messages });
    messages.push({ id: 9, who: 'me', text: 'typed after the save' });
    expect(takeSession()?.messages).toHaveLength(1);
  });
});
