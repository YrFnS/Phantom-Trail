export class AlarmManager {
  static initialize(): void {
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    this.setupAlarms();
    console.log('[Phantom Trail] Alarm manager initialized');
  }

  private static setupAlarms(): void {
    // Clean up old events daily
    chrome.alarms.create('cleanup-old-events', {
      delayInMinutes: 1,
      periodInMinutes: 24 * 60, // Daily
    });

    // Daily privacy summary
    chrome.alarms.create('daily-privacy-summary', {
      delayInMinutes: 60,
      periodInMinutes: 24 * 60, // Daily
    });

    // Daily snapshot for trends
    chrome.alarms.create('daily-snapshot', {
      delayInMinutes: 30,
      periodInMinutes: 24 * 60, // Daily
    });
  }

  private static async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    try {
      switch (alarm.name) {
        case 'cleanup-old-events':
          await this.cleanupOldEvents();
          break;
        case 'daily-privacy-summary':
          await this.generateDailySummary();
          break;
        case 'daily-snapshot':
          await this.takeDailySnapshot();
          break;
        default:
          console.warn('[Alarm Manager] Unknown alarm:', alarm.name);
      }
    } catch (error) {
      console.error('[Alarm Manager] Alarm handling failed:', error);
    }
  }

  private static async cleanupOldEvents(): Promise<void> {
    const { EventsStorage } = await import('../../lib/storage/events-storage');
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days

    const events = await EventsStorage.getTrackingEvents();
    const filtered = events.filter(event => event.timestamp > cutoff);

    await EventsStorage.setTrackingEvents(filtered);
    console.log(
      `[Alarm Manager] Cleaned up ${events.length - filtered.length} old events`
    );
  }

  private static async generateDailySummary(): Promise<void> {
    // Future: Generate daily privacy summary
    console.log('[Alarm Manager] Daily summary generated');
  }

  private static async takeDailySnapshot(): Promise<void> {
    // Future: Take daily snapshot for trends
    console.log('[Alarm Manager] Daily snapshot taken');
  }
}
