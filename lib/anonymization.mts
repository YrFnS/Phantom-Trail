import type {
  AnonymousPrivacyData,
  P2PSettings,
  PrivacyData,
  RiskLevel,
  TrackingEvent,
} from './types';
import {
  hasCurrentP2PConsent,
  P2P_CONSENT_VERSION,
  P2P_PAYLOAD_VERSION,
} from './p2p-consent.mts';
import {
  getP2PGradeForScore,
  parseAnonymousPrivacyData,
} from './p2p-payload-policy.mts';

export class AnonymizationService {
  /**
   * Build the canonical minimized peer payload.
   *
   * N/A results, invalid local aggregates, absent sharing consent, and disabled
   * sharing all fail closed with null.
   */
  static anonymizeForP2P(
    rawData: PrivacyData,
    settings: P2PSettings
  ): AnonymousPrivacyData | null {
    if (
      !hasCurrentP2PConsent(settings) ||
      !settings.joinPrivacyNetwork ||
      !settings.shareAnonymousData ||
      rawData.scoreStatus !== 'estimated' ||
      rawData.averageScore === null ||
      !Number.isFinite(rawData.averageScore) ||
      rawData.averageScore < 0 ||
      rawData.averageScore > 100 ||
      !Number.isFinite(rawData.trackerCount) ||
      rawData.trackerCount < 0 ||
      rawData.grade === 'N/A' ||
      (rawData.events !== undefined && !Array.isArray(rawData.events))
    ) {
      return null;
    }

    const privacyScore = this.roundScore(rawData.averageScore);
    const events = rawData.events || [];
    const candidate: AnonymousPrivacyData = {
      payloadVersion: P2P_PAYLOAD_VERSION,
      consentVersion: P2P_CONSENT_VERSION,
      privacyScore,
      scoreStatus: 'estimated',
      scoreConfidence:
        rawData.scoreConfidence && rawData.scoreConfidence !== 'none'
          ? rawData.scoreConfidence
          : 'low',
      grade: getP2PGradeForScore(privacyScore),
      trackerCount: this.capTrackerCount(rawData.trackerCount),
      riskDistribution: this.aggregateRiskData(events),
      websiteCategories: this.getTopCategories(events, 3),
      timestamp: this.roundToHour(Date.now()),
      region: settings.shareRegionalData ? this.getGeneralRegion() : undefined,
    };

    // Apply the same strict parser used at the unauthenticated inbound boundary
    // so the extension never broadcasts a shape it would reject itself.
    return parseAnonymousPrivacyData(candidate);
  }

  private static roundScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score / 5) * 5));
  }

  private static capTrackerCount(count: number): number {
    return Math.max(0, Math.min(Math.round(count), 50));
  }

  private static aggregateRiskData(
    events: TrackingEvent[]
  ): Record<RiskLevel, number> {
    const riskCounts: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    events.forEach(event => {
      if (event.riskLevel && event.riskLevel in riskCounts) {
        riskCounts[event.riskLevel]++;
      }
    });

    const total = Object.values(riskCounts).reduce(
      (sum, count) => sum + count,
      0
    );
    if (total === 0) return riskCounts;

    (Object.keys(riskCounts) as RiskLevel[]).forEach(risk => {
      riskCounts[risk] = Math.round((riskCounts[risk] / total) * 100);
    });

    return riskCounts;
  }

  private static getTopCategories(
    events: TrackingEvent[],
    limit: number
  ): string[] {
    const categories = new Map<string, number>();

    events.forEach(event => {
      if (event.trackerType) {
        categories.set(
          event.trackerType,
          (categories.get(event.trackerType) || 0) + 1
        );
      }
    });

    return Array.from(categories.entries())
      .sort(([, first], [, second]) => second - first)
      .slice(0, limit)
      .map(([category]) => category);
  }

  private static roundToHour(timestamp: number): number {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
  }

  private static getGeneralRegion(): string | undefined {
    // No geolocation or IP lookup is performed in P3.
    return undefined;
  }

  static parseAnonymousPrivacyData(
    data: unknown,
    now = Date.now()
  ): AnonymousPrivacyData | null {
    return parseAnonymousPrivacyData(data, now);
  }

  static validateAnonymization(data: unknown): data is AnonymousPrivacyData {
    return parseAnonymousPrivacyData(data) !== null;
  }

  static generateAnonymousPeerId(): string {
    const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const randomSeed = Math.random().toString(36).slice(2, 8);
    return `anon_${hourTimestamp}_${randomSeed}`;
  }

  static sanitizeForSharing(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const allowedKeys = new Set([
      'payloadVersion',
      'consentVersion',
      'privacyScore',
      'scoreStatus',
      'scoreConfidence',
      'grade',
      'trackerCount',
      'riskDistribution',
      'websiteCategories',
      'timestamp',
      'region',
    ]);
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => allowedKeys.has(key))
    );
  }
}
