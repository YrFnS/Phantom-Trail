import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import { AIEngine } from '../../lib/ai-engine';
import type { TrackingEvent, AIAnalysis } from '../../lib/types';
import type {
  NarrativeState,
  EventAnalysis,
  TrackingPattern,
  PatternAlert,
} from './LiveNarrative.types';
import { AnalysisCache } from './LiveNarrative.cache';
import { ContextDetector } from './LiveNarrative.context';

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
      setRecentEvents(events.slice(-10));
      lastEventCountRef.current = events.length;
    }
  }, [events]); // Need full events array to slice

  return {
    events: recentEvents,
    loading: eventsLoading,
  };
}

/**
 * Hook for individual event AI analysis with caching
 */
export function useEventAnalysis(event: TrackingEvent | null) {
  const [analysis, setAnalysis] = useState<EventAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateEventAnalysis = useCallback(
    async (targetEvent: TrackingEvent) => {
      setLoading(true);
      setError(null);

      try {
        // Check cache first
        const cached = await AnalysisCache.getCachedAnalysis(targetEvent);
        if (cached) {
          setAnalysis(cached);
          setLoading(false);
          return;
        }

        // Detect website context
        const context = ContextDetector.detectContext(targetEvent);

        // Generate AI analysis with context
        const aiAnalysis = await AIEngine.generateEventAnalysis(
          targetEvent,
          context
        );

        if (aiAnalysis) {
          const eventAnalysis: EventAnalysis = {
            ...aiAnalysis,
            eventId: targetEvent.id,
            timestamp: Date.now(),
            websiteContext: context,
          };

          setAnalysis(eventAnalysis);

          // Cache the result
          await AnalysisCache.setCachedAnalysis(targetEvent, eventAnalysis);
        } else {
          setAnalysis(null);
        }
      } catch (err) {
        console.error('Failed to generate event analysis:', err);
        setError('Analysis temporarily unavailable');
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (event) {
      generateEventAnalysis(event);
    } else {
      setAnalysis(null);
      setError(null);
    }
  }, [event, generateEventAnalysis]);

  return {
    analysis,
    loading,
    error,
    regenerate: event ? () => generateEventAnalysis(event) : undefined,
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
  const lastAnalyzedCountRef = useRef(0);
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateAnalysis = useCallback(
    async (attempt = 0) => {
      if (events.length === 0) {
        setAnalysis(null);
        return;
      }

      // Skip if we already analyzed this many events
      if (events.length === lastAnalyzedCountRef.current && attempt === 0) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await AIEngine.generateNarrative(events);
        setAnalysis(result);
        setRetryCount(0);
        lastAnalyzedCountRef.current = events.length;
      } catch (err) {
        console.error('Failed to generate AI analysis:', err);

        // Retry logic with exponential backoff
        if (attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000;
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
    },
    [events] // Need full events array for analysis
  );

  // Debounce analysis generation
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    if (events.length > 0) {
      analysisTimeoutRef.current = setTimeout(() => {
        generateAnalysis();
      }, 3000); // Wait 3 seconds after last event
    }

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [events.length, generateAnalysis]);

  return {
    analysis,
    loading,
    error,
    retryCount,
    regenerate: () => {
      lastAnalyzedCountRef.current = 0;
      generateAnalysis(0);
    },
  };
}

/**
 * Hook for pattern detection across tracking events
 */
export function usePatternDetection(events: TrackingEvent[]) {
  const [patterns, setPatterns] = useState<TrackingPattern[]>([]);
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const lastPatternCheckRef = useRef(0);
  const patternTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectPatterns = useCallback(async () => {
    if (events.length < 3) {
      setPatterns([]);
      setAlerts([]);
      return;
    }

    // Skip if we already checked this many events
    if (events.length === lastPatternCheckRef.current) {
      return;
    }

    setLoading(true);

    try {
      const detectedPatterns: TrackingPattern[] = [];
      const newAlerts: PatternAlert[] = [];

      // Cross-site tracking detection
      const crossSitePattern = detectCrossSiteTracking(events);
      if (crossSitePattern) {
        detectedPatterns.push(crossSitePattern);

        if (
          crossSitePattern.riskLevel === 'high' ||
          crossSitePattern.riskLevel === 'critical'
        ) {
          newAlerts.push({
            pattern: crossSitePattern,
            severity:
              crossSitePattern.riskLevel === 'critical'
                ? 'critical'
                : 'warning',
            message: `Cross-site tracking detected across ${crossSitePattern.domains.length} domains`,
            actionable: true,
          });
        }
      }

      // Fingerprinting pattern detection
      const fingerprintingPattern = detectFingerprintingPattern(events);
      if (fingerprintingPattern) {
        detectedPatterns.push(fingerprintingPattern);

        newAlerts.push({
          pattern: fingerprintingPattern,
          severity: 'warning',
          message: 'Advanced fingerprinting techniques detected',
          actionable: true,
        });
      }

      setPatterns(detectedPatterns);
      setAlerts(newAlerts);
      lastPatternCheckRef.current = events.length;
    } catch (error) {
      console.error('Pattern detection failed:', error);
    } finally {
      setLoading(false);
    }
  }, [events]); // Need full events array for pattern detection

  // Debounce pattern detection
  useEffect(() => {
    if (patternTimeoutRef.current) {
      clearTimeout(patternTimeoutRef.current);
    }

    if (events.length >= 3) {
      patternTimeoutRef.current = setTimeout(() => {
        detectPatterns();
      }, 5000); // Wait 5 seconds for pattern detection
    }

    return () => {
      if (patternTimeoutRef.current) {
        clearTimeout(patternTimeoutRef.current);
      }
    };
  }, [events.length, detectPatterns]);

  return {
    patterns,
    alerts,
    loading,
  };
}

/**
 * Detect cross-site tracking patterns
 */
function detectCrossSiteTracking(
  events: TrackingEvent[]
): TrackingPattern | null {
  // Group events by tracker domain
  const trackerDomains = new Map<string, TrackingEvent[]>();

  events.forEach(event => {
    if (
      event.trackerType === 'advertising' ||
      event.trackerType === 'analytics'
    ) {
      const existing = trackerDomains.get(event.domain) || [];
      existing.push(event);
      trackerDomains.set(event.domain, existing);
    }
  });

  // Find trackers present on multiple different sites
  const crossSiteTrackers = Array.from(trackerDomains.entries()).filter(
    ([, trackerEvents]) => {
      const uniqueSites = new Set(
        trackerEvents.map(e => new URL(e.url).hostname)
      );
      return uniqueSites.size >= 3; // Present on 3+ different sites
    }
  );

  if (crossSiteTrackers.length === 0) return null;

  const allEvents = crossSiteTrackers.flatMap(([, events]) => events);
  const allDomains = Array.from(
    new Set(crossSiteTrackers.map(([domain]) => domain))
  );

  return {
    id: `cross-site-${Date.now()}`,
    type: 'cross-site',
    domains: allDomains,
    events: allEvents,
    riskLevel: allDomains.length >= 5 ? 'critical' : 'high',
    description: `${allDomains.length} trackers following you across multiple websites`,
    detectedAt: Date.now(),
  };
}

/**
 * Detect fingerprinting patterns
 */
function detectFingerprintingPattern(
  events: TrackingEvent[]
): TrackingPattern | null {
  const fingerprintingEvents = events.filter(
    e => e.trackerType === 'fingerprinting'
  );

  if (fingerprintingEvents.length < 2) return null;

  // Check for multiple fingerprinting attempts from same site
  const siteCounts = new Map<string, number>();
  fingerprintingEvents.forEach(event => {
    const site = new URL(event.url).hostname;
    siteCounts.set(site, (siteCounts.get(site) || 0) + 1);
  });

  const intensiveSites = Array.from(siteCounts.entries()).filter(
    ([, count]) => count >= 2
  );

  if (intensiveSites.length === 0) return null;

  return {
    id: `fingerprinting-${Date.now()}`,
    type: 'fingerprinting',
    domains: intensiveSites.map(([site]) => site),
    events: fingerprintingEvents,
    riskLevel: 'high',
    description: 'Advanced browser fingerprinting detected',
    detectedAt: Date.now(),
  };
}
export function useLiveNarrative(): NarrativeState {
  const { events, loading: eventsLoading } = useTrackingEvents();
  const {
    analysis,
    loading: analysisLoading,
    error,
    retryCount,
  } = useAIAnalysis(events);

  return {
    events,
    analysis,
    loading: eventsLoading || analysisLoading,
    error,
    retryCount,
  };
}
