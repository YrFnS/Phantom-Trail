import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import { AIEngine } from '../../lib/ai-engine';
import type { TrackingEvent, AIAnalysis } from '../../lib/types';
import type { NarrativeState } from './LiveNarrative.types';

/**
 * Hook for managing tracking events with real-time updates
 */
export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );

  return {
    events: events.slice(-10), // Show last 10 events
    loading: eventsLoading,
  };
}

/**
 * Hook for managing AI analysis of tracking events
 */
export function useAIAnalysis(events: TrackingEvent[]) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const generateAnalysis = useCallback(async (attempt = 0) => {
    if (events.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AIEngine.generateNarrative(events);
      setAnalysis(result);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Failed to generate AI analysis:', err);
      
      // Retry logic with exponential backoff
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          generateAnalysis(attempt + 1);
        }, delay);
        setRetryCount(attempt + 1);
      } else {
        setError('AI analysis temporarily unavailable');
        setAnalysis(null);
        setRetryCount(0);
      }
    } finally {
      if (attempt >= 2 || events.length === 0) {
        setLoading(false);
      }
    }
  }, [events]);

  // Generate analysis when events change
  useEffect(() => {
    if (events.length > 0) {
      generateAnalysis();
    }
  }, [generateAnalysis]);

  return {
    analysis,
    loading,
    error,
    retryCount,
    regenerate: () => generateAnalysis(0),
  };
}

/**
 * Main hook combining events and AI analysis
 */
export function useLiveNarrative(): NarrativeState {
  const { events, loading: eventsLoading } = useTrackingEvents();
  const { analysis, loading: analysisLoading, error, retryCount } = useAIAnalysis(events);

  return {
    events,
    analysis,
    loading: eventsLoading || analysisLoading,
    error,
    retryCount,
  };
}
