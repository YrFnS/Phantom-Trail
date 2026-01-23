import {
  WebsiteCategorization,
  WebsiteCategory,
} from './website-categorization';
import { calculatePrivacyScore } from './privacy-score';
import type { TrackingEvent } from './types';

import { EventsStorage } from './storage/events-storage';

/**
 * Privacy comparison data structures
 */
export interface CategoryComparison {
  currentSite: {
    domain: string;
    privacyScore: number;
    trackerCount: number;
    category: string;
  };
  categoryAverage: {
    privacyScore: number;
    trackerCount: number;
    category: string;
  };
  percentile: number; // 0-100, where this site ranks
  insight: string;
  betterThanAverage: boolean;
  improvementSuggestions: string[];
}

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

export interface SimilarSiteComparison {
  currentSite: {
    domain: string;
    privacyScore: number;
  };
  similarSites: Array<{
    domain: string;
    privacyScore: number;
    category: string;
  }>;
  ranking: number; // 1-based ranking among similar sites
  insight: string;
}

export interface ComparisonInsights {
  categoryComparison: CategoryComparison;
  userComparison: UserComparison | null;
  overallInsight: string;
  recommendations: string[];
  trustLevel: 'high' | 'medium' | 'low';
}

/**
 * Privacy comparison engine
 */
