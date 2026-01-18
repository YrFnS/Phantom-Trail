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
}
