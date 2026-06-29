import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  readFreezeState,
  applyFreezesToDates,
  awardFreezes,
  FREEZE_INTERVAL,
  type FreezeState,
} from './streak-freeze';
import { withStoreLock } from './with-store-lock';
import { earnedTierBetween, type Tier } from '@/models/tiers';

export type SessionRecord = {
  techniqueId: string;
  completedAt: string; // ISO 8601
};

export type StreakInfo = {
  streak: number;
  availableFreezes: number;
};

const STORAGE_KEY = 'niyora:sessions';

function parseRecords(raw: string | null): SessionRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

// Pure computation: walk backward from now counting consecutive days that have
// sessions, frozen dates, or can be bridged by a freeze.
// A freeze only bridges a SINGLE missed day that has a session or frozen date
// on the far side — preventing freezes from extending past the session history.
function computeEffectiveStreak(
  sessionDates: Set<string>,
  freezeState: FreezeState,
  now: Date,
): { streak: number; newFrozenDates: string[] } {
  const frozenDates = new Set(freezeState.appliedDates);
  const todayStr = localDateStr(now);
  let offset = sessionDates.has(todayStr) ? 0 : 1;
  let streak = 0;
  let remaining = freezeState.available;
  const newFrozenDates: string[] = [];

  while (true) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const dateStr = localDateStr(d);

    if (sessionDates.has(dateStr) || frozenDates.has(dateStr)) {
      streak++;
      offset++;
    } else {
      // No session here. Only bridge if the day further back (offset+1) also
      // has a session or frozen date — ensuring a freeze spans exactly one gap.
      const behind = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (offset + 1));
      const behindStr = localDateStr(behind);
      if (remaining > 0 && (sessionDates.has(behindStr) || frozenDates.has(behindStr))) {
        remaining--;
        newFrozenDates.push(dateStr);
        streak++;
        offset++;
      } else {
        break;
      }
    }
  }

  return { streak, newFrozenDates };
}

export type AppendResult = {
  /** Total sessions ever, after this one was recorded. */
  sessionCount: number;
  /** The tier newly reached by this session, or null if no threshold crossed. */
  earnedTier: Tier | null;
};

export async function appendSession(techniqueId: string): Promise<AppendResult> {
  return withStoreLock(STORAGE_KEY, async () => {
    const [rawSessions, freezeState] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      readFreezeState(),
    ]);

    const records = parseRecords(rawSessions);
    const now = new Date();
    const countBefore = records.length;

    const sessionDatesBefore = new Set(records.map((r) => localDateStr(new Date(r.completedAt))));
    const { streak: streakBefore } = computeEffectiveStreak(sessionDatesBefore, freezeState, now);

    records.push({ techniqueId, completedAt: now.toISOString() });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    const countAfter = records.length;

    const sessionDatesAfter = new Set(records.map((r) => localDateStr(new Date(r.completedAt))));
    const { streak: streakAfter } = computeEffectiveStreak(sessionDatesAfter, freezeState, now);

    // Award one freeze each time the effective streak crosses a 7-day milestone.
    const prevMilestones = Math.floor(streakBefore / FREEZE_INTERVAL);
    const newMilestones = Math.floor(streakAfter / FREEZE_INTERVAL);
    if (newMilestones > prevMilestones) {
      await awardFreezes(newMilestones - prevMilestones);
    }

    return {
      sessionCount: countAfter,
      earnedTier: earnedTierBetween(countBefore, countAfter),
    };
  });
}

// Reads the effective streak (with any pending freeze auto-applications) and
// persists newly applied freezes so the UI and future reads stay consistent.
export async function getStreakInfo(): Promise<StreakInfo> {
  const [rawSessions, freezeState] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    readFreezeState(),
  ]);
  const records = parseRecords(rawSessions);
  const sessionDates = new Set(records.map((r) => localDateStr(new Date(r.completedAt))));
  const now = new Date();

  const { streak, newFrozenDates } = computeEffectiveStreak(sessionDates, freezeState, now);

  if (newFrozenDates.length > 0) {
    await applyFreezesToDates(newFrozenDates);
  }

  const availableFreezes = Math.max(0, freezeState.available - newFrozenDates.length);
  return { streak, availableFreezes };
}

export async function getSessionCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return parseRecords(raw).length;
}

export async function getSessionsThisWeek(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const now = new Date();
  const day = now.getDay(); // 0=Sunday, 1=Monday, …, 6=Saturday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return records.filter((r) => new Date(r.completedAt) >= weekStart).length;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getSessionsToday(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const todayStr = localDateStr(new Date());
  return records.filter((r) => localDateStr(new Date(r.completedAt)) === todayStr).length;
}

export async function getLastSession(): Promise<SessionRecord | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  return records.length > 0 ? records[records.length - 1] : null;
}

export async function getCurrentStreak(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const records = parseRecords(raw);
  const sessionDates = new Set(records.map((r) => localDateStr(new Date(r.completedAt))));
  const now = new Date();
  const todayStr = localDateStr(now);
  // If today has no session, start from yesterday so users aren't penalized for not breathing yet.
  let offset = sessionDates.has(todayStr) ? 0 : 1;
  let streak = 0;
  while (true) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    if (!sessionDates.has(localDateStr(d))) break;
    streak++;
    offset++;
  }
  return streak;
}
