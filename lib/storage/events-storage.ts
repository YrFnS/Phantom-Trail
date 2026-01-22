import type { TrackingEvent } from '../types';

/**
 * Manages tracking events storage
 */
export class EventsStorage {
  private static readonly EVENTS_KEY = 'phantom_trail_events';

  /**
   * Get recent tracking events
   */
  static async getRecentEvents(limit = 100): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      let events = result[this.EVENTS_KEY] || [];
      
      // Validate and repair corrupted data
      if (!Array.isArray(events)) {
        console.warn('Events storage corrupted, resetting to empty array');
        events = [];
        await chrome.storage.local.set({ [this.EVENTS_KEY]: [] });
      }
      
      return events.slice(-limit);
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }

  /**
   * Get events by date range
   */
  static async getEventsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      let events = result[this.EVENTS_KEY] || [];
      
      // Validate and repair corrupted data
      if (!Array.isArray(events)) {
        console.warn('Events storage corrupted, resetting to empty array');
        events = [];
        await chrome.storage.local.set({ [this.EVENTS_KEY]: [] });
        return [];
      }
      
      return events.filter((event: TrackingEvent) => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= startDate && eventDate <= endDate;
      });
    } catch (error) {
      console.error('Failed to get events by date range:', error);
      return [];
    }
  }

  /**
   * Add a new tracking event
   */
  static async addEvent(event: TrackingEvent): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      let events = result[this.EVENTS_KEY] || [];
      
      // Validate and repair corrupted data
      if (!Array.isArray(events)) {
        console.warn('Events storage corrupted, resetting to empty array');
        events = [];
      }
      
      events.push(event);
      
      // Keep only last 1000 events to prevent storage bloat
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      await chrome.storage.local.set({
        [this.EVENTS_KEY]: events,
      });
    } catch (error) {
      console.error('Failed to add event:', error);
      throw new Error('Failed to add tracking event');
    }
  }

  /**
   * Clean up old events (older than 30 days)
   */
  static async cleanupOldEvents(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      let events = result[this.EVENTS_KEY] || [];
      
      // Validate and repair corrupted data
      if (!Array.isArray(events)) {
        console.warn('Events storage corrupted, resetting to empty array');
        events = [];
        await chrome.storage.local.set({ [this.EVENTS_KEY]: [] });
        return 0;
      }
      
      const originalCount = events.length;
      
      const filteredEvents = events.filter((event: TrackingEvent) => {
        return new Date(event.timestamp) > thirtyDaysAgo;
      });
      
      await chrome.storage.local.set({
        [this.EVENTS_KEY]: filteredEvents,
      });
      
      return originalCount - filteredEvents.length;
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      return 0;
    }
  }

  /**
   * Clear all events
   */
  static async clearEvents(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.EVENTS_KEY]: [],
      });
    } catch (error) {
      console.error('Failed to clear events:', error);
      throw new Error('Failed to clear events');
    }
  }

  /**
   * Get all tracking events
   */
  static async getTrackingEvents(): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      let events = result[this.EVENTS_KEY] || [];
      
      // Validate and repair corrupted data
      if (!Array.isArray(events)) {
        console.warn('Events storage corrupted, resetting to empty array');
        events = [];
        await chrome.storage.local.set({ [this.EVENTS_KEY]: [] });
      }
      
      return events;
    } catch (error) {
      console.error('Failed to get tracking events:', error);
      return [];
    }
  }

  /**
   * Set tracking events (replace all)
   */
  static async setTrackingEvents(events: TrackingEvent[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [this.EVENTS_KEY]: events,
      });
    } catch (error) {
      console.error('Failed to set tracking events:', error);
      throw new Error('Failed to set tracking events');
    }
  }
}
