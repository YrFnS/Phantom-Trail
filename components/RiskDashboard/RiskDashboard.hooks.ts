import { useState, useEffect, useMemo } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import { calculatePrivacyScore } from '../../lib/privacy-score';
import type { RiskLevel, TrackingEvent } from '../../lib/types';
import {
  eventMatchesPageDomain,
  getDisplayDomain,
  getEventOccurrenceCount,
  getResourceDomain,
  normalizeDomain,
} from '../../lib/event-attribution.mts';
import type {
  RiskDistribution,
  TrackerSummary,
  RiskTrendPoint,
  DashboardState,
} from './RiskDashboard.types';

export function useRiskMetrics(currentDomain?: string): DashboardState {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedDomain = normalizeDomain(currentDomain);

  const metrics = useMemo(() => {
    try {
      const recentEvents = events.slice(-500);
      const scopedEvents = normalizedDomain
        ? recentEvents.filter(event =>
            eventMatchesPageDomain(event, normalizedDomain)
          )
        : recentEvents;
      const evidenceScore = calculatePrivacyScore(scopedEvents, true, {
        scope: normalizedDomain ? 'page' : 'dataset',
        pageDomain: normalizedDomain || undefined,
      });

      return {
        evidenceScore,
        totalRows: scopedEvents.length,
        totalOccurrences: scopedEvents.reduce(
          (total, event) => total + getEventOccurrenceCount(event),
          0
        ),
        riskDistribution: calculateRiskDistribution(scopedEvents),
        topTrackers: calculateTopTrackers(scopedEvents),
        riskTrend: calculateRiskTrend(scopedEvents, normalizedDomain),
      };
    } catch (calculationError) {
      console.error('Error calculating evidence dashboard metrics:', calculationError);
      return null;
    }
  }, [events, normalizedDomain]);

  const recommendations = useMemo(() => {
    if (!metrics) return [];

    const notes = [...metrics.evidenceScore.recommendations];
    if (metrics.riskDistribution.critical > 0) {
      notes.push(
        'Critical-labeled occurrences exist in the observed rows. Some may be excluded from scoring; inspect their evidence and attribution.'
      );
    }
    if (metrics.topTrackers.length > 5) {
      notes.push(
        'Several resource-domain labels appear in recent evidence. This does not prove common ownership or data sharing.'
      );
    }
    return Array.from(new Set(notes)).slice(0, 5);
  }, [metrics]);

  useEffect(() => {
    setLoading(eventsLoading);
    setError(null);
  }, [eventsLoading]);

  return {
    metrics,
    loading,
    error,
    recommendations,
  };
}

function calculateRiskDistribution(
  events: TrackingEvent[]
): RiskDistribution {
  const distribution: RiskDistribution = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const event of events) {
    distribution[event.riskLevel] += getEventOccurrenceCount(event);
  }
  return distribution;
}

function calculateTopTrackers(events: TrackingEvent[]): TrackerSummary[] {
  const trackerMap = new Map<string, TrackerSummary>();

  for (const event of events) {
    const domain = getResourceDomain(event) || getDisplayDomain(event);
    if (!domain) continue;
    const existing = trackerMap.get(domain);
    const occurrences = getEventOccurrenceCount(event);

    if (existing) {
      existing.count += occurrences;
      existing.riskLevel = maxRiskLevel(existing.riskLevel, event.riskLevel);
    } else {
      trackerMap.set(domain, {
        domain,
        count: occurrences,
        riskLevel: event.riskLevel,
        category: event.trackerType,
      });
    }
  }

  return Array.from(trackerMap.values())
    .sort((first, second) => second.count - first.count)
    .slice(0, 5);
}

function calculateRiskTrend(
  events: TrackingEvent[],
  pageDomain: string
): RiskTrendPoint[] {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const points: RiskTrendPoint[] = [];

  for (let index = 11; index >= 0; index -= 1) {
    const end = now - index * hourMs;
    const start = end - hourMs;
    const hourEvents = events.filter(event => {
      const timestamp = event.lastSeenAt || event.timestamp;
      return timestamp >= start && timestamp < end;
    });
    const score = calculatePrivacyScore(hourEvents, true, {
      scope: pageDomain ? 'page' : 'dataset',
      pageDomain: pageDomain || undefined,
    });

    points.push({
      timestamp: end,
      evidenceIndex: score.score,
      confidence: score.confidence,
      eventCount: hourEvents.reduce(
        (total, event) => total + getEventOccurrenceCount(event),
        0
      ),
    });
  }

  return points;
}

function maxRiskLevel(first: RiskLevel, second: RiskLevel): RiskLevel {
  const rank: Record<RiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return rank[second] > rank[first] ? second : first;
}
