import type { NarrativeState } from './LiveNarrative.types';
import { useTrackingEvents } from '../../lib/hooks/useTrackingEvents';
import { useEventAnalysis } from '../../lib/hooks/useEventAnalysis';
import { useAIAnalysis } from '../../lib/hooks/useAIAnalysis';
import { usePatternDetection } from '../../lib/hooks/usePatternDetection';

/**
 * Main hook for LiveNarrative component
 */
export function useLiveNarrative(): NarrativeState {
  const { events, loading: eventsLoading } = useTrackingEvents();
  const { analysis: aiAnalysis, loading: aiLoading, error } = useAIAnalysis(events);

  return {
    events,
    analysis: aiAnalysis,
    loading: eventsLoading || aiLoading,
    error: error || null,
  };
}

// Re-export individual hooks for direct use
export { useTrackingEvents, useEventAnalysis, useAIAnalysis, usePatternDetection };
