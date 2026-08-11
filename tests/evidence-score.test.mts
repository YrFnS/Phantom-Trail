import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEvidenceScore } from '../lib/evidence-score.mts';
import type {
  DetectionConfidence,
  DetectionSource,
  RiskLevel,
  TrackingEvent,
} from '../lib/types.ts';

interface NetworkFixtureOptions {
  id?: string;
  pageDomain?: string;
  resourceDomain?: string;
  riskLevel?: RiskLevel;
  detectorId?: string;
  detectorConfidence?: DetectionConfidence;
  attributionConfidence?: DetectionConfidence;
  party?: 'first-party' | 'third-party' | 'unknown';
  partyConfidence?: DetectionConfidence;
  source?: Extract<DetectionSource, 'network-request' | 'dom-resource'>;
  occurrences?: number;
}

function createNetworkEvent(
  options: NetworkFixtureOptions = {}
): TrackingEvent {
  const pageDomain = options.pageDomain || 'page.test';
  const resourceDomain = options.resourceDomain || 'tracker.test';
  const party = options.party || 'third-party';
  const timestamp = 1_000;

  return {
    schemaVersion: 2,
    id: options.id || `${pageDomain}-${resourceDomain}`,
    timestamp,
    url: `https://${resourceDomain}/collect`,
    domain: resourceDomain,
    trackerType: 'analytics',
    riskLevel: options.riskLevel || 'medium',
    description: 'fixture evidence',
    context: {
      source: options.source || 'network-request',
      pageUrl: `https://${pageDomain}/`,
      pageDomain,
      resourceUrl: `https://${resourceDomain}/collect`,
      resourceDomain,
      tabId: 1,
      frameId: 0,
      parentFrameId: -1,
      requestId: options.id || 'request-1',
      requestType: 'xmlhttprequest',
      requestMethod: 'GET',
      party,
      partyBasis:
        party === 'first-party'
          ? 'same-host'
          : party === 'third-party'
            ? 'different-site-heuristic'
            : 'missing-context',
      partyConfidence: options.partyConfidence || 'medium',
      attributionBasis: 'document-url',
      attributionConfidence: options.attributionConfidence || 'high',
    },
    detector: {
      id: options.detectorId || 'catalog-tracker.test',
      matchType: 'catalog-exact-domain',
      confidence: options.detectorConfidence || 'high',
      rule: resourceDomain,
      evidence: [`hostname matched ${resourceDomain}`],
    },
    occurrences: options.occurrences || 1,
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
  };
}

function createApiEvent(
  detectorId: string,
  riskLevel: RiskLevel = 'high',
  pageDomain = 'page.test'
): TrackingEvent {
  return {
    schemaVersion: 2,
    id: `${pageDomain}-${detectorId}`,
    timestamp: 2_000,
    url: `https://${pageDomain}/`,
    domain: pageDomain,
    trackerType: 'fingerprinting',
    riskLevel,
    description: 'API threshold fixture',
    context: {
      source: 'main-world-api',
      pageUrl: `https://${pageDomain}/`,
      pageDomain,
      party: 'first-party',
      partyBasis: 'same-host',
      partyConfidence: 'high',
      attributionBasis: 'content-script',
      attributionConfidence: 'high',
    },
    detector: {
      id: detectorId,
      matchType: 'api-threshold',
      confidence: 'high',
      rule: detectorId,
      evidence: ['fixture threshold crossed'],
    },
    occurrences: 1,
    firstSeenAt: 2_000,
    lastSeenAt: 2_000,
    inPageTracking: {
      method: 'canvas-fingerprint',
      details: '{}',
      frequency: 3,
    },
  };
}

test('returns an explicit insufficient-evidence state for an empty set', () => {
  const result = calculateEvidenceScore([]);

  assert.equal(result.status, 'insufficient-evidence');
  assert.equal(result.score, null);
  assert.equal(result.grade, 'N/A');
  assert.equal(result.color, 'gray');
  assert.equal(result.confidence, 'none');
  assert.equal(result.breakdown.evidenceUnits, 0);
});

test('legacy, first-party, and low-confidence rows do not create a number', () => {
  const legacy: TrackingEvent = {
    id: 'legacy',
    timestamp: 1,
    url: 'https://legacy.test/pixel',
    domain: 'legacy.test',
    trackerType: 'analytics',
    riskLevel: 'medium',
    description: 'legacy row',
  };
  const result = calculateEvidenceScore([
    legacy,
    createNetworkEvent({ party: 'first-party' }),
    createNetworkEvent({
      id: 'low',
      detectorConfidence: 'low',
      resourceDomain: 'low.test',
    }),
  ]);

  assert.equal(result.status, 'insufficient-evidence');
  assert.equal(result.score, null);
  assert.equal(result.breakdown.excludedByReason['legacy-event'], 1);
  assert.equal(result.breakdown.excludedByReason['first-party-resource'], 1);
  assert.equal(
    result.breakdown.excludedByReason['low-detector-confidence'],
    1
  );
});

