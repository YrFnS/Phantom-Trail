import type { ExtensionSettings, TrackingEvent } from './types';

/**
 * Chrome storage wrapper for type-safe storage operations
 */
export class StorageManager {
  private static readonly SETTINGS_KEY = 'phantom_trail_settings';
  private static readonly EVENTS_KEY = 'phantom_trail_events';

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

      // Remove events older than 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filteredEvents = events.filter(e => e.timestamp > sevenDaysAgo);

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
}
