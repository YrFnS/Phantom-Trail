import type {
  DailySnapshot,
  NotificationSettings,
  TrackingEvent,
} from './types';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  isWithinQuietHours,
  normalizeNotificationSettings,
  shouldNotifyForEvent,
} from './notification-policy.mts';
import { SettingsStorage } from './storage/settings-storage';
import { getDisplayDomain } from './event-attribution.mts';

export interface NotificationCapability {
  permissionGranted: boolean;
  settings: NotificationSettings;
}

const THROTTLE_KEY = 'phantom_trail_notification_throttle';
const NOTIFICATION_PREFIX = 'phantom-trail-evidence';

/**
 * Optional, user-authorized evidence alerts.
 *
 * No alert is attempted until both the optional browser permission and explicit
 * settings are enabled. Alerts describe score-qualified recorded evidence only;
 * they are not incident, collection, or website-safety verdicts.
 */
export class NotificationManager {
  private static readonly NOTIFICATION_THROTTLE_MS = 20 * 60 * 1000;
  private static readonly MAX_NOTIFICATIONS_PER_HOUR = 3;
  private static listenerInitialized = false;

  static initialize(): void {
    if (this.listenerInitialized || !chrome.notifications?.onClicked) return;
    this.listenerInitialized = true;
    chrome.notifications.onClicked.addListener(notificationId => {
      if (!notificationId.startsWith(NOTIFICATION_PREFIX)) return;
      void chrome.action.openPopup().catch(() => undefined);
      void chrome.notifications.clear(notificationId).catch(() => undefined);
    });
  }

  static async getCapability(): Promise<NotificationCapability> {
    const [permissionGranted, settings] = await Promise.all([
      this.hasPermission(),
      this.getSettings(),
    ]);
    return { permissionGranted, settings };
  }

  static async hasPermission(): Promise<boolean> {
    try {
      return await chrome.permissions.contains({
        permissions: ['notifications'],
      });
    } catch {
      return false;
    }
  }

  static async requestPermission(): Promise<boolean> {
    try {
      return await chrome.permissions.request({
        permissions: ['notifications'],
      });
    } catch (error) {
      console.warn('Notification permission request failed:', error);
      return false;
    }
  }

  static async revokePermission(): Promise<boolean> {
    const disabled = {
      ...(await this.getSettings()),
      enabled: false,
      dailySummary: false,
      weeklyReport: false,
    };
    await this.updateSettings(disabled, { requirePermission: false });
    try {
      return await chrome.permissions.remove({
        permissions: ['notifications'],
      });
    } catch (error) {
      console.warn('Notification permission revoke failed:', error);
      return false;
    }
  }

