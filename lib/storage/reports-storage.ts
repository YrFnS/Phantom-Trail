import type { DailySnapshot, WeeklyReport } from '../types';

/**
 * Manages daily snapshots and weekly reports storage
 */
export class ReportsStorage {
  private static readonly DAILY_SNAPSHOTS_KEY = 'phantom_trail_daily_snapshots';
  private static readonly WEEKLY_REPORTS_KEY = 'phantom_trail_weekly_reports';

  /**
   * Store a daily snapshot
   */
  static async storeDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.DAILY_SNAPSHOTS_KEY);
      const snapshots = result[this.DAILY_SNAPSHOTS_KEY] || [];
      
      // Remove existing snapshot for the same date
      const filteredSnapshots = snapshots.filter(
        (s: DailySnapshot) => s.date !== snapshot.date
      );
      
      filteredSnapshots.push(snapshot);
      
      // Keep only last 90 days
      filteredSnapshots.sort((a: DailySnapshot, b: DailySnapshot) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      if (filteredSnapshots.length > 90) {
        filteredSnapshots.splice(0, filteredSnapshots.length - 90);
      }
      
      await chrome.storage.local.set({
        [this.DAILY_SNAPSHOTS_KEY]: filteredSnapshots,
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
      const result = await chrome.storage.local.get(this.DAILY_SNAPSHOTS_KEY);
      const snapshots = result[this.DAILY_SNAPSHOTS_KEY] || [];
      
      // Sort by date (newest first) and limit
      return snapshots
        .sort((a: DailySnapshot, b: DailySnapshot) => 
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
      const result = await chrome.storage.local.get(this.WEEKLY_REPORTS_KEY);
      const reports = result[this.WEEKLY_REPORTS_KEY] || [];
      
      // Remove existing report for the same week
      const filteredReports = reports.filter(
        (r: WeeklyReport) => r.weekStart !== report.weekStart
      );
      
      filteredReports.push(report);
      
      // Keep only last 52 weeks (1 year)
      filteredReports.sort((a: WeeklyReport, b: WeeklyReport) => 
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );
      
      if (filteredReports.length > 52) {
        filteredReports.splice(0, filteredReports.length - 52);
      }
      
      await chrome.storage.local.set({
        [this.WEEKLY_REPORTS_KEY]: filteredReports,
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
      const result = await chrome.storage.local.get(this.WEEKLY_REPORTS_KEY);
      const reports = result[this.WEEKLY_REPORTS_KEY] || [];
      
      // Sort by week start (newest first) and limit
      return reports
        .sort((a: WeeklyReport, b: WeeklyReport) => 
          new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
        )
        .slice(0, weeks);
    } catch (error) {
      console.error('Failed to get weekly reports:', error);
      return [];
    }
  }
}
