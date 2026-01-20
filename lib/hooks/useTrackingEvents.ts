import { useState, useEffect, useRef } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import type { TrackingEvent } from '../../lib/types';

/**
 * Hook for managing tracking events with real-time updates
 */
export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );

  // Use stable reference to prevent unnecessary re-renders
  const [recentEvents, setRecentEvents] = useState<TrackingEvent[]>([]);
  const lastEventCountRef = useRef(0);

  useEffect(() => {
    // Only update if event count changed
    if (events.length !== lastEventCountRef.current) {
      const recent = events.slice(-20); // Last 20 events
      setRecentEvents(recent);
      lastEventCountRef.current = events.length;
    }
  }, [events]);

  return {
    events: recentEvents,
    allEvents: events,
    loading: eventsLoading,
    totalCount: events.length,
  };
}
