import type { TrackingEvent } from './types';
import { EventsStorage } from './storage/events-storage';

export interface PrivacyScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: 'green' | 'yellow' | 'orange' | 'red';
  breakdown: {
    /** Legacy field name: currently counts recorded detector events. */
    totalTrackers: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    criticalRisk: number;
    httpsBonus: boolean;
    excessiveTrackingPenalty: boolean;
    trustAdjustment?: {
      applied: boolean;
      domain: string;
      adjustment: number;
      reason: string;
    };
  };
  recommendations: string[];
}

/**
 * Apply the current experimental penalty formula to recorded detector events.
 * The result is not an independently validated website privacy rating.
 */
export function calculatePrivacyScore(
  events: TrackingEvent[],
  isHttps: boolean = true
): PrivacyScore {
  let score = 100;
  const breakdown = {
    totalTrackers: events.length,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    criticalRisk: 0,
    httpsBonus: isHttps,
    excessiveTrackingPenalty: events.length > 10,
  };

  for (const event of events) {
    switch (event.riskLevel) {
      case 'critical':
        score -= 30;
        breakdown.criticalRisk++;
        breakdown.highRisk++;
        break;
      case 'high':
        score -= 18;
        breakdown.highRisk++;
        break;
      case 'medium':
        score -= 10;
        breakdown.mediumRisk++;
        break;
      case 'low':
        score -= 5;
        breakdown.lowRisk++;
        break;
    }
  }

  if (isHttps) score += 5;
  if (events.length > 10) score -= 20;

  const uniqueDomainGroups = new Set(
    events.map(event => extractDomainGroup(event.domain))
  );
  if (uniqueDomainGroups.size >= 3) score -= 15;

  const hasFingerprintingRelatedSignal = events.some(event =>
    [
      'canvas-fingerprint',
      'font-fingerprint',
      'audio-fingerprint',
      'webgl-fingerprint',
      'webrtc-leak',
    ].includes(event.inPageTracking?.method || '')
  );
  if (hasFingerprintingRelatedSignal) score -= 20;

  score = Math.max(0, Math.min(100, score));
  const { grade, color } = getGradeAndColor(score);

  return {
    score,
    grade,
    color,
    breakdown,
    recommendations: generateReviewNotes(
      breakdown,
      score,
      uniqueDomainGroups.size,
      hasFingerprintingRelatedSignal
    ),
  };
}

/**
 * Historical compatibility API. Personal site annotations no longer alter the
 * detector-derived heuristic.
 */
export async function calculatePrivacyScoreWithTrust(
  events: TrackingEvent[],
  isHttps: boolean = true,
  legacyDomain?: string
): Promise<PrivacyScore> {
  void legacyDomain;
  return calculatePrivacyScore(events, isHttps);
}

export function calculatePrivacyScoreSync(
  events: TrackingEvent[],
  isHttps: boolean = true
): PrivacyScore {
  return calculatePrivacyScore(events, isHttps);
}

function extractDomainGroup(domain: string): string {
  const cleaned = (domain || 'unknown')
    .toLowerCase()
    .replace(/^(www\.|analytics\.|tracking\.|ads\.)/, '');
  const parts = cleaned.split('.').filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : cleaned;
}

function getGradeAndColor(score: number): {
  grade: PrivacyScore['grade'];
  color: PrivacyScore['color'];
} {
  if (score >= 90) return { grade: 'A', color: 'green' };
  if (score >= 80) return { grade: 'B', color: 'green' };
  if (score >= 70) return { grade: 'C', color: 'yellow' };
  if (score >= 60) return { grade: 'D', color: 'orange' };
  return { grade: 'F', color: 'red' };
}

