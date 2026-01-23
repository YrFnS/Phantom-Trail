import type { DailySnapshot, WeeklyReport } from '../types';

/**
 * Manages daily snapshots and weekly reports storage
 */
export class ReportsStorage {
  private static readonly DAILY_SNAPSHOTS_KEY = 'phantom_trail_daily_snapshots';
  private static readonly WEEKLY_REPORTS_KEY = 'phantom_trail_weekly_reports';

  /**
   * Validate if data is a valid WeeklyReport
   */
  private static isValidWeeklyReport(data: unknown): data is WeeklyReport {
    if (!data || typeof data !== 'object') return false;

    const report = data as Record<string, unknown>;
    return (
      typeof report.weekStart === 'string' &&
      typeof report.averageScore === 'number' &&
      typeof report.scoreChange === 'number' &&
      Array.isArray(report.newTrackers) &&
      Array.isArray(report.improvedSites) &&
      Array.isArray(report.riskySites)
    );
  }

  /**
   * Validate if data is a valid DailySnapshot
   */
  private static isValidDailySnapshot(data: unknown): data is DailySnapshot {
    if (!data || typeof data !== 'object') return false;

    const snapshot = data as Record<string, unknown>;
    return (
      typeof snapshot.date === 'string' &&
      typeof snapshot.privacyScore === 'number' &&
      typeof snapshot.trackersBlocked === 'number' &&
      typeof snapshot.sitesVisited === 'number' &&
      Array.isArray(snapshot.topDomains)
    );
  }

  /**
   * Safely parse and validate stored data
   */
  private static validateStoredData<T>(
    rawData: unknown,
    validator: (data: unknown) => data is T,
    dataType: string
  ): T[] {
    if (!rawData) return [];

    if (!Array.isArray(rawData)) {
      console.warn(`${dataType} data is not an array, resetting:`, {
        type: typeof rawData,
        value: rawData,
      });
      return [];
    }

    const validItems: T[] = [];
    const invalidItems: unknown[] = [];

    for (const item of rawData) {
      if (validator(item)) {
        validItems.push(item);
      } else {
        invalidItems.push(item);
      }
    }

    if (invalidItems.length > 0) {
      console.warn(
        `Found ${invalidItems.length} invalid ${dataType} items, removing:`,
        invalidItems
      );
    }

    return validItems;
  }

  /**
   * Store a daily snapshot
   */
  static async storeDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    try {
      const result = await chrome.storage.local.get(
        ReportsStorage.DAILY_SNAPSHOTS_KEY
      );
      const rawSnapshots = result[ReportsStorage.DAILY_SNAPSHOTS_KEY];

      // Validate and clean existing data
      const snapshots = ReportsStorage.validateStoredData(
        rawSnapshots,
        ReportsStorage.isValidDailySnapshot,
        'daily snapshots'
      );

      // Remove existing snapshot for the same date
      const filteredSnapshots = snapshots.filter(
        (s: DailySnapshot) => s.date !== snapshot.date
      );

      filteredSnapshots.push(snapshot);

      // Keep only last 90 days
      filteredSnapshots.sort(
        (a: DailySnapshot, b: DailySnapshot) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      if (filteredSnapshots.length > 90) {
        filteredSnapshots.splice(0, filteredSnapshots.length - 90);
      }

      await chrome.storage.local.set({
        [ReportsStorage.DAILY_SNAPSHOTS_KEY]: filteredSnapshots,
      });
    } catch (error) {
      console.error('Failed to store daily snapshot:', error);
      throw new Error('Failed to store daily snapshot');
    }
  }

  /**
   * Get daily snapshots
   */
  static async getDailySnapshots(days: number = 30): Promise<DailySnapshot[]> {
    try {
      const result = await chrome.storage.local.get(
        ReportsStorage.DAILY_SNAPSHOTS_KEY
      );
      const rawSnapshots = result[ReportsStorage.DAILY_SNAPSHOTS_KEY];

      // Validate and clean existing data
      const snapshots = ReportsStorage.validateStoredData(
        rawSnapshots,
        ReportsStorage.isValidDailySnapshot,
        'daily snapshots'
      );

      // If we found invalid data, update storage with cleaned data
      if (
        rawSnapshots &&
        (!Array.isArray(rawSnapshots) ||
          rawSnapshots.length !== snapshots.length)
      ) {
        await chrome.storage.local.set({
          [ReportsStorage.DAILY_SNAPSHOTS_KEY]: snapshots,
        });
      }

      // Sort by date (newest first) and limit
      return snapshots
        .sort(
          (a: DailySnapshot, b: DailySnapshot) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, days);
    } catch (error) {
      console.error('Failed to get daily snapshots:', error);
      return [];
    }
  }

