import { useState, useEffect, useCallback } from 'react';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getResourceDomain,
  normalizeTrackingEvent,
} from '../../lib/event-attribution.mts';
import type { TrackingEvent } from '../../lib/types';
import type {
  TrackingPattern,
  PatternAlert,
} from '../../components/LiveNarrative/LiveNarrative.types';

/**
 * Detect possible patterns in attributed recorded events.
 *
 * These are heuristic groupings, not proof that tracking, fingerprinting, or
 * data sharing occurred.
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
        pattern: crossSitePattern,
        severity: 'warning',
        message:
          'The same attributed third-party resource domain appeared on multiple recorded pages',
        actionable: true,
      });
    }

    const fingerprintingPattern = detectFingerprintingPattern(events);
    if (fingerprintingPattern) {
      detectedPatterns.push(fingerprintingPattern);
      newAlerts.push({
        pattern: fingerprintingPattern,
        severity: 'warning',
        message:
          'Fingerprinting-related API thresholds were recorded; normal API use can still trigger these rules',
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
  const resources = new Map<
    string,
    { events: TrackingEvent[]; pages: Set<string> }
  >();

  for (const rawEvent of events) {
    const event = normalizeTrackingEvent(rawEvent);
    const pageDomain = getPageDomain(event);
    const resourceDomain = getResourceDomain(event);

    if (
      !pageDomain ||
      !resourceDomain ||
      event.context?.party !== 'third-party'
    ) {
      continue;
    }

    const current = resources.get(resourceDomain) || {
      events: [],
      pages: new Set<string>(),
    };
    current.events.push(event);
    current.pages.add(pageDomain);
    resources.set(resourceDomain, current);
  }

  const repeatedResources = Array.from(resources.entries()).filter(
    ([, data]) => data.pages.size > 1
  );
  if (repeatedResources.length === 0) return null;

  const repeatedEvents = repeatedResources.flatMap(([, data]) => data.events);
  const pageDomains = new Set(
    repeatedResources.flatMap(([, data]) => Array.from(data.pages))
  );
  const resourceDomains = repeatedResources.map(([domain]) => domain);
  const occurrences = repeatedEvents.reduce(
    (total, event) => total + getEventOccurrenceCount(event),
    0
  );

  return {
    id: `cross-site-${Date.now()}`,
    type: 'cross-site',
    domains: resourceDomains,
    events: repeatedEvents,
    riskLevel: pageDomains.size > 3 ? 'high' : 'medium',
    description: `${resourceDomains.length} attributed third-party resource domain${
      resourceDomains.length === 1 ? '' : 's'
    } appeared across ${pageDomains.size} recorded page contexts in ${occurrences} occurrence${
      occurrences === 1 ? '' : 's'
    }; common ownership, user identity, and data sharing are not established`,
    detectedAt: Date.now(),
  };
}

function detectFingerprintingPattern(
  events: TrackingEvent[]
): TrackingPattern | null {
  const fingerprintingEvents = events
    .map(normalizeTrackingEvent)
    .filter(
      event =>
        event.trackerType === 'fingerprinting' &&
        event.detector?.matchType === 'api-threshold'
    );

  if (fingerprintingEvents.length === 0) return null;

  const pageDomains = Array.from(
    new Set(fingerprintingEvents.map(getPageDomain).filter(Boolean))
  );
  const occurrences = fingerprintingEvents.reduce(
    (total, event) => total + getEventOccurrenceCount(event),
    0
  );

  return {
    id: `fingerprinting-${Date.now()}`,
    type: 'fingerprinting',
    domains: pageDomains,
    events: fingerprintingEvents,
    riskLevel: 'high',
    description: `${occurrences} occurrence${
      occurrences === 1 ? '' : 's'
    } crossed fingerprinting-related API thresholds on ${pageDomains.length} attributed page${
      pageDomains.length === 1 ? '' : 's'
    }; the thresholds do not prove that a stable fingerprint was created, retained, or transmitted`,
    detectedAt: Date.now(),
  };
}
