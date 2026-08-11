import type { TrackingEvent } from './types.ts';
import {
  buildEventDeduplicationKey,
  normalizeTrackingEvent,
} from './event-attribution.mts';

export interface EventMergeResult {
  events: TrackingEvent[];
  appended: boolean;
  aggregatedEvent?: TrackingEvent;
}

/**
 * Merge an incoming event into a bounded list.
 *
 * Equivalent events inside the short window become one row with an occurrence
 * count. The page domain is part of the key, so the same resource on two pages
 * remains two rows.
 */
export function mergeEventIntoList(
  existingEvents: TrackingEvent[],
  incomingEvent: TrackingEvent,
  deduplicationWindowMs = 5000,
  maxEvents = 1000
): EventMergeResult {
  const events = existingEvents.map(normalizeTrackingEvent);
  const incoming = normalizeTrackingEvent(incomingEvent);
  const signature = buildEventDeduplicationKey(incoming);
  const incomingLastSeen = incoming.lastSeenAt || incoming.timestamp;

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const existing = events[index];
    const existingLastSeen = existing.lastSeenAt || existing.timestamp;

    if (incomingLastSeen - existingLastSeen > deduplicationWindowMs) break;
    if (buildEventDeduplicationKey(existing) !== signature) continue;

    const aggregatedEvent: TrackingEvent = {
      ...existing,
      timestamp: incoming.timestamp,
      lastSeenAt: incomingLastSeen,
      occurrences:
        Math.max(1, existing.occurrences || 1) +
        Math.max(1, incoming.occurrences || 1),
      description: incoming.description,
      detector: incoming.detector,
      context: incoming.context,
    };

    events.splice(index, 1);
    events.push(aggregatedEvent);
    return { events, appended: false, aggregatedEvent };
  }

  events.push(incoming);
  if (events.length > maxEvents) {
    events.splice(0, events.length - maxEvents);
  }

  return { events, appended: true };
}
