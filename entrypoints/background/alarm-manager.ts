export class AlarmManager {
  static readonly CLEANUP_ALARM = 'cleanup-old-events';

  static initialize(): void {
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    void this.setupAlarms();
    console.log('[Phantom Trail] Retention alarm manager initialized');
  }

  private static async setupAlarms(): Promise<void> {
    // P3 keeps only the source-backed retention alarm. Daily summaries and
    // snapshots remain P4 work and no longer create placeholder alarms.
    await chrome.alarms.create(this.CLEANUP_ALARM, {
      delayInMinutes: 1,
      periodInMinutes: 24 * 60,
    });
    await Promise.allSettled([
      chrome.alarms.clear('daily-privacy-summary'),
      chrome.alarms.clear('daily-snapshot'),
    ]);
  }

  private static async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (alarm.name !== this.CLEANUP_ALARM) return;

    try {
      const { EventsStorage } = await import(
        '../../lib/storage/events-storage'
      );
      const result = await EventsStorage.reapplyProtectionPolicy();
      console.log(
        `[Phantom Trail] Retention cleanup removed ${result.removedByRetention} rows; ${result.remainingRows} remain under the ${result.retentionDays}-day policy`
      );
    } catch (error) {
      console.error('[Phantom Trail] Retention cleanup failed:', error);
    }
  }
}