  /**
   * Store a weekly report
   */
  static async storeWeeklyReport(report: WeeklyReport): Promise<void> {
    try {
      const result = await chrome.storage.local.get(
        ReportsStorage.WEEKLY_REPORTS_KEY
      );
      const rawReports = result[ReportsStorage.WEEKLY_REPORTS_KEY];

      // Validate and clean existing data
      const reports = ReportsStorage.validateStoredData(
        rawReports,
        ReportsStorage.isValidWeeklyReport,
        'weekly reports'
      );

      // Remove existing report for the same week
      const filteredReports = reports.filter(
        (r: WeeklyReport) => r.weekStart !== report.weekStart
      );

      filteredReports.push(report);

      // Keep only last 52 weeks (1 year)
      filteredReports.sort(
        (a: WeeklyReport, b: WeeklyReport) =>
          new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );

      if (filteredReports.length > 52) {
        filteredReports.splice(0, filteredReports.length - 52);
      }

      await chrome.storage.local.set({
        [ReportsStorage.WEEKLY_REPORTS_KEY]: filteredReports,
      });
    } catch (error) {
      console.error('Failed to store weekly report:', error);
      throw new Error('Failed to store weekly report');
    }
  }

  /**
   * Get weekly reports
   */
  static async getWeeklyReports(weeks: number = 12): Promise<WeeklyReport[]> {
    try {
      const result = await chrome.storage.local.get(
        ReportsStorage.WEEKLY_REPORTS_KEY
      );
      const rawReports = result[ReportsStorage.WEEKLY_REPORTS_KEY];

      // Validate and clean existing data
      const reports = ReportsStorage.validateStoredData(
        rawReports,
        ReportsStorage.isValidWeeklyReport,
        'weekly reports'
      );

      // If we found invalid data, update storage with cleaned data
      if (
        rawReports &&
        (!Array.isArray(rawReports) || rawReports.length !== reports.length)
      ) {
        await chrome.storage.local.set({
          [ReportsStorage.WEEKLY_REPORTS_KEY]: reports,
        });
      }

      // Sort by week start (newest first) and limit
      return reports
        .sort(
          (a: WeeklyReport, b: WeeklyReport) =>
            new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
        )
        .slice(0, weeks);
    } catch (error) {
      console.error('Failed to get weekly reports:', error);
      return [];
    }
  }

  /**
   * Clean up corrupted data and migrate to new format if needed
   */
  static async migrateAndCleanData(): Promise<void> {
    try {
      console.log('Starting data migration and cleanup...');

      // Clean daily snapshots
      const dailyResult = await chrome.storage.local.get(
        ReportsStorage.DAILY_SNAPSHOTS_KEY
      );
      const cleanedDaily = ReportsStorage.validateStoredData(
        dailyResult[ReportsStorage.DAILY_SNAPSHOTS_KEY],
        ReportsStorage.isValidDailySnapshot,
        'daily snapshots'
      );

      // Clean weekly reports
      const weeklyResult = await chrome.storage.local.get(
        ReportsStorage.WEEKLY_REPORTS_KEY
      );
      const cleanedWeekly = ReportsStorage.validateStoredData(
        weeklyResult[ReportsStorage.WEEKLY_REPORTS_KEY],
        ReportsStorage.isValidWeeklyReport,
        'weekly reports'
      );

      // Update storage with cleaned data
      await chrome.storage.local.set({
        [ReportsStorage.DAILY_SNAPSHOTS_KEY]: cleanedDaily,
        [ReportsStorage.WEEKLY_REPORTS_KEY]: cleanedWeekly,
      });

      console.log('Data migration and cleanup completed successfully');
    } catch (error) {
      console.error('Failed to migrate and clean data:', error);
    }
  }
}
