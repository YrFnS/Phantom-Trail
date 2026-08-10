import type {
  AttributionBasis,
  DetectionConfidence,
  DetectionSource,
  DetectorEvidence,
  PartyBasis,
  PartyRelationship,
  TrackingEvent,
  TrackingEventContext,
} from './types.ts';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const COMMON_TWO_LEVEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'ac.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'co.nz',
  'com.br',
  'com.cn',
  'com.sg',
  'com.tr',
]);

export interface NetworkAttributionInput {
  requestUrl: string;
  requestType?: string;
  requestMethod?: string;
  initiator?: string;
  documentUrl?: string;
  tabUrl?: string;
  tabId?: number;
  frameId?: number;
  parentFrameId?: number;
  requestId?: string;
}

export interface ContentAttributionInput {
  source: Exclude<DetectionSource, 'network-request' | 'legacy'>;
  pageUrl: string;
  resourceUrl?: string;
  tabId?: number;
  frameId?: number;
}

export function parseHttpUrl(value?: string): URL | null {
  if (!value || value === 'null') return null;

  try {
    const parsed = new URL(value);
    return HTTP_PROTOCOLS.has(parsed.protocol) && parsed.hostname ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeDomain(value?: string): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^\.+|\.+$/g, '');
}

export function getDomainFromUrl(value?: string): string {
  return normalizeDomain(parseHttpUrl(value)?.hostname);
}

function getApproximateSiteKey(domainValue?: string): string {
  const domain = normalizeDomain(domainValue);
  if (
    !domain ||
    domain === 'localhost' ||
    domain.includes(':') ||
    /^\d+(?:\.\d+){3}$/.test(domain)
  ) {
    return domain;
  }

  const labels = domain.split('.').filter(Boolean);
  if (labels.length <= 2) return domain;

  const lastTwo = labels.slice(-2).join('.');
  return COMMON_TWO_LEVEL_SUFFIXES.has(lastTwo) && labels.length >= 3
    ? labels.slice(-3).join('.')
    : lastTwo;
}

export function classifyPartyRelationship(
  pageDomainValue?: string,
  resourceDomainValue?: string
): {
  party: PartyRelationship;
  basis: PartyBasis;
  confidence: DetectionConfidence;
} {
  const pageDomain = normalizeDomain(pageDomainValue);
  const resourceDomain = normalizeDomain(resourceDomainValue);

  if (!pageDomain || !resourceDomain) {
    return {
      party: 'unknown',
      basis: 'missing-context',
      confidence: 'low',
    };
  }

  if (pageDomain === resourceDomain) {
    return { party: 'first-party', basis: 'same-host', confidence: 'high' };
  }

  if (
    pageDomain.endsWith(`.${resourceDomain}`) ||
    resourceDomain.endsWith(`.${pageDomain}`)
  ) {
    return { party: 'first-party', basis: 'subdomain', confidence: 'high' };
  }

  if (getApproximateSiteKey(pageDomain) === getApproximateSiteKey(resourceDomain)) {
    return {
      party: 'first-party',
      basis: 'same-site-heuristic',
      confidence: 'medium',
    };
  }

  return {
    party: 'third-party',
    basis: 'different-site-heuristic',
    confidence: 'medium',
  };
}

export function resolveNetworkAttribution(
  input: NetworkAttributionInput
): TrackingEventContext {
  const resource = parseHttpUrl(input.requestUrl);
  const resourceUrl = resource?.href || input.requestUrl;
  const resourceDomain = normalizeDomain(resource?.hostname);

  let page: URL | null = null;
  let attributionBasis: AttributionBasis = 'unknown';

  if (input.requestType === 'main_frame') {
    page = resource;
    attributionBasis = 'main-frame';
  } else {
    const candidates: Array<[string | undefined, AttributionBasis]> = [
      [input.documentUrl, 'document-url'],
      [input.initiator, 'initiator'],
      [input.tabUrl, 'tab-url'],
    ];

    for (const [candidate, basis] of candidates) {
      const parsed = parseHttpUrl(candidate);
      if (parsed) {
        page = parsed;
        attributionBasis = basis;
        break;
      }
    }
  }

  const pageUrl = page?.href || '';
  const pageDomain = normalizeDomain(page?.hostname);
  const relationship = classifyPartyRelationship(pageDomain, resourceDomain);

  return {
    source: 'network-request',
    pageUrl,
    pageDomain,
    resourceUrl,
    resourceDomain,
    initiator: input.initiator,
    tabId: input.tabId,
    frameId: input.frameId,
    parentFrameId: input.parentFrameId,
    requestId: input.requestId,
    requestType: input.requestType,
    requestMethod: input.requestMethod,
    party: relationship.party,
    partyBasis: relationship.basis,
    partyConfidence: relationship.confidence,
    attributionBasis,
    attributionConfidence:
      attributionBasis === 'main-frame' || attributionBasis === 'document-url'
        ? 'high'
        : attributionBasis === 'initiator' || attributionBasis === 'tab-url'
          ? 'medium'
          : 'low',
  };
}

