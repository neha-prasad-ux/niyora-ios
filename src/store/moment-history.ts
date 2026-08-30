import AsyncStorage from '@react-native-async-storage/async-storage';

import { localYmd } from '../lib/day';
import { encrypt, decrypt } from '../lib/secure-box';

// Every finished moment, remembered on-device (Neha 2026-08-11). This is the
// foundation for: My Soul showing the real emotions she named, pattern detection
// across entries, and picking up a thread she is continuing (mom / work / ...).
//
// On-device only, AsyncStorage, iOS sandboxes and encrypts this at rest when the
// phone is locked. App-level encryption of `entry`/`response` (a Keychain key) is
// the immediate follow-up; the shape below does not change when it lands, so the
// rest of the app can build against it now.
//
// ponytail: plain list + a cap. No index/DB until the history is big enough that a
// linear scan measurably hurts (hundreds of moments in, not tens).

export type MomentRecord = {
  /** ISO timestamp, sorts newest-first, and the stable key. */
  at: string;
  /** YYYY-MM-DD, for day grouping and cycle correlation later. */
  date: string;
  /** What she wrote. TODO(encrypt): wrap this + `response` in the Keychain cipher. */
  entry: string;
  /** The feeling she named (FEELING_SET label), e.g. "Hurt". */
  feeling: string;
  /** The constellation that feeling belongs to, lights the badge on My Soul. */
  constellation: string;
  /** The thread key (person/topic) from moment-subject, when she named one. */
  subject?: string;
  /** The response she drafted/sent, kept so a continued thread has the full arc. */
  response?: string;
};

const STORAGE_KEY = 'niyora:moment-history';
const CAP = 300;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseMoments(raw: string | null): MomentRecord[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter(
      (m): m is MomentRecord =>
        m != null &&
        typeof m.at === 'string' &&
        typeof m.date === 'string' &&
        YMD.test(m.date) &&
        typeof m.entry === 'string' &&
        typeof m.feeling === 'string' &&
        typeof m.constellation === 'string',
    );
  } catch {
    return [];
  }
}

export async function getMoments(): Promise<MomentRecord[]> {
  const parsed = parseMoments(await AsyncStorage.getItem(STORAGE_KEY));
  // Decrypt the sensitive fields back to plaintext for callers. secure-box.decrypt
  // returns legacy plaintext untouched, so pre-encryption records still read.
  return Promise.all(
    parsed.map(async (m) => ({
      ...m,
      entry: await decrypt(m.entry),
      ...(m.response !== undefined ? { response: await decrypt(m.response) } : {}),
    })),
  );
}

/** Save a finished moment. Newest-first, capped. Empty entry → skip (nothing to
 *  remember). */
