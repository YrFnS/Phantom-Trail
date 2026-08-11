import { repairReportCollection } from '../report-policy.mts';
import type {
  DailySnapshot,
  EvidenceCoverageConfidence,
  EvidenceScoreStatus,
  RiskLevel,
  TrackerType,
  WeeklyReport,
} from '../types';

/**
 * Stores evidence-index snapshots and weekly aggregations.
 * P2 preserves explicit N/A values instead of rejecting or converting them.
 */
export class ReportsStorage {
  private static readonly DAILY_SNAPSHOTS_KEY =
    'phantom_trail_daily_snapshots';
  private static readonly WEEKLY_REPORTS_KEY = 'phantom_trail_weekly_reports';

  static async storeDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    try {
      const snapshots = await this.readDailySnapshots();
      const filtered = snapshots.filter(item => item.date !== snapshot.date);
      filtered.push(this.normalizeDailySnapshot(snapshot));
      filtered.sort(
        (first, second) =>
          new Date(first.date).getTime() - new Date(second.date).getTime()
      );

      await chrome.storage.local.set({
        [this.DAILY_SNAPSHOTS_KEY]: filtered.slice(-90),
      });
    } catch (error) {
      console.error('Failed to store daily evidence snapshot:', error);
      throw new Error('Failed to store daily evidence snapshot');
    }
  }

  static async getDailySnapshots(days: number = 30): Promise<DailySnapshot[]> {
    try {
      return (await this.readDailySnapshots())
        .sort(
          (first, second) =>
            new Date(second.date).getTime() - new Date(first.date).getTime()
        )
        .slice(0, days);
    } catch (error) {
      console.error('Failed to get daily evidence snapshots:', error);
      return [];
    }
  }

  static async storeWeeklyReport(report: WeeklyReport): Promise<void> {
    try {
      const reports = await this.readWeeklyReports();
      const filtered = reports.filter(
        item => item.weekStart !== report.weekStart
      );
      filtered.push(this.normalizeWeeklyReport(report));
      filtered.sort(
        (first, second) =>
          new Date(first.weekStart).getTime() -
          new Date(second.weekStart).getTime()
      );

      await chrome.storage.local.set({
        [this.WEEKLY_REPORTS_KEY]: filtered.slice(-52),
      });
    } catch (error) {
      console.error('Failed to store weekly evidence aggregation:', error);
      throw new Error('Failed to store weekly evidence aggregation');
    }
  }

  static async getWeeklyReports(weeks: number = 12): Promise<WeeklyReport[]> {
    try {
      return (await this.readWeeklyReports())
        .sort(
          (first, second) =>
            new Date(second.weekStart).getTime() -
            new Date(first.weekStart).getTime()
        )
        .slice(0, weeks);
    } catch (error) {
      console.error('Failed to get weekly evidence aggregations:', error);
      return [];
    }
  }

  static async migrateAndCleanData(): Promise<void> {
    try {
      const [dailySnapshots, weeklyReports] = await Promise.all([
        this.readDailySnapshots(),
        this.readWeeklyReports(),
      ]);

      await chrome.storage.local.set({
        [this.DAILY_SNAPSHOTS_KEY]: dailySnapshots.slice(-90),
        [this.WEEKLY_REPORTS_KEY]: weeklyReports.slice(-52),
      });
      console.log('Evidence snapshot migration and cleanup completed');
    } catch (error) {
      console.error('Failed to migrate evidence snapshot data:', error);
    }
  }

  private static async readDailySnapshots(): Promise<DailySnapshot[]> {
    const result = await chrome.storage.local.get(this.DAILY_SNAPSHOTS_KEY);
    const raw = result[this.DAILY_SNAPSHOTS_KEY];
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) {
      console.warn('Daily evidence snapshots were not an array; resetting');
      await chrome.storage.local.set({ [this.DAILY_SNAPSHOTS_KEY]: [] });
      return [];
    }

    const repair = repairReportCollection(raw, item =>
      this.tryNormalizeDailySnapshot(item)
    );

    if (repair.changed) {
      this.logRepair('daily evidence snapshot', repair.migrated, repair.removed);
      await chrome.storage.local.set({
        [this.DAILY_SNAPSHOTS_KEY]: repair.items.slice(-90),
      });
    }

    return repair.items;
  }

  private static async readWeeklyReports(): Promise<WeeklyReport[]> {
    const result = await chrome.storage.local.get(this.WEEKLY_REPORTS_KEY);
    const raw = result[this.WEEKLY_REPORTS_KEY];
    if (raw === undefined) return [];
    if (!Array.isArray(raw)) {
      console.warn('Weekly evidence reports were not an array; resetting');
      await chrome.storage.local.set({ [this.WEEKLY_REPORTS_KEY]: [] });
      return [];
    }

    const repair = repairReportCollection(raw, item =>
      this.tryNormalizeWeeklyReport(item)
    );

    if (repair.changed) {
      this.logRepair('weekly evidence report', repair.migrated, repair.removed);
      await chrome.storage.local.set({
        [this.WEEKLY_REPORTS_KEY]: repair.items.slice(-52),
      });
    }

    return repair.items;
  }

  private static tryNormalizeDailySnapshot(
    value: unknown
  ): DailySnapshot | null {
    if (!value || typeof value !== 'object') return null;
    const snapshot = value as Record<string, unknown>;
    if (typeof snapshot.date !== 'string') return null;

    const privacyScore = this.toNullableNumber(snapshot.privacyScore);
    if (privacyScore === undefined) return null;
    const topDomains = this.normalizeTopDomains(snapshot.topDomains);
    const eventCounts = this.normalizeEventCounts(snapshot.eventCounts);

    // A legacy snapshot can still carry a numeric score without event counts.
    // Preserve it as low-confidence historical context; do not synthesize a
    // numeric value when the stored score is missing.
    const scoreStatus = this.normalizeScoreStatus(
      snapshot.scoreStatus,
      privacyScore
    );
    const scoreConfidence = this.normalizeScoreConfidence(
      snapshot.scoreConfidence,
      scoreStatus
    );

    return {
      date: snapshot.date,
      privacyScore,
      scoreStatus,
      scoreConfidence,
      eventCounts,
      topDomains,
    };
  }

  private static normalizeDailySnapshot(snapshot: DailySnapshot): DailySnapshot {
    return this.tryNormalizeDailySnapshot(snapshot) || {
      date: snapshot.date,
      privacyScore: null,
      scoreStatus: 'insufficient-evidence',
      scoreConfidence: 'none',
      eventCounts: this.emptyEventCounts(),
      topDomains: [],
    };
  }

  private static tryNormalizeWeeklyReport(
    value: unknown
  ): WeeklyReport | null {
    if (!value || typeof value !== 'object') return null;
    const report = value as Record<string, unknown>;
    if (typeof report.weekStart !== 'string') return null;

    const averageScore = this.toNullableNumber(report.averageScore);
    const scoreChange = this.toNullableNumber(report.scoreChange);
    if (averageScore === undefined || scoreChange === undefined) return null;

    return {
      weekStart: report.weekStart,
      averageScore,
      scoreChange,
      newTrackers: this.stringArray(report.newTrackers),
      improvedSites: this.stringArray(report.improvedSites),
      riskySites: this.stringArray(report.riskySites),
    };
  }

  private static normalizeWeeklyReport(report: WeeklyReport): WeeklyReport {
    return this.tryNormalizeWeeklyReport(report) || {
      weekStart: report.weekStart,
      averageScore: null,
      scoreChange: null,
      newTrackers: [],
      improvedSites: [],
      riskySites: [],
    };
  }

  private static normalizeEventCounts(
    value: unknown
  ): DailySnapshot['eventCounts'] {
    if (!value || typeof value !== 'object') return this.emptyEventCounts();
    const counts = value as Record<string, unknown>;
    const byRisk =
      counts.byRisk && typeof counts.byRisk === 'object'
        ? (counts.byRisk as Partial<Record<RiskLevel, unknown>>)
        : {};
    const byType =
      counts.byType && typeof counts.byType === 'object'
        ? (counts.byType as Partial<Record<TrackerType, unknown>>)
        : {};

    return {
      total: this.nonNegativeNumber(counts.total),
      byRisk: {
        low: this.nonNegativeNumber(byRisk.low),
        medium: this.nonNegativeNumber(byRisk.medium),
        high: this.nonNegativeNumber(byRisk.high),
        critical: this.nonNegativeNumber(byRisk.critical),
      },
      byType: {
        advertising: this.nonNegativeNumber(byType.advertising),
        analytics: this.nonNegativeNumber(byType.analytics),
        social: this.nonNegativeNumber(byType.social),
        fingerprinting: this.nonNegativeNumber(byType.fingerprinting),
        cryptomining: this.nonNegativeNumber(byType.cryptomining),
        unknown: this.nonNegativeNumber(byType.unknown),
      },
    };
  }

  private static emptyEventCounts(): DailySnapshot['eventCounts'] {
    return {
      total: 0,
      byRisk: { low: 0, medium: 0, high: 0, critical: 0 },
      byType: {
        advertising: 0,
        analytics: 0,
        social: 0,
        fingerprinting: 0,
        cryptomining: 0,
        unknown: 0,
      },
    };
  }

  private static normalizeTopDomains(
    value: unknown
  ): DailySnapshot['topDomains'] {
    if (!Array.isArray(value)) return [];

    return value.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const entry = item as Record<string, unknown>;
      return typeof entry.domain === 'string'
        ? [
            {
              domain: entry.domain,
              count: this.nonNegativeNumber(entry.count),
            },
          ]
        : [];
    });
  }

  private static normalizeScoreStatus(
    value: unknown,
    privacyScore: number | null
  ): EvidenceScoreStatus {
    if (value === 'estimated' || value === 'insufficient-evidence') return value;
    return privacyScore === null ? 'insufficient-evidence' : 'estimated';
  }

  private static normalizeScoreConfidence(
    value: unknown,
    status: EvidenceScoreStatus
  ): EvidenceCoverageConfidence {
    if (
      value === 'none' ||
      value === 'low' ||
      value === 'medium' ||
      value === 'high'
    ) {
      return status === 'insufficient-evidence' ? 'none' : value;
    }
    return status === 'insufficient-evidence' ? 'none' : 'low';
  }

  private static toNullableNumber(value: unknown): number | null | undefined {
    if (value === null) return null;
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private static nonNegativeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : 0;
  }

  private static stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private static logRepair(
    label: string,
    migrated: number,
    removed: number
  ): void {
    if (removed > 0) {
      console.warn(
        `[Phantom Trail] Removed ${removed} invalid ${label} item(s)${
          migrated > 0 ? ` and normalized ${migrated} legacy item(s)` : ''
        }`
      );
      return;
    }

    if (migrated > 0) {
      console.info(
        `[Phantom Trail] Normalized ${migrated} legacy ${label} item(s)`
      );
    }
  }
}
