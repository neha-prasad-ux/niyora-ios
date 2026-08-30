import { scrubForExport } from './pii';

describe('scrubForExport', () => {
  it('drops a cued name and keeps the relation', () => {
    expect(scrubForExport('my sister Jess said I was too much')).toBe(
      'my sister said I was too much',
    );
    expect(scrubForExport('my manager, Priya, cut me off again')).toBe(
      'my manager, cut me off again',
    );
  });

  it('scrubs later bare mentions of a name a cue already proved', () => {
    expect(scrubForExport('my sister Jess called. Jess never listens.')).toBe(
      'my sister called. they never listens.',
    );
  });

  // The reason this is not scrub(): that one would hand the clinician "Sam".
  it('never substitutes a different realistic name', () => {
    const out = scrubForExport('my partner Dan forgot again');
    expect(out).not.toMatch(/Robin|Alex|Sam|Jamie|Casey|Morgan|Dan/);
  });

  it('leaves her own name and ordinary capitals alone', () => {
    expect(scrubForExport("I'm Neha and I'm Tired")).toBe("I'm Neha and I'm Tired");
    expect(scrubForExport('my brother Will call me back')).toBe('my brother Will call me back');
  });

  it('placeholders contact details but not dates or counts', () => {
    expect(scrubForExport('mail me at a.b@x.com or 555 123 4567')).toBe(
      'mail me at [email] or [phone]',
    );
    expect(scrubForExport('it started 2024-01-15, about 3 times')).toBe(
      'it started 2024-01-15, about 3 times',
    );
  });
});
