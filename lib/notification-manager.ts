import type { TrackingEvent, PrivacyScore, NotificationSettings } from './types';
import { StorageManager } from './storage-manager';

/**
 * Manages browser notifications for privacy alerts and summaries
 */
export class NotificationManager {
  private static readonly NOTIFICATION_THROTTLE_MS = 1200000; // 20 minutes
  private static readonly MAX_NOTIFICATIONS_PER_HOUR = 3;
  private static recentNotifications = new Map<string, number>();

  /**
   * Show privacy alert notification for critical tracking events
   */
  static async showPrivacyAlert(event: TrackingEvent): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (!settings.enabled) return;

      // Check if we should show this notification
      if (!this.shouldShowNotification(event, settings)) return;

      // Check quiet hours
      if (this.isQuietHours(settings)) return;

      // Throttle notifications
      if (this.isThrottled(event.domain)) return;

      const { title, message, iconUrl } = this.formatPrivacyAlert(event);

      await chrome.notifications.create({
        type: 'basic',
        iconUrl,
        title,
        message,
        contextMessage: `Phantom Trail • ${new Date().toLocaleTimeString()}`,
        buttons: [
          { title: 'View Details' },
          { title: 'Dismiss' }
        ]
      });

      // Track notification
      this.trackNotification(event.domain);
      
      console.log('Privacy alert notification shown:', event.domain, event.trackerType);
    } catch (error) {
      console.error('Failed to show privacy alert:', error);
    }
  }

  /**
   * Show daily privacy summary notification
   */
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
        contextMessage: 'Phantom Trail • Daily Summary'
      });

      console.log('Daily summary notification shown:', score.grade, score.score);
    } catch (error) {
      console.error('Failed to show daily summary:', error);
    }
  }

  /**
   * Check if notifications are enabled
   */
  static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.enabled;
  }

  /**
   * Update notification settings
   */
  static async updateSettings(settings: NotificationSettings): Promise<void> {
    try {
      const currentSettings = await StorageManager.getSettings();
      await StorageManager.saveSettings({
        ...currentSettings,
        notifications: settings
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }

  /**
   * Get current notification settings
   */
  private static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await StorageManager.getSettings();
      return settings.notifications || {
        enabled: true,
        criticalOnly: false,
        dailySummary: true,
        weeklyReport: false,
        quietHours: { start: '22:00', end: '08:00' }
      };
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return {
        enabled: false,
        criticalOnly: true,
        dailySummary: false,
        weeklyReport: false,
        quietHours: { start: '22:00', end: '08:00' }
      };
    }
  }

  /**
   * Check if we should show notification based on settings and event
   */
  private static shouldShowNotification(
    event: TrackingEvent,
    settings: NotificationSettings
  ): boolean {
    if (settings.criticalOnly) {
      return event.riskLevel === 'critical';
    }
    return event.riskLevel === 'critical' || event.riskLevel === 'high';
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isQuietHours(settings: NotificationSettings): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 100 + startMin;
    const endTime = endHour * 100 + endMin;

    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Quiet hours within same day
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Check if notifications for this domain are throttled
   */
  private static isThrottled(domain: string): boolean {
    const now = Date.now();
    const lastNotification = this.recentNotifications.get(domain) || 0;
    
    if (now - lastNotification < this.NOTIFICATION_THROTTLE_MS) {
      return true;
    }

    // Check hourly limit
    const hourAgo = now - 3600000;
    let recentCount = 0;
    for (const timestamp of this.recentNotifications.values()) {
      if (timestamp > hourAgo) recentCount++;
    }

    return recentCount >= this.MAX_NOTIFICATIONS_PER_HOUR;
  }

  /**
   * Track notification for throttling
   */
  private static trackNotification(domain: string): void {
    const now = Date.now();
    this.recentNotifications.set(domain, now);

    // Clean up old entries
    if (this.recentNotifications.size > 50) {
      const cutoff = now - this.NOTIFICATION_THROTTLE_MS * 2;
      for (const [key, timestamp] of this.recentNotifications.entries()) {
        if (timestamp < cutoff) {
          this.recentNotifications.delete(key);
        }
      }
    }
  }

  /**
   * Format privacy alert notification
   */
  private static formatPrivacyAlert(event: TrackingEvent): {
    title: string;
    message: string;
    iconUrl: string;
  } {
    const riskEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '📊',
      low: 'ℹ️'
    };

    const typeDescriptions = {
      fingerprinting: 'fingerprinting your device',
      advertising: 'tracking for ads',
      analytics: 'collecting analytics',
      social: 'social media tracking',
      cryptomining: 'using your device for mining',
      unknown: 'tracking your activity'
    };

    const title = event.riskLevel === 'critical' 
      ? `${riskEmoji[event.riskLevel]} Privacy Alert`
      : `${riskEmoji[event.riskLevel]} Tracking Alert`;

    const action = typeDescriptions[event.trackerType] || 'tracking your activity';
    const message = `${event.domain} is ${action}`;

    return {
      title,
      message,
      iconUrl: '/icon/icon-48.png'
    };
  }

  /**
   * Format daily summary notification
   */
  private static formatDailySummary(score: PrivacyScore): {
    title: string;
    message: string;
  } {
    const gradeEmoji = {
      A: '🛡️',
      B: '✅',
      C: '⚠️',
      D: '🔶',
      F: '🚨'
    };

    const title = `${gradeEmoji[score.grade]} Privacy Summary`;
    const message = `Your privacy score: ${score.grade} (${score.score}/100). ${score.breakdown.totalTrackers} trackers detected today.`;

    return { title, message };
  }
}
