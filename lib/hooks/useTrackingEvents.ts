import { useState, useEffect, useRef } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import { normalizeTrackingEvent } from '../../lib/event-attribution.mts';
import type { TrackingEvent } from '../../lib/types';

/**
 * Hook for managing detector events with real-time aggregation updates.
 */
export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );

  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>([]);
  const lastRevisionRef = useRef('');

  useEffect(() => {
    const lastEvent = events[events.length - 1];
    const revision = `${events.length}:${lastEvent?.id || ''}:${
      lastEvent?.lastSeenAt || lastEvent?.timestamp || 0
    }:${lastEvent?.occurrences || 1}`;

    if (revision !== lastRevisionRef.current) {
      setRecentEvents(events.slice(-20).map(normalizeTrackingEvent));
      lastRevisionRef.current = revision;
    }
  }, [events]);

  return {
    events: recentEvents,
    allEvents: events.map(normalizeTrackingEvent),
    loading: eventsLoading,
    totalCount: events.length,
    occurrenceCount: events.reduce(
      (total, event) => total + Math.max(1, event.occurrences || 1),
      0
    ),
  };
}