export class PrivacyComparison {
  /**
   * Compare site to its category average
   */
  static async compareToCategory(domain: string): Promise<CategoryComparison> {
    try {
      // Get site's tracking events
      const events = await this.getSiteEvents(domain);
      const privacyScore =
        events.length > 0 ? calculatePrivacyScore(events, true).score : 100;

      // Categorize the website
      const category = WebsiteCategorization.categorizeWebsite(domain);
      const benchmark = WebsiteCategorization.getCategoryBenchmark(category.id);

      // Calculate percentile
      const percentile = this.calculatePercentile(
        privacyScore,
        benchmark.distribution
      );

      // Generate insight
      const insight = this.generateCategoryInsight(percentile, category.name);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        privacyScore,
        benchmark.averageScore,
        category
      );

      return {
        currentSite: {
          domain,
          privacyScore,
          trackerCount: events.length,
          category: category.name,
        },
        categoryAverage: {
          privacyScore: benchmark.averageScore,
          trackerCount: benchmark.averageTrackers,
          category: category.name,
        },
        percentile,
        insight,
        betterThanAverage: privacyScore > benchmark.averageScore,
        improvementSuggestions,
      };
    } catch (error) {
      console.error('Failed to compare to category:', error);
      throw error;
    }
  }

  /**
   * Compare site to user's browsing average
   */
  static async compareToUserAverage(
    domain: string
  ): Promise<UserComparison | null> {
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
      const percentile = this.calculateUserPercentile(siteScore, siteScores);

      const insight = this.generateUserInsight(
        siteScore,
        userAverage,
        percentile
      );

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
   * Compare to similar sites
   */
  static async compareSimilarSites(
    domain: string
  ): Promise<SimilarSiteComparison> {
    try {
      const siteEvents = await this.getSiteEvents(domain);
      const siteScore =
        siteEvents.length > 0
          ? calculatePrivacyScore(siteEvents, true).score
          : 100;

      // Get category and find similar sites
      const category = WebsiteCategorization.categorizeWebsite(domain);
      const allEvents = await EventsStorage.getRecentEvents(1000);

      // Group events by domain and calculate scores
      const domainScores = await this.calculateDomainScores(allEvents);

      // Filter to similar category sites
      const similarSites = domainScores
        .filter(site => {
          const siteCategory = WebsiteCategorization.categorizeWebsite(
            site.domain
          );
          return siteCategory.id === category.id && site.domain !== domain;
        })
        .slice(0, 10); // Top 10 similar sites

      // Calculate ranking
      const allSites = [
        ...similarSites,
        { domain, privacyScore: siteScore, category: category.name },
      ];
      allSites.sort((a, b) => b.privacyScore - a.privacyScore);
      const ranking = allSites.findIndex(site => site.domain === domain) + 1;

      const insight = this.generateSimilarSitesInsight(
        ranking,
        allSites.length,
        category.name
      );

      return {
        currentSite: {
          domain,
          privacyScore: siteScore,
        },
        similarSites: similarSites.map(site => ({
          domain: site.domain,
          privacyScore: site.privacyScore,
          category: category.name,
        })),
        ranking,
        insight,
      };
    } catch (error) {
      console.error('Failed to compare similar sites:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive comparison insights
   */
  static async generateComparisonInsights(
    domain: string
  ): Promise<ComparisonInsights> {
    try {
      const [categoryComparison, userComparison] = await Promise.all([
        this.compareToCategory(domain),
        this.compareToUserAverage(domain),
      ]);

      // Generate overall insight
      const overallInsight = this.generateOverallInsight(
        categoryComparison,
        userComparison
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        categoryComparison,
        userComparison
      );

      // Determine trust level
      const trustLevel = this.calculateTrustLevel(
        categoryComparison.currentSite.privacyScore
      );

      return {
        categoryComparison,
        userComparison,
        overallInsight,
        recommendations,
        trustLevel,
      };
    } catch (error) {
      console.error('Failed to generate comparison insights:', error);
      throw error;
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
   * Calculate percentile ranking
   */
  private static calculatePercentile(
    score: number,
    distribution: number[]
  ): number {
    if (distribution.length === 0) return 50;

    let count = 0;
    for (let i = 0; i < score && i < distribution.length; i++) {
      count += distribution[i];
    }

    const totalArea = distribution.reduce((sum, val) => sum + val, 0);
    return Math.round((count / totalArea) * 100);
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
  private static calculateUserPercentile(
    score: number,
    userScores: number[]
  ): number {
    const betterCount = userScores.filter(s => score > s).length;
    return Math.round((betterCount / userScores.length) * 100);
  }

  /**
   * Calculate domain scores from events
   */
  private static async calculateDomainScores(
    events: TrackingEvent[]
  ): Promise<Array<{ domain: string; privacyScore: number }>> {
    const domainEvents: Record<string, TrackingEvent[]> = {};

    events.forEach(event => {
      if (!domainEvents[event.domain]) {
        domainEvents[event.domain] = [];
      }
      domainEvents[event.domain].push(event);
    });

    return Object.entries(domainEvents)
      .filter(([, events]) => events.length >= 3)
      .map(([domain, events]) => ({
        domain,
        privacyScore: calculatePrivacyScore(events, true).score,
      }));
  }

  /**
   * Generate category comparison insight
   */
  private static generateCategoryInsight(
    percentile: number,
    categoryName: string
  ): string {
    if (percentile >= 80) {
      return `Excellent privacy - better than ${percentile}% of ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 60) {
      return `Good privacy - above average for ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 40) {
      return `Average privacy for ${categoryName.toLowerCase()} sites`;
    } else if (percentile >= 20) {
      return `Below average privacy - worse than ${100 - percentile}% of ${categoryName.toLowerCase()} sites`;
    } else {
      return `Poor privacy - among the worst ${100 - percentile}% of ${categoryName.toLowerCase()} sites`;
    }
  }

  /**
   * Generate user comparison insight
   */
  private static generateUserInsight(
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

  /**
   * Generate similar sites insight
   */
  private static generateSimilarSitesInsight(
    ranking: number,
    totalSites: number,
    category: string
  ): string {
    if (ranking === 1) {
      return `Best privacy among ${totalSites} similar ${category.toLowerCase()} sites`;
    } else if (ranking <= Math.ceil(totalSites * 0.3)) {
      return `Top ${Math.ceil((ranking / totalSites) * 100)}% privacy among ${category.toLowerCase()} sites`;
    } else if (ranking <= Math.ceil(totalSites * 0.7)) {
      return `Average privacy ranking among ${category.toLowerCase()} sites`;
    } else {
      return `Below average privacy - ranks ${ranking} of ${totalSites} ${category.toLowerCase()} sites`;
    }
  }

  /**
   * Generate improvement suggestions
   */
  private static generateImprovementSuggestions(
    siteScore: number,
    avgScore: number,
    category: WebsiteCategory
  ): string[] {
    const suggestions: string[] = [];

    if (siteScore < avgScore - 10) {
      suggestions.push(
        `This ${category.name.toLowerCase()} site has more tracking than typical`
      );
      suggestions.push(
        'Consider using an ad blocker or privacy-focused browser'
      );
    }

    if (
      category.riskProfile === 'critical' ||
      category.riskProfile === 'high'
    ) {
      suggestions.push(`${category.name} sites often have extensive tracking`);
      suggestions.push(
        'Review privacy settings and limit personal information sharing'
      );
    }

    if (siteScore < 60) {
      suggestions.push('Consider alternatives with better privacy practices');
      suggestions.push(
        'Use incognito/private browsing mode for sensitive activities'
      );
    }

    return suggestions;
  }

  /**
   * Generate overall insight
   */
  private static generateOverallInsight(
    categoryComparison: CategoryComparison,
    userComparison: UserComparison | null
  ): string {
    const { currentSite, betterThanAverage } = categoryComparison;

    if (betterThanAverage && userComparison?.betterThanUsual) {
      return `${currentSite.domain} has good privacy practices for both its category and your browsing pattern`;
    } else if (betterThanAverage) {
      return `${currentSite.domain} has above-average privacy for ${currentSite.category.toLowerCase()} sites`;
    } else if (userComparison?.betterThanUsual) {
      return `${currentSite.domain} has better privacy than most sites you visit`;
    } else {
      return `${currentSite.domain} has below-average privacy practices`;
    }
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    categoryComparison: CategoryComparison,
    userComparison: UserComparison | null
  ): string[] {
    const recommendations: string[] = [];

    if (!categoryComparison.betterThanAverage) {
      recommendations.push(
        'Consider using privacy-focused alternatives in this category'
      );
      recommendations.push('Enable tracking protection in your browser');
    }

    if (userComparison && !userComparison.betterThanUsual) {
      recommendations.push(
        'This site has more tracking than you typically encounter'
      );
      recommendations.push('Be cautious about sharing personal information');
    }

    if (categoryComparison.currentSite.privacyScore < 50) {
      recommendations.push(
        'Use incognito mode or VPN for sensitive activities'
      );
      recommendations.push('Review and adjust privacy settings');
    }

    return recommendations;
  }

  /**
   * Calculate trust level
   */
  private static calculateTrustLevel(
    privacyScore: number
  ): 'high' | 'medium' | 'low' {
    if (privacyScore >= 80) return 'high';
    if (privacyScore >= 60) return 'medium';
    return 'low';
  }
}
