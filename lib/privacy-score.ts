import type {
  EvidenceCoverageConfidence,
  EvidenceScoreBand,
  EvidenceScoreColor,
  PrivacyScore,
  TrackingEvent,
} from './types';
import { EventsStorage } from './storage/events-storage';
import {
  eventMatchesPageDomain,
  normalizeDomain,
} from './event-attribution.mts';
import {
  calculateEvidenceScore,
  type EvidenceScoreOptions,
} from './evidence-score.mts';

export type { PrivacyScore } from './types';

/**
 * Historical API name retained for compatibility.
 *
 * P2 ignores the legacy HTTPS argument and delegates to the published
 * evidence-qualified model. A missing evidence set returns a nullable N/A
 * result instead of zero, 100, A, or F.
 */
export function calculatePrivacyScore(
  events: TrackingEvent[],
  legacyIsHttps: boolean = true,
  options: EvidenceScoreOptions = {}
): PrivacyScore {
  void legacyIsHttps;
  return calculateEvidenceScore(events, options);
}

/**
 * Personal site annotations do not alter evidence scoring.
 */
export async function calculatePrivacyScoreWithTrust(
  events: TrackingEvent[],
  legacyIsHttps: boolean = true,
  legacyDomain?: string
): Promise<PrivacyScore> {
  void legacyDomain;
  return calculatePrivacyScore(events, legacyIsHttps);
}

export function calculatePrivacyScoreSync(
  events: TrackingEvent[],
  legacyIsHttps: boolean = true,
  options: EvidenceScoreOptions = {}
): PrivacyScore {
  return calculatePrivacyScore(events, legacyIsHttps, options);
}

export function getPrivacyTrend(
  currentScore: number | null,
  previousScore: number | null
): 'improving' | 'declining' | 'stable' | 'insufficient-evidence' {
  if (currentScore === null || previousScore === null) {
    return 'insufficient-evidence';
  }

  const difference = currentScore - previousScore;
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

export interface DomainScoreResult extends PrivacyScore {
  known: boolean;
  source: 'local-events' | 'insufficient-evidence';
}

/**
 * Page-domain compatibility calculator for background messages.
 *
 * It uses only locally stored events attributed to the requested page and
 * preserves the P2 insufficient-evidence state.
 */
export class PrivacyScoreCalculator {
  private static scoreCache = new Map<
    string,
    { result: DomainScoreResult; timestamp: number }
  >();
  private static readonly CACHE_TTL = 300000;

  static async calculateDomainScore(
    domain?: string
  ): Promise<DomainScoreResult> {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) return this.getUnknownResult();

    const cached = this.scoreCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const events = await EventsStorage.getRecentEvents(1000);
      const domainEvents = events.filter(event =>
        eventMatchesPageDomain(event, normalizedDomain)
      );
      const evidenceResult = calculateEvidenceScore(domainEvents, {
        scope: 'page',
        pageDomain: normalizedDomain,
      });
      const result = this.toDomainResult(evidenceResult);

      this.scoreCache.set(normalizedDomain, {
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch (error) {
      console.warn('Failed to calculate page evidence index:', error);
      return this.getUnknownResult(normalizedDomain);
    }
  }

  static clearCache(domain?: string): void {
    const normalizedDomain = normalizeDomain(domain);
    if (normalizedDomain) {
      this.scoreCache.delete(normalizedDomain);
      return;
    }
    this.scoreCache.clear();
  }

  private static toDomainResult(score: PrivacyScore): DomainScoreResult {
    return {
      ...score,
      known: score.status === 'estimated',
      source:
        score.status === 'estimated'
          ? 'local-events'
          : 'insufficient-evidence',
    };
  }

  private static getUnknownResult(pageDomain?: string): DomainScoreResult {
    return this.toDomainResult(
      calculateEvidenceScore([], {
        scope: pageDomain ? 'page' : 'dataset',
        pageDomain,
      })
    );
  }
}

export const PrivacyScoreClass = PrivacyScoreCalculator;

export function formatEvidenceScore(score: PrivacyScore): string {
  return score.status === 'estimated' && score.score !== null
    ? `${score.score}/100 (${score.grade})`
    : 'N/A — insufficient evidence';
}

export function isEstimatedScore(
  score: PrivacyScore
): score is PrivacyScore & {
  status: 'estimated';
  score: number;
  grade: Exclude<EvidenceScoreBand, 'N/A'>;
  color: Exclude<EvidenceScoreColor, 'gray'>;
  confidence: Exclude<EvidenceCoverageConfidence, 'none'>;
} {
  return score.status === 'estimated' && score.score !== null;
}
