import type { TrackingEvent, AIAnalysis, RiskLevel } from '../../lib/types';

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

/**
 * Individual event analysis types
 */
export interface EventAnalysis extends AIAnalysis {
  eventId: string;
  timestamp: number;
  websiteContext?: WebsiteContext;
}

export interface EventAnalysisCache {
  [eventSignature: string]: {
    analysis: EventAnalysis;
    timestamp: number;
    ttl: number;
  };
}

/**
 * Website context detection types
 */
export type WebsiteContext =
  | 'banking'
  | 'shopping'
  | 'social'
  | 'news'
  | 'search'
  | 'streaming'
  | 'unknown';

export interface ContextualPrompt {
  context: WebsiteContext;
  systemPrompt: string;
  riskMultiplier: number;
}

/**
 * Pattern detection types
 */
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
