import type { TrackingEvent } from '../types';
import {
  isTrackingEvent,
  normalizeTrackingEvent,
} from '../event-attribution.mts';
import { mergeEventIntoList } from '../event-storage-policy.mts';

export class EventsStorage {
  private static readonly EVENTS_KEY = 'phantom_trail_events';
  private static readonly MAX_EVENTS = 1000;
  private static readonly DEDUPLICATION_WINDOW_MS = 5000;
  private static mutationQueue: Promise<void> = Promise.resolve();

  static async getRecentEvents(limit = 100): Promise<TrackingEvent[]> {
    const events = await this.getValidatedEvents();
    return events.slice(-limit);
  }

  static async getEventsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<TrackingEvent[]> {
    const events = await this.getValidatedEvents();
    return events.filter(event => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  /**
   * Add an event or aggregate a duplicate seen in the short dedupe window.
   * Returns true only when a new row was appended.
   */
  static async addEvent(event: TrackingEvent): Promise<boolean> {
    return this.runMutation(async () => {
      try {
        const existingEvents = await this.getValidatedEvents();
        const result = mergeEventIntoList(
          existingEvents,
          event,
          this.DEDUPLICATION_WINDOW_MS,
          this.MAX_EVENTS
        );
        await this.persist(result.events);
        return result.appended;
      } catch (error) {
        console.error('Failed to add detector event:', error);
        throw new Error('Failed to add detector event');
      }
    });
  }

  static async cleanupOldEvents(): Promise<number> {
    return this.runMutation(async () => {
      try {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const events = await this.getValidatedEvents();
        const filteredEvents = events.filter(
          event => (event.lastSeenAt || event.timestamp) > cutoff
        );

        await this.persist(filteredEvents);
        return events.length - filteredEvents.length;
      } catch (error) {
        console.error('Failed to cleanup old events:', error);
        return 0;
      }
    });
  }

  static async clearEvents(): Promise<void> {
    return this.runMutation(async () => {
      try {
        await this.persist([]);
      } catch (error) {
        console.error('Failed to clear events:', error);
        throw new Error('Failed to clear events');
      }
    });
  }

  static async getTrackingEvents(): Promise<TrackingEvent[]> {
    return this.getValidatedEvents();
  }

  static async setTrackingEvents(events: TrackingEvent[]): Promise<void> {
    return this.runMutation(async () => {
      try {
        const normalized = events
          .filter(isTrackingEvent)
          .map(normalizeTrackingEvent)
          .slice(-this.MAX_EVENTS);
        await this.persist(normalized);
      } catch (error) {
        console.error('Failed to set tracking events:', error);
        throw new Error('Failed to set tracking events');
      }
    });
  }

  private static async getValidatedEvents(): Promise<TrackingEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const rawEvents = result[this.EVENTS_KEY];

      if (!Array.isArray(rawEvents)) {
        if (rawEvents !== undefined) {
          console.warn('Events storage was not an array; resetting it');
          await this.persist([]);
        }
        return [];
      }

      const validEvents = rawEvents.filter(isTrackingEvent);
      const normalizedEvents = validEvents.map(normalizeTrackingEvent);
      const needsRepair =
        validEvents.length !== rawEvents.length ||
        validEvents.some(
          event =>
            event.schemaVersion !== 2 || !event.context || !event.detector
        );

      if (needsRepair) {
        console.warn(
          '[Phantom Trail] Migrated legacy or invalid detector-event storage to schema version 2'
        );
        await this.persist(normalizedEvents.slice(-this.MAX_EVENTS));
      }

      return normalizedEvents.slice(-this.MAX_EVENTS);
    } catch (error) {
      console.error('Failed to read detector events:', error);
      return [];
    }
  }

  private static runMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private static async persist(events: TrackingEvent[]): Promise<void> {
    await chrome.storage.local.set({
      [this.EVENTS_KEY]: events,
    });
  }
}
