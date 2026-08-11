import { useMemo } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import {
  getPageDomain,
  getResourceDomain,
} from '../../lib/event-attribution.mts';
import type { TrackingEvent, RiskLevel } from '../../lib/types';
import type {
  NetworkData,
  NetworkNode,
  NetworkEdge,
  ProcessedTrackingData,
} from './NetworkGraph.types';
import { selectRecentTrackingEvents } from './network-event-window.mts';

export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );

  const recentEvents = useMemo(
    () => selectRecentTrackingEvents(events, 50),
    [events]
  );

  return {
    events: recentEvents,
    loading: eventsLoading,
  };
}

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'low':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'high':
      return '#f97316';
    case 'critical':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function updateHighestRisk(
  riskLevels: Map<string, RiskLevel>,
  domain: string,
  riskLevel: RiskLevel
): void {
  const currentRisk = riskLevels.get(domain);
  if (
    !currentRisk ||
    getRiskPriority(riskLevel) > getRiskPriority(currentRisk)
  ) {
    riskLevels.set(domain, riskLevel);
  }
}

function processTrackingEvents(events: TrackingEvent[]): ProcessedTrackingData {
  const domains = new Set<string>();
  const connections = new Map<string, Set<string>>();
  const riskLevels = new Map<string, RiskLevel>();

  for (const event of events) {
    const pageDomain = getPageDomain(event);
    const resourceDomain = getResourceDomain(event);

    if (pageDomain) {
      domains.add(pageDomain);
      updateHighestRisk(
        riskLevels,
        pageDomain,
        resourceDomain && resourceDomain !== pageDomain ? 'low' : event.riskLevel
      );
    }

    if (resourceDomain) {
      domains.add(resourceDomain);
      updateHighestRisk(riskLevels, resourceDomain, event.riskLevel);
    }

    if (pageDomain && resourceDomain && pageDomain !== resourceDomain) {
      if (!connections.has(pageDomain)) {
        connections.set(pageDomain, new Set());
      }
      connections.get(pageDomain)!.add(resourceDomain);
    }
  }

  return { domains, connections, riskLevels };
}

function getRiskPriority(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'low':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    case 'critical':
      return 4;
    default:
      return 0;
  }
}

export function useNetworkData(): { data: NetworkData; loading: boolean } {
  const { events, loading } = useTrackingEvents();

  const networkData = useMemo((): NetworkData => {
    if (events.length === 0) return { nodes: [], edges: [] };

    const { domains, connections, riskLevels } = processTrackingEvents(events);
    const nodes: NetworkNode[] = Array.from(domains)
      .sort()
      .map(domain => {
        const riskLevel = riskLevels.get(domain) || 'low';
        return {
          id: domain,
          label: domain,
          color: getRiskColor(riskLevel),
          shape: 'dot',
          size: 20 + getRiskPriority(riskLevel) * 5,
          riskLevel,
        };
      });

    const edges: NetworkEdge[] = [];
    connections.forEach((targetDomains, sourceDomain) => {
      Array.from(targetDomains)
        .sort()
        .forEach(targetDomain => {
          const targetRisk = riskLevels.get(targetDomain) || 'low';
          edges.push({
            id: `${sourceDomain}->${targetDomain}`,
            from: sourceDomain,
            to: targetDomain,
            color: getRiskColor(targetRisk),
            width: 2 + getRiskPriority(targetRisk),
            arrows: 'to',
          });
        });
    });

    return { nodes, edges };
  }, [events]);

  return { data: networkData, loading };
}
