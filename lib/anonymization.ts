import { AnonymousPrivacyData, PrivacyData, RiskLevel, TrackingEvent } from './types';

export class AnonymizationService {
  /**
   * Anonymize privacy data for P2P sharing
   */
  static anonymizeForP2P(rawData: PrivacyData): AnonymousPrivacyData {
    return {
      privacyScore: this.roundScore(rawData.averageScore),
      grade: rawData.grade,
      trackerCount: this.capTrackerCount(rawData.trackerCount),
      riskDistribution: this.aggregateRiskData(rawData.events || []),
      websiteCategories: this.getTopCategories(rawData.events || [], 3),
      timestamp: this.roundToHour(Date.now()),
      region: this.getGeneralRegion()
    };
  }

  /**
   * Round privacy score to nearest 5 for anonymization
   */
  private static roundScore(score: number): number {
    return Math.round(score / 5) * 5;
  }

  /**
   * Cap tracker count at 50 to prevent fingerprinting
   */
  private static capTrackerCount(count: number): number {
    return Math.min(count, 50);
  }

  /**
   * Aggregate risk data from tracking events
   */
  private static aggregateRiskData(events: TrackingEvent[]): Record<RiskLevel, number> {
    const riskCounts: Record<RiskLevel, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    events.forEach(event => {
      if (event.riskLevel && event.riskLevel in riskCounts) {
        riskCounts[event.riskLevel as RiskLevel]++;
      }
    });

    // Convert to percentages and round
    const total = Object.values(riskCounts).reduce((sum, count) => sum + count, 0);
    if (total === 0) return riskCounts;

    (Object.keys(riskCounts) as RiskLevel[]).forEach(risk => {
      riskCounts[risk] = Math.round((riskCounts[risk] / total) * 100);
    });

    return riskCounts;
  }

  /**
   * Get top website categories (limited for privacy)
   */
  private static getTopCategories(events: TrackingEvent[], limit: number): string[] {
    const categories = new Map<string, number>();
    
    events.forEach(event => {
      // Use trackerType as category since TrackingEvent doesn't have category
      if (event.trackerType) {
        categories.set(event.trackerType, (categories.get(event.trackerType) || 0) + 1);
      }
    });

    return Array.from(categories.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([category]) => category);
  }

  /**
   * Round timestamp to nearest hour for privacy
   */
  private static roundToHour(timestamp: number): number {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    return date.getTime();
  }

  /**
   * Get general region (optional, broad geographic area)
   */
  private static getGeneralRegion(): string | undefined {
    // This would typically use IP geolocation to get broad region
    // For now, return undefined to maintain maximum privacy
    return undefined;
  }

  /**
   * Validate that data is properly anonymized
   */
  static validateAnonymization(data: AnonymousPrivacyData): boolean {
    // Check that score is rounded to 5
    if (data.privacyScore % 5 !== 0) return false;
    
    // Check that tracker count is capped
    if (data.trackerCount > 50) return false;
    
    // Check that timestamp is rounded to hour
    const date = new Date(data.timestamp);
    if (date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
      return false;
    }
    
    // Check that categories are limited
    if (data.websiteCategories.length > 5) return false;
    
    return true;
  }

  /**
   * Generate anonymous peer ID that changes periodically
   */
  static generateAnonymousPeerId(): string {
    // Generate ID that changes every hour for privacy
    const hourTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));
    const randomSeed = Math.random().toString(36).substr(2, 6);
    return `anon_${hourTimestamp}_${randomSeed}`;
  }

  /**
   * Sanitize data before sharing to remove any potential PII
   */
  static sanitizeForSharing(data: Record<string, unknown>): Record<string, unknown> {
    // Remove any fields that might contain PII
    const sanitized = { ...data };
    
    // Remove URLs, IPs, and other identifying information
    delete sanitized.url;
    delete sanitized.domain;
    delete sanitized.ip;
    delete sanitized.userAgent;
    delete sanitized.sessionId;
    delete sanitized.userId;
    
    return sanitized;
  }
}