export function createContentAttribution(
  input: ContentAttributionInput
): TrackingEventContext {
  const page = parseHttpUrl(input.pageUrl);
  const resource = parseHttpUrl(input.resourceUrl);
  const pageUrl = page?.href || input.pageUrl;
  const pageDomain = normalizeDomain(page?.hostname);
  const resourceUrl = resource?.href;
  const resourceDomain = normalizeDomain(resource?.hostname);
  const relationship = resource
    ? classifyPartyRelationship(pageDomain, resourceDomain)
    : {
        party: 'first-party' as const,
        basis: 'same-host' as const,
        confidence: 'high' as const,
      };

  return {
    source: input.source,
    pageUrl,
    pageDomain,
    resourceUrl,
    resourceDomain,
    tabId: input.tabId,
    frameId: input.frameId,
    party: relationship.party,
    partyBasis: relationship.basis,
    partyConfidence: relationship.confidence,
    attributionBasis: 'content-script',
    attributionConfidence: 'high',
  };
}

export function isTrackingEvent(value: unknown): value is TrackingEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TrackingEvent>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.url === 'string' &&
    typeof candidate.domain === 'string' &&
    typeof candidate.trackerType === 'string' &&
    typeof candidate.riskLevel === 'string' &&
    typeof candidate.description === 'string'
  );
}

export function normalizeTrackingEvent(event: TrackingEvent): TrackingEvent {
  const existingContext = event.context;
  const inferredInPage = Boolean(event.inPageTracking);

  const context: TrackingEventContext = existingContext
    ? {
        ...existingContext,
        pageUrl: existingContext.pageUrl || '',
        pageDomain: normalizeDomain(existingContext.pageDomain),
        resourceUrl: existingContext.resourceUrl || undefined,
        resourceDomain: normalizeDomain(existingContext.resourceDomain),
        party:
          existingContext.party ||
          classifyPartyRelationship(
            existingContext.pageDomain,
            existingContext.resourceDomain
          ).party,
        partyBasis:
          existingContext.partyBasis ||
          classifyPartyRelationship(
            existingContext.pageDomain,
            existingContext.resourceDomain
          ).basis,
        partyConfidence:
          existingContext.partyConfidence ||
          classifyPartyRelationship(
            existingContext.pageDomain,
            existingContext.resourceDomain
          ).confidence,
        attributionBasis: existingContext.attributionBasis || 'unknown',
        attributionConfidence:
          existingContext.attributionConfidence || 'low',
      }
    : inferredInPage
      ? createContentAttribution({
          source: 'main-world-api',
          pageUrl: event.url,
        })
      : {
          source: 'legacy',
          pageUrl: '',
          pageDomain: '',
          resourceUrl: event.url,
          resourceDomain: normalizeDomain(event.domain),
          party: 'unknown',
          partyBasis: 'missing-context',
          partyConfidence: 'low',
          attributionBasis: 'legacy',
          attributionConfidence: 'low',
        };

  const detector: DetectorEvidence = event.detector || {
    id: inferredInPage ? `legacy-${event.inPageTracking?.method}` : 'legacy-event',
    matchType: 'legacy',
    confidence: 'low',
    evidence: ['Migrated from the pre-P1 event shape; attribution is incomplete'],
  };

  return {
    ...event,
    schemaVersion: 2,
    context,
    detector,
    occurrences: Math.max(1, event.occurrences || 1),
    firstSeenAt: event.firstSeenAt || event.timestamp,
    lastSeenAt: event.lastSeenAt || event.timestamp,
  };
}

export function getPageDomain(event: TrackingEvent): string {
  const normalized = normalizeTrackingEvent(event);
  return normalizeDomain(normalized.context?.pageDomain);
}

export function getPageUrl(event: TrackingEvent): string {
  return normalizeTrackingEvent(event).context?.pageUrl || '';
}

export function getResourceDomain(event: TrackingEvent): string {
  const normalized = normalizeTrackingEvent(event);
  return (
    normalizeDomain(normalized.context?.resourceDomain) ||
    (normalized.context?.source === 'legacy' ? normalizeDomain(event.domain) : '')
  );
}

export function getResourceUrl(event: TrackingEvent): string {
  const normalized = normalizeTrackingEvent(event);
  return normalized.context?.resourceUrl || '';
}

export function getDisplayDomain(event: TrackingEvent): string {
  return (
    getResourceDomain(event) || getPageDomain(event) || normalizeDomain(event.domain)
  );
}

export function getDetectorConfidence(event: TrackingEvent): DetectionConfidence {
  return normalizeTrackingEvent(event).detector?.confidence || 'low';
}

export function getEventOccurrenceCount(event: TrackingEvent): number {
  return Math.max(1, event.occurrences || 1);
}

export function eventMatchesPageDomain(
  event: TrackingEvent,
  pageDomainValue: string
): boolean {
  const pageDomain = normalizeDomain(pageDomainValue);
  if (!pageDomain) return false;

  const eventPageDomain = getPageDomain(event);
  if (eventPageDomain) return eventPageDomain === pageDomain;

  if (event.context?.source === 'legacy') {
    return getDomainFromUrl(event.url) === pageDomain;
  }

  return false;
}

export function buildEventDeduplicationKey(event: TrackingEvent): string {
  const normalized = normalizeTrackingEvent(event);
  const context = normalized.context;
  const detector = normalized.detector;

  return [
    context?.source || 'legacy',
    context?.pageDomain || '',
    context?.resourceDomain || '',
    context?.requestType || '',
    context?.requestMethod || '',
    detector?.id || '',
    detector?.matchType || '',
    detector?.rule || '',
    normalized.inPageTracking?.method || '',
  ].join('|');
}
