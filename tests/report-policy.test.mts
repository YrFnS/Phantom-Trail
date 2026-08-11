import test from 'node:test';
import assert from 'node:assert/strict';
import type { DailySnapshot, WeeklyReport } from '../lib/types.ts';
import {
  calculateComparableScoreChange,
  collectObservedDomainLabels,
  getCompletedDailyReportDate,
  getCompletedWeeklyReportDate,
  repairReportCollection,
  selectWeeklyComparison,
  shouldCaptureCurrentReport,
  sortDailySnapshotsChronologically,
} from '../lib/report-policy.mts';

function daily(
  date: string,
  score: number | null,
  domains: Array<[string, number]> = []
): DailySnapshot {
  return {
    date,
    privacyScore: score,
    scoreStatus: score === null ? 'insufficient-evidence' : 'estimated',
    scoreConfidence: score === null ? 'none' : 'low',
    eventCounts: {
      total: domains.reduce((total, [, count]) => total + count, 0),
      byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {
        advertising: 0,
        analytics: 0,
        social: 0,
        fingerprinting: 0,
        cryptomining: 0,
        unknown: 0,
      },
    },
    topDomains: domains.map(([domain, count]) => ({ domain, count })),
  };
}

function weekly(weekStart: string, averageScore: number | null): WeeklyReport {
  return {
    weekStart,
    averageScore,
    scoreChange: null,
    newTrackers: [],
    improvedSites: [],
    riskySites: [],
  };
}

test('storage repair ignores object-key order', () => {
  const raw = [{ nested: { second: 2, first: 1 }, value: 'same' }];
  const repair = repairReportCollection(raw, () => ({
    value: 'same',
    nested: { first: 1, second: 2 },
  }));

  assert.equal(repair.changed, false);
  assert.equal(repair.migrated, 0);
  assert.equal(repair.removed, 0);
});

test('storage repair distinguishes normalized legacy rows from removals', () => {
  const repair = repairReportCollection(
    [{ value: 1, legacy: true }, { invalid: true }],
    value =>
      typeof (value as { value?: unknown }).value === 'number'
        ? { value: (value as { value: number }).value }
        : null
  );

  assert.deepEqual(repair.items, [{ value: 1 }]);
  assert.equal(repair.migrated, 1);
  assert.equal(repair.removed, 1);
  assert.equal(repair.changed, true);
});

test('current-period reports refresh only when requested or missing', () => {
  assert.equal(
    shouldCaptureCurrentReport('2026-08-12', '2026-08-12', false),
    false
  );
  assert.equal(
    shouldCaptureCurrentReport('2026-08-12', '2026-08-12', true),
    true
  );
  assert.equal(
    shouldCaptureCurrentReport(undefined, '2026-08-12', false),
    true
  );
});

test('daily snapshots are returned in chronological chart order', () => {
  assert.deepEqual(
    sortDailySnapshotsChronologically([
      daily('2026-08-12', 70),
      daily('2026-08-10', 80),
      daily('2026-08-11', 75),
    ]).map(snapshot => snapshot.date),
    ['2026-08-10', '2026-08-11', '2026-08-12']
  );
});

test('weekly comparison selects newest current and prior week', () => {
  const reports = [
    weekly('2026-07-27', 90),
    weekly('2026-08-10', 70),
    weekly('2026-08-03', 80),
  ];
  const { current, previous } = selectWeeklyComparison(reports);

  assert.equal(current?.weekStart, '2026-08-10');
  assert.equal(previous?.weekStart, '2026-08-03');
  assert.equal(calculateComparableScoreChange(current, previous), -10);
});

test('N/A weekly values preserve an incomparable change', () => {
  assert.equal(
    calculateComparableScoreChange(
      weekly('2026-08-10', null),
      weekly('2026-08-03', 80)
    ),
    null
  );
});

test('completed report dates target closed local periods', () => {
  const monday = new Date(2026, 7, 10, 0, 15);
  const dailyDate = getCompletedDailyReportDate(monday);
  const weeklyDate = getCompletedWeeklyReportDate(monday);

  assert.equal(dailyDate.getFullYear(), 2026);
  assert.equal(dailyDate.getMonth(), 7);
  assert.equal(dailyDate.getDate(), 9);
  assert.equal(weeklyDate.getDay(), 0);
  assert.equal(weeklyDate.getDate(), 9);

  const delayedTuesday = getCompletedWeeklyReportDate(
    new Date(2026, 7, 11, 9, 0)
  );
  assert.equal(delayedTuesday.getDate(), 9);
});

test('weekly observed labels are frequency-ranked and bounded', () => {
  assert.deepEqual(
    collectObservedDomainLabels(
      [
        daily('2026-08-10', 80, [
          ['b.test', 2],
          ['a.test', 1],
        ]),
        daily('2026-08-11', 70, [
          ['a.test', 4],
          ['c.test', 1],
        ]),
      ],
      2
    ),
    ['a.test', 'b.test']
  );
});
