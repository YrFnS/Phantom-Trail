import type {
  DetectionSource,
  EvidenceCoverageConfidence,
  EvidenceScoreBreakdown,
  EvidenceScoreContribution,
  EvidenceScoreScopeType,
  PrivacyScore,
  RiskLevel,
  TrackingEvent,
} from './types.ts';
import {
  getEventOccurrenceCount,
  normalizeDomain,
} from './event-attribution.mts';
import {
  ADDITIONAL_DETECTOR_FACTOR,
  EVIDENCE_UNIT_PENALTY_CAP,
  calculateCoverageConfidence,
  createEmptyExclusionRecord,
  getEvidenceBand,
  maxRiskLevel,
  qualifyEvidenceEvent,
  recurrenceFactor,
  roundTwo,
} from './evidence-score-policy.mts';

export interface EvidenceScoreOptions {
  scope?: EvidenceScoreScopeType;
  pageDomain?: string;
}

interface MutableDetectorContribution {
  detectorId: string;
  detectorRule: string;
  evidence: Set<string>;
  riskLevel: RiskLevel;
  eventRows: number;
  occurrences: number;
  maxBaseContribution: number;
  highQuality: boolean;
}

interface MutableEvidenceUnit {
  id: string;
  kind: EvidenceScoreContribution['kind'];
  pageDomain: string;
  resourceDomain?: string;
  source: DetectionSource;
  party: 'first-party' | 'third-party' | 'unknown';
  detectors: Map<string, MutableDetectorContribution>;
}

export function calculateEvidenceScore(
  events: TrackingEvent[],
  options: EvidenceScoreOptions = {}
): PrivacyScore {
  const scopeType = options.scope || 'dataset';
  const requestedPageDomain = normalizeDomain(options.pageDomain);
  const excludedByReason = createEmptyExclusionRecord();
  const units = new Map<string, MutableEvidenceUnit>();
  const thirdPartyDomains = new Set<string>();

  let observedOccurrences = 0;
  let qualifyingRows = 0;
  let qualifyingOccurrences = 0;
  let lowRisk = 0;
  let mediumRisk = 0;
  let highRisk = 0;
  let criticalRisk = 0;

  for (const event of events) {
    observedOccurrences += getEventOccurrenceCount(event);
    const assessment = qualifyEvidenceEvent(
      event,
      scopeType,
      requestedPageDomain
    );

    if ('reason' in assessment) {
      excludedByReason[assessment.reason] += 1;
      continue;
    }

    const candidate = assessment.candidate;
    qualifyingRows += 1;
    qualifyingOccurrences += candidate.occurrences;

    switch (candidate.riskLevel) {
      case 'critical':
        criticalRisk += 1;
        highRisk += 1;
        break;
      case 'high':
        highRisk += 1;
        break;
      case 'medium':
        mediumRisk += 1;
        break;
      case 'low':
        lowRisk += 1;
        break;
    }

    if (candidate.kind === 'third-party-resource' && candidate.resourceDomain) {
      thirdPartyDomains.add(candidate.resourceDomain);
    }

    let unit = units.get(candidate.unitKey);
    if (!unit) {
      unit = {
        id: candidate.unitKey,
        kind: candidate.kind,
        pageDomain: candidate.pageDomain,
        resourceDomain: candidate.resourceDomain,
        source: candidate.source,
        party: candidate.party,
        detectors: new Map(),
      };
      units.set(candidate.unitKey, unit);
    }

    let detector = unit.detectors.get(candidate.detectorKey);
    if (!detector) {
      detector = {
        detectorId: candidate.detectorId,
        detectorRule: candidate.detectorRule,
        evidence: new Set<string>(),
        riskLevel: candidate.riskLevel,
        eventRows: 0,
        occurrences: 0,
        maxBaseContribution: 0,
        highQuality: false,
      };
      unit.detectors.set(candidate.detectorKey, detector);
    }

    for (const evidenceItem of candidate.evidence) {
      detector.evidence.add(evidenceItem);
    }
    detector.eventRows += 1;
    detector.occurrences += candidate.occurrences;
    detector.maxBaseContribution = Math.max(
      detector.maxBaseContribution,
      candidate.baseContribution
    );
    detector.riskLevel = maxRiskLevel(
      detector.riskLevel,
      candidate.riskLevel
    );
    detector.highQuality = detector.highQuality || candidate.highQuality;
  }

  const contributions = Array.from(units.values())
    .map(finalizeEvidenceUnit)
    .sort((first, second) => second.appliedPenalty - first.appliedPenalty);
  const rawPenalty = roundTwo(
    contributions.reduce(
      (total, contribution) => total + contribution.rawPenalty,
      0
    )
  );
  const appliedPenalty = roundTwo(
    Math.min(
      100,
      contributions.reduce(
        (total, contribution) => total + contribution.appliedPenalty,
        0
      )
    )
  );
  const highQualityUnits = contributions.filter(
    contribution => contribution.highQuality
  ).length;
  const pageApiUnits = contributions.filter(
    contribution => contribution.kind === 'page-api'
  ).length;
  const breakdown: EvidenceScoreBreakdown = {
    totalTrackers: qualifyingRows,
    highRisk,
    mediumRisk,
    lowRisk,
    criticalRisk,
    httpsBonus: false,
    excessiveTrackingPenalty: false,
    observedRows: events.length,
    observedOccurrences,
    qualifyingRows,
    qualifyingOccurrences,
    excludedRows: events.length - qualifyingRows,
    excludedByReason,
    uniqueThirdPartyParties: thirdPartyDomains.size,
    pageApiUnits,
    evidenceUnits: contributions.length,
    highQualityUnits,
    rawPenalty,
    appliedPenalty,
    contributions,
  };
  const scope = {
    type: scopeType,
    ...(scopeType === 'page' && requestedPageDomain
      ? { pageDomain: requestedPageDomain }
      : {}),
  } as const;

  if (contributions.length === 0) {
    return {
      status: 'insufficient-evidence',
      score: null,
      grade: 'N/A',
      color: 'gray',
      confidence: 'none',
      scope,
      breakdown,
      recommendations: buildReviewNotes(null, 'none', breakdown),
    };
  }

  const score = Math.round(Math.max(0, 100 - appliedPenalty));
  const confidence = calculateCoverageConfidence(
    contributions.length,
    highQualityUnits
  );
  const { grade, color } = getEvidenceBand(score);

  return {
    status: 'estimated',
    score,
    grade,
    color,
    confidence,
    scope,
    breakdown,
    recommendations: buildReviewNotes(score, confidence, breakdown),
  };
}

