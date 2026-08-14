import type { DataProtectionSettings, TrackingEvent } from '../types';
import {
  isTrackingEvent,
  normalizeTrackingEvent,
} from '../event-attribution.mts';
import { mergeEventIntoList } from '../event-storage-policy.mts';
import {
  sanitizeTrackingEventForStorage,
  sanitizeTrackingEventsForStorage,
} from '../data-protection-policy.mts';
import { isControlledBrowserShutdown } from '../browser-lifecycle-errors.mts';
import { DataProtectionStorage } from './data-protection-storage';

export interface EventPolicyApplicationResult {
  changedRows: number;
  removedByRetention: number;
  remainingRows: number;
  retentionDays: number;
}

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
   * Minimize a detector event before persistence, then append or aggregate it.
   * Returns true only when a new row was appended.
   */
  static async addEvent(event: TrackingEvent): Promise<boolean> {
    return this.runMutation(async () => {
      try {
        const [existingEvents, settings] = await Promise.all([
          this.getValidatedEvents(),
          DataProtectionStorage.getSettings(),
        ]);
        const protectedEvent = sanitizeTrackingEventForStorage(
          normalizeTrackingEvent(event),
          settings
        ).event;
        const result = mergeEventIntoList(
          existingEvents,
          protectedEvent,
          this.DEDUPLICATION_WINDOW_MS,
          this.MAX_EVENTS
        );
        await this.persist(result.events);
        return result.appended;
      } catch (error) {
        console.error('Failed to add protected detector event:', error);
        throw new Error('Failed to add detector event');
      }
    });
  }

  static async cleanupOldEvents(): Promise<number> {
    const result = await this.reapplyProtectionPolicy();
    return result.removedByRetention;
  }

  static async clearEvents(): Promise<void> {
    return this.runMutation(async () => {
      try {
        await chrome.storage.local.remove(this.EVENTS_KEY);
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
        const settings = await DataProtectionStorage.getSettings();
        const normalized = events
          .filter(isTrackingEvent)
          .map(normalizeTrackingEvent)
          .slice(-this.MAX_EVENTS);
        const protectedRows = sanitizeTrackingEventsForStorage(
          normalized,
          settings
        ).events;
        await this.persist(protectedRows);
      } catch (error) {
        console.error('Failed to set protected tracking events:', error);
        throw new Error('Failed to set tracking events');
      }
    });
  }

  static async reapplyProtectionPolicy(
    providedSettings?: DataProtectionSettings
  ): Promise<EventPolicyApplicationResult> {
    return this.runMutation(async () => {
      const settings =
        providedSettings || (await DataProtectionStorage.getSettings());
      const result = await chrome.storage.local.get(this.EVENTS_KEY);
      const rawEvents = Array.isArray(result[this.EVENTS_KEY])
        ? result[this.EVENTS_KEY]
        : [];
      const normalized = rawEvents
        .filter(isTrackingEvent)
        .map(normalizeTrackingEvent)
        .slice(-this.MAX_EVENTS);
      const protectedRows = sanitizeTrackingEventsForStorage(
        normalized,
        settings
      );
      const cutoff = Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000;
      const retained = protectedRows.events.filter(
        event => (event.lastSeenAt || event.timestamp) > cutoff
      );
      await this.persist(retained);

      return {
        changedRows:
          protectedRows.changedRows +
          Math.max(0, rawEvents.length - normalized.length),
        removedByRetention: protectedRows.events.length - retained.length,
        remainingRows: retained.length,
        retentionDays: settings.retentionDays,
      };
    });
  }

  private static async getValidatedEvents(): Promise<TrackingEvent[]> {
    try {
      const [result, settings] = await Promise.all([
        chrome.storage.local.get(this.EVENTS_KEY),
        DataProtectionStorage.getSettings(),
      ]);
      const rawEvents = result[this.EVENTS_KEY];

      if (!Array.isArray(rawEvents)) {
        if (rawEvents !== undefined) {
          console.warn('Events storage was not an array; removing it');
          await chrome.storage.local.remove(this.EVENTS_KEY);
        }
        return [];
      }

      const validEvents = rawEvents.filter(isTrackingEvent);
      const normalizedEvents = validEvents.map(normalizeTrackingEvent);
      const protectedRows = sanitizeTrackingEventsForStorage(
        normalizedEvents,
        settings
      );
      const cutoff = Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000;
      const retained = protectedRows.events
        .filter(event => (event.lastSeenAt || event.timestamp) > cutoff)
        .slice(-this.MAX_EVENTS);
      const needsRepair =
        validEvents.length !== rawEvents.length ||
        protectedRows.changedRows > 0 ||
        retained.length !== protectedRows.events.length ||
        validEvents.some(
          event =>
            event.schemaVersion !== 2 || !event.context || !event.detector
        );

      if (needsRepair) {
        console.warn(
          '[Phantom Trail] Rewrote event storage under the active attribution and data-protection policy'
        );
        await this.persist(retained);
      }

      return retained;
    } catch (error) {
      if (!isControlledBrowserShutdown(error)) {
        console.error('Failed to read protected detector events:', error);
      }
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
    if (events.length === 0) {
      await chrome.storage.local.remove(this.EVENTS_KEY);
      return;
    }
    await chrome.storage.local.set({
      [this.EVENTS_KEY]: events,
    });
  }
}