export async function addMoment(
  m: Omit<MomentRecord, 'at' | 'date'> & { at?: string; date?: string },
): Promise<void> {
  if (!m.entry?.trim() || !m.feeling) return;
  const now = new Date();
  const rec: MomentRecord = {
    at: m.at ?? now.toISOString(),
    date: m.date ?? localYmd(now),
    entry: m.entry.trim(),
    feeling: m.feeling,
    constellation: m.constellation,
    ...(m.subject ? { subject: m.subject } : {}),
    ...(m.response?.trim() ? { response: m.response.trim() } : {}),
  };
  const existing = await getMoments(); // plaintext (decrypted on read)
  // Encrypt entry/response of EVERY record before persisting: `existing` is
  // plaintext, so re-encrypting the whole list keeps ciphertext in storage (and
  // upgrades any legacy-plaintext record it passes through).
  const stored = await Promise.all(
    [rec, ...existing].slice(0, CAP).map(async (r) => ({
      ...r,
      entry: await encrypt(r.entry),
      ...(r.response !== undefined ? { response: await encrypt(r.response) } : {}),
    })),
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/** Attach a drafted response to the most recent moment, for when it lands after
 *  the moment was already saved this session (the emotion saves when she finishes
 *  reflecting; the act draft comes later). No-op if there is no moment/response. */
export async function updateLatestMomentResponse(response: string): Promise<void> {
  const r = response?.trim();
  if (!r) return;
  const existing = await getMoments(); // plaintext (decrypted on read)
  if (existing.length === 0) return;
  existing[0] = { ...existing[0], response: r };
  const stored = await Promise.all(
    existing.map(async (m) => ({
      ...m,
      entry: await encrypt(m.entry),
      ...(m.response !== undefined ? { response: await encrypt(m.response) } : {}),
    })),
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/** How many times each feeling has been named, most-worked-through first. Feeds
 *  the My Soul "emotions you've worked through" view. */
export function feelingCounts(moments: readonly MomentRecord[]): { feeling: string; count: number }[] {
  const by = new Map<string, number>();
  for (const m of moments) by.set(m.feeling, (by.get(m.feeling) ?? 0) + 1);
  return [...by.entries()]
    .map(([feeling, count]) => ({ feeling, count }))
    .sort((a, b) => b.count - a.count);
}

/** The most recent stored moment for a subject/thread, or null. Feeds the thread
 *  pickup: its entry + feeling + response become context for the continued moment. */
export function latestForSubject(
  moments: readonly MomentRecord[],
  subject: string,
): MomentRecord | null {
  for (const m of moments) if (m.subject === subject) return m; // list is newest-first
  return null;
}

/** How many stored moments name this subject, a subject seen 2+ times is a
 *  recurring thread, which flips the `pattern` reflect card on. */
export function subjectCount(moments: readonly MomentRecord[], subject: string): number {
  let n = 0;
  for (const m of moments) if (m.subject === subject) n++;
  return n;
}

/** The distinct thread subjects in her recent moments (last `days`), newest-first.
 *  Passed to pickSubject so a continued entry lands on the right thread. */
export function recentSubjects(moments: readonly MomentRecord[], days = 30): string[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const seen: string[] = [];
  for (const m of moments) {
    if (!m.subject) continue;
    if (Date.parse(m.at) < cutoff) continue;
    if (!seen.includes(m.subject)) seen.push(m.subject);
  }
  return seen;
}

/** One badge = one constellation she has worked through. The reward drawings are
 *  claimed by the first `slots` distinct constellations, in the order she cracked
 *  them (Neha 2026-08-19). A repeat never hands out new art: it lights a golden
 *  star and raises the count, so the collection stays tied to what she felt.
 *
 *  ponytail: derived from history on read, no separate counter store. Six slots is
 *  the art we have; the full 19-constellation set (docs/moon-ai-constellations.md)
 *  drops in by growing MOON_DRAWINGS, no logic change. */
export type Badge = {
  constellation: string;
  /** Index into MOON_DRAWINGS, or -1 once the art has run out. */
  drawing: number;
  /** Times she has worked this constellation through. The star number. */
  count: number;
  /** The feelings she named inside it, first-named first. */
  feelings: string[];
};

/** Her badges, in the order she earned them. */
export function badgesFrom(moments: readonly MomentRecord[], slots: number): Badge[] {
  const by = new Map<string, Badge>();
  // History is newest-first; walk it backwards so slot 0 is her first emotion.
  for (let i = moments.length - 1; i >= 0; i--) {
    const m = moments[i];
    if (!m.constellation) continue;
    const b = by.get(m.constellation);
    if (b) {
      b.count += 1;
      if (m.feeling && !b.feelings.includes(m.feeling)) b.feelings.push(m.feeling);
      continue;
    }
    by.set(m.constellation, {
      constellation: m.constellation,
      drawing: by.size < slots ? by.size : -1,
      count: 1,
      feelings: m.feeling ? [m.feeling] : [],
    });
  }
  return [...by.values()];
}

/** The badge for the moment she just finished. Falls back to a fresh badge when
 *  that moment has not landed in history yet, so the reveal is never empty. */
export function badgeFor(
  moments: readonly MomentRecord[],
  constellation: string,
  slots: number,
  feeling?: string,
): Badge {
  const all = badgesFrom(moments, slots);
  return (
    all.find((b) => b.constellation === constellation) ?? {
      constellation,
      drawing: all.length < slots ? all.length : -1,
      count: 1,
      feelings: feeling ? [feeling] : [],
    }
  );
}

/** How many moments she finished in a calendar month (YYYY-MM), the number the
 *  Plus gate meters. Reads the raw list and never decrypts: the gate only needs
 *  dates, and `date` is stored in the clear.
 *
 *  ponytail: derived from history, not a separate counter. That means "delete my
 *  data" also resets the month's count, and that is the honest trade · a meter
 *  that outlived a privacy deletion would make the deletion a lie. Move to its
 *  own store only if wipe-to-reset shows up in the numbers. */
export async function countMomentsInMonth(ym: string): Promise<number> {
  const parsed = parseMoments(await AsyncStorage.getItem(STORAGE_KEY));
  return parsed.filter((m) => m.date.startsWith(ym)).length;
}
