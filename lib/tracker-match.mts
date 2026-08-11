import type {
  DetectionConfidence,
  DetectorMatchType,
  TrackerInfo,
  TrackerMatch,
} from './types.ts';

const PATH_PATTERNS: Array<{ id: string; expression: RegExp }> = [
  { id: 'gtag-segment', expression: /\/(?:gtag)(?:\/|$)/i },
  { id: 'pixel-segment', expression: /\/(?:pixel)(?:\/|$)/i },
  { id: 'collect-segment', expression: /\/(?:collect)(?:\/|$)/i },
  { id: 'beacon-segment', expression: /\/(?:beacon)(?:\/|$)/i },
  { id: 'track-segment', expression: /\/(?:track)(?:\/|$)/i },
  { id: 'analytics-segment', expression: /\/(?:analytics)(?:\/|$)/i },
];

const HOSTNAME_TOKENS = [
  'analytics',
  'tracking',
  'telemetry',
  'metrics',
  'pixel',
  'beacon',
];

function createMatch(
  tracker: TrackerInfo,
  detectorId: string,
  matchType: DetectorMatchType,
  rule: string,
  confidence: DetectionConfidence,
  evidence: string[]
): TrackerMatch {
  return {
    tracker,
    detectorId,
    matchType,
    rule,
    confidence,
    evidence,
  };
}

function hasHostnameToken(hostname: string, token: string): boolean {
  return hostname
    .split('.')
    .some(label =>
      label
        .split('-')
        .filter(Boolean)
        .some(part => part === token)
    );
}

export function matchTrackerUrl(
  value: string,
  knownTrackers: Record<string, TrackerInfo>
): TrackerMatch | null {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  const exact = knownTrackers[hostname];
  if (exact) {
    return createMatch(
      exact,
      'tracker-catalog-domain',
      'catalog-exact-domain',
      hostname,
      'high',
      [`Resource hostname exactly matched catalog entry ${hostname}`]
    );
  }

  for (const [catalogDomain, tracker] of Object.entries(knownTrackers)) {
    if (hostname.endsWith(`.${catalogDomain}`)) {
      return createMatch(
        tracker,
        'tracker-catalog-subdomain',
        'catalog-subdomain',
        catalogDomain,
        'high',
        [
          `Resource hostname ${hostname} is a subdomain of catalog entry ${catalogDomain}`,
        ]
      );
    }
  }

  for (const pattern of PATH_PATTERNS) {
    if (pattern.expression.test(pathname)) {
      return createMatch(
        {
          domain: hostname,
          name: `Path-rule match (${hostname})`,
          category: 'Analytics',
          description: 'Low-confidence path-segment rule match',
          riskLevel: 'low',
        },
        'tracker-path-rule',
        'path-pattern',
        pattern.id,
        'low',
        [`Resource path ${pathname} matched rule ${pattern.id}`]
      );
    }
  }

  for (const token of HOSTNAME_TOKENS) {
    if (hasHostnameToken(hostname, token)) {
      return createMatch(
        {
          domain: hostname,
          name: `Hostname-token match (${hostname})`,
          category: 'Analytics',
          description: 'Low-confidence hostname-token rule match',
          riskLevel: 'low',
        },
        'tracker-hostname-token',
        'url-heuristic',
        token,
        'low',
        [`Resource hostname label contained the standalone token ${token}`]
      );
    }
  }

  return null;
}
