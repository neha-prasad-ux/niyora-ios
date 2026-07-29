// The prep items for the PrepSheet — what helps, grouped by where she is in the
// cycle. See docs/pms/niyora-pms-preparedness-spec.md (v2, four-phase content
// map). This is the buildable subset: the items whose screens already exist.
// Neha's story (Aware) and couples ch.2–4 (Together) slot in as that content
// lands.
//
// Framed as *what helps* (a map), never *what you owe* (a backlog): items she
// hasn't done show an open chevron, not a red flag, and nothing is required.

import type { BandPhase } from '@/lib/phase-band';

export type PrepPillar = 'build' | 'aware' | 'nourish' | 'calm' | 'together' | 'steady' | 'care';

export type PrepItemKey = 'build' | 'checklist' | 'calm' | 'steady' | 'care';

export type PrepItem = {
  key: PrepItemKey;
  pillar: PrepPillar;
  title: string;
  sub: string;
  // A clear daily done state exists only for some (checklist, calm); the rest
  // are simply openable and never show as "missed".
  done: boolean;
  tracksDone: boolean;
};

// Pillar → colour, matching the concept mock: Aware/Build violet, Nourish green,
// Calm blue, Together/Steady rose, Care coral.
export const PILLAR_HUE: Record<PrepPillar, string> = {
  build: '#a982f2',
  aware: '#a982f2',
  nourish: '#54c3a8',
  calm: '#7fa0ee',
  together: '#e888b2',
  steady: '#e08bb0',
  care: '#eaa07a',
};

type PrepFacts = { checklistDone: boolean; calmDone: boolean };

const CHECKLIST = (f: PrepFacts, sub: string): PrepItem => ({
  key: 'checklist',
  pillar: 'nourish',
  title: 'Daily checklist',
  sub,
  done: f.checklistDone,
  tracksDone: true,
});

const CALM = (f: PrepFacts): PrepItem => ({
  key: 'calm',
  pillar: 'calm',
  title: 'A moment of calm',
  sub: 'One guided breath',
  done: f.calmDone,
  tracksDone: true,
});

export function prepItemsFor(phase: BandPhase, f: PrepFacts): PrepItem[] {
  switch (phase) {
    case 'build':
      return [
        {
          key: 'build',
          pillar: 'build',
          title: 'Build a skill',
          sub: 'Train emotional regulation',
          done: false,
          tracksDone: false,
        },
        CHECKLIST(f, 'Fuel, rest, movement'),
        CALM(f),
      ];
    case 'pms':
      return [
        {
          key: 'steady',
          pillar: 'steady',
          title: 'Cried, fought, snapped?',
          sub: 'Move through it, the science way',
          done: false,
          tracksDone: false,
        },
        CHECKLIST(f, 'Keep fuel, rest, movement going'),
        CALM(f),
      ];
    case 'period':
      return [
        {
          key: 'care',
          pillar: 'care',
          title: 'Care through your period',
          sub: 'Comfort and rest',
          done: false,
          tracksDone: false,
        },
        CALM(f),
      ];
  }
}
