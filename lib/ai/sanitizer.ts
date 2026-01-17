import type { TrackingEvent } from '../types';

/**
 * Data sanitization utilities for AI processing
 */
export class DataSanitizer {
  /**
   * Sanitize URL by removing query parameters and hash fragments
   * Prevents PII leakage (session tokens, user IDs, etc.)
   */
  static sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep only protocol, hostname, and pathname
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      // If URL parsing fails, return domain only
      return url.split('?')[0].split('#')[0];
    }
  }

  /**
   * Sanitize tracking event before sending to AI
   * Removes PII and sensitive data
   */
  static sanitizeEvent(event: TrackingEvent): TrackingEvent {
    return {
      ...event,
      url: this.sanitizeUrl(event.url),
      // Keep domain as-is (no PII in domain names)
      // Remove any potential PII from description
      description: event.description,
      // Sanitize in-page tracking data
      inPageTracking: event.inPageTracking
        ? {
            ...event.inPageTracking,
            // Limit API calls to prevent data leakage
            apiCalls: event.inPageTracking.apiCalls?.slice(0, 5),
          }
        : undefined,
    };
  }

  /**
   * Sanitize array of events for AI processing
   */
  static sanitizeEvents(events: TrackingEvent[]): TrackingEvent[] {
    return events.map(event => this.sanitizeEvent(event));
  }
}
