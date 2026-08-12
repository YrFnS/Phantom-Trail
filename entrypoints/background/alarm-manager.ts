import {
  getNextDailyRun,
  getNextWeeklyRun,
  isRetiredFeatureAlarm,
  REPORT_ALARMS,
} from '../../lib/report-schedule.mts';
import {
  getCompletedDailyReportDate,
  getCompletedWeeklyReportDate,
} from '../../lib/report-policy.mts';

export class AlarmManager {
  static initialize(): void {
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    void this.setupAlarms();
    console.log('[Phantom Trail] Retention and local-report alarms initialized');
  }

  static async setupAlarms(): Promise<void> {
    await Promise.all([
      chrome.alarms.create(REPORT_ALARMS.cleanup, {
        delayInMinutes: 1,
        periodInMinutes: 24 * 60,
      }),
      chrome.alarms.create(REPORT_ALARMS.daily, {
        when: getNextDailyRun(),
        periodInMinutes: 24 * 60,
      }),
      chrome.alarms.create(REPORT_ALARMS.weekly, {
        when: getNextWeeklyRun(),
        periodInMinutes: 7 * 24 * 60,
      }),
    ]);

    const alarms = await chrome.alarms.getAll();
    await Promise.allSettled(
      alarms
        .filter(alarm => isRetiredFeatureAlarm(alarm.name))
        .map(alarm => chrome.alarms.clear(alarm.name))
    );
  }

  static async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    try {
      switch (alarm.name) {
        case REPORT_ALARMS.cleanup:
          await this.cleanupEvents();
          return;
        case REPORT_ALARMS.daily:
          await this.captureDailyReport();
          return;
        case REPORT_ALARMS.weekly:
          await this.captureWeeklyReport();
          return;
        default:
          if (isRetiredFeatureAlarm(alarm.name)) {
            await chrome.alarms.clear(alarm.name);
          }
      }
    } catch (error) {
      console.error(
        `[Phantom Trail] Alarm ${alarm.name} failed:`,
        error
      );
    }
  }

  private static async cleanupEvents(): Promise<void> {
    const { EventsStorage } = await import(
      '../../lib/storage/events-storage'
    );
    const result = await EventsStorage.reapplyProtectionPolicy();
    console.log(
      `[Phantom Trail] Retention cleanup removed ${result.removedByRetention} rows; ${result.remainingRows} remain under the ${result.retentionDays}-day policy`
    );
  }

  private static async captureDailyReport(): Promise<void> {
    const [{ ReportService }, { NotificationManager }] = await Promise.all([
      import('../../lib/report-service'),
      import('../../lib/notification-manager'),
    ]);
    const snapshot = await ReportService.captureDaily(
      getCompletedDailyReportDate(),
      'alarm'
    );
    await NotificationManager.showDailySummary(snapshot);
  }

  private static async captureWeeklyReport(): Promise<void> {
    const { ReportService } = await import('../../lib/report-service');
    await ReportService.captureWeekly(
      getCompletedWeeklyReportDate(),
      'alarm'
    );
  }
}
