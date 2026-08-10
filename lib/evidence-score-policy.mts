import type {
  DetectionConfidence,
  DetectionSource,
  EvidenceCoverageConfidence,
  EvidenceExclusionReason,
  EvidenceScoreBand,
  EvidenceScoreColor,
  EvidenceScoreContribution,
  EvidenceScoreScopeType,
  RiskLevel,
  TrackingEvent,
} from './types.ts';
import {
  getEventOccurrenceCount,
  getPageDomain,
  getResourceDomain,
  normalizeTrackingEvent,
} from './event-attribution.mts';

export interface QualifiedEvidenceCandidate {
  unitKey: string;
  detectorKey: string;
  kind: EvidenceScoreContribution['kind'];
  pageDomain: string;
  resourceDomain?: string;
  source: DetectionSource;
  party: 'first-party' | 'third-party' | 'unknown';
  detectorId: string;
  detectorRule: string;
  evidence: string[];
  riskLevel: RiskLevel;
  occurrences: number;
  baseContribution: number;
  highQuality: boolean;
}

const SEVERITY_WEIGHTS: Record<RiskLevel, number> = {
  low: 4,
  medium: 8,
  high: 14,
  critical: 22,
};

const DETECTOR_FACTORS: Record<DetectionConfidence, number> = {
  low: 0,
  medium: 0.65,
  high: 1,
};

const ATTRIBUTION_FACTORS: Record<DetectionConfidence, number> = {
  low: 0,
  medium: 0.75,
  high: 1,
};

const PARTY_FACTORS: Record<DetectionConfidence, number> = {
  low: 0,
  medium: 0.8,
  high: 1,
};

const SOURCE_FACTORS: Partial<Record<DetectionSource, number>> = {
  'network-request': 1,
  'dom-resource': 0.85,
  'main-world-api': 0.8,
};

export const EVIDENCE_UNIT_PENALTY_CAP = 22;
export const ADDITIONAL_DETECTOR_FACTOR = 0.3;

export function qualifyEvidenceEvent(
  event: TrackingEvent,
  scopeType: EvidenceScoreScopeType,
  requestedPageDomain: string
):
  | { candidate: QualifiedEvidenceCandidate }
  | { reason: EvidenceExclusionReason } {
  if (event.schemaVersion !== 2 || event.context?.source === 'legacy') {
    return { reason: 'legacy-event' };
  }

  const normalized = normalizeTrackingEvent(event);
  const context = normalized.context;
  const detector = normalized.detector;
  const pageDomain = getPageDomain(normalized);

  if (!context || !detector || !pageDomain) {
    return { reason: 'missing-page-attribution' };
  }

  if (
    scopeType === 'page' &&
    (!requestedPageDomain || pageDomain !== requestedPageDomain)
  ) {
    return { reason: 'page-scope-mismatch' };
  }

  const sourceFactor = SOURCE_FACTORS[context.source];
  if (sourceFactor === undefined) {
    return { reason: 'unsupported-source' };
  }

  if (detector.confidence === 'low') {
    return { reason: 'low-detector-confidence' };
  }

  if (context.attributionConfidence === 'low') {
    return { reason: 'low-attribution-confidence' };
  }

  let unitKey: string;
  let detectorKey: string;
  let kind: EvidenceScoreContribution['kind'];
  let resourceDomain: string | undefined;
  let partyFactor = 1;

  if (context.source === 'network-request' || context.source === 'dom-resource') {
    if (context.party === 'first-party') {
      return { reason: 'first-party-resource' };
    }
    if (context.party === 'unknown') {
      return { reason: 'unknown-party' };
    }
    if (context.partyConfidence === 'low') {
      return { reason: 'low-party-confidence' };
    }

    resourceDomain = getResourceDomain(normalized);
    if (!resourceDomain) {
      return { reason: 'missing-resource-domain' };
    }

    kind = 'third-party-resource';
    unitKey = `party:${pageDomain}:${resourceDomain}`;
    detectorKey = `${detector.id}|${detector.matchType}|${detector.rule || ''}`;
    partyFactor = PARTY_FACTORS[context.partyConfidence];
  } else if (context.source === 'main-world-api') {
    kind = 'page-api';
    unitKey = `api:${pageDomain}:${detector.id}`;
    detectorKey = `${detector.id}|${detector.matchType}|${detector.rule || ''}`;
  } else {
    return { reason: 'unsupported-source' };
  }

  const baseContribution =
    SEVERITY_WEIGHTS[normalized.riskLevel] *
    DETECTOR_FACTORS[detector.confidence] *
    ATTRIBUTION_FACTORS[context.attributionConfidence] *
    partyFactor *
    sourceFactor;
  const highQuality =
    detector.confidence === 'high' &&
    context.attributionConfidence === 'high' &&
    (context.source === 'main-world-api' || context.partyConfidence === 'high');

  return {
    candidate: {
      unitKey,
      detectorKey,
      kind,
      pageDomain,
      resourceDomain,
      source: context.source,
      party: context.party,
      detectorId: detector.id,
      detectorRule: detector.rule || detector.matchType,
      evidence: detector.evidence || [],
      riskLevel: normalized.riskLevel,
      occurrences: getEventOccurrenceCount(normalized),
      baseContribution,
      highQuality,
    },
  };
}

export function recurrenceFactor(occurrences: number): number {
  return 1 + Math.min(Math.log2(Math.max(1, occurrences)), 2) * 0.1;
}

export function calculateCoverageConfidence(
  evidenceUnits: number,
  highQualityUnits: number
): EvidenceCoverageConfidence {
  if (evidenceUnits === 0) return 'none';

  const highQualityShare = highQualityUnits / evidenceUnits;
  if (evidenceUnits >= 4 && highQualityShare >= 0.75) return 'high';
  if (evidenceUnits >= 2 && highQualityShare >= 0.5) return 'medium';
  return 'low';
}

export function getEvidenceBand(score: number): {
  grade: EvidenceScoreBand;
  color: EvidenceScoreColor;
} {
  if (score >= 90) return { grade: 'A', color: 'green' };
  if (score >= 80) return { grade: 'B', color: 'green' };
  if (score >= 65) return { grade: 'C', color: 'yellow' };
  if (score >= 50) return { grade: 'D', color: 'orange' };
  return { grade: 'F', color: 'red' };
}

export function createEmptyExclusionRecord(): Record<
  EvidenceExclusionReason,
  number
> {
  return {
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
  };
}

export function maxRiskLevel(
  first: RiskLevel,
  second: RiskLevel
): RiskLevel {
  const rank: Record<RiskLevel, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return rank[second] > rank[first] ? second : first;
}

export function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