function generateReviewNotes(
  breakdown: PrivacyScore['breakdown'],
  score: number,
  domainGroupCount: number,
  hasFingerprintingRelatedSignal: boolean
): string[] {
  const notes: string[] = [];

  if (breakdown.totalTrackers === 0) {
    notes.push(
      'No detector signals were recorded in this data set. This does not prove that tracking was absent.'
    );
    return notes;
  }

  if (breakdown.criticalRisk > 0) {
    notes.push(
      `${breakdown.criticalRisk} recorded signal${
        breakdown.criticalRisk === 1 ? '' : 's'
      } carry the prototype critical label. Inspect the detector evidence; the label is not proof of an attack or data collection.`
    );
  }

  const highOnlyCount = Math.max(
    0,
    breakdown.highRisk - breakdown.criticalRisk
  );
  if (highOnlyCount > 0) {
    notes.push(
      `${highOnlyCount} recorded signal${
        highOnlyCount === 1 ? '' : 's'
      } carry the prototype high label. Review false-positive and attribution risk before changing browser settings.`
    );
  }

  if (domainGroupCount >= 3) {
    notes.push(
      `Recorded event labels span ${domainGroupCount} simplified root-domain groups. The current event model does not prove cross-site tracking, common ownership, or data sharing.`
    );
  }

  if (hasFingerprintingRelatedSignal) {
    notes.push(
      'At least one fingerprinting-related instrumentation rule fired. Normal canvas, WebGL, audio, font, or WebRTC use can trigger these rules.'
    );
  }

  if (breakdown.excessiveTrackingPenalty) {
    notes.push(
      'More than ten detector events were counted. Check duplicate requests and repeated instrumentation before interpreting the volume.'
    );
  }

  if (!breakdown.httpsBonus) {
    notes.push(
      'The supplied context was not marked HTTPS. This flag alone does not establish how every request was transported or whether the page is unsafe.'
    );
  }

  if (score < 60) {
    notes.push(
      'The experimental formula produced a low value. Review the underlying event mix rather than treating the number as a website verdict.'
    );
  }

  return notes;
}

export function getPrivacyTrend(
  currentScore: number,
  previousScore: number
): 'improving' | 'declining' | 'stable' {
  const difference = currentScore - previousScore;
  if (difference > 5) return 'improving';
  if (difference < -5) return 'declining';
  return 'stable';
}

export interface DomainScoreResult {
  score: number;
  grade: string;
  color: string;
  known: boolean;
  source: 'local-events' | 'insufficient-evidence';
}

/**
 * Compatibility calculator for background messages.
 *
 * It uses only local recorded events. Unauthenticated peer scores are not used
 * as website reputation, and missing evidence returns an explicit N/A state.
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
    const normalizedDomain = domain?.trim().toLowerCase();
    if (!normalizedDomain) return this.getUnknownResult();

    const cached = this.scoreCache.get(normalizedDomain);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    try {
      const events = await EventsStorage.getRecentEvents(1000);
      const domainEvents = events.filter(event =>
        this.matchesDomain(event, normalizedDomain)
      );

      if (domainEvents.length === 0) {
        const result = this.getUnknownResult();
        this.scoreCache.set(normalizedDomain, {
          result,
          timestamp: Date.now(),
        });
        return result;
      }

      const score = calculatePrivacyScore(domainEvents);
      const result: DomainScoreResult = {
        score: score.score,
        grade: score.grade,
        color: score.color,
        known: true,
        source: 'local-events',
      };
      this.scoreCache.set(normalizedDomain, {
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch (error) {
      console.warn('Failed to calculate local domain heuristic:', error);
      return this.getUnknownResult();
    }
  }

  private static matchesDomain(
    event: TrackingEvent,
    normalizedDomain: string
  ): boolean {
    if ((event.domain || '').toLowerCase() === normalizedDomain) return true;

    try {
      return new URL(event.url).hostname.toLowerCase() === normalizedDomain;
    } catch {
      return false;
    }
  }

  private static getUnknownResult(): DomainScoreResult {
    return {
      score: 0,
      grade: 'N/A',
      color: 'gray',
      known: false,
      source: 'insufficient-evidence',
    };
  }
}

export const PrivacyScoreClass = PrivacyScoreCalculator;
