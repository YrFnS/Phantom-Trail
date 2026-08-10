import { useState, useEffect, useMemo } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import type { TrackingEvent } from '../../lib/types';
import type {
  RiskDistribution,
  TrackerSummary,
  RiskTrendPoint,
  DashboardState,
} from './RiskDashboard.types';

/**
 * Hook for calculating experimental signal metrics from recorded events.
 */
export function useRiskMetrics(): DashboardState {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!events.length) return null;

    try {
      const recentEvents = events.slice(-100);

      return {
        overallRiskScore: calculateOverallRiskScore(recentEvents),
        totalEvents: recentEvents.length,
        riskDistribution: calculateRiskDistribution(recentEvents),
        topTrackers: calculateTopTrackers(recentEvents),
        riskTrend: calculateRiskTrend(recentEvents),
      };
    } catch (err) {
      console.error('Error calculating signal metrics:', err);
      return null;
    }
  }, [events]);

  const recommendations = useMemo(() => {
    if (!metrics) return [];

    const recs: string[] = [];

    if (metrics.overallRiskScore > 70) {
      recs.push(
        'The heuristic signal score is high. Review the underlying events before choosing privacy controls.'
      );
    }

    if (metrics.riskDistribution.critical > 0) {
      recs.push(
        'Critical-risk signals were recorded. Review their evidence before entering sensitive information.'
      );
    }

    if (metrics.topTrackers.length > 5) {
      recs.push(
        'Several recorded domains appear in recent events. This does not by itself prove cross-site data sharing.'
      );
    }

    return recs;
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

/**
 * Calculate an experimental weighted signal score (0-100).
 */
function calculateOverallRiskScore(events: TrackingEvent[]): number {
  if (!events.length) return 0;

  const riskWeights = { low: 1, medium: 3, high: 7, critical: 10 };
  const totalWeight = events.reduce(
    (sum, event) => sum + riskWeights[event.riskLevel],
    0
  );

  const maxPossibleWeight = events.length * riskWeights.critical;
  return Math.round((totalWeight / maxPossibleWeight) * 100);
}

function calculateRiskDistribution(events: TrackingEvent[]): RiskDistribution {
  const distribution = { low: 0, medium: 0, high: 0, critical: 0 };

  events.forEach(event => {
    distribution[event.riskLevel]++;
  });

  return distribution;
}

function calculateTopTrackers(events: TrackingEvent[]): TrackerSummary[] {
  const trackerMap = new Map<string, TrackerSummary>();

  events.forEach(event => {
    const existing = trackerMap.get(event.domain);
    if (existing) {
      existing.count++;
    } else {
      trackerMap.set(event.domain, {
        domain: event.domain,
        count: 1,
        riskLevel: event.riskLevel,
        category: event.trackerType,
      });
    }
  });

  return Array.from(trackerMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateRiskTrend(events: TrackingEvent[]): RiskTrendPoint[] {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const points: RiskTrendPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const timestamp = now - i * hourMs;
    const hourEvents = events.filter(
      event =>
        event.timestamp >= timestamp - hourMs && event.timestamp < timestamp
    );

    points.push({
      timestamp,
      riskScore: calculateOverallRiskScore(hourEvents),
      eventCount: hourEvents.length,
    });
  }

  return points;
}
