import { parseReminder, DEFAULT_REMINDER } from '@/store/reminder-prefs';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('parseReminder', () => {
  it('returns the default when storage is empty', () => {
    expect(parseReminder(null)).toEqual(DEFAULT_REMINDER);
  });

  it('returns the default on malformed JSON', () => {
    expect(parseReminder('not json')).toEqual(DEFAULT_REMINDER);
  });

  it('reads a well-formed value', () => {
    expect(parseReminder(JSON.stringify({ enabled: true, hour: 7, minute: 30 }))).toEqual({
      enabled: true,
      hour: 7,
      minute: 30,
    });
  });

  it('coerces a non-boolean enabled to false', () => {
    expect(parseReminder(JSON.stringify({ enabled: 'yes', hour: 9, minute: 0 })).enabled).toBe(false);
  });

  it('clamps out-of-range hour and minute back to the default time', () => {
    const r = parseReminder(JSON.stringify({ enabled: true, hour: 26, minute: 99 }));
    expect(r.hour).toBe(DEFAULT_REMINDER.hour);
    expect(r.minute).toBe(DEFAULT_REMINDER.minute);
  });

  it('floors fractional values to whole units', () => {
    const r = parseReminder(JSON.stringify({ enabled: true, hour: 8.5, minute: 15 }));
    expect(r.hour).toBe(8);
    expect(r.minute).toBe(15);
  });
});
