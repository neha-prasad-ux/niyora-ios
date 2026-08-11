import { subjectOf, hasContinuationCue, pickSubject } from './moment-subject';

describe('subjectOf', () => {
  it('keys by the person or topic she names', () => {
    expect(subjectOf('my mom keeps bringing up the wedding')).toBe('mom');
    expect(subjectOf('work is a mess again')).toBe('work');
    expect(subjectOf('my brother texted me')).toBe('brother');
    expect(subjectOf('my husband forgot')).toBe('husband');
  });
  it('returns null when no clear subject is named', () => {
    expect(subjectOf('she keeps doing this to me')).toBeNull();
    expect(subjectOf('everything feels heavy today')).toBeNull();
  });
  it('mother-in-law does not collapse to mom', () => {
    expect(subjectOf('my mother-in-law criticised me')).toBe('in-law');
  });
});

describe('pickSubject (match only when obvious)', () => {
  it('picks the named subject when it has a thread', () => {
    expect(pickSubject('my mom again', ['mom', 'work'])).toBe('mom');
  });
  it('does not pick a named subject with no existing thread', () => {
    expect(pickSubject('my mom again', ['work'])).toBeNull();
  });
  it('honours a continuation cue when exactly one thread exists', () => {
    expect(hasContinuationCue('I talked about it before')).toBe(true);
    expect(pickSubject('I talked about it before', ['work'])).toBe('work');
  });
  it('will not guess between several threads on a bare continuation cue', () => {
    expect(pickSubject('I talked about it before', ['mom', 'work', 'brother'])).toBeNull();
  });
  it('starts fresh with no subject and no cue', () => {
    expect(pickSubject('she keeps doing this', ['mom', 'work'])).toBeNull();
  });
});
