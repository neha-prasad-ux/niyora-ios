import {
  ACTIVITIES,
  getActivity,
  activitiesForFeeling,
  type PmsFeeling,
} from './activities';

const ALL_FEELINGS: readonly PmsFeeling[] = [
  'irritable',
  'anxious',
  'low',
  'foggy',
  'overwhelmed',
];

describe('activity catalogue', () => {
  it('ships exactly the 15 spec activities', () => {
    expect(ACTIVITIES).toHaveLength(15);
  });

  it('has unique ids', () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every activity fits at least one feeling, all from the known set', () => {
    for (const a of ACTIVITIES) {
      expect(a.fits.length).toBeGreaterThan(0);
      for (const f of a.fits) {
        expect(ALL_FEELINGS).toContain(f);
      }
    }
  });

  it('only the under-a-minute activity is flagged fast', () => {
    const fast = ACTIVITIES.filter((a) => a.fast);
    expect(fast.map((a) => a.id)).toEqual(['cold-water']);
  });

  it('carries the type-specific payload each card type needs', () => {
    for (const a of ACTIVITIES) {
      if (a.cardType === 'nudge') expect(a.how).toBeTruthy();
      if (a.cardType === 'write') expect(a.placeholder).toBeTruthy();
      if (a.cardType === 'read') expect(a.body).toBeTruthy();
      if (a.cardType === 'action') expect(a.template).toBeTruthy();
    }
  });

  it('keeps copy free of em dashes', () => {
    for (const a of ACTIVITIES) {
      const text = [a.title, a.benefit, a.why, a.how, a.body, a.template, a.placeholder]
        .filter(Boolean)
        .join(' ');
      expect(text).not.toContain('—');
    }
  });
});

describe('getActivity', () => {
  it('returns the activity for a known id', () => {
    expect(getActivity('cold-water')?.title).toBe('Cold water on your face');
  });

  it('returns undefined for an unknown id', () => {
    expect(getActivity('nope')).toBeUndefined();
  });
});

describe('activitiesForFeeling', () => {
  it('returns only activities whose fits include the feeling', () => {
    for (const f of ALL_FEELINGS) {
      const matches = activitiesForFeeling(f);
      expect(matches.length).toBeGreaterThan(0);
      for (const a of matches) {
        expect(a.fits).toContain(f);
      }
    }
  });

  it('preserves catalogue order', () => {
    const irritable = activitiesForFeeling('irritable').map((a) => a.id);
    const catalogueOrder = ACTIVITIES.filter((a) =>
      a.fits.includes('irritable'),
    ).map((a) => a.id);
    expect(irritable).toEqual(catalogueOrder);
  });

  it('matches the spec fit counts per feeling', () => {
    // Hand-counted from docs/pms/niyora-pms-activities.md.
    expect(activitiesForFeeling('irritable')).toHaveLength(8);
    expect(activitiesForFeeling('anxious')).toHaveLength(6);
    expect(activitiesForFeeling('low')).toHaveLength(8);
    expect(activitiesForFeeling('foggy')).toHaveLength(4);
    expect(activitiesForFeeling('overwhelmed')).toHaveLength(8);
  });
});
