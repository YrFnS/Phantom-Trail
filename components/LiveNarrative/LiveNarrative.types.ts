import type { TrackingEvent, AIAnalysis, RiskLevel } from '../../lib/types';

/** Component-specific interfaces for the local attributed-signal feed. */
export interface LiveNarrativeProps {
  className?: string;
}

export interface EventDisplayProps {
  event: TrackingEvent;
}

export interface NarrativeState {
  events: TrackingEvent[];
  loading: boolean;
}

/** Local deterministic event interpretation used by the feed. */
export interface EventAnalysis extends AIAnalysis {
  eventId: string;
  timestamp: number;
}

/** Pattern detection types. */
export interface TrackingPattern {
  id: string;
  type: 'cross-site' | 'fingerprinting' | 'behavioral' | 'data-broker';
  domains: string[];
  events: TrackingEvent[];
  riskLevel: RiskLevel;
  description: string;
  detectedAt: number;
}

export interface PatternAlert {
  pattern: TrackingPattern;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  actionable: boolean;
}
