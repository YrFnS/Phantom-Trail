import { calculatePrivacyScore } from '../privacy-score';
import type { TrackingEvent } from '../types';
import { EventsStorage } from '../storage/events-storage';

/**
 * User comparison data structure
 */
export interface UserComparison {
  currentSite: {
    domain: string;
    privacyScore: number;
  };
  userAverage: {
    privacyScore: number;
    totalSites: number;
  };
  percentile: number;
  insight: string;
  betterThanUsual: boolean;
}

/**
 * Service for comparing sites to user's browsing average
 */
export class UserComparisonService {
  /**
   * Compare site to user's browsing average
   */
  static async compare(domain: string): Promise<UserComparison | null> {
    try {
      // Get current site score
      const siteEvents = await this.getSiteEvents(domain);
      const siteScore =
        siteEvents.length > 0
          ? calculatePrivacyScore(siteEvents, true).score
          : 100;

      // Get user's historical data
      const allEvents = await EventsStorage.getRecentEvents(1000);
      if (allEvents.length < 10) {
        return null; // Not enough data for comparison
      }

      // Calculate user's average privacy score
      const siteScores = await this.calculateUserSiteAverages(allEvents);
      if (siteScores.length < 3) {
        return null; // Need at least 3 different sites
      }

      const userAverage =
        siteScores.reduce((sum, score) => sum + score, 0) / siteScores.length;
      const percentile = this.calculatePercentile(siteScore, siteScores);

      const insight = this.generateInsight(siteScore, userAverage, percentile);

      return {
        currentSite: {
          domain,
          privacyScore: siteScore,
        },
        userAverage: {
          privacyScore: Math.round(userAverage),
          totalSites: siteScores.length,
        },
        percentile,
        insight,
        betterThanUsual: siteScore > userAverage,
      };
    } catch (error) {
      console.error('Failed to compare to user average:', error);
      return null;
    }
  }

  /**
   * Get tracking events for a specific site
   */
  private static async getSiteEvents(domain: string): Promise<TrackingEvent[]> {
    const allEvents = await EventsStorage.getRecentEvents(500);
    return allEvents.filter(event => event.domain === domain);
  }

  /**
   * Calculate user's site averages
   */
  private static async calculateUserSiteAverages(
    events: TrackingEvent[]
  ): Promise<number[]> {
    const siteEvents: Record<string, TrackingEvent[]> = {};

    // Group events by domain
    events.forEach(event => {
      if (!siteEvents[event.domain]) {
        siteEvents[event.domain] = [];
      }
      siteEvents[event.domain].push(event);
    });

    // Calculate privacy score for each site
    const scores: number[] = [];
    Object.entries(siteEvents).forEach(([, domainEvents]) => {
      if (domainEvents.length >= 3) {
        // Minimum events for reliable score
        const score = calculatePrivacyScore(domainEvents, true).score;
        scores.push(score);
      }
    });

    return scores;
  }

  /**
   * Calculate percentile within user's browsing pattern
   */
  private static calculatePercentile(
    score: number,
    userScores: number[]
  ): number {
    const betterCount = userScores.filter(s => score > s).length;
    return Math.round((betterCount / userScores.length) * 100);
  }

  /**
   * Generate user comparison insight
   */
  private static generateInsight(
    siteScore: number,
    userAverage: number,
    percentile: number
  ): string {
    if (Math.abs(siteScore - userAverage) < 5) {
      return `Similar privacy to your usual browsing pattern`;
    } else if (siteScore > userAverage) {
      return `Better privacy than ${100 - percentile}% of sites you visit`;
    } else {
      return `Lower privacy than ${percentile}% of sites you visit`;
    }
  }
}
