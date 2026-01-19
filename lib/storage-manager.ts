import type { ExtensionSettings, TrackingEvent, DailySnapshot, WeeklyReport } from './types';

/**
 * Chrome storage wrapper for type-safe storage operations
 */
export class StorageManager {
  private static readonly SETTINGS_KEY = 'phantom_trail_settings';
  private static readonly EVENTS_KEY = 'phantom_trail_events';
  private static readonly DAILY_SNAPSHOTS_KEY = 'phantom_trail_daily_snapshots';
  private static readonly WEEKLY_REPORTS_KEY = 'phantom_trail_weekly_reports';

  /**
   * Get extension settings from storage
   */
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(this.SETTINGS_KEY);
      return (
        result[this.SETTINGS_KEY] || {
          enableAI: true,
          enableNotifications: true,
          riskThreshold: 'medium' as const,
        }
      );
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        enableAI: true,
        enableNotifications: true,
        riskThreshold: 'medium' as const,
      };
    }
  }

  /**
   * Save extension settings to storage
   */
  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.SETTINGS_KEY]: settings,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Get recent tracking events
   */
  static async getRecentEvents(limit = 100): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const events: TrackingEvent[] = result[this.EVENTS_KEY] || [];
      return events.slice(-limit);
    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  /**
   * Get tracking events within a date range
   */
  static async getEventsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const events: TrackingEvent[] = result[this.EVENTS_KEY] || [];
      
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();
      
      return events.filter(event => 
        event.timestamp >= startTime && event.timestamp <= endTime
      );
    } catch (error) {
      console.error('Failed to get events by date range:', error);
      return [];
    }
  }

  /**
   * Add new tracking event to storage
   */
  static async addEvent(event: TrackingEvent): Promise<void> {
    try {
      const events = await this.getRecentEvents(999); // Keep last 999 events

      // Remove events older than 30 days (GDPR/CCPA compliance)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filteredEvents = events.filter(e => e.timestamp > thirtyDaysAgo);

      filteredEvents.push(event);

      await chrome.storage.local.set({
        [this.EVENTS_KEY]: filteredEvents,
      });
    } catch (error) {
      console.error('Failed to add event:', error);
      throw new Error('Failed to save tracking event');
    }
  }

  /**
   * Clean up old events (30-day retention policy)
   * Should be called periodically
   */
  static async cleanupOldEvents(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const events: TrackingEvent[] = result[this.EVENTS_KEY] || [];
      
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const filteredEvents = events.filter(e => e.timestamp > thirtyDaysAgo);
      
      const removedCount = events.length - filteredEvents.length;
      
      if (removedCount > 0) {
        await chrome.storage.local.set({
          [this.EVENTS_KEY]: filteredEvents,
        });
      }
      
      return removedCount;
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      return 0;
    }
  }

  /**
   * Clear all stored events
   */
  static async clearEvents(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.EVENTS_KEY);
    } catch (error) {
      console.error('Failed to clear events:', error);
      throw new Error('Failed to clear events');
    }
  }

  /**
   * Store daily privacy snapshot
   */
  static async storeDailySnapshot(snapshot: DailySnapshot): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.DAILY_SNAPSHOTS_KEY);
      const snapshots: Record<string, DailySnapshot> = result[this.DAILY_SNAPSHOTS_KEY] || {};
      
      snapshots[snapshot.date] = snapshot;
      
      // Keep only last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];
      
      Object.keys(snapshots).forEach(date => {
        if (date < cutoffDate) {
          delete snapshots[date];
        }
      });
      
      await chrome.storage.local.set({
        [this.DAILY_SNAPSHOTS_KEY]: snapshots,
      });
    } catch (error) {
      console.error('Failed to store daily snapshot:', error);
    }
  }

  /**
   * Get daily snapshots for date range
   */
  static async getDailySnapshots(days: number = 30): Promise<DailySnapshot[]> {
    try {
      const result = await chrome.storage.local.get(this.DAILY_SNAPSHOTS_KEY);
      const snapshots: Record<string, DailySnapshot> = result[this.DAILY_SNAPSHOTS_KEY] || {};
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      return Object.values(snapshots)
        .filter(snapshot => snapshot.date >= startDateStr)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Failed to get daily snapshots:', error);
      return [];
    }
  }

  /**
   * Store weekly report
   */
  static async storeWeeklyReport(report: WeeklyReport): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.WEEKLY_REPORTS_KEY);
      const reports: Record<string, WeeklyReport> = result[this.WEEKLY_REPORTS_KEY] || {};
      
      reports[report.weekStart] = report;
      
      // Keep only last 12 weeks
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
      const cutoffDate = twelveWeeksAgo.toISOString().split('T')[0];
      
      Object.keys(reports).forEach(weekStart => {
        if (weekStart < cutoffDate) {
          delete reports[weekStart];
        }
      });
      
      await chrome.storage.local.set({
        [this.WEEKLY_REPORTS_KEY]: reports,
      });
    } catch (error) {
      console.error('Failed to store weekly report:', error);
    }
  }

  /**
   * Get weekly reports
   */
  static async getWeeklyReports(weeks: number = 12): Promise<WeeklyReport[]> {
    try {
      const result = await chrome.storage.local.get(this.WEEKLY_REPORTS_KEY);
      const reports: Record<string, WeeklyReport> = result[this.WEEKLY_REPORTS_KEY] || {};
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));
      const startDateStr = startDate.toISOString().split('T')[0];
      
      return Object.values(reports)
        .filter(report => report.weekStart >= startDateStr)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    } catch (error) {
      console.error('Failed to get weekly reports:', error);
      return [];
    }
  }

  /**
   * Generic get method for any storage key
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  /**
   * Generic set method for any storage key
   */
  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
      throw new Error(`Failed to save ${key}`);
    }
  }

  /**
   * Generic remove method for any storage key
   */
  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw new Error(`Failed to remove ${key}`);
    }
  }

  /**
   * Get multiple keys at once
   */
  static async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('Failed to get multiple keys:', error);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs at once
   */
  static async setMultiple(items: Record<string, any>): Promise<void> {
    try {
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('Failed to set multiple items:', error);
      throw new Error('Failed to save multiple items');
    }
  }

  /**
   * Get all storage data (for sync purposes)
   */
  static async getAllData(): Promise<Record<string, any>> {
    try {
      return await chrome.storage.local.get(null);
    } catch (error) {
      console.error('Failed to get all data:', error);
      return {};
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{ bytesInUse: number; quota: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
      return { bytesInUse, quota };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { bytesInUse: 0, quota: 5242880 };
    }
  }

  /**
   * Sync-specific methods
   */

  /**
   * Get syncable data (excludes sensitive information)
   */
  static async getSyncableData(): Promise<Record<string, any>> {
    try {
      const allData = await this.getAllData();
      
      // Define keys that should be synced
      const syncableKeys = [
        'extensionSettings',
        'trustedSites',
        'privacyGoals',
        'exportSchedules',
        'uiPreferences',
        'privacyPreferences'
      ];

      const syncableData: Record<string, any> = {};
      for (const key of syncableKeys) {
        if (allData[key] !== undefined) {
          syncableData[key] = allData[key];
        }
      }

      return syncableData;
    } catch (error) {
      console.error('Failed to get syncable data:', error);
      return {};
    }
  }

  /**
   * Set syncable data (used when receiving sync data)
   */
  static async setSyncableData(data: Record<string, any>): Promise<void> {
    try {
      // Filter out any non-syncable keys for security
      const allowedKeys = [
        'extensionSettings',
        'trustedSites',
        'privacyGoals',
        'exportSchedules',
        'uiPreferences',
        'privacyPreferences'
      ];

      const filteredData: Record<string, any> = {};
      for (const key of allowedKeys) {
        if (data[key] !== undefined) {
          filteredData[key] = data[key];
        }
      }

      await this.setMultiple(filteredData);
    } catch (error) {
      console.error('Failed to set syncable data:', error);
      throw new Error('Failed to apply sync data');
    }
  }

  /**
   * Check if a key should be synced
   */
  static isSyncableKey(key: string): boolean {
    const syncableKeys = [
      'extensionSettings',
      'trustedSites',
      'privacyGoals',
      'exportSchedules',
      'uiPreferences',
      'privacyPreferences'
    ];

    return syncableKeys.includes(key);
  }

  /**
   * Get non-syncable keys (for privacy protection)
   */
  static getNonSyncableKeys(): string[] {
    return [
      this.EVENTS_KEY, // Raw tracking events
      this.DAILY_SNAPSHOTS_KEY, // Privacy scores
      this.WEEKLY_REPORTS_KEY, // Analytics data
      'chatHistory', // AI conversation history
      'apiKeys', // Service credentials
      'deviceId', // Device identification
      'syncSettings', // Sync configuration
      'syncStatus', // Sync status
      'syncError' // Sync errors
    ];
  }

  // Stub methods for compatibility - implement as needed
  static async getTrackingEvents(): Promise<TrackingEvent[]> {
    const events = await this.getAllData();
    return events[this.EVENTS_KEY] || [];
  }

  static async setTrackingEvents(events: TrackingEvent[]): Promise<void> {
    const allData = await this.getAllData();
    allData[this.EVENTS_KEY] = events;
    await chrome.storage.local.set(allData);
  }

  static async addTrackingEvent(event: TrackingEvent): Promise<void> {
    const events = await this.getTrackingEvents();
    events.push(event);
    await this.setTrackingEvents(events);
  }

  static async initializeDefaults(): Promise<void> {
    // Initialize default settings if needed
    const settings = await this.getSettings();
    if (!settings) {
      const allData = await this.getAllData();
      allData[this.SETTINGS_KEY] = {
        aiEnabled: true,
        privacyMode: 'balanced'
      };
      await chrome.storage.local.set(allData);
    }
  }

  static async getSessionData(_key: string): Promise<unknown> {
    // Placeholder for session data access
    return null;
  }

  static async setSessionData(_key: string, _data: unknown): Promise<void> {
    // Placeholder for session data storage
  }
}
