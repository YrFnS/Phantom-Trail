import type { TrackingEvent } from '../types';
import {
  DEFAULT_DATA_PROTECTION_SETTINGS,
  sanitizeTrackingEventForStorage,
  sanitizeUrlForStorage,
} from '../data-protection-policy.mts';

/**
 * Compatibility sanitizer.
 *
 * OpenRouter no longer receives event objects in P3. Legacy callers that still
 * request sanitized events receive the strict origin-only local representation.
 */
export class DataSanitizer {
  static sanitizeUrl(url: string): string {
    return sanitizeUrlForStorage(url, 'origin-only').value;
  }

  static sanitizeEvent(event: TrackingEvent): TrackingEvent {
    return sanitizeTrackingEventForStorage(
      event,
      DEFAULT_DATA_PROTECTION_SETTINGS
    ).event;
  }

  static sanitizeEvents(events: TrackingEvent[]): TrackingEvent[] {
    return events.map(event => this.sanitizeEvent(event));
  }
}
