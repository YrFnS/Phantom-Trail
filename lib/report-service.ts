import { format, startOfWeek } from 'date-fns';
import { PrivacyTrends } from './privacy-trends';
import { ReportsStorage } from './storage/reports-storage';
import { shouldCaptureCurrentReport } from './report-policy.mts';
import type { DailySnapshot, WeeklyReport } from './types';

export type ReportRunSource = 'alarm' | 'manual' | 'startup' | 'view';
export type ReportKind = 'daily' | 'weekly';

export interface ReportRunRecord {
  kind: ReportKind;
  source: ReportRunSource;
  completedAt: number;
  period: string;
  status: 'success' | 'error';
  error?: string;
}

export interface ReportLifecycleStatus {
  version: 1;
  lastDailyRun?: ReportRunRecord;
  lastWeeklyRun?: ReportRunRecord;
}

export interface ReportOverview {
  latestDaily: DailySnapshot | null;
  latestWeekly: WeeklyReport | null;
  status: ReportLifecycleStatus;
}

const STATUS_KEY = 'phantom_trail_report_lifecycle';
const STATUS_VERSION = 1 as const;

/**
 * Owns the real local report lifecycle used by P4 alarms and the popup.
 * Every generation is idempotent because ReportsStorage replaces an existing
 * item for the same date or week.
 */
export class ReportService {
  static async captureDaily(
    date = new Date(),
    source: ReportRunSource = 'manual'
  ): Promise<DailySnapshot> {
    const period = format(date, 'yyyy-MM-dd');

    try {
      const snapshot = await PrivacyTrends.generateDailySnapshot(date);
      await ReportsStorage.storeDailySnapshot(snapshot);
      await this.recordRun({
        kind: 'daily',
        source,
        completedAt: Date.now(),
        period,
        status: 'success',
      });
      return snapshot;
    } catch (error) {
      await this.recordFailure('daily', source, period, error);
      throw error;
    }
  }

  static async captureWeekly(
    date = new Date(),
    source: ReportRunSource = 'manual'
  ): Promise<WeeklyReport> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const period = format(weekStart, 'yyyy-MM-dd');

    try {
      const report = await PrivacyTrends.generateWeeklyReport(weekStart);
      await ReportsStorage.storeWeeklyReport(report);
      await this.recordRun({
        kind: 'weekly',
        source,
        completedAt: Date.now(),
        period,
        status: 'success',
      });
      return report;
    } catch (error) {
      await this.recordFailure('weekly', source, period, error);
      throw error;
    }
  }

  static async ensureCurrentReports(
    date = new Date(),
    source: ReportRunSource = 'startup',
    refreshExisting = false
  ): Promise<ReportOverview> {
    const today = format(date, 'yyyy-MM-dd');
    const currentWeek = format(
      startOfWeek(date, { weekStartsOn: 1 }),
      'yyyy-MM-dd'
    );
    const [daily, weekly] = await Promise.all([
      ReportsStorage.getDailySnapshots(1),
      ReportsStorage.getWeeklyReports(1),
    ]);

    if (
      shouldCaptureCurrentReport(daily[0]?.date, today, refreshExisting)
    ) {
      await this.captureDaily(date, source);
    }
    if (
      shouldCaptureCurrentReport(
        weekly[0]?.weekStart,
        currentWeek,
        refreshExisting
      )
    ) {
      await this.captureWeekly(date, source);
    }

    return this.getOverview();
  }

  static async getOverview(): Promise<ReportOverview> {
    const [daily, weekly, status] = await Promise.all([
      ReportsStorage.getDailySnapshots(1),
      ReportsStorage.getWeeklyReports(1),
      this.getStatus(),
    ]);

    return {
      latestDaily: daily[0] || null,
      latestWeekly: weekly[0] || null,
      status,
    };
  }

  static async getStatus(): Promise<ReportLifecycleStatus> {
    try {
      const result = await chrome.storage.local.get(STATUS_KEY);
      return this.normalizeStatus(result[STATUS_KEY]);
    } catch {
      return { version: STATUS_VERSION };
    }
  }

  static getStorageKey(): string {
    return STATUS_KEY;
  }

  private static async recordFailure(
    kind: ReportKind,
    source: ReportRunSource,
    period: string,
    error: unknown
  ): Promise<void> {
    await this.recordRun({
      kind,
      source,
      completedAt: Date.now(),
      period,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  private static async recordRun(record: ReportRunRecord): Promise<void> {
    const status = await this.getStatus();
    const next: ReportLifecycleStatus = {
      ...status,
      version: STATUS_VERSION,
      ...(record.kind === 'daily'
        ? { lastDailyRun: record }
        : { lastWeeklyRun: record }),
    };
    await chrome.storage.local.set({ [STATUS_KEY]: next });
  }

  private static normalizeStatus(value: unknown): ReportLifecycleStatus {
    if (!value || typeof value !== 'object') {
      return { version: STATUS_VERSION };
    }

    const candidate = value as Partial<ReportLifecycleStatus>;
    return {
      version: STATUS_VERSION,
      lastDailyRun: this.normalizeRun(candidate.lastDailyRun, 'daily'),
      lastWeeklyRun: this.normalizeRun(candidate.lastWeeklyRun, 'weekly'),
    };
  }

  private static normalizeRun(
    value: unknown,
    kind: ReportKind
  ): ReportRunRecord | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as Partial<ReportRunRecord>;
    if (
      candidate.kind !== kind ||
      (candidate.source !== 'alarm' &&
        candidate.source !== 'manual' &&
        candidate.source !== 'startup' &&
        candidate.source !== 'view') ||
      (candidate.status !== 'success' && candidate.status !== 'error') ||
      typeof candidate.completedAt !== 'number' ||
      !Number.isFinite(candidate.completedAt) ||
      typeof candidate.period !== 'string'
    ) {
      return undefined;
    }

    return {
      kind,
      source: candidate.source,
      status: candidate.status,
      completedAt: candidate.completedAt,
      period: candidate.period,
      error:
        typeof candidate.error === 'string' ? candidate.error : undefined,
    };
  }
}
