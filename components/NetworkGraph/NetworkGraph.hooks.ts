import { useMemo } from 'react';
import { useStorage } from '../../lib/hooks/useStorage';
import type { TrackingEvent, RiskLevel } from '../../lib/types';
import type { NetworkData, NetworkNode, NetworkEdge, ProcessedTrackingData } from './NetworkGraph.types';

export function useTrackingEvents() {
  const [events, , eventsLoading] = useStorage<TrackingEvent[]>(
    'phantom_trail_events',
    []
  );

  return {
    events: events.slice(-50), // Show last 50 events for network analysis
    loading: eventsLoading,
  };
}

function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'low':
      return '#10b981'; // green-500
    case 'medium':
      return '#f59e0b'; // yellow-500
    case 'high':
      return '#f97316'; // orange-500
    case 'critical':
      return '#ef4444'; // red-500
    default:
      return '#6b7280'; // gray-500
  }
}

function processTrackingEvents(events: TrackingEvent[]): ProcessedTrackingData {
  const domains = new Set<string>();
  const connections = new Map<string, Set<string>>();
  const riskLevels = new Map<string, RiskLevel>();

  events.forEach(event => {
    const { domain, riskLevel } = event;
    domains.add(domain);
    
    // Track highest risk level for each domain
    const currentRisk = riskLevels.get(domain);
    if (!currentRisk || getRiskPriority(riskLevel) > getRiskPriority(currentRisk)) {
      riskLevels.set(domain, riskLevel);
    }

    // Create connections between domains (simplified: connect to current page domain)
    const pageDomain = new URL(event.url).hostname;
    if (pageDomain !== domain) {
      if (!connections.has(pageDomain)) {
        connections.set(pageDomain, new Set());
      }
      connections.get(pageDomain)!.add(domain);
    }
  });

  return { domains, connections, riskLevels };
}

function getRiskPriority(riskLevel: RiskLevel): number {
  switch (riskLevel) {
    case 'low': return 1;
    case 'medium': return 2;
    case 'high': return 3;
    case 'critical': return 4;
    default: return 0;
  }
}

export function useNetworkData(): { data: NetworkData; loading: boolean } {
  const { events, loading } = useTrackingEvents();

  const networkData = useMemo((): NetworkData => {
    if (events.length === 0) {
      return { nodes: [], edges: [] };
    }

    const { domains, connections, riskLevels } = processTrackingEvents(events);
    
    // Create nodes
    const nodes: NetworkNode[] = Array.from(domains).map(domain => {
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

    // Create edges
    const edges: NetworkEdge[] = [];
    let edgeId = 0;
    
    connections.forEach((targetDomains, sourceDomain) => {
      targetDomains.forEach(targetDomain => {
        const sourceRisk = riskLevels.get(sourceDomain) || 'low';
        const targetRisk = riskLevels.get(targetDomain) || 'low';
        const maxRisk = getRiskPriority(sourceRisk) > getRiskPriority(targetRisk) ? sourceRisk : targetRisk;
        
        edges.push({
          id: `edge-${edgeId++}`,
          from: sourceDomain,
          to: targetDomain,
          color: getRiskColor(maxRisk),
          width: 2 + getRiskPriority(maxRisk),
          arrows: 'to',
        });
      });
    });

    return { nodes, edges };
  }, [events]);

  return { data: networkData, loading };
}
