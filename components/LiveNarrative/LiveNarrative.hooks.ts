import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import { AIEngine } from '../../lib/ai-engine';
import type { TrackingEvent, AIAnalysis } from '../../lib/types';
import type { NarrativeState } from './LiveNarrative.types';

/**
 * Hook for managing tracking events with real-time updates
 */
export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>('phantom_trail_events', []);
  
  return {
    events: events.slice(-10), // Show last 10 events
    loading: eventsLoading
  };
}

/**
 * Hook for managing AI analysis of tracking events
 */
export function useAIAnalysis(events: TrackingEvent[]) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = useCallback(async () => {
    if (events.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await AIEngine.generateNarrative(events);
      setAnalysis(result);
    } catch (err) {
      console.error('Failed to generate AI analysis:', err);
      setError('Failed to generate analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
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
    regenerate: generateAnalysis
  };
}

/**
 * Main hook combining events and AI analysis
 */
export function useLiveNarrative(): NarrativeState {
  const { events, loading: eventsLoading } = useTrackingEvents();
  const { analysis, loading: analysisLoading, error } = useAIAnalysis(events);

  return {
    events,
    analysis,
    loading: eventsLoading || analysisLoading,
    error
  };
}