test('one high-quality third-party party produces a low-coverage estimate', () => {
  const result = calculateEvidenceScore([createNetworkEvent()]);

  assert.equal(result.status, 'estimated');
  assert.equal(result.score, 94);
  assert.equal(result.grade, 'A');
  assert.equal(result.confidence, 'low');
  assert.equal(result.breakdown.evidenceUnits, 1);
  assert.equal(result.breakdown.uniqueThirdPartyParties, 1);
  assert.equal(result.breakdown.appliedPenalty, 6.4);
});

test('recurrence is bounded instead of scaling linearly', () => {
  const single = calculateEvidenceScore([
    createNetworkEvent({ occurrences: 1 }),
  ]);
  const repeated = calculateEvidenceScore([
    createNetworkEvent({ occurrences: 128 }),
  ]);

  assert.equal(single.status, 'estimated');
  assert.equal(repeated.status, 'estimated');
  assert.ok(
    repeated.breakdown.appliedPenalty <=
      single.breakdown.appliedPenalty * 1.201
  );
  assert.equal(repeated.breakdown.qualifyingOccurrences, 128);
});

test('distinct detectors on one party remain one capped evidence unit', () => {
  const result = calculateEvidenceScore([
    createNetworkEvent({ detectorId: 'analytics', riskLevel: 'medium' }),
    createNetworkEvent({
      id: 'second',
      detectorId: 'advertising',
      riskLevel: 'high',
    }),
  ]);

  assert.equal(result.breakdown.evidenceUnits, 1);
  assert.equal(result.breakdown.contributions[0].detectorIds.length, 2);
  assert.equal(result.breakdown.appliedPenalty, 13.12);
  assert.equal(result.score, 87);
});

test('unique third-party parties drive the result and coverage confidence', () => {
  const result = calculateEvidenceScore([
    createNetworkEvent({ resourceDomain: 'one.test', id: 'one' }),
    createNetworkEvent({ resourceDomain: 'two.test', id: 'two' }),
  ]);

  assert.equal(result.breakdown.evidenceUnits, 2);
  assert.equal(result.breakdown.uniqueThirdPartyParties, 2);
  assert.equal(result.breakdown.appliedPenalty, 12.8);
  assert.equal(result.score, 87);
  assert.equal(result.confidence, 'medium');
});

test('four high-quality evidence units can reach high coverage confidence', () => {
  const result = calculateEvidenceScore([
    createNetworkEvent({ resourceDomain: 'one.test', id: 'one' }),
    createNetworkEvent({ resourceDomain: 'two.test', id: 'two' }),
    createNetworkEvent({ resourceDomain: 'three.test', id: 'three' }),
    createNetworkEvent({ resourceDomain: 'four.test', id: 'four' }),
  ]);

  assert.equal(result.breakdown.evidenceUnits, 4);
  assert.equal(result.breakdown.highQualityUnits, 4);
  assert.equal(result.confidence, 'high');
  assert.equal(result.score, 74);
  assert.equal(result.grade, 'C');
});

test('page scope excludes attributed evidence from other pages', () => {
  const events = [
    createNetworkEvent({ pageDomain: 'one.test', id: 'one' }),
    createNetworkEvent({ pageDomain: 'two.test', id: 'two' }),
  ];
  const dataset = calculateEvidenceScore(events);
  const page = calculateEvidenceScore(events, {
    scope: 'page',
    pageDomain: 'one.test',
  });

  assert.equal(dataset.breakdown.evidenceUnits, 2);
  assert.equal(page.breakdown.evidenceUnits, 1);
  assert.equal(page.breakdown.excludedByReason['page-scope-mismatch'], 1);
  assert.equal(page.scope.pageDomain, 'one.test');
});

test('page-local API thresholds form separate non-resource evidence units', () => {
  const result = calculateEvidenceScore([
    createApiEvent('canvas-threshold'),
  ]);

  assert.equal(result.status, 'estimated');
  assert.equal(result.breakdown.pageApiUnits, 1);
  assert.equal(result.breakdown.uniqueThirdPartyParties, 0);
  assert.equal(result.breakdown.contributions[0].resourceDomain, undefined);
  assert.equal(result.breakdown.appliedPenalty, 11.2);
  assert.equal(result.score, 89);
});

test('many equivalent rows still collapse into one bounded scoring unit', () => {
  const events = Array.from({ length: 100 }, (_, index) =>
    createNetworkEvent({ id: `row-${index}` })
  );
  const result = calculateEvidenceScore(events);

  assert.equal(result.breakdown.qualifyingRows, 100);
  assert.equal(result.breakdown.evidenceUnits, 1);
  assert.equal(result.breakdown.appliedPenalty, 7.68);
  assert.equal(result.score, 92);
});
