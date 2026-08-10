import type {
  AnonymousPrivacyData,
  PrivacyData,
  RiskLevel,
  TrackingEvent,
} from './types';

export class AnonymizationService {
  /**
   * Prepare an estimated score for optional P2P sharing.
   * Insufficient-evidence states are never converted to zero or advertised.
   */
  static anonymizeForP2P(rawData: PrivacyData): AnonymousPrivacyData | null {
    if (
      rawData.scoreStatus !== 'estimated' ||
      rawData.averageScore === null ||
      rawData.grade === 'N/A'
    ) {
      return null;
    }

    return {
      privacyScore: this.roundScore(rawData.averageScore),
      scoreStatus: 'estimated',
      scoreConfidence:
        rawData.scoreConfidence && rawData.scoreConfidence !== 'none'
          ? rawData.scoreConfidence
          : 'low',
      grade: rawData.grade,
      trackerCount: this.capTrackerCount(rawData.trackerCount),
      riskDistribution: this.aggregateRiskData(rawData.events || []),
      websiteCategories: this.getTopCategories(rawData.events || [], 3),
      timestamp: this.roundToHour(Date.now()),
      region: this.getGeneralRegion(),
    };
  }

  private static roundScore(score: number): number {
    return Math.round(score / 5) * 5;
  }

  private static capTrackerCount(count: number): number {
    return Math.min(count, 50);
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
    return undefined;
  }

  static validateAnonymization(data: AnonymousPrivacyData): boolean {
    if (data.scoreStatus && data.scoreStatus !== 'estimated') return false;
    if (data.privacyScore % 5 !== 0) return false;
    if (data.trackerCount > 50) return false;

    const date = new Date(data.timestamp);
    if (
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0 ||
      date.getMilliseconds() !== 0
    ) {
      return false;
    }

    return data.websiteCategories.length <= 5;
  }

  static generateAnonymousPeerId(): string {
    const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const randomSeed = Math.random().toString(36).slice(2, 8);
    return `anon_${hourTimestamp}_${randomSeed}`;
  }

  static sanitizeForSharing(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...data };
    delete sanitized.url;
    delete sanitized.domain;
    delete sanitized.ip;
    delete sanitized.userAgent;
    delete sanitized.sessionId;
    delete sanitized.userId;
    return sanitized;
  }
}
