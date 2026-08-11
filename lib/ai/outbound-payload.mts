import type {
  AIOutboundMode,
  PrivacyScore,
  RiskLevel,
  TrackerType,
  TrackingEvent,
} from '../types.ts';
import {
  getEventOccurrenceCount,
  getResourceDomain,
  normalizeTrackingEvent,
} from '../event-attribution.mts';

export interface AISummaryPayload {
  payloadVersion: 1;
  dataClass: 'aggregate-detector-summary';
  mode: AIOutboundMode;
  scoreStatus: PrivacyScore['status'];
  evidenceIndex: number | null;
  modelBand: PrivacyScore['grade'];
  coverageConfidence: PrivacyScore['confidence'];
  observedRows: number;
  observedOccurrences: number;
  qualifyingRows: number;
  excludedRows: number;
  evidenceUnits: number;
  categoryCounts: Record<TrackerType, number>;
  severityCounts: Record<RiskLevel, number>;
  resourceDomainLabels?: Array<{ domain: string; rows: number }>;
}

export interface AIOutboundPreview {
  mode: AIOutboundMode;
  destination: 'OpenRouter';
  includedFields: string[];
  excludedFields: string[];
  sample: AISummaryPayload;
}

export function buildAISummaryPayload(
  events: TrackingEvent[],
  score: PrivacyScore,
  mode: AIOutboundMode
): AISummaryPayload {
  const categoryCounts: Record<TrackerType, number> = {
    advertising: 0,
    analytics: 0,
    social: 0,
    fingerprinting: 0,
    cryptomining: 0,
    unknown: 0,
  };
  const severityCounts: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  const resourceCounts = new Map<string, number>();

  for (const rawEvent of events) {
    const event = normalizeTrackingEvent(rawEvent);
    const occurrences = getEventOccurrenceCount(event);
    categoryCounts[event.trackerType] += occurrences;
    severityCounts[event.riskLevel] += occurrences;

    if (
      mode === 'include-domain-labels' &&
      event.context?.party === 'third-party'
    ) {
      const resourceDomain = getResourceDomain(event);
      if (resourceDomain) {
        resourceCounts.set(
          resourceDomain,
          (resourceCounts.get(resourceDomain) || 0) + 1
        );
      }
    }
  }

  const payload: AISummaryPayload = {
    payloadVersion: 1,
    dataClass: 'aggregate-detector-summary',
    mode,
    scoreStatus: score.status,
    evidenceIndex: score.score,
    modelBand: score.grade,
    coverageConfidence: score.confidence,
    observedRows: score.breakdown.observedRows,
    observedOccurrences: score.breakdown.observedOccurrences,
    qualifyingRows: score.breakdown.qualifyingRows,
    excludedRows: score.breakdown.excludedRows,
    evidenceUnits: score.breakdown.evidenceUnits,
    categoryCounts,
    severityCounts,
  };

  if (mode === 'include-domain-labels') {
    payload.resourceDomainLabels = Array.from(resourceCounts.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 5)
      .map(([domain, rows]) => ({ domain, rows }));
  }

  return payload;
}

export function getAIOutboundPreview(
  mode: AIOutboundMode
): AIOutboundPreview {
  const sampleScore: PrivacyScore = {
    status: 'insufficient-evidence',
    score: null,
    grade: 'N/A',
    color: 'gray',
    confidence: 'none',
    scope: { type: 'dataset' },
    breakdown: {
      totalTrackers: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      criticalRisk: 0,
      httpsBonus: false,
      excessiveTrackingPenalty: false,
      observedRows: 0,
      observedOccurrences: 0,
      qualifyingRows: 0,
      qualifyingOccurrences: 0,
      excludedRows: 0,
      excludedByReason: {
        'legacy-event': 0,
        'missing-page-attribution': 0,
        'page-scope-mismatch': 0,
        'unsupported-source': 0,
        'first-party-resource': 0,
        'unknown-party': 0,
        'missing-resource-domain': 0,
        'low-detector-confidence': 0,
        'low-attribution-confidence': 0,
        'low-party-confidence': 0,
      },
      uniqueThirdPartyParties: 0,
      pageApiUnits: 0,
      evidenceUnits: 0,
      highQualityUnits: 0,
      rawPenalty: 0,
      appliedPenalty: 0,
      contributions: [],
    },
    recommendations: [],
  };
  const sample = buildAISummaryPayload([], sampleScore, mode);

  return {
    mode,
    destination: 'OpenRouter',
    includedFields: [
      'score status, nullable evidence index, model band, and coverage label',
      'observed and qualifying row/occurrence totals',
      'excluded-row and evidence-unit totals',
      'prototype category and severity aggregate counts',
      ...(mode === 'include-domain-labels'
        ? ['up to five third-party resource-domain labels with row counts']
        : []),
    ],
    excludedFields: [
      'page URLs and resource URLs',
      'paths, query strings, fragments, and URL credentials',
      'page-domain labels',
      'descriptions and detector-evidence strings',
      'raw API details or arguments',
      'OpenRouter keys and browser storage keys',
      'personal annotations and P2P peer identifiers',
    ],
    sample,
  };
}
