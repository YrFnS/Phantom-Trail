import { useState, useEffect, useCallback } from 'react';
import type { TrackingEvent } from '../../lib/types';
import type {
  TrackingPattern,
  PatternAlert,
} from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Detect possible patterns in recorded events.
 *
 * These are heuristic groupings, not proof that tracking, fingerprinting, or
 * data sharing actually occurred.
 */
export function usePatternDetection(events: TrackingEvent[]) {
  const [patterns, setPatterns] = useState<TrackingPattern[]>([]);
  const [alerts, setAlerts] = useState<PatternAlert[]>([]);

  const detectPatterns = useCallback(() => {
    if (events.length < 2) {
      setPatterns([]);
      setAlerts([]);
      return;
    }

    const detectedPatterns: TrackingPattern[] = [];
    const newAlerts: PatternAlert[] = [];

    const crossSitePattern = detectCrossSiteTracking(events);
    if (crossSitePattern) {
      detectedPatterns.push(crossSitePattern);

      newAlerts.push({
        pattern: {
          id: `cross-site-${Date.now()}`,
          type: 'cross-site',
          domains: crossSitePattern.domains,
          events: crossSitePattern.events,
          riskLevel: 'medium',
          description: crossSitePattern.description,
          detectedAt: Date.now(),
        },
        severity: 'warning',
        message:
          'Possible repeated-domain pattern across recorded page contexts',
        actionable: true,
      });
    }

    const fingerprintingPattern = detectFingerprintingPattern(events);
    if (fingerprintingPattern) {
      detectedPatterns.push(fingerprintingPattern);

      newAlerts.push({
        pattern: {
          id: `fingerprinting-${Date.now()}`,
          type: 'fingerprinting',
          domains: fingerprintingPattern.domains,
          events: fingerprintingPattern.events,
          riskLevel: 'high',
          description: fingerprintingPattern.description,
          detectedAt: Date.now(),
        },
        severity: 'warning',
        message: 'Possible fingerprinting-related signals recorded',
        actionable: true,
      });
    }

    setPatterns(detectedPatterns);
    setAlerts(newAlerts);
  }, [events]);

  useEffect(() => {
    detectPatterns();
  }, [detectPatterns]);

  return {
    patterns,
    alerts,
    refresh: detectPatterns,
  };
}

function detectCrossSiteTracking(
  events: TrackingEvent[]
): TrackingPattern | null {
  const eventsByRecordedDomain = new Map<string, TrackingEvent[]>();

  for (const event of events) {
    if (!eventsByRecordedDomain.has(event.domain)) {
      eventsByRecordedDomain.set(event.domain, []);
    }
    eventsByRecordedDomain.get(event.domain)!.push(event);
  }

  const repeatedAcrossPages = Array.from(eventsByRecordedDomain.entries()).filter(
    ([, domainEvents]) => {
      const pageContexts = new Set(domainEvents.map(event => extractDomain(event.url)));
      return pageContexts.size > 1;
    }
  );

  if (repeatedAcrossPages.length === 0) return null;

  const repeatedEvents = repeatedAcrossPages.flatMap(([, domainEvents]) =>
    domainEvents
  );
  const pageContexts = new Set(
    repeatedEvents.map(event => extractDomain(event.url))
  );
  const recordedDomains = repeatedAcrossPages.map(([domain]) => domain);

  return {
    id: `cross-site-${Date.now()}`,
    type: 'cross-site',
    domains: recordedDomains,
    events: repeatedEvents,
    riskLevel: pageContexts.size > 3 ? 'high' : 'medium',
    description: `${recordedDomains.length} recorded domain${
      recordedDomains.length === 1 ? '' : 's'
    } appeared across ${pageContexts.size} page contexts; data sharing is not confirmed`,
    detectedAt: Date.now(),
  };
}

function detectFingerprintingPattern(
  events: TrackingEvent[]
): TrackingPattern | null {
  const fingerprintingEvents = events.filter(
    event => event.trackerType === 'fingerprinting'
  );

  if (fingerprintingEvents.length === 0) return null;

  return {
    id: `fingerprinting-${Date.now()}`,
    type: 'fingerprinting',
    domains: Array.from(new Set(fingerprintingEvents.map(event => event.domain))),
    events: fingerprintingEvents,
    riskLevel: 'high',
    description: `${fingerprintingEvents.length} event${
      fingerprintingEvents.length === 1 ? '' : 's'
    } classified as possible fingerprinting-related signals`,
    detectedAt: Date.now(),
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
