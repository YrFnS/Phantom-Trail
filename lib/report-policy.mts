import type { DailySnapshot, WeeklyReport } from './types.ts';

export interface ReportCollectionRepair<T> {
  items: T[];
  migrated: number;
  removed: number;
  changed: boolean;
}

/**
 * Normalize a storage collection without treating object key order as a data
 * migration. Invalid rows are removed; retained legacy rows are counted only
 * when their normalized value is semantically different.
 */
export function repairReportCollection<T>(
  raw: unknown[],
  normalize: (value: unknown) => T | null
): ReportCollectionRepair<T> {
  const items: T[] = [];
  let migrated = 0;
  let removed = 0;

  for (const value of raw) {
    const normalized = normalize(value);
    if (normalized === null) {
      removed += 1;
      continue;
    }

    if (!areEquivalentStorageValues(value, normalized)) {
      migrated += 1;
    }
    items.push(normalized);
  }

  return {
    items,
    migrated,
    removed,
    changed: migrated > 0 || removed > 0,
  };
}

export function shouldCaptureCurrentReport(
  latestPeriod: string | undefined,
  targetPeriod: string,
  refreshExisting: boolean
): boolean {
  return refreshExisting || latestPeriod !== targetPeriod;
}

export function sortDailySnapshotsChronologically(
  snapshots: DailySnapshot[]
): DailySnapshot[] {
  return [...snapshots].sort((first, second) =>
    first.date.localeCompare(second.date)
  );
}

export function selectWeeklyComparison(
  reports: WeeklyReport[],
  requestedWeekStart?: string
): { current: WeeklyReport | null; previous: WeeklyReport | null } {
  const sorted = [...reports].sort((first, second) =>
    second.weekStart.localeCompare(first.weekStart)
  );
  const current = requestedWeekStart
    ? sorted.find(report => report.weekStart === requestedWeekStart) ||
      sorted[0] ||
      null
    : sorted[0] || null;
  const previous = current
    ? sorted.find(report => report.weekStart < current.weekStart) || null
    : null;

  return { current, previous };
}

export function calculateComparableScoreChange(
  current: WeeklyReport | null,
  previous: WeeklyReport | null
): number | null {
  if (
    !current ||
    !previous ||
    current.averageScore === null ||
    previous.averageScore === null
  ) {
    return null;
  }

  return current.averageScore - previous.averageScore;
}

/** Return the local calendar day that completed before a daily alarm ran. */
export function getCompletedDailyReportDate(now = new Date()): Date {
  const completed = new Date(now);
  completed.setDate(completed.getDate() - 1);
  return completed;
}

/**
 * Return a date inside the last fully completed Monday-Sunday week. This stays
 * correct when Chrome delivers the weekly alarm late after sleep or shutdown.
 */
export function getCompletedWeeklyReportDate(now = new Date()): Date {
  const completed = new Date(now);
  const daysSinceMonday = (completed.getDay() + 6) % 7;
  completed.setDate(completed.getDate() - daysSinceMonday - 1);
  return completed;
}

/**
 * The legacy WeeklyReport field is named newTrackers, but P4 can only establish
 * bounded observed resource-domain labels. Rank them by recorded occurrence.
 */
export function collectObservedDomainLabels(
  snapshots: DailySnapshot[],
  limit = 5
): string[] {
  const counts = new Map<string, number>();
  for (const snapshot of snapshots) {
    for (const entry of snapshot.topDomains) {
      counts.set(entry.domain, (counts.get(entry.domain) || 0) + entry.count);
    }
  }

  return [...counts.entries()]
    .sort(
      ([firstDomain, firstCount], [secondDomain, secondCount]) =>
        secondCount - firstCount || firstDomain.localeCompare(secondDomain)
    )
    .slice(0, Math.max(0, limit))
    .map(([domain]) => domain);
}

function areEquivalentStorageValues(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) =>
        areEquivalentStorageValues(value, right[index])
      )
    );
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          areEquivalentStorageValues(left[key], right[key])
      )
    );
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}
