export const REPORT_ALARMS = {
  cleanup: 'cleanup-old-events',
  daily: 'daily-evidence-snapshot',
  weekly: 'weekly-evidence-report',
} as const;

export const LEGACY_REPORT_ALARMS = [
  'daily-privacy-summary',
  'daily-snapshot',
] as const;

export function getNextDailyRun(
  now = new Date(),
  hour = 0,
  minute = 5
): number {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

export function getNextWeeklyRun(
  now = new Date(),
  weekday = 1,
  hour = 0,
  minute = 15
): number {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  const daysAhead = (weekday - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + daysAhead);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }
  return next.getTime();
}

export function isRetiredFeatureAlarm(name: string): boolean {
  return (
    LEGACY_REPORT_ALARMS.includes(
      name as (typeof LEGACY_REPORT_ALARMS)[number]
    ) || name.startsWith('export-schedule-')
  );
}