function finalizeEvidenceUnit(
  unit: MutableEvidenceUnit
): EvidenceScoreContribution {
  const detectorContributions = Array.from(unit.detectors.values())
    .map(detector => ({
      detector,
      contribution:
        detector.maxBaseContribution * recurrenceFactor(detector.occurrences),
    }))
    .sort((first, second) => second.contribution - first.contribution);
  const strongest = detectorContributions[0];
  const additional = detectorContributions
    .slice(1)
    .reduce((total, entry) => total + entry.contribution, 0);
  const rawPenalty = roundTwo(
    (strongest?.contribution || 0) + additional * ADDITIONAL_DETECTOR_FACTOR
  );
  const appliedPenalty = roundTwo(
    Math.min(EVIDENCE_UNIT_PENALTY_CAP, rawPenalty)
  );
  const riskLevel = detectorContributions.reduce<RiskLevel>(
    (current, entry) => maxRiskLevel(current, entry.detector.riskLevel),
    'low'
  );

  return {
    id: unit.id,
    kind: unit.kind,
    pageDomain: unit.pageDomain,
    resourceDomain: unit.resourceDomain,
    source: unit.source,
    party: unit.party,
    detectorIds: detectorContributions.map(entry => entry.detector.detectorId),
    detectorRules: detectorContributions.map(
      entry => entry.detector.detectorRule
    ),
    evidence: Array.from(
      new Set(
        detectorContributions.flatMap(entry =>
          Array.from(entry.detector.evidence)
        )
      )
    ).slice(0, 12),
    riskLevel,
    eventRows: detectorContributions.reduce(
      (total, entry) => total + entry.detector.eventRows,
      0
    ),
    occurrences: detectorContributions.reduce(
      (total, entry) => total + entry.detector.occurrences,
      0
    ),
    rawPenalty,
    appliedPenalty,
    highQuality: Boolean(strongest?.detector.highQuality),
  };
}

function buildReviewNotes(
  score: number | null,
  confidence: EvidenceCoverageConfidence,
  breakdown: EvidenceScoreBreakdown
): string[] {
  const notes: string[] = [];

  if (score === null) {
    notes.push(
      'No score-qualified evidence units were available. This does not show that tracking was absent or that the page is private or safe.'
    );
  } else {
    notes.push(
      `${breakdown.evidenceUnits} evidence unit${
        breakdown.evidenceUnits === 1 ? '' : 's'
      } contributed to the experimental index: ${breakdown.uniqueThirdPartyParties} unique third-party resource domain${
        breakdown.uniqueThirdPartyParties === 1 ? '' : 's'
      } and ${breakdown.pageApiUnits} page-local API unit${
        breakdown.pageApiUnits === 1 ? '' : 's'
      }.`
    );
    notes.push(
      `Evidence coverage confidence is ${confidence}. This label describes recorded evidence coverage, not detector accuracy.`
    );
  }

  if (breakdown.excludedRows > 0) {
    const reasons = Object.entries(breakdown.excludedByReason)
      .filter(([, count]) => count > 0)
      .sort((first, second) => second[1] - first[1])
      .slice(0, 3)
      .map(([reason, count]) => `${reason}: ${count}`)
      .join(', ');
    notes.push(
      `${breakdown.excludedRows} observed row${
        breakdown.excludedRows === 1 ? ' was' : 's were'
      } excluded from scoring${reasons ? ` (${reasons})` : ''}. Excluded rows remain inspectable.`
    );
  }

  if (breakdown.qualifyingOccurrences > breakdown.qualifyingRows) {
    notes.push(
      `${breakdown.qualifyingRows} qualifying rows represent ${breakdown.qualifyingOccurrences} occurrences. Recurrence is bounded and cannot create a linear request-volume penalty.`
    );
  }

  if (score !== null && score < 65) {
    notes.push(
      'The model produced a larger observed-evidence penalty. Review contribution routes and detector evidence instead of treating the band as a website verdict.'
    );
  }

  return notes;
}