  static async showEvidenceAlert(event: TrackingEvent): Promise<boolean> {
    try {
      const [permissionGranted, settings] = await Promise.all([
        this.hasPermission(),
        this.getSettings(),
      ]);
      if (!permissionGranted || !shouldNotifyForEvent(event, settings)) {
        return false;
      }
      if (isWithinQuietHours(settings)) return false;

      const domain = getDisplayDomain(event) || 'unknown domain';
      const throttle = await this.getThrottleState();
      if (this.isThrottled(domain, throttle)) return false;

      const notificationId = `${NOTIFICATION_PREFIX}-${event.id}`.slice(0, 120);
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '/icon/icon-48.png',
        title:
          event.riskLevel === 'critical'
            ? 'Critical-label evidence recorded'
            : 'High-label evidence recorded',
        message: `${domain}: ${event.description} This is not proof of collection, an attack, or website danger.`,
        contextMessage: `Detector confidence: ${event.detector?.confidence || 'unknown'}`,
        priority: event.riskLevel === 'critical' ? 2 : 1,
      });
      await this.trackNotification(domain, throttle);
      return true;
    } catch (error) {
      console.error('Failed to show evidence notification:', error);
      return false;
    }
  }

  static async showDailySummary(snapshot: DailySnapshot): Promise<boolean> {
    try {
      const [permissionGranted, settings] = await Promise.all([
        this.hasPermission(),
        this.getSettings(),
      ]);
      if (
        !permissionGranted ||
        !settings.enabled ||
        !settings.dailySummary ||
        isWithinQuietHours(settings)
      ) {
        return false;
      }

      const value =
        snapshot.scoreStatus === 'estimated' && snapshot.privacyScore !== null
          ? `${snapshot.privacyScore}/100 (${snapshot.scoreConfidence || 'low'} coverage)`
          : 'N/A — insufficient score-qualified evidence';
      await chrome.notifications.create(
        `${NOTIFICATION_PREFIX}-daily-${snapshot.date}`,
        {
          type: 'basic',
          iconUrl: '/icon/icon-48.png',
          title: `Daily local evidence summary — ${snapshot.date}`,
          message: `${value}. ${snapshot.eventCounts.total} recorded occurrences. This is not a verified privacy or safety rating.`,
          contextMessage: 'Generated from the stored local daily snapshot',
        }
      );
      return true;
    } catch (error) {
      console.error('Failed to show daily evidence summary:', error);
      return false;
    }
  }

  static async showTestNotification(): Promise<boolean> {
    if (!(await this.hasPermission())) return false;
    try {
      await chrome.notifications.create(`${NOTIFICATION_PREFIX}-test`, {
        type: 'basic',
        iconUrl: '/icon/icon-48.png',
        title: 'Phantom Trail evidence alerts enabled',
        message:
          'Future alerts remain throttled, respect quiet hours, and describe qualifying detector evidence—not verified incidents.',
      });
      return true;
    } catch (error) {
      console.error('Failed to show test notification:', error);
      return false;
    }
  }

  static async isEnabled(): Promise<boolean> {
    const capability = await this.getCapability();
    return capability.permissionGranted && capability.settings.enabled;
  }

  static async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await SettingsStorage.getSettings();
      return normalizeNotificationSettings(settings.notifications);
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  }

  static async updateSettings(
    settings: NotificationSettings,
    options: { requirePermission?: boolean } = {}
  ): Promise<NotificationSettings> {
    const normalized = normalizeNotificationSettings(settings);
    const requirePermission = options.requirePermission !== false;
    if (
      normalized.enabled &&
      requirePermission &&
      !(await this.hasPermission())
    ) {
      throw new Error(
        'Browser notification permission must be granted before alerts can be enabled.'
      );
    }

    const current = await SettingsStorage.getSettings();
    await SettingsStorage.saveSettings({
      ...current,
      enableNotifications: normalized.enabled,
      notifications: normalized,
    });
    return normalized;
  }

  private static isThrottled(
    domain: string,
    throttle: Record<string, number>
  ): boolean {
    const now = Date.now();
    const last = throttle[domain] || 0;
    if (now - last < this.NOTIFICATION_THROTTLE_MS) return true;

    const hourAgo = now - 60 * 60 * 1000;
    const recentCount = Object.values(throttle).filter(
      timestamp => timestamp > hourAgo
    ).length;
    return recentCount >= this.MAX_NOTIFICATIONS_PER_HOUR;
  }

  private static async trackNotification(
    domain: string,
    throttle: Record<string, number>
  ): Promise<void> {
    const now = Date.now();
    const cutoff = now - 2 * 60 * 60 * 1000;
    const next = Object.fromEntries(
      Object.entries({ ...throttle, [domain]: now }).filter(
        ([, timestamp]) => timestamp > cutoff
      )
    );

    try {
      await chrome.storage.session.set({ [THROTTLE_KEY]: next });
    } catch {
      // Session storage can be unavailable in older Chromium contexts. Alerts
      // remain permission/settings guarded even if cross-worker throttling is lost.
    }
  }

  private static async getThrottleState(): Promise<Record<string, number>> {
    try {
      const result = await chrome.storage.session.get(THROTTLE_KEY);
      const value = result[THROTTLE_KEY];
      if (!value || typeof value !== 'object') return {};
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).flatMap(
          ([domain, timestamp]) =>
            typeof timestamp === 'number' && Number.isFinite(timestamp)
              ? [[domain, timestamp]]
              : []
        )
      );
    } catch {
      return {};
    }
  }
}
