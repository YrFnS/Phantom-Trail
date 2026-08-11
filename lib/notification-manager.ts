import type {
  TrackingEvent,
  PrivacyScore,
  NotificationSettings,
} from './types';
import { SettingsStorage } from './storage/settings-storage';
import { getDisplayDomain } from './event-attribution.mts';

/**
 * Notification utility retained for incomplete notification workflows.
 * Messages describe recorded detector evidence and never present N/A as zero.
 */
export class NotificationManager {
  private static readonly NOTIFICATION_THROTTLE_MS = 1200000;
  private static readonly MAX_NOTIFICATIONS_PER_HOUR = 3;
  private static recentNotifications = new Map<string, number>();

  static async showPrivacyAlert(event: TrackingEvent): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) return;
      if (!this.shouldShowNotification(event, settings)) return;
      if (this.isQuietHours(settings)) return;

      const domain = getDisplayDomain(event) || 'unknown domain';
      if (this.isThrottled(domain)) return;

      const { title, message, iconUrl } = this.formatDetectorAlert(event);
      await chrome.notifications.create({
        type: 'basic',
        iconUrl,
        title,
        message,
        contextMessage: `Phantom Trail • ${new Date().toLocaleTimeString()}`,
        buttons: [{ title: 'View Evidence' }, { title: 'Dismiss' }],
      });
      this.trackNotification(domain);
    } catch (error) {
      console.error('Failed to show detector notification:', error);
    }
  }

  static async showDailySummary(score: PrivacyScore): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled || !settings.dailySummary) return;
      if (this.isQuietHours(settings)) return;

      const { title, message } = this.formatDailySummary(score);
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/icon-48.png',
        title,
        message,
        contextMessage: 'Phantom Trail • Experimental Summary',
      });
    } catch (error) {
      console.error('Failed to show daily evidence summary:', error);
    }
  }

  static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.enabled;
  }

  static async updateSettings(settings: NotificationSettings): Promise<void> {
    try {
      const currentSettings = await SettingsStorage.getSettings();
      await SettingsStorage.saveSettings({
        ...currentSettings,
        notifications: settings,
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  private static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await SettingsStorage.getSettings();
      return (
        settings.notifications || {
          enabled: false,
          criticalOnly: true,
          dailySummary: false,
          weeklyReport: false,
          quietHours: { start: '22:00', end: '08:00' },
        }
      );
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return {
        enabled: false,
        criticalOnly: true,
        dailySummary: false,
        weeklyReport: false,
        quietHours: { start: '22:00', end: '08:00' },
      };
    }
  }

  private static shouldShowNotification(
    event: TrackingEvent,
    settings: NotificationSettings
  ): boolean {
    if (settings.criticalOnly) return event.riskLevel === 'critical';
    return event.riskLevel === 'critical' || event.riskLevel === 'high';
  }

  private static isQuietHours(settings: NotificationSettings): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const [startHour, startMin] = settings.quietHours.start
      .split(':')
      .map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;

    return startTime > endTime
      ? currentTime >= startTime || currentTime <= endTime
      : currentTime >= startTime && currentTime <= endTime;
  }

  private static isThrottled(domain: string): boolean {
    const now = Date.now();
    const lastNotification = this.recentNotifications.get(domain) || 0;
    if (now - lastNotification < this.NOTIFICATION_THROTTLE_MS) return true;

    const hourAgo = now - 3600000;
    let recentCount = 0;
    for (const timestamp of this.recentNotifications.values()) {
      if (timestamp > hourAgo) recentCount += 1;
    }
    return recentCount >= this.MAX_NOTIFICATIONS_PER_HOUR;
  }

  private static trackNotification(domain: string): void {
    const now = Date.now();
    this.recentNotifications.set(domain, now);

    if (this.recentNotifications.size > 50) {
      const cutoff = now - this.NOTIFICATION_THROTTLE_MS * 2;
      for (const [key, timestamp] of this.recentNotifications.entries()) {
        if (timestamp < cutoff) this.recentNotifications.delete(key);
      }
    }
  }

  private static formatDetectorAlert(event: TrackingEvent): {
    title: string;
    message: string;
    iconUrl: string;
  } {
    const symbol =
      event.riskLevel === 'critical'
        ? '🚨'
        : event.riskLevel === 'high'
          ? '⚠️'
          : 'ℹ️';
    const domain = getDisplayDomain(event) || 'unknown domain';
    const confidence = event.detector?.confidence || 'unknown';

    return {
      title: `${symbol} Experimental Detector Signal`,
      message: `${domain}: ${event.description} Detector confidence: ${confidence}. This is not proof of data collection or a security incident.`,
      iconUrl: '/icon/icon-48.png',
    };
  }

  private static formatDailySummary(score: PrivacyScore): {
    title: string;
    message: string;
  } {
    if (score.status !== 'estimated' || score.score === null) {
      return {
        title: 'Phantom Trail — Evidence Index N/A',
        message: `${score.breakdown.observedRows} rows were observed, but none formed score-qualified evidence units. This is not a favorable privacy result.`,
      };
    }

    return {
      title: `Phantom Trail — Model Band ${score.grade}`,
      message: `Experimental evidence index ${score.score}/100 with ${score.confidence} coverage confidence. ${score.breakdown.evidenceUnits} evidence units contributed. This is not a verified privacy rating.`,
    };
  }
}
