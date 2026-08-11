import type { NarrativeState } from './LiveNarrative.types';
import { useTrackingEvents } from '../../lib/hooks/useTrackingEvents';
import { useEventAnalysis } from '../../lib/hooks/useEventAnalysis';
import { usePatternDetection } from '../../lib/hooks/usePatternDetection';

/** Main hook for the local attributed-signal feed. */
export function useLiveNarrative(): NarrativeState {
  const { events, loading } = useTrackingEvents();
  return { events, loading };
}

export { useTrackingEvents, useEventAnalysis, usePatternDetection };
