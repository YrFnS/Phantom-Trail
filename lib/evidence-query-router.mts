export type EvidenceQueryType =
  | 'pattern'
  | 'risk'
  | 'tracker'
  | 'website'
  | 'timeline'
  | 'unsupported';

export interface EvidenceQueryRoute {
  type: EvidenceQueryType;
  query: string;
  timeframe?: number;
  domain?: string;
}

const DOMAIN_PATTERN =
  /(?:https?:\/\/)?((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(?:[/:?#][^\s]*)?/iu;

export function routeEvidenceQuery(query: string): EvidenceQueryRoute {
  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) return { type: 'unsupported', query: trimmed };

  const domain = extractDomain(trimmed);
  const timeframe = extractEvidenceTimeframe(trimmed);

  if (
    matches(lower, [
      'tracking patterns',
      'signal patterns',
      'top trackers',
      'top domains',
      'most common trackers',
      'cross-site tracking',
      'tracker frequency',
      'analyze patterns',
    ])
  ) {
    return { type: 'pattern', query: trimmed, timeframe };
  }

  if (
    matches(lower, [
      'evidence index',
      'privacy risk',
      'privacy score',
      'heuristic score',
      'risk assessment',
      'overall risk',
      'evidence trend',
      'privacy trend',
    ])
  ) {
    return { type: 'risk', query: trimmed, timeframe };
  }

  if (
    matches(lower, [
      'timeline',
      'tracking over time',
      'tracking history',
      'signal history',
      'peak tracking',
      'tracking trends',
      'anomalies',
    ])
  ) {
    return { type: 'timeline', query: trimmed, timeframe };
  }

  if (
    domain &&
    matches(lower, [
      'domain profile',
      'analyze tracker',
      'tracker behavior',
      'resource domain',
      'tracker domain',
    ])
  ) {
    return { type: 'tracker', query: trimmed, domain };
  }

  if (
    domain &&
    matches(lower, [
      'website signals',
      'site signals',
      'signals for',
      'page evidence',
      'website evidence',
      'site evidence',
    ])
  ) {
    return { type: 'website', query: trimmed, domain };
  }

  return { type: 'unsupported', query: trimmed };
}

export function extractEvidenceTimeframe(query: string): number {
  const lower = query.toLowerCase();
  const timeframes: Array<[string, number]> = [
    ['30 days', 30 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['7 days', 7 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['24 hours', 24 * 60 * 60 * 1000],
    ['today', 24 * 60 * 60 * 1000],
    ['yesterday', 2 * 24 * 60 * 60 * 1000],
  ];

  return (
    timeframes.find(([label]) => lower.includes(label))?.[1] ||
    7 * 24 * 60 * 60 * 1000
  );
}

export function extractDomain(query: string): string | undefined {
  const match = query.match(DOMAIN_PATTERN);
  return match?.[1]?.toLowerCase();
}

function matches(query: string, patterns: string[]): boolean {
  return patterns.some(pattern => query.includes(pattern));
}
