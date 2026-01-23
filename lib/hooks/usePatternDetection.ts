import { useState, useEffect, useCallback } from 'react';
import type { TrackingEvent } from '../../lib/types';
import type {
  TrackingPattern,
  PatternAlert,
} from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Hook for detecting tracking patterns across events
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

    // Detect cross-site tracking
    const crossSitePattern = detectCrossSiteTracking(events);
    if (crossSitePattern) {
      detectedPatterns.push(crossSitePattern);

      newAlerts.push({
        pattern: {
          id: `cross-site-${Date.now()}`,
          type: 'cross-site',
          domains: [],
          events: crossSitePattern.events,
          riskLevel: 'medium',
          description: crossSitePattern.description,
          detectedAt: Date.now(),
        },
        severity: 'warning',
        message: 'Cross-site tracking detected across multiple domains',
        actionable: true,
      });
    }

    // Detect fingerprinting patterns
    const fingerprintingPattern = detectFingerprintingPattern(events);
    if (fingerprintingPattern) {
      detectedPatterns.push(fingerprintingPattern);

      newAlerts.push({
        pattern: {
          id: `fingerprinting-${Date.now()}`,
          type: 'fingerprinting',
          domains: [],
          events: fingerprintingPattern.events,
          riskLevel: 'high',
          description: fingerprintingPattern.description,
          detectedAt: Date.now(),
        },
        severity: 'warning',
        message: 'Device fingerprinting attempts detected',
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
  // Group events by tracker domain
  const trackerDomains = new Map<string, TrackingEvent[]>();

  events.forEach(event => {
    const domain = extractDomain(event.url);
    if (!trackerDomains.has(domain)) {
      trackerDomains.set(domain, []);
    }
    trackerDomains.get(domain)!.push(event);
  });

  // Find trackers present on multiple sites
  const crossSiteTrackers = Array.from(trackerDomains.entries()).filter(
    ([, trackerEvents]) => {
      const uniqueSites = new Set(trackerEvents.map(e => extractDomain(e.url)));
      return uniqueSites.size > 1;
    }
  );

  if (crossSiteTrackers.length === 0) return null;

  const allCrossSiteEvents = crossSiteTrackers.flatMap(([, events]) => events);
  const uniqueSites = new Set(
    allCrossSiteEvents.map(e => extractDomain(e.url))
  );

  return {
    id: `cross-site-${Date.now()}`,
    type: 'cross-site',
    domains: Array.from(uniqueSites),
    events: allCrossSiteEvents,
    riskLevel: uniqueSites.size > 3 ? 'high' : 'medium',
    description: `Tracker present on ${uniqueSites.size} different sites`,
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
    domains: [],
    events: fingerprintingEvents,
    riskLevel: 'high',
    description: `${fingerprintingEvents.length} fingerprinting attempts detected`,
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
