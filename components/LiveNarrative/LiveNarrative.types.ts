import type { TrackingEvent, AIAnalysis } from '../../lib/types';

/**
 * Component-specific interfaces for LiveNarrative
 */

export interface LiveNarrativeProps {
  className?: string;
}

export interface EventDisplayProps {
  event: TrackingEvent;
  analysis?: AIAnalysis;
}

export interface NarrativeState {
  events: TrackingEvent[];
  analysis: AIAnalysis | null;
  loading: boolean;
  error: string | null;
  retryCount?: number;
}

export interface EventWithAnalysis extends TrackingEvent {
  analysis?: AIAnalysis;
}
